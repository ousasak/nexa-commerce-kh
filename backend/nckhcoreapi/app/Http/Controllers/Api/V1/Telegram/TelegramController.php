<?php

namespace App\Http\Controllers\Api\V1\Telegram;

use App\Helpers\ShopHelper;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Shop;
use App\Models\TelegramLinkingToken;
use App\Services\Inventory\StockService;
use App\Services\Reports\SalesReportService;
use App\Services\Telegram\TelegramService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TelegramController extends Controller
{
    /**
     * Webhook entry point called by Telegram Bot servers.
     */
    public function webhook(Request $request, string $token)
    {
        $update = $request->all();

        // 1. Locate the shop corresponding to this bot token
        $shop = null;
        $candidates = Shop::where('telegram_settings', 'like', "%{$token}%")->get();
        foreach ($candidates as $s) {
            if (trim($s->telegram_dict()['bot_token'] ?? '') === $token) {
                $shop = $s;
                break;
            }
        }

        // Standard Report Inline Keyboard Menu
        $reportKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📊 ថ្ងៃនេះ (Today)', 'callback_data' => 'report_today'],
                    ['text' => '📅 ៧ ថ្ងៃ (Weekly)', 'callback_data' => 'report_weekly'],
                ],
                [
                    ['text' => '🗓️ ៣០ ថ្ងៃ (Monthly)', 'callback_data' => 'report_monthly'],
                ],
            ],
        ];

        // 2. Handle inline keyboard callback queries (Button clicks in Telegram)
        $callbackQuery = $update['callback_query'] ?? null;
        if ($callbackQuery && $shop) {
            $cqId = $callbackQuery['id'] ?? '';
            $chatId = $callbackQuery['message']['chat']['id'] ?? ($callbackQuery['from']['id'] ?? null);
            $data = trim($callbackQuery['data'] ?? '');

            TelegramService::answerCallbackQuery($token, $cqId);

            if ($chatId) {
                $tg = $shop->telegram_dict();
                $linkedChats = $tg['linked_chats'] ?? [];
                $isLinked = in_array((string) $chatId, array_map('strval', $linkedChats));

                if (! $isLinked) {
                    $unauthMsg = "⚠️ <b>ពុំមានសិទ្ធិចូលមើលរបាយការណ៍ទេ / Unauthorized</b>\n\n".
                                 "Chat នេះមិនទាន់ត្រូវបានភ្ជាប់ជាមួយហាង <b>".htmlspecialchars($shop->shop_name ?: $shop->username, ENT_QUOTES, 'UTF-8')."</b> នៅឡើយទេ។\n".
                                 "សូមផ្ញើពាក្យបញ្ជាភ្ជាប់គណនីជាមុនសិន។";
                    TelegramService::sendTelegramMessage($token, (string) $chatId, $unauthMsg);
                    return response()->json(['ok' => true]);
                }

                $salesService = app(SalesReportService::class);
                $report = match ($data) {
                    'report_today', 'report_1' => $salesService->getDailyReport($shop, null, 'kh'),
                    'report_weekly', 'report_7' => $salesService->getWeeklyReport($shop, null, 'kh'),
                    'report_monthly', 'report_30' => $salesService->getMonthlyReport($shop, null, 'kh'),
                    default => null,
                };

                if ($report) {
                    TelegramService::sendTelegramMessage($token, (string) $chatId, $report['html'], $reportKeyboard);
                    return response()->json(['ok' => true]);
                }
            }

            return response()->json(['ok' => true]);
        }

        // 3. Bot added to a group or channel -> Welcome with secure LINK instructions
        $myChatMember = $update['my_chat_member'] ?? null;
        if ($myChatMember) {
            $newStatus = $myChatMember['new_chat_member']['status'] ?? '';
            $newChatId = $myChatMember['chat']['id'] ?? null;
            if ($shop && $newChatId && in_array($newStatus, ['member', 'administrator'])) {
                $profile = TelegramService::ensureShopProfile($shop);
                $shopName = htmlspecialchars($shop->shop_name ?: $shop->username, ENT_QUOTES, 'UTF-8');
                $msg = "👋 <b>ស្វាគមន៍! Bot របស់ {$shopName} ត្រូវបានបន្ថែមចូលក្រុមនេះ!</b> 🏪\n\n".
                       "ដើម្បីភ្ជាប់ក្រុមនេះ និងទទួល <b>ការជូនដំណឹងការបង់ប្រាក់ KHQR និងរបាយការណ៍លក់</b> សូមអនុវត្តតាមជំហាន៖\n\n".
                       "1. បើក <b>Merchant Dashboard → Settings → Telegram Bot</b>\n".
                       "2. ចុចប៊ូតុង <b>«បង្កើត Linking Token»</b>\n".
                       "3. ផ្ញើពាក្យបញ្ជាខាងក្រោមមកកាន់ទីនេះ៖\n\n".
                       "<code>LINK {$profile['profile_id']} &lt;Linking_Token&gt;</code>";
                TelegramService::sendTelegramMessage($token, (string) $newChatId, $msg);
            }

            return response()->json(['ok' => true]);
        }

        // 4. Handle incoming message
        $message = $update['message'] ?? null;
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $chatId = $message['chat']['id'] ?? null;
        $text = trim($message['text'] ?? '');
        $from = $message['from'] ?? [];

        if (! $chatId || ! $text) {
            return response()->json(['ok' => true]);
        }

        if (! $shop) {
            return response()->json(['ok' => true]);
        }

        $tg = $shop->telegram_dict();
        $linkedChats = $tg['linked_chats'] ?? [];
        $isLinked = in_array((string) $chatId, array_map('strval', $linkedChats));

        // Normalize command: remove @bot_username, convert to lowercase
        $rawLower = mb_strtolower($text, 'UTF-8');
        $cleanCommand = preg_replace('/@[a-zA-Z0-9_]+/', '', $rawLower);
        $cleanCommand = trim($cleanCommand);

        // 5. Check if Account Linking Command
        // Supports: "LINK <pid> <token>", "/link <pid> <token>", or "/start link_<token>"
        $isLinkCmd = str_starts_with($cleanCommand, 'link ') || str_starts_with($cleanCommand, '/link ') || str_starts_with($cleanCommand, '/start link_');

        if ($isLinkCmd) {
            // Apply Rate Limiting for linking attempts (5 attempts per 15 minutes per chat)
            $rateKey = 'tg_link_attempt:'.$chatId;
            if (RateLimiter::tooManyAttempts($rateKey, 5)) {
                $seconds = RateLimiter::availableIn($rateKey);
                $min = ceil($seconds / 60);
                TelegramService::sendTelegramMessage(
                    $token,
                    (string) $chatId,
                    "⚠️ <b>អ្នកបានព្យាយាមភ្ជាប់ច្រើនដងពេក / Too Many Attempts</b>\n\nសូមរង់ចាំ {$min} នាទីទៀត មុនពេលព្យាយាមម្តងទៀត។"
                );
                return response()->json(['ok' => true]);
            }

            $pid = null;
            $providedToken = null;

            if (str_starts_with($cleanCommand, '/start link_')) {
                $providedToken = substr($text, 12);
                $pid = $tg['profile_id'] ?? null;
            } else {
                $parts = preg_split('/\s+/', trim($text));
                if (count($parts) >= 3) {
                    $pid = $parts[1];
                    $providedToken = $parts[2];
                }
            }

            if (! $pid || ! $providedToken) {
                RateLimiter::hit($rateKey, 900);
                TelegramService::sendTelegramMessage(
                    $token,
                    (string) $chatId,
                    "⚠️ <b>ទម្រង់ភ្ជាប់ពុំត្រឹមត្រូវទេ!</b>\n\nសូមផ្ញើតាមទម្រង់:\n<code>LINK &lt;Profile_ID&gt; &lt;Linking_Token&gt;</code>\n\n💡 លោកអ្នកអាចបង្កើត Linking Token នៅក្នុង <b>Merchant Dashboard → Settings → Telegram Bot</b>"
                );
                return response()->json(['ok' => true]);
            }

            // Find matching shop by profile_id
            $matchedShop = null;
            $candidates = Shop::where('telegram_settings', 'like', "%{$pid}%")->get();
            foreach ($candidates as $s) {
                $sTg = $s->telegram_dict();
                if (($sTg['profile_id'] ?? '') === $pid) {
                    $matchedShop = $s;
                    break;
                }
            }

            if (! $matchedShop) {
                RateLimiter::hit($rateKey, 900);
                TelegramService::sendTelegramMessage($token, (string) $chatId, "❌ <b>ភ្ជាប់មិនបានសម្រេច!</b>\n\nរកមិនឃើញ Profile ID នេះក្នុងប្រព័ន្ធទេ។");
                return response()->json(['ok' => true]);
            }

            // Validate token: Check single-use temporary token, with legacy secret_key fallback
            $tokenValid = TelegramLinkingToken::verifyAndConsume($matchedShop->id, $providedToken);
            if (! $tokenValid) {
                $mTg = $matchedShop->telegram_dict();
                if (($mTg['secret_key'] ?? '') === $providedToken) {
                    $tokenValid = true;
                }
            }

            if (! $tokenValid) {
                RateLimiter::hit($rateKey, 900);
                TelegramService::sendTelegramMessage(
                    $token,
                    (string) $chatId,
                    "❌ <b>ភ្ជាប់មិនបានសម្រេច!</b>\n\nLinking Token មិនត្រឹមត្រូវ ឬបានផុតកំណត់ (សុពលភាព ១៥ នាទី)។\nសូមបង្កើត Linking Token ថ្មីក្នុង Merchant Dashboard → Settings → Telegram Bot ។"
                );
                return response()->json(['ok' => true]);
            }

            // Success: clear rate limiter
            RateLimiter::clear($rateKey);

            // Enforce single-merchant-per-chat rule: Unlink this chat from any other shop
            $allOtherShops = Shop::where('id', '!=', $matchedShop->id)
                ->where('telegram_settings', 'like', "%{$chatId}%")
                ->get();
            foreach ($allOtherShops as $oShop) {
                $oTg = $oShop->telegram_dict();
                $oChats = array_values(array_filter($oTg['linked_chats'] ?? [], fn ($c) => (string) $c !== (string) $chatId));
                $oAccounts = array_values(array_filter($oTg['linked_accounts'] ?? [], fn ($a) => (string) ($a['chat_id'] ?? '') !== (string) $chatId));
                $oTg['linked_chats'] = $oChats;
                $oTg['linked_accounts'] = $oAccounts;
                $oShop->telegram_settings = json_encode($oTg, JSON_UNESCAPED_UNICODE);
                $oShop->save();
            }

            // Bind chat & user details to target shop
            $mTg = $matchedShop->telegram_dict();
            $chats = array_map('strval', $mTg['linked_chats'] ?? []);
            if (! in_array((string) $chatId, $chats)) {
                $chats[] = (string) $chatId;
                $mTg['linked_chats'] = $chats;
            }

            $accounts = $mTg['linked_accounts'] ?? [];
            // Remove existing entry for this chat if present
            $accounts = array_values(array_filter($accounts, fn ($a) => (string) ($a['chat_id'] ?? '') !== (string) $chatId));
            $accounts[] = [
                'chat_id' => (string) $chatId,
                'telegram_user_id' => $from['id'] ?? null,
                'username' => $from['username'] ?? null,
                'first_name' => $from['first_name'] ?? null,
                'linked_at' => Carbon::now()->toIso8601String(),
            ];
            $mTg['linked_accounts'] = $accounts;
            $mTg['enabled'] = true;

            $matchedShop->telegram_settings = json_encode($mTg, JSON_UNESCAPED_UNICODE);
            $matchedShop->save();

            ActivityLog::create([
                'shop_id' => $matchedShop->id,
                'user_id' => null,
                'username' => 'Telegram Bot',
                'action' => 'telegram_account_linked',
                'description' => "Linked Telegram Chat {$chatId} (@".($from['username'] ?? 'unknown').") to shop",
            ]);

            $shopName = htmlspecialchars($matchedShop->shop_name ?: $matchedShop->username, ENT_QUOTES, 'UTF-8');
            $successReply = "✅ <b>ភ្ជាប់គណនីជោគជ័យ! / LINKED SUCCESSFULLY</b>\n\n".
                            "Chat នេះត្រូវបានភ្ជាប់ទៅកាន់ <b>{$shopName}</b> ដោយជោគជ័យ។\n\n".
                            "🔔 <b>មុខងារដំណើរការ៖</b>\n".
                            "• ទទួលដំណឹងភ្លាមៗពេលមានការកុម្ម៉ង់ថ្មី\n".
                            "• ទទួលដំណឹងពេលអតិថិជនបង់ប្រាក់ KHQR ជោគជ័យ\n".
                            "• មើលរបាយការណ៍លក់បានគ្រប់ពេល (/today, /weekly, /monthly)\n\n".
                            "សូមជ្រើសរើសរបាយការណ៍ដែលលោកអ្នកចង់ពិនិត្យមើល៖";

            TelegramService::sendTelegramMessage($token, (string) $chatId, $successReply, $reportKeyboard);

            return response()->json(['ok' => true]);
        }

        // 6. /start command
        if ($cleanCommand === '/start' || $cleanCommand === 'start') {
            $profile = TelegramService::ensureShopProfile($shop);
            $shopName = htmlspecialchars($shop->shop_name ?: $shop->username, ENT_QUOTES, 'UTF-8');

            if ($isLinked) {
                $msg = "🏪 <b>{$shopName} — Menu គ្រប់គ្រងរបាយការណ៍</b>\n".
                       "━━━━━━━━━━━━━━━━━━━━\n".
                       "⚡ <b>ស្ថានភាពគណនី:</b> បានភ្ជាប់រួចរាល់ (Connected & Active ✅)\n\n".
                       "សូមជ្រើសរើសប្រភេទរបាយការណ៍ដែលលោកអ្នកចង់ពិនិត្យមើល៖\n\n".
                       "• <b>/today</b> (ថ្ងៃនេះ) — របាយការណ៍លក់ប្រចាំថ្ងៃ\n".
                       "• <b>/weekly</b> (៧ថ្ងៃ) — របាយការណ៍លក់ ៧ ថ្ងៃចុងក្រោយ\n".
                       "• <b>/monthly</b> (ប្រចាំខែ) — របាយការណ៍លក់ ៣០ ថ្ងៃចុងក្រោយ\n".
                       "• <b>/report</b> (របាយការណ៍) — បើក Menu ជ្រើសរើសរបាយការណ៍\n".
                       "• <b>/help</b> (ជំនួយ) — ជំនួយពាក្យបញ្ជាទាំងអស់";
                TelegramService::sendTelegramMessage($token, (string) $chatId, $msg, $reportKeyboard);
            } else {
                $reply = "សូមស្វាគមន៍មកកាន់ <b>{$shopName}</b>! 🏪\n\n".
                         "ដើម្បីភ្ជាប់ Chat នេះទទួល <b>ដំណឹងបង់ប្រាក់ KHQR និងរបាយការណ៍លក់ផ្ទាល់ខ្លួន</b> សូមអនុវត្ត៖\n\n".
                         "1. ចូលទៅកាន់ <b>Merchant Dashboard → Settings → Telegram Bot</b>\n".
                         "2. ចុច <b>«បង្កើត Linking Token»</b>\n".
                         "3. ផ្ញើពាក្យបញ្ជា៖\n".
                         "<code>LINK {$profile['profile_id']} &lt;Linking_Token&gt;</code>";
                TelegramService::sendTelegramMessage($token, (string) $chatId, $reply);
            }

            return response()->json(['ok' => true]);
        }

        // 7. /menu or /report command
        if (in_array($cleanCommand, ['/report', 'report', '/menu', 'menu', 'របាយការណ៍', 'report menu'])) {
            $shopName = htmlspecialchars($shop->shop_name ?: $shop->username, ENT_QUOTES, 'UTF-8');
            if (! $isLinked) {
                TelegramService::sendTelegramMessage($token, (string) $chatId, "⚠️ សូមភ្ជាប់ Chat នេះជាមួយហាងជាមុនសិន ដោយផ្ញើ៖\n<code>LINK &lt;Profile_ID&gt; &lt;Token&gt;</code>");
                return response()->json(['ok' => true]);
            }
            $msg = "📊 <b>របាយការណ៍ការលក់ ({$shopName})</b>\n\nសូមចុចជ្រើសរើសរបាយការណ៍ខាងក្រោម៖";
            TelegramService::sendTelegramMessage($token, (string) $chatId, $msg, $reportKeyboard);

            return response()->json(['ok' => true]);
        }

        // 8. /today command (Daily Sales Report)
        if (in_array($cleanCommand, ['/today', 'today', 'ថ្ងៃនេះ', '/daily', 'daily', 'ប្រចាំថ្ងៃ', 'របាយការណ៍ថ្ងៃនេះ'])) {
            if (! $isLinked) {
                TelegramService::sendTelegramMessage($token, (string) $chatId, "⚠️ សូមភ្ជាប់ Chat នេះជាមួយហាងជាមុនសិន ដោយផ្ញើ៖\n<code>LINK &lt;Profile_ID&gt; &lt;Token&gt;</code>");
                return response()->json(['ok' => true]);
            }
            $salesService = app(SalesReportService::class);
            $report = $salesService->getDailyReport($shop, null, 'kh');
            TelegramService::sendTelegramMessage($token, (string) $chatId, $report['html'], $reportKeyboard);

            return response()->json(['ok' => true]);
        }

        // 9. /weekly command (Weekly Sales Report - 7 Days)
        if (in_array($cleanCommand, ['/weekly', 'weekly', 'ប្រចាំសប្តាហ៍', '៧ថ្ងៃ', '7days', '/7days', 'សប្តាហ៍នេះ'])) {
            if (! $isLinked) {
                TelegramService::sendTelegramMessage($token, (string) $chatId, "⚠️ សូមភ្ជាប់ Chat នេះជាមួយហាងជាមុនសិន ដោយផ្ញើ៖\n<code>LINK &lt;Profile_ID&gt; &lt;Token&gt;</code>");
                return response()->json(['ok' => true]);
            }
            $salesService = app(SalesReportService::class);
            $report = $salesService->getWeeklyReport($shop, null, 'kh');
            TelegramService::sendTelegramMessage($token, (string) $chatId, $report['html'], $reportKeyboard);

            return response()->json(['ok' => true]);
        }

        // 10. /monthly command (Monthly Sales Report - 30 Days)
        if (in_array($cleanCommand, ['/monthly', 'monthly', 'ប្រចាំខែ', '៣០ថ្ងៃ', '30days', '/30days', '/month', 'month', 'ខែនេះ'])) {
            if (! $isLinked) {
                TelegramService::sendTelegramMessage($token, (string) $chatId, "⚠️ សូមភ្ជាប់ Chat នេះជាមួយហាងជាមុនសិន ដោយផ្ញើ៖\n<code>LINK &lt;Profile_ID&gt; &lt;Token&gt;</code>");
                return response()->json(['ok' => true]);
            }
            $salesService = app(SalesReportService::class);
            $report = $salesService->getMonthlyReport($shop, null, 'kh');
            TelegramService::sendTelegramMessage($token, (string) $chatId, $report['html'], $reportKeyboard);

            return response()->json(['ok' => true]);
        }

        // 11. /help command
        if (in_array($cleanCommand, ['/help', 'help', '/about', 'about', 'ជំនួយ', '/info', 'info'])) {
            $helpMsg = "🤖 <b>បញ្ជីពាក្យបញ្ជា Telegram Bot / Available Commands</b>\n".
                       "━━━━━━━━━━━━━━━━━━━━\n".
                       "📊 <b>របាយការណ៍ការលក់ (Reports):</b>\n".
                       "• <b>/today</b> (ឬ <b>ថ្ងៃនេះ</b>) — របាយការណ៍លក់ប្រចាំថ្ងៃ\n".
                       "• <b>/weekly</b> (ឬ <b>៧ថ្ងៃ</b>, <b>ប្រចាំសប្តាហ៍</b>) — របាយការណ៍ ៧ ថ្ងៃ\n".
                       "• <b>/monthly</b> (ឬ <b>៣០ថ្ងៃ</b>, <b>ប្រចាំខែ</b>) — របាយការណ៍ ៣០ ថ្ងៃ\n".
                       "• <b>/report</b> (ឬ <b>របាយការណ៍</b>) — បើក Menu ជ្រើសរើសរបាយការណ៍\n\n".
                       "⚙️ <b>ការគ្រប់គ្រង (Management):</b>\n".
                       "• <b>/start</b> — ពិនិត្យស្ថានភាពការភ្ជាប់\n".
                       "• <b>/help</b> — បង្ហាញជំនួយពាក្យបញ្ជានេះ\n".
                       "• <code>LINK &lt;Profile_ID&gt; &lt;Token&gt;</code> — ភ្ជាប់គណនី Telegram\n".
                       "━━━━━━━━━━━━━━━━━━━━\n".
                       "✨ <i>ប្រព័ន្ធគ្រប់គ្រងការលក់ Nexa Commerce KH</i>";
            TelegramService::sendTelegramMessage($token, (string) $chatId, $helpMsg, $reportKeyboard);

            return response()->json(['ok' => true]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Generate a cryptographically secure, temporary, single-use linking token.
     */
    public function generateLinkingToken(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user->shop_id);
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        // Rate limit: max 5 tokens per 10 minutes per shop
        $rateKey = 'gen_tg_token:'.$shopId;
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            $sec = RateLimiter::availableIn($rateKey);
            throw new HttpException(429, "Too many token generation attempts. Please wait {$sec} seconds.");
        }
        RateLimiter::hit($rateKey, 600);

        $tokenData = TelegramLinkingToken::createToken($shopId, $user->id, 15);
        $tg = TelegramService::ensureShopProfile($shop);
        $profileId = $tg['profile_id'];
        $botUsername = trim($tg['bot_token'] ?? '') ? TelegramService::getBotUsername($tg['bot_token']) : null;

        ActivityLog::create([
            'shop_id' => $shopId,
            'user_id' => $user->id,
            'username' => $user->username,
            'action' => 'telegram_linking_token_generated',
            'description' => "Generated temporary Telegram linking token (Expires in 15 mins)",
        ]);

        return response()->json([
            'ok' => true,
            'token' => $tokenData['token'],
            'expires_at' => $tokenData['expires_at'],
            'expires_in_seconds' => $tokenData['expires_in_seconds'],
            'profile_id' => $profileId,
            'command' => "LINK {$profileId} {$tokenData['token']}",
            'deep_link' => $botUsername ? "https://t.me/{$botUsername}?start=link_{$tokenData['token']}" : null,
        ]);
    }

    /**
     * Disconnect / Unlink a Telegram Chat ID from merchant shop.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user->shop_id);
        $chatId = $request->input('chat_id');
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $tg = $shop->telegram_dict();
        $chats = array_values(array_filter($tg['linked_chats'] ?? [], fn ($c) => (string) $c !== (string) $chatId));
        $accounts = array_values(array_filter($tg['linked_accounts'] ?? [], fn ($a) => (string) ($a['chat_id'] ?? '') !== (string) $chatId));

        $tg['linked_chats'] = $chats;
        $tg['linked_accounts'] = $accounts;

        // If no more linked chats and chat_id matches default, clean it up
        if ((string) ($tg['chat_id'] ?? '') === (string) $chatId) {
            $tg['chat_id'] = ! empty($chats) ? (string) $chats[0] : '';
        }

        $shop->telegram_settings = json_encode($tg, JSON_UNESCAPED_UNICODE);
        $shop->save();

        ActivityLog::create([
            'shop_id' => $shopId,
            'user_id' => $user->id,
            'username' => $user->username,
            'action' => 'telegram_account_disconnected',
            'description' => "Disconnected Telegram Chat ID {$chatId} from shop",
        ]);

        return response()->json([
            'ok' => true,
            'detail' => 'Telegram account disconnected successfully.',
            'linked_chats' => $tg['linked_chats'],
            'linked_accounts' => $this->formatLinkedAccounts($tg['linked_accounts'] ?? []),
        ]);
    }

    /**
     * Update notification preferences for the merchant's Telegram bot.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user->shop_id);
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $preferences = $request->input('preferences', []);
        $tg = $shop->telegram_dict();

        $existingPrefs = $tg['notification_preferences'] ?? [];
        $mergedPrefs = array_merge([
            'daily_report_enabled' => true,
            'weekly_report_enabled' => true,
            'monthly_report_enabled' => true,
            'order_alerts_enabled' => true,
            'payment_alerts_enabled' => true,
            'stock_alerts_enabled' => true,
        ], $existingPrefs, $preferences);

        $tg['notification_preferences'] = $mergedPrefs;
        $shop->telegram_settings = json_encode($tg, JSON_UNESCAPED_UNICODE);
        $shop->save();

        return response()->json([
            'ok' => true,
            'preferences' => $mergedPrefs,
        ]);
    }

    /**
     * Get shop Telegram settings, connection details, linked accounts, and preferences.
     */
    public function settings(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user->shop_id);
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $tg = TelegramService::ensureShopProfile($shop);
        $botToken = trim($tg['bot_token'] ?? '');

        // Fetch active token if any
        $activeTokenRecord = TelegramLinkingToken::where('shop_id', $shop->id)
            ->active()
            ->latest('id')
            ->first();

        $activeTokenData = $activeTokenRecord ? [
            'expires_at' => $activeTokenRecord->expires_at->toIso8601String(),
            'seconds_remaining' => max(0, Carbon::now()->diffInSeconds($activeTokenRecord->expires_at, false)),
        ] : null;

        $linkedAccounts = $this->formatLinkedAccounts($tg['linked_accounts'] ?? [], $tg['linked_chats'] ?? []);

        return response()->json([
            'bot_token' => $botToken,
            'chat_id' => $tg['chat_id'] ?? '',
            'enabled' => ! empty($tg['enabled']),
            'profile_id' => $tg['profile_id'] ?? '',
            'secret_key' => $tg['secret_key'] ?? '',
            'linked_chats' => $tg['linked_chats'] ?? [],
            'linked_accounts' => $linkedAccounts,
            'notification_preferences' => $tg['notification_preferences'] ?? [
                'daily_report_enabled' => true,
                'weekly_report_enabled' => true,
                'monthly_report_enabled' => true,
                'order_alerts_enabled' => true,
                'payment_alerts_enabled' => true,
                'stock_alerts_enabled' => true,
            ],
            'active_token' => $activeTokenData,
            'bot_username' => $botToken ? TelegramService::getBotUsername($botToken) : null,
        ]);
    }

    /**
     * Format and mask linked account details safely.
     */
    protected function formatLinkedAccounts(array $accounts, array $legacyChats = []): array
    {
        $result = [];
        $recordedChatIds = [];

        foreach ($accounts as $acc) {
            $cid = (string) ($acc['chat_id'] ?? '');
            if (! $cid) {
                continue;
            }
            $recordedChatIds[] = $cid;
            $result[] = [
                'chat_id' => $cid,
                'masked_chat_id' => self::maskChatId($cid),
                'telegram_user_id' => $acc['telegram_user_id'] ?? null,
                'username' => $acc['username'] ?? null,
                'first_name' => $acc['first_name'] ?? null,
                'linked_at' => $acc['linked_at'] ?? null,
            ];
        }

        // Include any legacy chats not yet in accounts
        foreach ($legacyChats as $cid) {
            $sCid = (string) $cid;
            if (! in_array($sCid, $recordedChatIds)) {
                $result[] = [
                    'chat_id' => $sCid,
                    'masked_chat_id' => self::maskChatId($sCid),
                    'telegram_user_id' => null,
                    'username' => null,
                    'first_name' => null,
                    'linked_at' => null,
                ];
            }
        }

        return $result;
    }

    /**
     * Mask chat ID for display: e.g. -100123456789 -> -100****6789
     */
    public static function maskChatId(string|int $chatId): string
    {
        $s = (string) $chatId;
        $len = strlen($s);
        if ($len <= 5) {
            return $s;
        }

        $prefix = substr($s, 0, str_starts_with($s, '-') ? 4 : 3);
        $suffix = substr($s, -4);

        return $prefix.'****'.$suffix;
    }

    /**
     * Test connection message sender.
     */
    public function test(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user->shop_id);
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $token = trim($request->input('bot_token') ?: '');
        $chatId = trim($request->input('chat_id') ?: '');

        if (! $token || ! $chatId) {
            $tg = $shop->telegram_dict();
            $token = $token ?: trim($tg['bot_token'] ?? '');
            $chatId = $chatId ?: trim($tg['chat_id'] ?? '');
            if (! $chatId && ! empty($tg['linked_chats'])) {
                $chatId = (string) $tg['linked_chats'][0];
            }
        }

        $shopName = mb_strtoupper($shop->shop_name ?: $shop->username, 'UTF-8');
        $now = date('d-m-Y H:i:s');
        $botUsername = $token ? ('@'.(TelegramService::getBotUsername($token) ?: 'nexacommercekh_bot')) : '@nexacommercekh_bot';

        $defaultMessage = "🏪 <b>{$shopName}</b>\n".
            "━━━━━━━━━━━━━━━━━━━━\n".
            "🎉 <b>ការតភ្ជាប់ TELEGRAM BOT ជោគជ័យ!</b>\n".
            "<i>Telegram Bot Connected Successfully</i>\n\n".
            "📅 <b>កាលបរិច្ឆេទ:</b> {$now}\n".
            "🤖 <b>Bot Name:</b> {$botUsername}\n".
            "⚡ <b>ស្ថានភាពប្រព័ន្ធ:</b> ដំណើរការល្អ (Active & Online)\n".
            "🔔 <b>មុខងារដំណឹង:</b> វិក្កយបត្រ, ការបង់ប្រាក់ KHQR, និងរបាយការណ៍លក់\n".
            "━━━━━━━━━━━━━━━━━━━━\n".
            "✨ <i>ប្រព័ន្ធគ្រប់គ្រងការលក់ Nexa Commerce KH សូមអរគុណ!</i>";

        $message = $request->input('message') ?: $defaultMessage;

        if ($token && $chatId) {
            $result = TelegramService::sendTelegramMessageWithDetail($token, $chatId, $message);
            if (! $result['ok']) {
                throw new HttpException(400, $result['error'] ?? 'Could not send test message.');
            }
            return response()->json(['ok' => true, 'detail' => 'Test message sent!']);
        }

        $ok = TelegramService::sendShopNotification($shop, $message);

        if (! $ok) {
            throw new HttpException(400, 'Could not send test message. Check bot token and ensure the bot has been started.');
        }

        return response()->json(['ok' => true, 'detail' => 'Test message sent!']);
    }

    public function profile(Request $request, int $shopId)
    {
        $user = $request->user();
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $tg = TelegramService::ensureShopProfile($shop);
        $botToken = trim($tg['bot_token'] ?? '');

        return response()->json([
            'shop_id' => $shop->id,
            'profile_id' => $tg['profile_id'] ?? null,
            'secret_key' => $tg['secret_key'] ?? null,
            'bot_username' => $botToken ? TelegramService::getBotUsername($botToken) : null,
            'linked_chats' => $tg['linked_chats'] ?? [],
        ]);
    }

    public function linkChat(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id');
        $chatId = $request->input('chat_id');
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $tg = $shop->telegram_dict();
        $chats = $tg['linked_chats'] ?? [];
        if (! in_array($chatId, $chats)) {
            $chats[] = $chatId;
            $tg['linked_chats'] = $chats;
            $shop->telegram_settings = json_encode($tg, JSON_UNESCAPED_UNICODE);
            $shop->save();
        }

        return response()->json(['ok' => true, 'linked_chats' => $tg['linked_chats']]);
    }

    public function unlinkChat(Request $request)
    {
        return $this->disconnect($request);
    }

    public function setWebhook(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id');
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $tg = TelegramService::ensureShopProfile($shop);
        $botToken = trim($tg['bot_token'] ?? '');
        if (! $botToken) {
            throw new HttpException(400, 'Bot token is not configured');
        }

        $baseUrl = config('app.url');
        $webhookUrl = "{$baseUrl}/api/telegram/webhook/{$botToken}";

        try {
            $resp = Http::timeout(20)->post("https://api.telegram.org/bot{$botToken}/setWebhook", [
                'url' => $webhookUrl,
                'allowed_updates' => ['message', 'callback_query', 'my_chat_member'],
            ]);
            $data = $resp->json() ?? [];
        } catch (\Exception $e) {
            throw new HttpException(500, 'Could not reach Telegram: '.$e->getMessage());
        }

        if (empty($data['ok'])) {
            throw new HttpException(400, $data['description'] ?? 'setWebhook failed');
        }

        return response()->json([
            'ok' => true,
            'detail' => 'Webhook registered. Users can now start the bot and link your shop.',
            'profile_id' => $tg['profile_id'] ?? null,
            'secret_key' => $tg['secret_key'] ?? null,
            'webhook_url' => $webhookUrl,
            'linked_chats' => $tg['linked_chats'] ?? [],
        ]);
    }

    public function sendStockAlert(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id');
        ShopHelper::requireShopAccess($shopId, $user);

        $shop = Shop::find($shopId);
        if (! $shop) {
            throw new HttpException(404, 'Shop not found');
        }

        $ok = StockService::sendLowStockAlerts($shop);
        if (! $ok) {
            throw new HttpException(400, 'No low-stock items, or the bot token / chat ID is not configured in Telegram Settings');
        }

        return response()->json(['ok' => true, 'detail' => 'Low-stock alert sent to your Telegram group']);
    }

    public function logs(Request $request)
    {
        $user = $request->user();
        $shopId = $request->input('shop_id', $user->shop_id);
        if ($shopId) {
            ShopHelper::requireShopAccess((int) $shopId, $user);
            $logs = ActivityLog::where('shop_id', (int) $shopId)->orderBy('id', 'desc')->take(50)->get();
        } else {
            if ($user->role !== 'admin') {
                throw new HttpException(403, 'Admin privileges required');
            }
            $logs = ActivityLog::orderBy('id', 'desc')->take(50)->get();
        }

        return response()->json($logs->map(fn ($l) => $l->to_dict())->toArray());
    }

    public function listActivity(Request $request)
    {
        $user = $request->user();
        $shopId = $request->filled('shop_id') ? (int) $request->input('shop_id') : null;
        $username = trim((string) $request->input('username', ''));
        $action = trim((string) $request->input('action', ''));
        $status = trim((string) $request->input('status', ''));
        $search = trim((string) $request->input('search', ''));
        $limit = min(500, max(1, (int) $request->input('limit', 100)));

        $q = ActivityLog::query();
        if ($user->role !== 'admin') {
            $q->where('shop_id', $user->shop_id);
        } elseif ($shopId !== null) {
            $q->where('shop_id', $shopId);
        }

        if ($username) {
            $q->where('username', 'like', "%{$username}%");
        }
        if ($action && $action !== 'all') {
            $q->where('action', $action);
        }
        if ($status && $status !== 'all') {
            $q->where('status', $status);
        }
        if ($search) {
            $q->where(function ($sub) use ($search) {
                $sub->where('description', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $logs = $q->orderBy('id', 'desc')->limit($limit)->get();

        return response()->json($logs->map(fn ($l) => $l->to_dict())->toArray());
    }

    // =========================================================================
    // Bot-Service Dedicated Endpoints (for backend/nckhtelegrambot worker)
    // =========================================================================

    /**
     * Link Telegram chat via Bot-Service daemon.
     */
    public function botServiceLink(Request $request): JsonResponse
    {
        $profileId = trim((string) $request->input('profile_id'));
        $secretKey = trim((string) $request->input('secret_key'));
        $chatId = trim((string) $request->input('chat_id'));
        $userMeta = $request->input('user_info', []);

        if (! $profileId || ! $secretKey || ! $chatId) {
            return response()->json(['ok' => false, 'detail' => 'Profile ID, Secret Key / Token, and Chat ID are required.'], 400);
        }

        $matchedShop = null;
        $candidates = Shop::where('telegram_settings', 'like', "%{$profileId}%")->get();
        foreach ($candidates as $s) {
            $sTg = $s->telegram_dict();
            if (($sTg['profile_id'] ?? '') === $profileId) {
                $matchedShop = $s;
                break;
            }
        }

        if (! $matchedShop) {
            return response()->json(['ok' => false, 'detail' => 'Profile ID មិនត្រឹមត្រូវទេ។'], 404);
        }

        // Verify token or secret key
        $tokenValid = TelegramLinkingToken::verifyAndConsume($matchedShop->id, $secretKey);
        if (! $tokenValid) {
            $mTg = $matchedShop->telegram_dict();
            if (($mTg['secret_key'] ?? '') === $secretKey) {
                $tokenValid = true;
            }
        }

        if (! $tokenValid) {
            return response()->json(['ok' => false, 'detail' => 'Linking Token មិនត្រឹមត្រូវ ឬបានផុតកំណត់ (សុពលភាព ១៥ នាទី)។'], 400);
        }

        // Unlink chat from any other shops
        $otherShops = Shop::where('id', '!=', $matchedShop->id)
            ->where('telegram_settings', 'like', "%{$chatId}%")
            ->get();
        foreach ($otherShops as $oShop) {
            $oTg = $oShop->telegram_dict();
            $oChats = array_values(array_filter($oTg['linked_chats'] ?? [], fn ($c) => (string) $c !== (string) $chatId));
            $oAccounts = array_values(array_filter($oTg['linked_accounts'] ?? [], fn ($a) => (string) ($a['chat_id'] ?? '') !== (string) $chatId));
            $oTg['linked_chats'] = $oChats;
            $oTg['linked_accounts'] = $oAccounts;
            $oShop->telegram_settings = json_encode($oTg, JSON_UNESCAPED_UNICODE);
            $oShop->save();
        }

        $mTg = $matchedShop->telegram_dict();
        $chats = array_map('strval', $mTg['linked_chats'] ?? []);
        if (! in_array($chatId, $chats)) {
            $chats[] = $chatId;
            $mTg['linked_chats'] = $chats;
        }

        $accounts = $mTg['linked_accounts'] ?? [];
        $accounts = array_values(array_filter($accounts, fn ($a) => (string) ($a['chat_id'] ?? '') !== (string) $chatId));
        $accounts[] = [
            'chat_id' => $chatId,
            'telegram_user_id' => $userMeta['id'] ?? null,
            'username' => $userMeta['username'] ?? null,
            'first_name' => $userMeta['first_name'] ?? null,
            'linked_at' => Carbon::now()->toIso8601String(),
        ];
        $mTg['linked_accounts'] = $accounts;
        $mTg['enabled'] = true;

        $matchedShop->telegram_settings = json_encode($mTg, JSON_UNESCAPED_UNICODE);
        $matchedShop->save();

        return response()->json([
            'ok' => true,
            'shop_name' => $matchedShop->shop_name ?: $matchedShop->username,
            'shop_id' => $matchedShop->id,
            'linked_chats' => $mTg['linked_chats'],
        ]);
    }

    /**
     * Provide Sales Report on demand for the bot service.
     */
    public function botServiceReport(Request $request): JsonResponse
    {
        $shopId = (int) $request->input('shop_id');
        $chatId = trim((string) $request->input('chat_id'));
        $period = trim((string) $request->input('period', 'daily'));

        $shop = Shop::find($shopId);
        if (! $shop) {
            return response()->json(['ok' => false, 'error' => 'Shop not found'], 404);
        }

        $tg = $shop->telegram_dict();
        $linkedChats = array_map('strval', $tg['linked_chats'] ?? []);

        if ($chatId && ! in_array($chatId, $linkedChats)) {
            return response()->json(['ok' => false, 'error' => 'Unauthorized chat ID'], 403);
        }

        $salesService = app(SalesReportService::class);
        $report = match ($period) {
            'weekly', '7', '7days' => $salesService->getWeeklyReport($shop, null, 'kh'),
            'monthly', '30', '30days' => $salesService->getMonthlyReport($shop, null, 'kh'),
            default => $salesService->getDailyReport($shop, null, 'kh'),
        };

        return response()->json([
            'ok' => true,
            'report' => $report,
        ]);
    }

    /**
     * List all connected shops for the bot worker long-polling daemon.
     */
    public function botServiceConfig(): JsonResponse
    {
        $shops = Shop::where('status', 'active')->get();
        $list = [];

        foreach ($shops as $s) {
            $tg = $s->telegram_dict();
            $token = trim($tg['bot_token'] ?? '');
            if ($token && ! empty($tg['enabled'])) {
                $list[] = [
                    'shop_id' => $s->id,
                    'shop_name' => $s->shop_name ?: $s->username,
                    'username' => $s->username,
                    'bot_token' => $token,
                    'profile_id' => $tg['profile_id'] ?? null,
                    'linked_chats' => $tg['linked_chats'] ?? [],
                ];
            }
        }

        return response()->json(['ok' => true, 'shops' => $list]);
    }
}

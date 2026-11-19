<?php

namespace App\Actions\Telegram;

use App\Services\CoreApi\CoreApiService;
use App\Services\Telegram\TelegramApiService;
use App\Services\Telegram\TelegramKeyboardService;

class HandlePaymentAction
{
    public function __construct(
        protected TelegramApiService $apiService,
        protected TelegramKeyboardService $keyboardService,
        protected CoreApiService $coreApiService
    ) {}

    /**
     * Execute payment details or linking action.
     */
    public function execute(
        string|int $chatId,
        ?string $arguments = null,
        ?array $shop = null,
        ?string $botToken = null
    ): bool {
        $args = trim($arguments ?? '');

        // Check if linking command: /link <profile_id> <secret_key>
        if (!empty($args) && str_contains($args, ' ')) {
            return $this->handleLinkAccount($chatId, $args, $botToken);
        }

        return $this->handlePaymentInformation($chatId, $shop, $botToken);
    }

    /**
     * Handle shop owner account linking for real-time payment alerts and sales reports.
     */
    public function handleLinkAccount(string|int $chatId, string $arguments, ?string $botToken, array $userMeta = []): bool
    {
        $parts = preg_split('/\s+/', trim($arguments));

        if (count($parts) < 2) {
            $msg = "⚠️ <b>របៀបភ្ជាប់ Telegram ទទួលដំណឹងបង់ប្រាក់ និងរបាយការណ៍៖</b>\n\n"
                . "សូមផ្ញើតាមទម្រង់៖\n"
                . "<code>/link &lt;Profile_ID&gt; &lt;Linking_Token&gt;</code>\n\n"
                . "💡 លោកអ្នកអាចបង្កើត Linking Token នៅក្នុង <b>Merchant Dashboard → Settings → Telegram Bot</b> ។";

            return (bool) $this->apiService->sendMessage($chatId, $msg, null, 'HTML', $botToken);
        }

        $profileId = $parts[0];
        $secretKey = $parts[1];

        $res = $this->coreApiService->linkPaymentChat($profileId, $secretKey, $chatId, $userMeta);

        if (!empty($res['ok'])) {
            $shopName = htmlspecialchars($res['shop_name'] ?? $res['shop_username'] ?? 'ហាងរបស់អ្នក', ENT_QUOTES, 'UTF-8');
            $reply = "✅ <b>ភ្ជាប់ជោគជ័យ! / LINKED SUCCESSFULLY</b>\n\n"
                . "Chat នេះត្រូវបានភ្ជាប់ទៅកាន់ <b>{$shopName}</b> ដោយជោគជ័យ។\n\n"
                . "🔔 <b>មុខងារដំណើរការ៖</b>\n"
                . "• ទទួលដំណឹងភ្លាមៗពេលមានការកុម្ម៉ង់ថ្មី និងការបង់ប្រាក់ KHQR\n"
                . "• មើលរបាយការណ៍លក់បានគ្រប់ពេល (/today, /weekly, /monthly)\n\n"
                . "សូមជ្រើសរើសរបាយការណ៍ដែលលោកអ្នកចង់ពិនិត្យមើល៖";

            $reportKeyboard = $this->keyboardService->buildInlineKeyboard([
                [
                    ['text' => '📊 ថ្ងៃនេះ (Today)', 'callback_data' => 'report_today'],
                    ['text' => '📅 ៧ ថ្ងៃ (Weekly)', 'callback_data' => 'report_weekly'],
                ],
                [
                    ['text' => '🗓️ ៣០ ថ្ងៃ (Monthly)', 'callback_data' => 'report_monthly'],
                ],
            ]);

            return (bool) $this->apiService->sendMessage($chatId, $reply, $reportKeyboard, 'HTML', $botToken);
        } else {
            $detail = htmlspecialchars($res['detail'] ?? 'Profile ID ឬ Secret Key មិនត្រឹមត្រូវទេ។', ENT_QUOTES, 'UTF-8');
            $reply = "❌ <b>ភ្ជាប់មិនបានសម្រេច!</b>\n\n{$detail}\n\n"
                . "សូមពិនិត្យមើល Profile ID និង Linking Token នៅក្នុង Merchant Dashboard ឡើងវិញ។";

            return (bool) $this->apiService->sendMessage($chatId, $reply, null, 'HTML', $botToken);
        }
    }

    /**
     * Display payment options and supported methods.
     */
    public function handlePaymentInformation(string|int $chatId, ?array $shop = null, ?string $botToken = null): bool
    {
        $shopName = htmlspecialchars($shop['shop_name'] ?? $shop['username'] ?? 'Nexa Commerce KH');

        $text = "💳 <b>វិធីសាស្រ្តទូទាត់ប្រាក់ (Payment Options)</b>\n\n"
            . "ហាង <b>{$shopName}</b> គាំទ្រការទូទាត់ប្រាក់ឌីជីថលតាម៖\n\n"
            . "• <b>ABA Pay (KHQR)</b> - ស្កេនទូទាត់រហ័សទាន់ចិត្តតាមកម្មវិធី ABA Mobile ឬគ្រប់ធនាគារក្នុងប្រទេសកម្ពុជា\n"
            . "• <b>Bakong KHQR</b> - គាំទ្រទាំងប្រាក់រៀល (KHR) និងដុល្លារ (USD)\n"
            . "• <b>សាច់ប្រាក់ផ្ទាល់ (Cash on Delivery)</b>\n\n"
            . "🔒 <i>រាល់ការទូទាត់ទាំងអស់មានសុវត្ថិភាពខ្ពស់ និងផ្ទៀងផ្ទាត់ដោយស្វ័យប្រវត្តិតាមរយៈប្រព័ន្ធ ABA API Gateway។</i>";

        $keyboard = $this->keyboardService->buildInlineKeyboard([
            [
                [
                    'text' => '🔙 ត្រឡប់ទៅមេម៉ឺនុយ / Main Menu',
                    'callback_data' => 'main_menu',
                ],
            ],
        ]);

        return (bool) $this->apiService->sendMessage(
            $chatId,
            $text,
            $keyboard,
            'HTML',
            $botToken
        );
    }
}

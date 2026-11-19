<?php

namespace App\Services\Telegram;

use App\Models\Order;
use App\Models\Shop;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TelegramService
{
    public static function sendTelegramMessage(string $botToken, string $chatId, string $text, ?array $replyMarkup = null): bool
    {
        $res = self::sendTelegramMessageWithDetail($botToken, $chatId, $text, $replyMarkup);
        return $res['ok'] ?? false;
    }

    public static function sendTelegramMessageWithDetail(string $botToken, string $chatId, string $text, ?array $replyMarkup = null): array
    {
        if (empty($botToken) || empty($chatId)) {
            return ['ok' => false, 'error' => 'Bot token and Chat ID are required.'];
        }

        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ];
        if (! empty($replyMarkup)) {
            $payload['reply_markup'] = $replyMarkup;
        }

        // Try 1: HTML parse mode
        try {
            $resp = Http::timeout(15)->post($url, $payload);
            if ($resp->successful() && ($resp->json('ok') === true)) {
                return ['ok' => true];
            }
            $desc = $resp->json('description');
            if ($desc) {
                return ['ok' => false, 'error' => $desc];
            }
        } catch (Exception $e) {
            // fallback to plain text below
        }

        // Try 2: Plain text fallback
        try {
            $payload['text'] = strip_tags($text);
            unset($payload['parse_mode']);
            $resp = Http::timeout(15)->post($url, $payload);

            if ($resp->successful() && ($resp->json('ok') === true)) {
                return ['ok' => true];
            }
            $desc = $resp->json('description');
            return ['ok' => false, 'error' => $desc ?: 'Telegram request failed.'];
        } catch (Exception $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    public static function answerCallbackQuery(string $botToken, string $callbackQueryId, ?string $text = null): bool
    {
        if (empty($botToken) || empty($callbackQueryId)) {
            return false;
        }
        try {
            $payload = ['callback_query_id' => $callbackQueryId];
            if ($text) {
                $payload['text'] = $text;
            }
            $resp = Http::timeout(5)->post("https://api.telegram.org/bot{$botToken}/answerCallbackQuery", $payload);
            return $resp->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    public static function getBotUsername(string $botToken): ?string
    {
        if (empty($botToken)) {
            return null;
        }
        try {
            $resp = Http::timeout(10)->get("https://api.telegram.org/bot{$botToken}/getMe");
            if ($resp->successful()) {
                return $resp->json('result.username');
            }
        } catch (Exception $e) {
            return null;
        }

        return null;
    }

    public static function getWebhookInfo(string $botToken): array
    {
        if (empty($botToken)) {
            return [];
        }
        try {
            $resp = Http::timeout(10)->get("https://api.telegram.org/bot{$botToken}/getWebhookInfo");

            return $resp->json() ?? [];
        } catch (Exception $e) {
            return [];
        }
    }

    public static function setWebhook(string $botToken, string $url): array
    {
        if (empty($botToken)) {
            return [];
        }
        try {
            $resp = Http::timeout(10)->post("https://api.telegram.org/bot{$botToken}/setWebhook", [
                'url' => $url,
            ]);

            return $resp->json() ?? [];
        } catch (Exception $e) {
            return [];
        }
    }

    public static function verifyTelegramLogin(string $botToken, array $data): bool
    {
        $hash = $data['hash'] ?? '';
        if (empty($hash)) {
            return false;
        }

        $checkData = [];
        foreach ($data as $k => $v) {
            if ($k !== 'hash' && $k !== 'shop_id' && $v !== null && $v !== '') {
                $checkData[] = "{$k}={$v}";
            }
        }
        sort($checkData);
        $dataCheckString = implode("\n", $checkData);

        $secretKey = hash('sha256', $botToken, true);
        $computedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (! hash_equals($computedHash, $hash)) {
            return false;
        }

        $authDate = (int) ($data['auth_date'] ?? 0);
        if ($authDate > 0 && (time() - $authDate) > 86400) {
            return false; // older than 24h
        }

        return true;
    }

    public static function ensureShopProfile(Shop $shop): array
    {
        $tg = $shop->telegram_dict();
        $changed = false;

        if (empty($tg['profile_id'])) {
            $tg['profile_id'] = 'SHOP'.$shop->id.'-'.strtoupper(Str::random(8));
            $changed = true;
        }
        if (empty($tg['secret_key'])) {
            $tg['secret_key'] = Str::random(16);
            $changed = true;
        }
        if (! isset($tg['linked_chats']) || ! is_array($tg['linked_chats'])) {
            $tg['linked_chats'] = [];
            $changed = true;
        }

        if ($changed) {
            $shop->telegram_settings = json_encode($tg, JSON_UNESCAPED_UNICODE);
            $shop->save();
        }

        return $tg;
    }

    public static function sendShopNotification(Shop $shop, string $text, ?array $replyMarkup = null): bool
    {
        $tg = $shop->telegram_dict();
        $botToken = trim($tg['bot_token'] ?? '');
        if (empty($botToken)) {
            return false;
        }

        $chatIds = [];
        if (! empty($tg['chat_id'])) {
            $chatIds[] = (string) $tg['chat_id'];
        }
        foreach ($tg['linked_chats'] ?? [] as $c) {
            if (! empty($c)) {
                $chatIds[] = (string) $c;
            }
        }
        $chatIds = array_unique($chatIds);

        $sent = false;
        foreach ($chatIds as $cid) {
            if (self::sendTelegramMessage($botToken, $cid, $text, $replyMarkup)) {
                $sent = true;
            }
        }

        return $sent;
    }

    public static function sendVerificationCode(string $botToken, $chatId, string $code): bool
    {
        $text = "🔐 <b>លេខកូដផ្ទៀងផ្ទាត់ (Verification Code):</b>\n\n".
                "<code>{$code}</code>\n\n".
                'លេខកូដនេះមានសុពលភាពរយៈពេល ៥ នាទី។ សូមកុំចែករំលែកលេខកូដនេះទៅកាន់អ្នកដទៃ។';

        return self::sendTelegramMessage($botToken, (string) $chatId, $text);
    }

    public static function notifyShopNewOrder(Shop $shop, string $orderNumber, float $amount, string $currency, string $customerName): bool
    {
        $formattedAmount = number_format($amount, 2);
        $shopName = mb_strtoupper($shop->shop_name ?: $shop->username, 'UTF-8');
        $now = date('d-m-Y H:i:s');
        $text = "🏪 <b>{$shopName}</b>\n".
                "━━━━━━━━━━━━━━━━━━━━\n".
                "🛒 <b>មានការកុម្ម៉ង់ទំនិញថ្មី / NEW ORDER</b>\n".
                "━━━━━━━━━━━━━━━━━━━━\n".
                "🧾 <b>លេខវិក្កយបត្រ:</b> <code>#{$orderNumber}</code>\n".
                "📅 <b>កាលបរិច្ឆេទ:</b> {$now}\n".
                "💰 <b>ទឹកប្រាក់សរុប:</b> <b>\${$formattedAmount} {$currency}</b>\n".
                "👤 <b>អតិថិជន:</b> {$customerName}\n".
                "━━━━━━━━━━━━━━━━━━━━\n".
                "🔔 <i>សូមចូលទៅកាន់ផ្ទាំងគ្រប់គ្រងការលក់ ដើម្បីពិនិត្យមើល!</i>";

        return self::sendShopNotification($shop, $text);
    }

    public static function notifyShopPaymentSuccessFull(Shop $shop, Order $order, ?array $stockSummary = null): bool
    {
        $formattedAmount = number_format((float) $order->total, 2);
        $shopName = mb_strtoupper($shop->shop_name ?: $shop->username, 'UTF-8');
        $customerName = $order->customer_name ?: 'អតិថិជនទូទៅ';
        $customerPhone = $order->customer_phone ?: '-';
        $customerAddress = $order->customer_address ?: '-';
        $now = date('d-m-Y H:i:s');
        $paymentMethod = strtoupper($order->payment_method ?: 'KHQR');

        $khrRate = $shop->theme_dict()['exchange_rate_khr'] ?? 4100;
        $khrAmount = number_format((float) $order->total * $khrRate, 0);

        $lines = [
            "🏪 <b>{$shopName}</b>",
            "━━━━━━━━━━━━━━━━━━━━",
            "🎉 <b>ការទូទាត់ប្រាក់ជោគជ័យ / PAYMENT SUCCESS</b>",
            "━━━━━━━━━━━━━━━━━━━━",
            "🧾 <b>លេខវិក្កយបត្រ:</b> <code>#{$order->order_number}</code>",
            "📅 <b>កាលបរិច្ឆេទ:</b> {$now}",
            "💳 <b>វិធីសាស្ត្រទូទាត់:</b> {$paymentMethod}",
            "💰 <b>ទឹកប្រាក់សរុប:</b> <b>\${$formattedAmount}</b> (៛{$khrAmount})",
            "",
            "👤 <b>ព័ត៌មានអតិថិជន:</b>",
            "• ឈ្មោះ: {$customerName}",
            "• ទូរស័ព្ទ: {$customerPhone}",
            "• អាសយដ្ឋាន: {$customerAddress}",
            "",
            "📦 <b>មុខទំនិញដែលបានកុម្ម៉ង់:</b>",
        ];

        foreach ($order->items as $item) {
            $vars = $item->getVariationsDict();
            $varStr = '';
            if (! empty($vars)) {
                $varParts = [];
                foreach ($vars as $k => $v) {
                    $varParts[] = "{$k}: {$v}";
                }
                $varStr = ' ('.implode(', ', $varParts).')';
            }

            $deductInfo = '';
            if ($stockSummary && isset($stockSummary[$item->product_id])) {
                $rem = $stockSummary[$item->product_id]['remaining'] ?? null;
                if ($rem !== null) {
                    $deductInfo = " [ស្តុកនៅសល់: {$rem}]";
                }
            }

            $itemPrice = number_format((float) $item->price, 2);
            $lines[] = "• <b>{$item->product_name}</b>{$varStr} x{$item->quantity} — \${$itemPrice}{$deductInfo}";
        }

        $lines[] = "━━━━━━━━━━━━━━━━━━━━";
        $lines[] = "⚡ <i>សូមរៀបចំទំនិញជូនអតិថិជនឱ្យបានឆាប់រហ័ស!</i>";

        return self::sendShopNotification($shop, implode("\n", $lines));
    }
}

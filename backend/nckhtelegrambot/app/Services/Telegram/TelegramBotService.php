<?php

namespace App\Services\Telegram;

use App\Actions\Telegram\HandleMenuAction;
use App\Actions\Telegram\HandleOrderAction;
use App\Actions\Telegram\HandlePaymentAction;
use App\Actions\Telegram\HandleReportAction;
use App\Actions\Telegram\HandleStartAction;
use App\Enums\TelegramUpdateType;
use Illuminate\Support\Facades\Log;

class TelegramBotService
{
    public function __construct(
        protected TelegramApiService $apiService,
        protected HandleStartAction $startAction,
        protected HandleMenuAction $menuAction,
        protected HandleOrderAction $orderAction,
        protected HandlePaymentAction $paymentAction,
        protected HandleReportAction $reportAction
    ) {}

    /**
     * Process an incoming Telegram update.
     */
    public function handleUpdate(array $update, ?string $botToken = null, ?array $shop = null): bool
    {
        $updateType = TelegramUpdateType::fromUpdate($update);

        return match ($updateType) {
            TelegramUpdateType::MY_CHAT_MEMBER => $this->handleMyChatMember($update['my_chat_member'], $botToken, $shop),
            TelegramUpdateType::CALLBACK_QUERY => $this->handleCallbackQuery($update['callback_query'], $botToken, $shop),
            TelegramUpdateType::MESSAGE => $this->handleMessage($update['message'], $botToken, $shop),
            default => true,
        };
    }

    /**
     * Handle bot joining/leaving groups or channels.
     */
    protected function handleMyChatMember(array $memberUpdate, ?string $botToken, ?array $shop): bool
    {
        $newStatus = $memberUpdate['new_chat_member']['status'] ?? '';
        $chatId = $memberUpdate['chat']['id'] ?? null;

        if (!$chatId || !in_array($newStatus, ['member', 'administrator'])) {
            return true;
        }

        $shopName = htmlspecialchars($shop['shop_name'] ?? $shop['username'] ?? 'Nexa Commerce KH', ENT_QUOTES, 'UTF-8');

        $welcome = "👋 <b>ស្វាគមន៍! Bot របស់ {$shopName} ត្រូវបានបន្ថែមចូលក្រុមនេះ!</b> 🏪\n\n"
            . "ដើម្បីទទួលការជូនដំណឹងនៅពេលអតិថិជនបង់ប្រាក់ជោគជ័យ និងរបាយការណ៍លក់ សូមផ្ញើ៖\n"
            . "<code>/link &lt;Profile ID&gt; &lt;Linking Token&gt;</code>\n\n"
            . "💡 លោកអ្នកអាចស្វែងរក Profile ID & Linking Token ក្នុង <b>Dashboard → Settings → Telegram Bot</b>។";

        return (bool) $this->apiService->sendMessage($chatId, $welcome, null, 'HTML', $botToken);
    }

    /**
     * Handle Inline Keyboard Callback Queries.
     */
    protected function handleCallbackQuery(array $callback, ?string $botToken, ?array $shop): bool
    {
        $callbackId = $callback['id'] ?? '';
        $data = trim($callback['data'] ?? '');
        $chatId = $callback['message']['chat']['id'] ?? null;

        if (!empty($callbackId)) {
            $this->apiService->answerCallbackQuery($callbackId, null, false, $botToken);
        }

        if (!$chatId || empty($data)) {
            return true;
        }

        if (str_starts_with($data, 'report_') || in_array($data, ['report_today', 'report_weekly', 'report_monthly', 'report_1', 'report_7', 'report_30'])) {
            return $this->reportAction->handleCallback($chatId, $data, $shop, $botToken);
        }

        if (str_starts_with($data, 'menu')) {
            return $this->menuAction->execute($chatId, $shop, $botToken);
        }

        if (str_starts_with($data, 'order:')) {
            $orderNumber = substr($data, 6);
            return $this->orderAction->execute($chatId, $orderNumber, $shop, $botToken);
        }

        if ($data === 'track_order') {
            return $this->orderAction->execute($chatId, null, $shop, $botToken);
        }

        if (str_starts_with($data, 'payment_info')) {
            return $this->paymentAction->execute($chatId, null, $shop, $botToken);
        }

        if ($data === 'main_menu' || str_starts_with($data, 'shop_info')) {
            return $this->startAction->execute($chatId, null, $shop, $botToken);
        }

        return true;
    }

    /**
     * Handle incoming Telegram text messages.
     */
    protected function handleMessage(array $message, ?string $botToken, ?array $shop): bool
    {
        $chat = $message['chat'] ?? [];
        $chatId = $chat['id'] ?? null;
        $text = trim($message['text'] ?? '');
        $chatType = $chat['type'] ?? 'private';
        $from = $message['from'] ?? [];

        if (!$chatId || empty($text)) {
            return true;
        }

        // Normalize command and arguments
        $rawLower = mb_strtolower($text, 'UTF-8');
        $cleanText = preg_replace('/@[a-zA-Z0-9_]+/', '', $rawLower);
        $cleanText = trim($cleanText);

        $parts = preg_split('/\s+/', $text, 2);
        $firstWord = strtolower(preg_replace('/@[a-zA-Z0-9_]+/', '', $parts[0]));
        $arguments = $parts[1] ?? null;

        // 1. Account linking commands
        if (str_starts_with($firstWord, '/link') || $firstWord === 'link' || str_starts_with($cleanText, 'link ') || str_starts_with($cleanText, '/link ')) {
            $linkArgs = $arguments;
            if (!$linkArgs && str_contains($text, ' ')) {
                $rawParts = preg_split('/\s+/', $text, 2);
                $linkArgs = $rawParts[1] ?? null;
            }
            return $this->paymentAction->handleLinkAccount($chatId, $linkArgs ?? '', $botToken, $from);
        }

        // 2. On-demand sales report commands & Khmer language shortcuts
        $reportCommands = [
            '/today', 'today', 'ថ្ងៃនេះ', '/daily', 'daily', 'ប្រចាំថ្ងៃ', 'របាយការណ៍ថ្ងៃនេះ',
            '/weekly', 'weekly', 'ប្រចាំសប្តាហ៍', '៧ថ្ងៃ', '7days', '/7days', 'សប្តាហ៍នេះ',
            '/monthly', 'monthly', 'ប្រចាំខែ', '៣០ថ្ងៃ', '30days', '/30days', '/month', 'month', 'ខែនេះ',
            '/report', 'report', 'របាយការណ៍', 'report menu',
        ];

        if (in_array($firstWord, $reportCommands) || in_array($cleanText, $reportCommands)) {
            $cmd = in_array($firstWord, $reportCommands) ? $firstWord : $cleanText;
            return $this->reportAction->execute($chatId, $cmd, $shop, $botToken);
        }

        // 3. /start or start
        if ($firstWord === '/start' || $firstWord === 'start') {
            return $this->startAction->execute($chatId, $arguments, $shop, $botToken);
        }

        // 4. /menu or menu
        if ($firstWord === '/menu' || $firstWord === 'menu') {
            return $this->menuAction->execute($chatId, $shop, $botToken);
        }

        // 5. /order or order
        if ($firstWord === '/order' || $firstWord === 'order') {
            return $this->orderAction->execute($chatId, $arguments, $shop, $botToken);
        }

        // 6. /payment or payment
        if ($firstWord === '/payment' || $firstWord === 'payment') {
            return $this->paymentAction->execute($chatId, null, $shop, $botToken);
        }

        // 7. /help or help or /about or ជំនួយ
        if (in_array($firstWord, ['/help', 'help', '/about', 'about', '/info', 'info', 'ជំនួយ'])) {
            return $this->startAction->execute($chatId, null, $shop, $botToken);
        }

        // 8. Auto-reply in private chats for non-command messages
        if ($chatType === 'private') {
            Log::info("TelegramBotService: Auto-replying to private message from chat {$chatId}");
            return $this->startAction->execute($chatId, null, $shop, $botToken);
        }

        return true;
    }
}

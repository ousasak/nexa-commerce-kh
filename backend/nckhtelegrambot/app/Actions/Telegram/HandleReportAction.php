<?php

namespace App\Actions\Telegram;

use App\Services\CoreApi\CoreApiService;
use App\Services\Telegram\TelegramApiService;
use App\Services\Telegram\TelegramKeyboardService;

class HandleReportAction
{
    public function __construct(
        protected TelegramApiService $apiService,
        protected TelegramKeyboardService $keyboardService,
        protected CoreApiService $coreApiService
    ) {}

    /**
     * Build report selection inline keyboard buttons.
     */
    public function getReportKeyboard(): array
    {
        return $this->keyboardService->buildInlineKeyboard([
            [
                ['text' => '📊 ថ្ងៃនេះ (Today)', 'callback_data' => 'report_today'],
                ['text' => '📅 ៧ ថ្ងៃ (Weekly)', 'callback_data' => 'report_weekly'],
            ],
            [
                ['text' => '🗓️ ៣០ ថ្ងៃ (Monthly)', 'callback_data' => 'report_monthly'],
            ],
        ]);
    }

    /**
     * Execute on-demand report command from text message.
     */
    public function execute(
        string|int $chatId,
        string $command,
        ?array $shop = null,
        ?string $botToken = null
    ): bool {
        $shopId = $shop['id'] ?? $shop['shop_id'] ?? null;
        $keyboard = $this->getReportKeyboard();

        if (in_array($command, ['/report', 'report', '/menu', 'menu', 'របាយការណ៍', 'report menu'])) {
            $shopName = htmlspecialchars($shop['shop_name'] ?? $shop['username'] ?? 'Nexa Commerce KH', ENT_QUOTES, 'UTF-8');
            $msg = "📊 <b>របាយការណ៍ការលក់ ({$shopName})</b>\n\nសូមចុចជ្រើសរើសរបាយការណ៍ខាងក្រោម៖";
            return (bool) $this->apiService->sendMessage($chatId, $msg, $keyboard, 'HTML', $botToken);
        }

        $period = match ($command) {
            '/today', 'today', 'ថ្ងៃនេះ', '/daily', 'daily', 'ប្រចាំថ្ងៃ', 'របាយការណ៍ថ្ងៃនេះ' => 'daily',
            '/weekly', 'weekly', 'ប្រចាំសប្តាហ៍', '៧ថ្ងៃ', '7days', '/7days', 'សប្តាហ៍នេះ' => 'weekly',
            '/monthly', 'monthly', 'ប្រចាំខែ', '៣០ថ្ងៃ', '30days', '/30days', '/month', 'month', 'ខែនេះ' => 'monthly',
            default => 'daily',
        };

        return $this->sendReport($chatId, $period, $shopId, $botToken);
    }

    /**
     * Handle button callback queries for report requests.
     */
    public function handleCallback(
        string|int $chatId,
        string $callbackData,
        ?array $shop = null,
        ?string $botToken = null
    ): bool {
        $shopId = $shop['id'] ?? $shop['shop_id'] ?? null;

        $period = match ($callbackData) {
            'report_today', 'report_1' => 'daily',
            'report_weekly', 'report_7' => 'weekly',
            'report_monthly', 'report_30' => 'monthly',
            default => 'daily',
        };

        return $this->sendReport($chatId, $period, $shopId, $botToken);
    }

    /**
     * Fetch report from Core API and send to Telegram chat.
     */
    protected function sendReport(
        string|int $chatId,
        string $period,
        ?int $shopId,
        ?string $botToken
    ): bool {
        if (! $shopId) {
            $msg = "⚠️ <b>មិនទាន់បានភ្ជាប់ហាងទេ</b>\n\nសូមភ្ជាប់ Chat នេះជាមួយហាងជាមុនសិន ដោយផ្ញើ:\n<code>/link &lt;Profile_ID&gt; &lt;Linking_Token&gt;</code>";
            return (bool) $this->apiService->sendMessage($chatId, $msg, null, 'HTML', $botToken);
        }

        $report = $this->coreApiService->getSalesReport($shopId, $period, $chatId);
        $keyboard = $this->getReportKeyboard();

        if ($report && ! empty($report['html'])) {
            return (bool) $this->apiService->sendMessage($chatId, $report['html'], $keyboard, 'HTML', $botToken);
        }

        $fallbackMsg = "⚠️ <b>ពុំអាចទាញយករបាយការណ៍បានទេ</b>\n\nសូមប្រាកដថា Chat នេះត្រូវបានភ្ជាប់ជាមួយហាងត្រឹមត្រូវនៅក្នុង <b>Merchant Dashboard → Settings → Telegram Bot</b> ។\n\nដើម្បីភ្ជាប់ឡើងវិញ សូមផ្ញើ:\n<code>/link &lt;Profile_ID&gt; &lt;Linking_Token&gt;</code>";

        return (bool) $this->apiService->sendMessage($chatId, $fallbackMsg, null, 'HTML', $botToken);
    }
}


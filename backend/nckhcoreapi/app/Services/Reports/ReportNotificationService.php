<?php

namespace App\Services\Reports;

use App\Models\ActivityLog;
use App\Models\Shop;
use App\Services\Telegram\TelegramService;

class ReportNotificationService
{
    /**
     * Generate business report summary in plain text, HTML, and structured metrics
     * by delegating directly to centralized SalesReportService.
     */
    public static function generateSummary(Shop $shop, int $days = 1, string $lang = 'kh'): array
    {
        $salesService = app(SalesReportService::class);

        return match ($days) {
            7 => $salesService->getWeeklyReport($shop, null, $lang),
            30 => $salesService->getMonthlyReport($shop, null, $lang),
            default => $salesService->getDailyReport($shop, null, $lang),
        };
    }

    /**
     * Dispatch the report directly to shop's configured Telegram bot / chats.
     */
    public static function dispatch(Shop $shop, int $days = 1, string $lang = 'kh'): array
    {
        $summary = self::generateSummary($shop, $days, $lang);
        $sent = TelegramService::sendShopNotification($shop, $summary['html']);

        if ($sent) {
            ActivityLog::create([
                'shop_id' => $shop->id,
                'user_id' => null,
                'username' => 'System',
                'action' => 'telegram_report_dispatched',
                'description' => "Dispatched {$days}-day business report to Telegram (Lang: {$lang})",
            ]);
        }

        return [
            'ok' => $sent,
            'summary' => $summary,
        ];
    }

    /**
     * Automated nightly EOD dispatch for all active shops with Telegram & Daily Report enabled.
     */
    public static function dispatchAllDailyEod(): array
    {
        $shops = Shop::all();
        $success = 0;
        $failed = 0;

        foreach ($shops as $shop) {
            $tg = $shop->telegram_dict();
            $enabled = ! empty($tg['enabled']);
            $token = trim($tg['bot_token'] ?? '');
            $prefs = $tg['notification_preferences'] ?? [];
            $dailyAllowed = $prefs['daily_report_enabled'] ?? true;

            if ($enabled && ! empty($token) && $dailyAllowed) {
                $res = self::dispatch($shop, 1, 'kh');
                if ($res['ok']) {
                    $success++;
                } else {
                    $failed++;
                }
            }
        }

        return [
            'total_processed' => $success + $failed,
            'success' => $success,
            'failed' => $failed,
        ];
    }

    /**
     * Automated weekly dispatch for all active shops with Telegram & Weekly Report enabled.
     */
    public static function dispatchAllWeekly(): array
    {
        $shops = Shop::all();
        $success = 0;
        $failed = 0;

        foreach ($shops as $shop) {
            $tg = $shop->telegram_dict();
            $enabled = ! empty($tg['enabled']);
            $token = trim($tg['bot_token'] ?? '');
            $prefs = $tg['notification_preferences'] ?? [];
            $weeklyAllowed = $prefs['weekly_report_enabled'] ?? true;

            if ($enabled && ! empty($token) && $weeklyAllowed) {
                $res = self::dispatch($shop, 7, 'kh');
                if ($res['ok']) {
                    $success++;
                } else {
                    $failed++;
                }
            }
        }

        return [
            'total_processed' => $success + $failed,
            'success' => $success,
            'failed' => $failed,
        ];
    }

    /**
     * Automated monthly dispatch for all active shops with Telegram & Monthly Report enabled.
     */
    public static function dispatchAllMonthly(): array
    {
        $shops = Shop::all();
        $success = 0;
        $failed = 0;

        foreach ($shops as $shop) {
            $tg = $shop->telegram_dict();
            $enabled = ! empty($tg['enabled']);
            $token = trim($tg['bot_token'] ?? '');
            $prefs = $tg['notification_preferences'] ?? [];
            $monthlyAllowed = $prefs['monthly_report_enabled'] ?? true;

            if ($enabled && ! empty($token) && $monthlyAllowed) {
                $res = self::dispatch($shop, 30, 'kh');
                if ($res['ok']) {
                    $success++;
                } else {
                    $failed++;
                }
            }
        }

        return [
            'total_processed' => $success + $failed,
            'success' => $success,
            'failed' => $failed,
        ];
    }
}

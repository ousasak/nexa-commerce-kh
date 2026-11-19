<?php

namespace Tests\Unit\Actions\Telegram;

use App\Actions\Telegram\HandleReportAction;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HandleReportActionTest extends TestCase
{
    public function test_handle_report_command_displays_menu(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 10]], 200),
        ]);

        $action = app(HandleReportAction::class);
        $result = $action->execute(123456, '/report', ['shop_name' => 'Demo Mart'], 'mock_token');

        $this->assertTrue($result);
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'sendMessage')
                && str_contains($request['text'], 'របាយការណ៍ការលក់');
        });
    }

    public function test_handle_report_fetches_and_sends_daily_sales(): void
    {
        Http::fake([
            '*/api/bot-service/report*' => Http::response([
                'ok' => true,
                'report' => [
                    'html' => '📊 <b>របាយការណ៍ការលក់ប្រចាំថ្ងៃ</b>\nចំណូលលក់: $100.00',
                ],
            ], 200),
            'https://api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 11]], 200),
        ]);

        $action = app(HandleReportAction::class);
        $result = $action->execute(123456, '/today', ['id' => 1, 'shop_name' => 'Demo Mart'], 'mock_token');

        $this->assertTrue($result);
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'sendMessage')
                && str_contains($request['text'], 'របាយការណ៍ការលក់ប្រចាំថ្ងៃ');
        });
    }

    public function test_handle_report_callback_queries(): void
    {
        Http::fake([
            '*/api/bot-service/report*' => Http::response([
                'ok' => true,
                'report' => [
                    'html' => '📊 <b>របាយការណ៍លក់ប្រចាំសប្តាហ៍</b>\nចំណូលលក់: $500.00',
                ],
            ], 200),
            'https://api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 12]], 200),
        ]);

        $action = app(HandleReportAction::class);
        $result = $action->handleCallback(123456, 'report_weekly', ['id' => 1], 'mock_token');

        $this->assertTrue($result);
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'sendMessage')
                && str_contains($request['text'], 'របាយការណ៍លក់ប្រចាំសប្តាហ៍');
        });
    }
}


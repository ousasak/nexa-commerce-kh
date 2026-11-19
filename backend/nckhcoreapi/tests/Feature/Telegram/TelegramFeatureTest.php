<?php

namespace Tests\Feature\Telegram;

use App\Models\Shop;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramFeatureTest extends TestCase
{
    public function test_telegram_empty_webhook(): void
    {
        $response = $this->postJson('/api/telegram/webhook/fake_token_123', []);
        $response->assertStatus(200);
    }

    public function test_telegram_report_command_and_buttons(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        $shop = Shop::first();
        if (! $shop) {
            $shop = Shop::create([
                'username' => 'testshop',
                'shop_name' => 'Test Shop',
                'status' => 'active',
                'telegram_settings' => json_encode([
                    'bot_token' => 'test_bot_token_abc',
                    'linked_chats' => [123456789],
                    'enabled' => true,
                ]),
            ]);
        } else {
            $tg = $shop->telegram_dict();
            $tg['bot_token'] = 'test_bot_token_abc';
            $tg['linked_chats'] = [123456789];
            $shop->telegram_settings = json_encode($tg);
            $shop->save();
        }

        // Test /report command
        $response = $this->postJson('/api/telegram/webhook/test_bot_token_abc', [
            'message' => [
                'chat' => ['id' => 123456789],
                'text' => '/report',
            ],
        ]);
        $response->assertStatus(200);

        // Test /today command
        $response = $this->postJson('/api/telegram/webhook/test_bot_token_abc', [
            'message' => [
                'chat' => ['id' => 123456789],
                'text' => '/today',
            ],
        ]);
        $response->assertStatus(200);

        // Test callback_query for weekly report button
        $response = $this->postJson('/api/telegram/webhook/test_bot_token_abc', [
            'callback_query' => [
                'id' => 'cq_123',
                'from' => ['id' => 123456789],
                'data' => 'report_7',
            ],
        ]);
        $response->assertStatus(200);
    }
}

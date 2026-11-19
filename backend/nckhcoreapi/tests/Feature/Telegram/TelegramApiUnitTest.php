<?php

namespace Tests\Feature\Telegram;

use App\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TelegramApiUnitTest extends TestCase
{
    private function getDemoToken(): array
    {
        $shop = Shop::where('username', 'demo')->first();
        if (! $shop) {
            $shop = Shop::create([
                'username' => 'demo',
                'shop_name' => 'Demo Fashion Store',
                'telegram_settings' => json_encode([
                    'bot_token' => '123456:TEST_TOKEN',
                    'chat_id' => '-100123456789',
                    'enabled' => true,
                    'profile_id' => 'PR_TEST123',
                    'secret_key' => 'SEC_TEST456',
                    'linked_chats' => ['-100123456789'],
                ]),
            ]);
        }

        $user = User::where('username', 'demo')->first();
        if (! $user) {
            $user = User::create([
                'username' => 'demo',
                'email' => 'demo@ministorekh.com',
                'password' => Hash::make('demo123'),
                'role' => 'shop_owner',
                'shop_id' => $shop->id,
                'status' => 'active',
            ]);
        }

        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'demo',
            'password' => 'demo123',
        ]);

        $token = $loginRes->json('access_token');

        return [$token, $shop, $user];
    }

    public function test_telegram_webhook_accepts_empty_payload(): void
    {
        $response = $this->postJson('/api/telegram/webhook/fake_token_123', []);
        $response->assertStatus(200)
            ->assertJson(['ok' => true]);
    }

    public function test_telegram_webhook_handles_start_message(): void
    {
        $payload = [
            'update_id' => 10001,
            'message' => [
                'message_id' => 1,
                'chat' => ['id' => 12345678, 'type' => 'private'],
                'text' => '/start',
            ],
        ];

        $response = $this->postJson('/api/telegram/webhook/123456:TEST_TOKEN', $payload);
        $response->assertStatus(200)
            ->assertJson(['ok' => true]);
    }

    public function test_telegram_settings_endpoint_authenticated(): void
    {
        [$token, $shop] = $this->getDemoToken();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/telegram/settings?shop_id={$shop->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'bot_token',
                'chat_id',
                'enabled',
                'profile_id',
                'secret_key',
                'linked_chats',
            ]);
    }

    public function test_telegram_profile_endpoint_authenticated(): void
    {
        [$token, $shop] = $this->getDemoToken();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/telegram/profile/{$shop->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'shop_id',
                'profile_id',
                'secret_key',
                'linked_chats',
            ]);
    }

    public function test_telegram_link_and_unlink_chat(): void
    {
        [$token, $shop] = $this->getDemoToken();
        $testChatId = '-10099887766';

        // 1. Link Chat
        $linkRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/telegram/link-chat', [
                'shop_id' => $shop->id,
                'chat_id' => $testChatId,
            ]);

        $linkRes->assertStatus(200)
            ->assertJson(['ok' => true]);

        $linkedChats = $linkRes->json('linked_chats');
        $this->assertContains($testChatId, $linkedChats);

        // 2. Unlink Chat
        $unlinkRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/telegram/unlink-chat', [
                'shop_id' => $shop->id,
                'chat_id' => $testChatId,
            ]);

        $unlinkRes->assertStatus(200)
            ->assertJson(['ok' => true]);

        $remainingChats = $unlinkRes->json('linked_chats');
        $this->assertNotContains($testChatId, $remainingChats);
    }

    public function test_telegram_test_fails_with_invalid_token(): void
    {
        [$token, $shop] = $this->getDemoToken();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/telegram/test', [
                'shop_id' => $shop->id,
                'bot_token' => 'invalid_token_xyz',
                'chat_id' => '-100123456789',
            ]);

        // Expect 400 because Telegram API rejects invalid token
        $response->assertStatus(400);
    }
}


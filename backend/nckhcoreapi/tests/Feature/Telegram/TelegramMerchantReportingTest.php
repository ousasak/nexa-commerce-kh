<?php

namespace Tests\Feature\Telegram;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shop;
use App\Models\TelegramLinkingToken;
use App\Models\User;
use App\Services\Reports\SalesReportService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramMerchantReportingTest extends TestCase
{
    private function createMerchantUserAndShop(): array
    {
        $shop = Shop::create([
            'username' => 'merchant_shop_'.uniqid(),
            'shop_name' => 'Test Coffee Shop',
            'status' => 'active',
            'telegram_settings' => json_encode([
                'bot_token' => 'BOT_TOKEN_'.uniqid(),
                'profile_id' => 'PR_'.uniqid(),
                'secret_key' => 'SEC_'.uniqid(),
                'enabled' => true,
                'linked_chats' => [],
                'linked_accounts' => [],
            ]),
        ]);

        $user = User::create([
            'username' => 'merchant_'.uniqid(),
            'email' => 'merchant_'.uniqid().'@test.com',
            'password' => Hash::make('password123'),
            'role' => 'shop_owner',
            'shop_id' => $shop->id,
            'status' => 'active',
        ]);

        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => $user->username,
            'password' => 'password123',
        ]);

        $token = $loginRes->json('access_token');

        return [$token, $shop, $user];
    }

    public function test_secure_linking_token_generation_and_consumption(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        [$token, $shop, $user] = $this->createMerchantUserAndShop();
        $botToken = $shop->telegram_dict()['bot_token'];
        $profileId = $shop->telegram_dict()['profile_id'];

        // 1. Merchant generates linking token via API
        $genRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/telegram/linking-token', ['shop_id' => $shop->id]);

        $genRes->assertStatus(200)
            ->assertJson(['ok' => true])
            ->assertJsonStructure(['token', 'expires_at', 'expires_in_seconds', 'profile_id', 'command']);

        $plainToken = $genRes->json('token');
        $this->assertNotEmpty($plainToken);

        // Verify token hash stored in DB
        $dbToken = TelegramLinkingToken::where('shop_id', $shop->id)->active()->first();
        $this->assertNotNull($dbToken);
        $this->assertEquals(hash('sha256', $plainToken), $dbToken->token_hash);

        // 2. Merchant sends linking command in Telegram
        $chatId = 987654321;
        $webhookRes = $this->postJson("/api/telegram/webhook/{$botToken}", [
            'update_id' => 1001,
            'message' => [
                'message_id' => 1,
                'chat' => ['id' => $chatId, 'type' => 'group', 'title' => 'Shop Group'],
                'from' => [
                    'id' => 987654321,
                    'username' => 'sok_merchant',
                    'first_name' => 'Sok',
                ],
                'text' => "LINK {$profileId} {$plainToken}",
            ],
        ]);

        $webhookRes->assertStatus(200);

        // 3. Verify chat is linked in shop settings
        $shop->refresh();
        $tg = $shop->telegram_dict();
        $this->assertContains((string) $chatId, array_map('strval', $tg['linked_chats']));
        $this->assertNotEmpty($tg['linked_accounts']);
        $this->assertEquals('sok_merchant', $tg['linked_accounts'][0]['username']);

        // 4. Verify single-use token cannot be consumed a second time
        $secondWebhookRes = $this->postJson("/api/telegram/webhook/{$botToken}", [
            'update_id' => 1002,
            'message' => [
                'message_id' => 2,
                'chat' => ['id' => 555555, 'type' => 'private'],
                'text' => "LINK {$profileId} {$plainToken}",
            ],
        ]);

        $secondWebhookRes->assertStatus(200);
        $shop->refresh();
        $this->assertNotContains('555555', array_map('strval', $shop->telegram_dict()['linked_chats']));
    }

    public function test_disconnect_account_and_update_preferences(): void
    {
        [$token, $shop, $user] = $this->createMerchantUserAndShop();

        // Setup linked chat
        $tg = $shop->telegram_dict();
        $tg['linked_chats'] = ['12345678'];
        $tg['linked_accounts'] = [
            ['chat_id' => '12345678', 'username' => 'testuser', 'first_name' => 'Test'],
        ];
        $shop->telegram_settings = json_encode($tg);
        $shop->save();

        // 1. Update preferences
        $prefRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/telegram/preferences', [
                'shop_id' => $shop->id,
                'preferences' => [
                    'daily_report_enabled' => true,
                    'weekly_report_enabled' => false,
                    'monthly_report_enabled' => true,
                ],
            ]);

        $prefRes->assertStatus(200)
            ->assertJson([
                'ok' => true,
                'preferences' => [
                    'daily_report_enabled' => true,
                    'weekly_report_enabled' => false,
                    'monthly_report_enabled' => true,
                ],
            ]);

        // 2. Disconnect chat
        $disRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/telegram/disconnect', [
                'shop_id' => $shop->id,
                'chat_id' => '12345678',
            ]);

        $disRes->assertStatus(200)
            ->assertJson(['ok' => true]);

        $shop->refresh();
        $this->assertNotContains('12345678', $shop->telegram_dict()['linked_chats']);
    }

    public function test_on_demand_reports_and_khmer_shortcuts(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        [$token, $shop] = $this->createMerchantUserAndShop();
        $botToken = $shop->telegram_dict()['bot_token'];
        $chatId = 11223344;

        // Link chat
        $tg = $shop->telegram_dict();
        $tg['linked_chats'] = [(string) $chatId];
        $shop->telegram_settings = json_encode($tg);
        $shop->save();

        // Test commands
        $commandsToTest = [
            '/today',
            'ថ្ងៃនេះ',
            'ប្រចាំថ្ងៃ',
            '/weekly',
            'ប្រចាំសប្តាហ៍',
            '៧ថ្ងៃ',
            '/monthly',
            'ប្រចាំខែ',
            '៣០ថ្ងៃ',
            '/report',
            'របាយការណ៍',
            '/help',
            '/start',
        ];

        foreach ($commandsToTest as $cmd) {
            $res = $this->postJson("/api/telegram/webhook/{$botToken}", [
                'message' => [
                    'chat' => ['id' => $chatId],
                    'text' => $cmd,
                ],
            ]);
            $res->assertStatus(200);
        }

        // Test inline keyboard callback queries
        $callbacks = ['report_today', 'report_weekly', 'report_monthly'];
        foreach ($callbacks as $cb) {
            $res = $this->postJson("/api/telegram/webhook/{$botToken}", [
                'callback_query' => [
                    'id' => 'cq_'.uniqid(),
                    'message' => ['chat' => ['id' => $chatId]],
                    'data' => $cb,
                ],
            ]);
            $res->assertStatus(200);
        }
    }

    public function test_sales_report_calculations_with_real_records(): void
    {
        [$token, $shop] = $this->createMerchantUserAndShop();

        // Create sample products
        $product1 = Product::create([
            'shop_id' => $shop->id,
            'name' => 'Iced Latte',
            'price' => 3.50,
            'quantity' => 20,
            'status' => 'active',
            'metadata_json' => json_encode(['cost' => 1.50]),
        ]);

        $product2 = Product::create([
            'shop_id' => $shop->id,
            'name' => 'Croissant',
            'price' => 2.50,
            'quantity' => 3, // Low stock <= 5
            'status' => 'active',
            'metadata_json' => json_encode(['cost' => 1.00]),
        ]);

        $product3 = Product::create([
            'shop_id' => $shop->id,
            'name' => 'Cheesecake',
            'price' => 4.00,
            'quantity' => 0, // Out of stock
            'status' => 'active',
        ]);

        // Order 1: Paid via KHQR
        $order1 = Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-'.uniqid(),
            'items_total' => 7.00,
            'total' => 7.00,
            'payment_method' => 'khqr',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
            'created_at' => Carbon::now(),
        ]);
        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $product1->id,
            'product_name' => $product1->name,
            'price' => 3.50,
            'quantity' => 2,
        ]);

        // Order 2: Paid via Cash
        $order2 = Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-'.uniqid(),
            'items_total' => 5.00,
            'total' => 5.00,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
            'created_at' => Carbon::now(),
        ]);
        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => $product2->id,
            'product_name' => $product2->name,
            'price' => 2.50,
            'quantity' => 2,
        ]);

        // Order 3: Cancelled order (Must be EXCLUDED from revenue)
        $order3 = Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-CANCELLED-'.uniqid(),
            'items_total' => 20.00,
            'total' => 20.00,
            'payment_method' => 'khqr',
            'payment_status' => 'paid',
            'order_status' => 'cancelled',
            'created_at' => Carbon::now(),
        ]);
        OrderItem::create([
            'order_id' => $order3->id,
            'product_id' => $product1->id,
            'product_name' => $product1->name,
            'price' => 3.50,
            'quantity' => 5,
        ]);

        // Order 4: Pending unpaid order (Must be EXCLUDED from revenue)
        Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-PENDING-'.uniqid(),
            'items_total' => 15.00,
            'total' => 15.00,
            'payment_method' => 'aba',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'created_at' => Carbon::now(),
        ]);

        // Execute SalesReportService
        $salesService = app(SalesReportService::class);
        $daily = $salesService->getDailyReport($shop);

        // Assertions
        $this->assertEquals(12.00, $daily['metrics']['total_revenue']); // 7.00 + 5.00
        $this->assertEquals(2, $daily['metrics']['total_orders']); // Order 1 & 2
        $this->assertEquals(4, $daily['metrics']['total_items_sold']); // 2 lattes + 2 croissants
        $this->assertEquals(6.00, $daily['metrics']['avg_order_value']); // 12.00 / 2
        $this->assertTrue($daily['metrics']['has_cost_data']);
        $this->assertEquals(7.00, $daily['metrics']['estimated_profit']); // 12.00 - (2*1.50 + 2*1.00) = 12.00 - 5.00 = 7.00

        // Stock counts
        $this->assertEquals(3, $daily['metrics']['active_products_count']);
        $this->assertEquals(1, $daily['metrics']['out_of_stock_count']); // Cheesecake
        $this->assertEquals(1, $daily['metrics']['low_stock_count']); // Croissant

        // Payment breakdown
        $this->assertEquals(1, $daily['payment_breakdown']['khqr']['count']);
        $this->assertEquals(7.00, $daily['payment_breakdown']['khqr']['amount']);
        $this->assertEquals(1, $daily['payment_breakdown']['cash']['count']);
        $this->assertEquals(5.00, $daily['payment_breakdown']['cash']['amount']);

        // Top products
        $this->assertNotEmpty($daily['top_products']);
        $this->assertEquals('Iced Latte', $daily['top_products'][0]['name']);
        $this->assertEquals(7.00, $daily['top_products'][0]['revenue']);
    }
}


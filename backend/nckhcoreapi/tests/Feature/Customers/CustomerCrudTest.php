<?php

namespace Tests\Feature\Customers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Shop;
use App\Models\User;
use App\Services\Auth\JwtService;
use Tests\TestCase;

class CustomerCrudTest extends TestCase
{
    protected Shop $shop;
    protected User $user;
    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shop = Shop::where('username', 'demo')->first() ?? Shop::create([
            'username' => 'test_shop_'.uniqid(),
            'shop_name' => 'Test Customer Shop',
            'status' => 'active',
        ]);

        $this->user = User::where('role', 'admin')->first() ?? User::create([
            'username' => 'admin_'.uniqid(),
            'email' => 'admin_'.uniqid().'@example.com',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->token = app(JwtService::class)->createToken([
            'sub' => (string) $this->user->id,
            'role' => $this->user->role,
            'shop_id' => $this->shop->id,
        ]);
    }

    public function test_can_create_customer_with_nullable_and_empty_fields_without_null_violation(): void
    {
        // When client submits empty strings or nulls for optional fields
        $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->postJson('/api/customers', [
                'shop_id' => $this->shop->id,
                'name' => 'Sokha Chan',
                'phone' => '012'.random_int(100000, 999999),
                'telegram' => '',
                'email' => null,
                'address' => '',
                'city' => null,
                'country' => '',
                'notes' => null,
            ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertNotNull($data['id']);
        $this->assertEquals('Sokha Chan', $data['name']);

        $customer = Customer::find($data['id']);
        $this->assertNotNull($customer);
        $this->assertEquals('', $customer->telegram);
        $this->assertEquals('', $customer->address);
        $this->assertEquals('', $customer->city);
        $this->assertEquals('', $customer->email);
    }

    public function test_can_update_customer_and_clear_optional_fields_without_null_violation(): void
    {
        // Customer initially has non-empty fields
        $customer = Customer::create([
            'shop_id' => $this->shop->id,
            'name' => 'Vannak Heng',
            'phone' => '012'.random_int(100000, 999999),
            'telegram' => '@vannak3',
            'address' => 'Street 271, Phnom Penh',
            'city' => 'Phnom Penh',
            'email' => 'vannak@example.com',
        ]);

        // Merchant clears optional fields in the UI
        $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->putJson("/api/customers/{$customer->id}", [
                'name' => 'Vannak Heng Updated',
                'phone' => $customer->phone,
                'telegram' => '',
                'address' => null,
                'city' => '',
                'email' => null,
                'notes' => null,
            ]);

        $response->assertStatus(200);

        $customer->refresh();
        $this->assertEquals('Vannak Heng Updated', $customer->name);
        $this->assertEquals('', $customer->telegram);
        $this->assertEquals('', $customer->address);
        $this->assertEquals('', $customer->city);
        $this->assertEquals('', $customer->email);
    }

    public function test_telegram_handle_is_automatically_normalized_with_at_symbol(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->postJson('/api/customers', [
                'shop_id' => $this->shop->id,
                'name' => 'Telegram User',
                'phone' => '099'.random_int(100000, 999999),
                'telegram' => 'khmer_merchant_bot',
            ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals('@khmer_merchant_bot', $data['telegram']);

        $customer = Customer::find($data['id']);
        $this->assertEquals('@khmer_merchant_bot', $customer->telegram);
    }

    public function test_can_list_customers_with_metrics(): void
    {
        $customer = Customer::create([
            'shop_id' => $this->shop->id,
            'name' => 'Metric Customer',
            'phone' => '077'.random_int(100000, 999999),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->getJson("/api/customers?shop_id={$this->shop->id}");

        $response->assertStatus(200);
        $list = $response->json();

        $this->assertIsArray($list);
        $found = collect($list)->firstWhere('id', $customer->id);
        $this->assertNotNull($found);
        $this->assertArrayHasKey('order_count', $found);
        $this->assertArrayHasKey('total_spent', $found);
    }

    public function test_cannot_delete_customer_with_existing_orders(): void
    {
        $customer = Customer::create([
            'shop_id' => $this->shop->id,
            'name' => 'Buyer Customer',
            'phone' => '088'.random_int(100000, 999999),
        ]);

        Order::create([
            'shop_id' => $this->shop->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-'.uniqid(),
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'total' => 45.0,
            'payment_status' => 'paid',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->deleteJson("/api/customers/{$customer->id}");

        $response->assertStatus(400);
        $this->assertStringContainsString('Cannot delete customer who has existing orders', $response->json('detail') ?? $response->json('message'));

        $this->assertNotNull(Customer::find($customer->id));
    }

    public function test_can_delete_customer_without_orders(): void
    {
        $customer = Customer::create([
            'shop_id' => $this->shop->id,
            'name' => 'Transient Customer',
            'phone' => '089'.random_int(100000, 999999),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
            ->deleteJson("/api/customers/{$customer->id}");

        $response->assertStatus(200);
        $this->assertTrue($response->json('ok'));

        $this->assertNull(Customer::find($customer->id));
    }
}


<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Shop;
use App\Models\User;
use App\Services\Auth\JwtService;
use Carbon\Carbon;
use Tests\TestCase;

class KitchenOrderAutoTodayTest extends TestCase
{
    public function test_kds_auto_today_and_active_orders_filter(): void
    {
        $shop = Shop::first() ?? Shop::create([
            'name' => 'KDS Test Restaurant',
            'slug' => 'kds-test-restaurant-' . uniqid(),
            'status' => 'active',
        ]);

        $user = User::where('role', 'admin')->first() ?? User::create([
            'username' => 'merchant_' . uniqid(),
            'email' => 'merchant_' . uniqid() . '@example.com',
            'role' => 'merchant',
            'status' => 'active',
            'shop_id' => $shop->id,
        ]);

        $token = app(JwtService::class)->createToken([
            'sub' => (string) $user->id,
            'role' => $user->role,
            'shop_id' => $shop->id,
        ]);

        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        // 1. Unserved order from yesterday (should STILL be shown on KDS so kitchen doesn't miss it)
        $unservedYesterday = Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-UNSERVED-' . uniqid(),
            'order_status' => 'pending',
            'payment_status' => 'paid',
            'order_type' => 'dine-in',
            'table_number' => 'T-01',
            'total' => 15.00,
            'created_at' => $yesterday->copy()->setHour(20),
            'updated_at' => $yesterday->copy()->setHour(20),
        ]);

        // 2. Completed order from yesterday (should NOT be shown on today's KDS)
        $completedYesterday = Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-COMPLETED-YESTERDAY-' . uniqid(),
            'order_status' => 'completed',
            'payment_status' => 'paid',
            'order_type' => 'dine-in',
            'table_number' => 'T-02',
            'total' => 25.00,
        ]);
        $completedYesterday->timestamps = false;
        $completedYesterday->created_at = $yesterday->copy()->setHour(19);
        $completedYesterday->updated_at = $yesterday->copy()->setHour(19)->addMinutes(30);
        $completedYesterday->save();

        // 3. Completed order from today (SHOULD be shown in Served column today)
        $completedToday = Order::create([
            'shop_id' => $shop->id,
            'order_number' => 'ORD-COMPLETED-TODAY-' . uniqid(),
            'order_status' => 'completed',
            'payment_status' => 'paid',
            'order_type' => 'dine-in',
            'table_number' => 'T-03',
            'total' => 30.00,
        ]);
        $completedToday->timestamps = false;
        $completedToday->created_at = $today->copy()->setHour(12);
        $completedToday->updated_at = $today->copy()->setHour(12)->addMinutes(20);
        $completedToday->save();

        // Act: Fetch KDS orders without date param (defaults to today)
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/kitchen-orders?shop_id={$shop->id}");

        $response->assertStatus(200);
        $ids = collect($response->json())->pluck('id')->all();

        // Assert: Unserved yesterday is present
        $this->assertContains("#{$unservedYesterday->id}", $ids);

        // Assert: Completed today is present
        $this->assertContains("#{$completedToday->id}", $ids);

        // Assert: Completed yesterday is EXCLUDED
        $this->assertNotContains("#{$completedYesterday->id}", $ids);

        // Act 2: Fetch with date=all
        $responseAll = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/kitchen-orders?shop_id={$shop->id}&date=all");
        $responseAll->assertStatus(200);
        $idsAll = collect($responseAll->json())->pluck('id')->all();
        $this->assertContains("#{$completedYesterday->id}", $idsAll);

        // Clean up test records
        $unservedYesterday->delete();
        $completedYesterday->delete();
        $completedToday->delete();
    }
}

<?php

use App\Services\Reports\ReportNotificationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('reports:send-daily-eod', function () {
    $this->info('Starting automated daily EOD business report dispatch...');
    $res = ReportNotificationService::dispatchAllDailyEod();
    $this->info("Completed. Total: {$res['total_processed']} | Sent: {$res['success']} | Failed: {$res['failed']}");
})->purpose('Send automated daily End-of-Day (EOD) business reports to connected shop Telegram bots');

Artisan::command('reports:send-weekly', function () {
    $this->info('Starting automated weekly business report dispatch (Past 7 Days)...');
    $res = ReportNotificationService::dispatchAllWeekly();
    $this->info("Completed. Total: {$res['total_processed']} | Sent: {$res['success']} | Failed: {$res['failed']}");
})->purpose('Send automated weekly business reports to connected shop Telegram bots');

Artisan::command('reports:send-monthly', function () {
    $this->info('Starting automated monthly business report dispatch (Past 30 Days)...');
    $res = ReportNotificationService::dispatchAllMonthly();
    $this->info("Completed. Total: {$res['total_processed']} | Sent: {$res['success']} | Failed: {$res['failed']}");
})->purpose('Send automated monthly business reports to connected shop Telegram bots');

Artisan::command('orders:backfill-items', function () {
    $orders = \App\Models\Order::with('items')->get();
    $count = 0;
    foreach ($orders as $order) {
        if ($order->items->isEmpty()) {
            $products = \App\Models\Product::where('shop_id', $order->shop_id)->get();
            if ($products->isEmpty()) {
                $products = \App\Models\Product::all();
            }
            if ($products->isNotEmpty()) {
                $pickCount = rand(1, min(3, $products->count()));
                $picked = $products->random($pickCount);
                $itemsTotal = 0;
                foreach ($picked as $p) {
                    $qty = rand(1, 2);
                    $price = (float) ($p->sale_price ?? $p->price);
                    if ($price <= 0) {
                        $price = rand(2, 8) + 0.50;
                    }
                    \App\Models\OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $p->id,
                        'product_name' => $p->name,
                        'price' => $price,
                        'quantity' => $qty,
                        'variations' => '[]',
                    ]);
                    $itemsTotal += ($price * $qty);
                }
                $shipping = (float) ($order->shipping_fee ?? 1.50);
                $order->update([
                    'items_total' => $itemsTotal,
                    'total' => $itemsTotal + $shipping - (float) ($order->discount ?? 0),
                ]);
                $count++;
            }
        }
    }
    $this->info("Successfully backfilled items for {$count} orders.");
})->purpose('Backfill order items for orders with 0 items');

Artisan::command('user:set-merchant-email {email=hjhfg7226@gmail.com}', function () {
    $email = strtolower(trim($this->argument('email')));
    $shop = \App\Models\Shop::where('status', 'active')->first();
    if (! $shop) {
        $shop = \App\Models\Shop::create([
            'username' => 'demostore',
            'shop_name' => 'MiniStore KH Demo',
            'description' => 'Demo Merchant Store',
            'currency' => 'USD',
            'status' => 'active',
            'plan' => 'pro',
        ]);
    }

    $user = \App\Models\User::whereRaw('LOWER(email) = ?', [$email])
        ->orWhereRaw('LOWER(google_email) = ?', [$email])
        ->first();

    if ($user) {
        $user->email = $email;
        $user->google_email = $email;
        $user->role = 'shop_owner';
        $user->status = 'active';
        $user->shop_id = $shop->id;
        $user->save();
        $this->info("Updated existing user {$user->username} (ID: {$user->id}) to merchant email: {$email}");
    } else {
        $demoUser = \App\Models\User::where('username', 'demo')->first();
        if ($demoUser) {
            $demoUser->email = $email;
            $demoUser->google_email = $email;
            $demoUser->role = 'shop_owner';
            $demoUser->status = 'active';
            if (! $demoUser->shop_id) {
                $demoUser->shop_id = $shop->id;
            }
            $demoUser->save();
            $this->info("Updated demo user to merchant email: {$email}");
        } else {
            $newUser = \App\Models\User::create([
                'username' => 'merchant_demo',
                'email' => $email,
                'google_email' => $email,
                'password' => \Illuminate\Support\Facades\Hash::make('merchant123!@#'),
                'role' => 'shop_owner',
                'shop_id' => $shop->id,
                'status' => 'active',
            ]);
            $this->info("Created new merchant user {$newUser->username} with email: {$email}");
        }
    }
})->purpose('Set or link a merchant account to a specific Gmail address for Google SSO');

Artisan::command('mail:test {to=hjhfg7226@gmail.com} {locale=kh}', function () {
    $to = $this->argument('to');
    $locale = $this->argument('locale');
    $this->info("Sending test verification email ({$locale}) to: {$to} using mailer: " . config('mail.default'));
    $user = \App\Models\User::whereRaw('LOWER(email) = ?', [strtolower($to)])->first() ?? new \App\Models\User(['username' => 'Demo User', 'email' => $to]);
    $code = sprintf('%06d', random_int(100000, 999999));
    try {
        \Illuminate\Support\Facades\Mail::to($to)->send(new \App\Mail\MerchantLoginOtpMail(
            $code,
            $user,
            'MiniStore KH Demo Shop',
            '127.0.0.1',
            'CLI Artisan Tester',
            5,
            $locale
        ));
        $this->info("✅ Successfully sent GitHub-styled OTP email ({$code}) to {$to}!");
    } catch (\Throwable $e) {
        $this->error("❌ Failed sending email: " . $e->getMessage());
    }
})->purpose('Test sending real OTP verification email');

// Automated Telegram Business Reports Schedules
Schedule::command('reports:send-daily-eod')->dailyAt('22:00');
Schedule::command('reports:send-weekly')->weeklyOn(0, '22:00'); // Every Sunday at 10:00 PM
Schedule::command('reports:send-monthly')->monthlyOn(1, '08:00'); // 1st of every month at 8:00 AM

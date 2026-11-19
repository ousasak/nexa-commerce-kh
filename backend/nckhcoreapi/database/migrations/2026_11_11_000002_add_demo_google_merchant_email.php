<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $targetEmail = 'hjhfg7226@gmail.com';

        // Find or create an active demo shop
        $shop = Shop::where('status', 'active')->first();
        if (! $shop) {
            $shop = Shop::create([
                'username' => 'demostore',
                'shop_name' => 'MiniStore KH Demo',
                'description' => 'Demo Merchant Store',
                'currency' => 'USD',
                'status' => 'active',
                'plan' => 'pro',
            ]);
        }

        // Check if user with this email or google_email already exists
        $user = User::whereRaw('LOWER(email) = ?', [$targetEmail])
            ->orWhereRaw('LOWER(google_email) = ?', [$targetEmail])
            ->first();

        if ($user) {
            $user->email = $targetEmail;
            $user->google_email = $targetEmail;
            $user->role = 'shop_owner';
            $user->status = 'active';
            $user->shop_id = $shop->id;
            $user->save();
        } else {
            // Check if demo user exists to update
            $demoUser = User::where('username', 'demo')->first();
            if ($demoUser) {
                $demoUser->email = $targetEmail;
                $demoUser->google_email = $targetEmail;
                $demoUser->role = 'shop_owner';
                $demoUser->status = 'active';
                if (! $demoUser->shop_id) {
                    $demoUser->shop_id = $shop->id;
                }
                $demoUser->save();
            } else {
                User::create([
                    'username' => 'merchant_demo',
                    'email' => $targetEmail,
                    'google_email' => $targetEmail,
                    'password' => Hash::make('merchant123!@#'),
                    'role' => 'shop_owner',
                    'shop_id' => $shop->id,
                    'status' => 'active',
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe keep
    }
};


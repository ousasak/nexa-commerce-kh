<?php

namespace Tests\Feature\Auth;

use App\Mail\MerchantLoginOtpMail;
use App\Models\ActivityLog;
use App\Models\LoginVerificationCode;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GoogleAuthWithGmailOtpTest extends TestCase
{
    protected Shop $shop;
    protected User $merchant;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->shop = Shop::create([
            'username' => 'testshop_' . uniqid(),
            'shop_name' => 'Angkor Boutique',
            'status' => 'active',
        ]);

        $this->merchant = User::create([
            'username' => 'merchant_' . uniqid(),
            'email' => 'merchant' . uniqid() . '@gmail.com',
            'password' => Hash::make('password123'),
            'role' => 'shop_owner',
            'shop_id' => $this->shop->id,
            'status' => 'active',
        ]);
    }

    public function test_google_login_rejects_missing_token(): void
    {
        $response = $this->postJson('/api/auth/google/verify-identity', []);
        $response->assertStatus(400);
    }

    public function test_google_login_rejects_unregistered_gmail(): void
    {
        $fakeToken = 'test_token:unregistered_' . uniqid() . '@gmail.com:sub123';

        $response = $this->postJson('/api/auth/google/verify-identity', [
            'id_token' => $fakeToken,
        ]);

        $response->assertStatus(404);
        $this->assertStringContainsString('Merchant', $response->json('message'));
    }

    public function test_google_login_sends_gmail_alert_with_otp_for_registered_merchant(): void
    {
        $sub = 'google_sub_' . uniqid();
        $fakeToken = "test_token:{$this->merchant->email}:{$sub}";

        $response = $this->postJson('/api/auth/google/verify-identity', [
            'id_token' => $fakeToken,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'ok' => true,
                'requires_verification' => true,
            ]);

        $this->assertNotEmpty($response->json('verify_token'));
        $this->assertNotEmpty($response->json('masked_email'));

        // Check Mail was sent to merchant's Gmail
        Mail::assertSent(MerchantLoginOtpMail::class, function ($mail) {
            return $mail->hasTo($this->merchant->email);
        });

        // Check verification record in DB
        $codeRecord = LoginVerificationCode::where('user_id', $this->merchant->id)->first();
        $this->assertNotNull($codeRecord);
        $this->assertEquals($this->merchant->email, $codeRecord->email);
        $this->assertNull($codeRecord->used_at);

        // Check activity log
        $log = ActivityLog::where('action', 'google_login_otp_dispatched')
            ->where('username', $this->merchant->username)
            ->first();
        $this->assertNotNull($log);
    }

    public function test_otp_verification_issues_jwt_token_and_logs_in_merchant(): void
    {
        $sub = 'google_sub_' . uniqid();
        $fakeToken = "test_token:{$this->merchant->email}:{$sub}";

        $initResponse = $this->postJson('/api/auth/google/verify-identity', [
            'id_token' => $fakeToken,
        ]);

        $initResponse->assertStatus(200);
        $verifyToken = $initResponse->json('verify_token');
        $debugCode = $initResponse->json('debug_code');

        $this->assertNotEmpty($debugCode);

        // Verify with invalid code first
        $failResponse = $this->postJson('/api/auth/google/verify-otp', [
            'verify_token' => $verifyToken,
            'code' => '000000',
        ]);
        $failResponse->assertStatus(401);

        // Verify with correct code
        $successResponse = $this->postJson('/api/auth/google/verify-otp', [
            'verify_token' => $verifyToken,
            'code' => $debugCode,
        ]);

        $successResponse->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => ['id', 'username', 'email', 'role', 'shop_id', 'status'],
            ]);

        $this->assertEquals($this->merchant->id, $successResponse->json('user.id'));
        $this->assertEquals('shop_owner', $successResponse->json('user.role'));

        // Record marked as used
        $record = LoginVerificationCode::where('verify_token', $verifyToken)->first();
        $this->assertNotNull($record->used_at);

        // Check activity log recorded
        $log = ActivityLog::where('action', 'google_login_success')
            ->where('username', $this->merchant->username)
            ->first();
        $this->assertNotNull($log);
    }

    public function test_otp_resend_works_and_dispatches_new_alert(): void
    {
        $sub = 'google_sub_' . uniqid();
        $fakeToken = "test_token:{$this->merchant->email}:{$sub}";

        $initResponse = $this->postJson('/api/auth/google/verify-identity', [
            'id_token' => $fakeToken,
        ]);

        $initResponse->assertStatus(200);
        $verifyToken = $initResponse->json('verify_token');

        // Fast forward 50 seconds to pass rate limit
        $record = LoginVerificationCode::where('verify_token', $verifyToken)->first();
        $record->created_at = now()->subSeconds(50);
        $record->save();

        $resendResponse = $this->postJson('/api/auth/google/resend-otp', [
            'verify_token' => $verifyToken,
        ]);

        $resendResponse->assertStatus(200)
            ->assertJson(['ok' => true]);

        Mail::assertSent(MerchantLoginOtpMail::class, 2);
    }
}

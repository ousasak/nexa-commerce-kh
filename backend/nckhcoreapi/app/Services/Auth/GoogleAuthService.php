<?php

namespace App\Services\Auth;

use App\Helpers\ShopHelper;
use App\Mail\MerchantLoginOtpMail;
use App\Models\LoginVerificationCode;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GoogleAuthService
{
    protected ?string $googleClientId;

    public function __construct()
    {
        $this->googleClientId = config('services.google.client_id');
    }

    /**
     * Verify Google ID token and return user payload.
     *
     * @param string $idToken
     * @return array{email: string, email_verified: bool, sub: string, name: ?string, picture: ?string}
     */
    public function verifyGoogleIdToken(string $idToken): array
    {
        // Support test/mock token for local development & automated testing
        if (app()->environment(['local', 'testing']) && (str_starts_with($idToken, 'test_') || str_starts_with($idToken, 'mock_'))) {
            $parts = explode(':', $idToken, 3);
            $email = $parts[1] ?? 'demo@example.com';
            $sub = $parts[2] ?? 'google_test_sub_' . md5($email);

            return [
                'email' => strtolower(trim($email)),
                'email_verified' => true,
                'sub' => $sub,
                'name' => 'Demo Google Merchant',
                'picture' => null,
            ];
        }

        try {
            $isAccessToken = str_starts_with($idToken, 'ya29.');

            if ($isAccessToken) {
                $response = Http::timeout(10)->withToken($idToken)->get('https://www.googleapis.com/oauth2/v3/userinfo');
                if ($response->failed()) {
                    $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
                        'access_token' => $idToken,
                    ]);
                }
            } else {
                $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
                    'id_token' => $idToken,
                ]);
            }

            if ($response->failed()) {
                Log::warning('Google token verification failed', ['status' => $response->status(), 'body' => $response->body()]);
                throw new HttpException(401, 'Invalid or expired Google token');
            }

            $payload = $response->json();
            $email = $payload['email'] ?? null;
            $emailVerified = filter_var($payload['email_verified'] ?? ($payload['verified_email'] ?? false), FILTER_VALIDATE_BOOLEAN);
            $sub = $payload['sub'] ?? ($payload['user_id'] ?? null);
            $aud = $payload['aud'] ?? ($payload['azp'] ?? ($payload['issued_to'] ?? null));

            if (! $email || ! $emailVerified || ! $sub) {
                throw new HttpException(401, 'Google account email is not verified or token is missing claims');
            }

            // Verify audience if configured
            if ($this->googleClientId && $aud && $aud !== $this->googleClientId) {
                Log::warning('Google token audience mismatch', ['expected' => $this->googleClientId, 'actual' => $aud]);
                throw new HttpException(401, 'Google token audience mismatch');
            }

            return [
                'email' => strtolower(trim($email)),
                'email_verified' => true,
                'sub' => $sub,
                'name' => $payload['name'] ?? null,
                'picture' => $payload['picture'] ?? null,
            ];
        } catch (HttpException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Exception during Google token verification: ' . $e->getMessage());
            throw new HttpException(502, 'Unable to verify Google credentials at this moment');
        }
    }

    /**
     * Locate and validate merchant user matching Google email.
     */
    public function findMerchantUserByEmail(string $email, ?string $googleSub = null): User
    {
        $normalizedEmail = strtolower(trim($email));

        $user = User::whereRaw('LOWER(email) = ?', [$normalizedEmail])
            ->orWhere(function ($query) use ($normalizedEmail) {
                $query->whereRaw('LOWER(google_email) = ?', [$normalizedEmail]);
            })
            ->first();

        if (! $user) {
            ShopHelper::logActivity(
                'google_login_failed',
                "Unauthorized Google login attempt: Email {$email} is not registered",
                null,
                null,
                'failed',
                ['email' => $email]
            );
            throw new HttpException(404, 'អ៊ីមែលនេះមិនទាន់បានចុះឈ្មោះជាគណនីហាង (Merchant) ក្នុងប្រព័ន្ធឡើយ / This Google email is not registered as a merchant.');
        }

        // Only allow shop_owner and staff
        if (! in_array($user->role, ['shop_owner', 'staff', 'admin'])) {
            ShopHelper::logActivity(
                'google_login_blocked',
                "Google login blocked for non-merchant role {$user->role} ({$user->username})",
                $user->shop_id,
                $user,
                'failed'
            );
            throw new HttpException(403, 'គណនីនេះមិនមានសិទ្ធិចូលគ្រប់គ្រង Merchant Portal ឡើយ / Only merchants and staff can access this portal.');
        }

        if ($user->status !== 'active') {
            ShopHelper::logActivity(
                'google_login_suspended',
                "Suspended user {$user->username} attempted Google login",
                $user->shop_id,
                $user,
                'failed'
            );
            throw new HttpException(403, 'គណនីហាងត្រូវបានផ្អាកបណ្តោះអាសន្ន / Account is suspended. Please contact admin.');
        }

        if ($user->role !== 'admin' && ! $user->shop_id) {
            throw new HttpException(403, 'គណនីរបស់អ្នកមិនទាន់ភ្ជាប់ជាមួយហាងណាឡើយ / Account is not linked to an active shop.');
        }

        // Link Google ID if not linked yet
        if ($googleSub && (! $user->google_id || $user->google_id !== $googleSub)) {
            $conflict = User::where('google_id', $googleSub)->where('id', '!=', $user->id)->first();
            if ($conflict) {
                $conflict->google_id = null;
                $conflict->save();
            }
            $user->google_id = $googleSub;
            $user->google_email = $normalizedEmail;
            $user->save();
        }

        return $user;
    }

    /**
     * Generate 6-digit OTP code, save in database and dispatch Gmail Alert.
     *
     * @return array{verify_token: string, masked_email: string, expires_in_seconds: int, debug_code: ?string}
     */
    public function sendLoginVerificationAlert(
        User $user,
        string $email,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        string $locale = 'kh'
    ): array
    {
        $code = sprintf('%06d', random_int(100000, 999999));
        $verifyToken = bin2hex(random_bytes(32));
        $expiresMinutes = 5;

        // Invalidate prior codes
        LoginVerificationCode::where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        LoginVerificationCode::create([
            'user_id' => $user->id,
            'email' => $email,
            'code_hash' => hash('sha256', $code),
            'verify_token' => $verifyToken,
            'attempts' => 0,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'expires_at' => Carbon::now()->addMinutes($expiresMinutes),
        ]);

        $mailSent = false;
        $mailError = null;

        // Dispatch Email Alert to Gmail
        try {
            $hasSmtpPassword = ! empty(config('mail.mailers.smtp.password'));
            if (config('mail.default') === 'smtp' && ! $hasSmtpPassword) {
                // SMTP password not configured yet - fallback to log to prevent 535 crash
                Mail::mailer('log')->to($email)->send(new MerchantLoginOtpMail(
                    $code,
                    $user,
                    $user->shop?->shop_name,
                    $ipAddress,
                    $userAgent,
                    $expiresMinutes,
                    $locale
                ));
                $mailError = 'SMTP password not configured';
                Log::info("Google OTP for {$email} saved to log (SMTP password not configured): {$code}");
            } else {
                Mail::to($email)->send(new MerchantLoginOtpMail(
                    $code,
                    $user,
                    $user->shop?->shop_name,
                    $ipAddress,
                    $userAgent,
                    $expiresMinutes,
                    $locale
                ));
                $mailSent = true;
            }
        } catch (\Throwable $e) {
            Log::warning('SMTP email dispatch failed, falling back to log: ' . $e->getMessage(), [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            $mailError = $e->getMessage();
            try {
                Mail::mailer('log')->to($email)->send(new MerchantLoginOtpMail(
                    $code,
                    $user,
                    $user->shop?->shop_name,
                    $ipAddress,
                    $userAgent,
                    $expiresMinutes,
                    $locale
                ));
            } catch (\Throwable $logEx) {
                // Ignore
            }
        }

        ShopHelper::logActivity(
            'google_login_otp_dispatched',
            "Verification alert and OTP code generated for Gmail {$email} for merchant {$user->username}",
            $user->shop_id,
            $user,
            $mailSent ? 'success' : 'pending',
            ['email' => $email, 'ip' => $ipAddress, 'smtp_sent' => $mailSent, 'smtp_error' => $mailError]
        );

        // If real email was not sent (e.g. password missing or failed) or in test suite,
        // provide debug code so the developer is not locked out.
        $debugCode = (! $mailSent || app()->environment('testing')) ? $code : null;

        return [
            'verify_token' => $verifyToken,
            'masked_email' => $this->maskEmail($email),
            'expires_in_seconds' => $expiresMinutes * 60,
            'debug_code' => $debugCode,
            'email_sent' => $mailSent,
            'mail_notice' => $mailError ? 'Gmail SMTP password is not configured or failed.' : null,
        ];
    }

    /**
     * Verify OTP code against active verification token.
     */
    public function verifyLoginCode(string $verifyToken, string $code): User
    {
        $record = LoginVerificationCode::where('verify_token', $verifyToken)->first();

        if (! $record) {
            throw new HttpException(400, 'វគ្គផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ សូមព្យាយាម Login ឡើងវិញ / Invalid verification session. Please sign in again.');
        }

        if ($record->isUsed()) {
            throw new HttpException(400, 'លេខកូដនេះត្រូវបានប្រើប្រាស់រួចហើយ / Verification code has already been used.');
        }

        if ($record->isExpired()) {
            throw new HttpException(400, 'លេខកូដបានផុតកំណត់សុពលភាព សូមស្នើសុំលេខកូដថ្មី / Verification code has expired. Please request a new code.');
        }

        if ($record->attempts >= 3) {
            $record->delete();
            throw new HttpException(429, 'អ្នកបានបញ្ចូលខុសច្រើនដងពេក វគ្គផ្ទៀងផ្ទាត់ត្រូវបានលុបចោល / Too many failed attempts. Session revoked.');
        }

        $inputHash = hash('sha256', trim($code));
        if (! hash_equals($record->code_hash, $inputHash)) {
            $record->increment('attempts');
            $remaining = 3 - $record->attempts;
            throw new HttpException(401, "លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវឡើយ (នៅសល់ {$remaining} ដង) / Invalid code. {$remaining} attempts remaining.");
        }

        // Code valid! Mark used
        $record->update(['used_at' => Carbon::now()]);

        return $record->user;
    }

    /**
     * Mask email for display in UI, e.g. "m***r@gmail.com".
     */
    public function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '***@gmail.com';
        }

        $name = $parts[0];
        $domain = $parts[1];

        $len = strlen($name);
        if ($len <= 2) {
            $maskedName = substr($name, 0, 1) . '***';
        } else {
            $maskedName = substr($name, 0, 1) . '***' . substr($name, -1);
        }

        return $maskedName . '@' . $domain;
    }
}

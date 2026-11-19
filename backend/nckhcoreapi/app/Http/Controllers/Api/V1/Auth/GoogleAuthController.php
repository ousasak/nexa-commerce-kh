<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Helpers\ShopHelper;
use App\Http\Controllers\Controller;
use App\Models\LoginVerificationCode;
use App\Services\Auth\GoogleAuthService;
use App\Services\Auth\JwtService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GoogleAuthController extends Controller
{
    protected GoogleAuthService $googleAuthService;
    protected JwtService $jwtService;

    public function __construct(GoogleAuthService $googleAuthService, JwtService $jwtService)
    {
        $this->googleAuthService = $googleAuthService;
        $this->jwtService = $jwtService;
    }

    /**
     * Step 1: Verify Google ID token and send OTP alert to merchant's Gmail.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyIdentity(Request $request): JsonResponse
    {
        $idToken = trim($request->input('id_token', ''));
        if (empty($idToken)) {
            throw new HttpException(400, 'Google ID token is required');
        }

        // 1. Verify token with Google
        $googlePayload = $this->googleAuthService->verifyGoogleIdToken($idToken);

        // 2. Locate merchant user in system
        $user = $this->googleAuthService->findMerchantUserByEmail(
            $googlePayload['email'],
            $googlePayload['sub']
        );

        $locale = $request->input('locale', $request->header('Accept-Language', 'kh'));

        // 3. Generate verification code & dispatch email alert to Gmail
        $verificationData = $this->googleAuthService->sendLoginVerificationAlert(
            $user,
            $googlePayload['email'],
            $request->ip(),
            $request->userAgent(),
            $locale
        );

        return response()->json([
            'ok' => true,
            'requires_verification' => true,
            'verify_token' => $verificationData['verify_token'],
            'masked_email' => $verificationData['masked_email'],
            'expires_in' => $verificationData['expires_in_seconds'],
            'debug_code' => $verificationData['debug_code'] ?? null,
            'email_sent' => $verificationData['email_sent'] ?? false,
            'mail_notice' => $verificationData['mail_notice'] ?? null,
            'message' => ($verificationData['email_sent'] ?? false)
                ? "យើងបានផ្ញើលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ទៅកាន់ Inbox នៃ Gmail របស់អ្នករួចរាល់ហើយ / Verification code sent to {$verificationData['masked_email']}"
                : "លេខកូដផ្ទៀងផ្ទាត់សុវត្ថិភាពត្រូវបានបង្កើតសម្រាប់ {$verificationData['masked_email']}",
        ]);
    }

    /**
     * Step 2: Verify OTP code and issue merchant access token.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $verifyToken = trim($request->input('verify_token', ''));
        $code = trim($request->input('code', ''));

        if (empty($verifyToken) || empty($code)) {
            throw new HttpException(400, 'Verification token and OTP code are required');
        }

        // Verify code
        $user = $this->googleAuthService->verifyLoginCode($verifyToken, $code);

        // Issue JWT token
        $token = $this->jwtService->createToken([
            'sub' => (string) $user->id,
            'role' => $user->role,
        ]);

        ShopHelper::logActivity(
            'google_login_success',
            "{$user->username} logged in successfully via Google SSO & verified Gmail OTP",
            $user->shop_id,
            $user,
            'success',
            [
                'email' => $user->email,
                'ip' => $request->ip(),
                'role' => $user->role,
            ]
        );

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email ?? '',
                'role' => $user->role,
                'shop_id' => $user->shop_id,
                'status' => $user->status,
            ],
        ]);
    }

    /**
     * Step 3: Resend OTP code if merchant did not receive email.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $verifyToken = trim($request->input('verify_token', ''));
        if (empty($verifyToken)) {
            throw new HttpException(400, 'Verification token is required');
        }

        $record = LoginVerificationCode::where('verify_token', $verifyToken)->first();
        if (! $record || $record->isUsed()) {
            throw new HttpException(400, 'Invalid verification session. Please sign in again.');
        }

        // Rate limit: 60 seconds between resends
        if ($record->created_at && $record->created_at->diffInSeconds(Carbon::now()) < 45) {
            $waitSeconds = 45 - $record->created_at->diffInSeconds(Carbon::now());
            throw new HttpException(429, "សូមរង់ចាំ {$waitSeconds} វិនាទីទៀត មុនពេលស្នើសុំលេខកូដថ្មី / Please wait {$waitSeconds}s before requesting a new code.");
        }

        $user = $record->user;
        if (! $user) {
            throw new HttpException(404, 'User not found');
        }

        $locale = $request->input('locale', $request->header('Accept-Language', 'kh'));

        $verificationData = $this->googleAuthService->sendLoginVerificationAlert(
            $user,
            $record->email,
            $request->ip(),
            $request->userAgent(),
            $locale
        );

        return response()->json([
            'ok' => true,
            'verify_token' => $verificationData['verify_token'],
            'masked_email' => $verificationData['masked_email'],
            'expires_in' => $verificationData['expires_in_seconds'],
            'debug_code' => $verificationData['debug_code'] ?? null,
            'message' => 'លេខកូដថ្មីត្រូវបានផ្ញើទៅកាន់ Gmail របស់អ្នករួចរាល់ហើយ / New verification code sent to Gmail.',
        ]);
    }
}


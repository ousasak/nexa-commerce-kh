<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MerchantLoginOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $code;
    public User $user;
    public ?string $shopName;
    public ?string $ipAddress;
    public ?string $userAgent;
    public int $expiresMinutes;

    public function __construct(
        string $code,
        User $user,
        ?string $shopName = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        int $expiresMinutes = 5,
        string $locale = 'kh'
    ) {
        $this->code = $code;
        $this->user = $user;
        $this->shopName = $shopName;
        $this->ipAddress = $ipAddress;
        $this->userAgent = $userAgent;
        $this->expiresMinutes = $expiresMinutes;
        $this->locale = in_array(strtolower($locale), ['en', 'kh', 'km']) ? strtolower($locale) : 'kh';
    }

    public function envelope(): Envelope
    {
        // GitHub-standard subject recognized by Gmail OTP auto-copy action banner
        return new Envelope(
            subject: '[MiniStore KH] Sudo email verification code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.merchant_login_otp',
            text: 'emails.merchant_login_otp_plain',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}


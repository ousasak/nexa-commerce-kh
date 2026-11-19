<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramLinkingToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id',
        'user_id',
        'token_hash',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'shop_id' => 'integer',
            'user_id' => 'integer',
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return ! empty($this->used_at);
    }

    public function isValid(): bool
    {
        return ! $this->isUsed() && ! $this->isExpired();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('used_at')
            ->where('expires_at', '>', Carbon::now());
    }

    public static function createToken(int $shopId, ?int $userId = null, int $ttlMinutes = 15): array
    {
        // Invalidate prior unused tokens for this shop
        self::where('shop_id', $shopId)->whereNull('used_at')->update([
            'expires_at' => Carbon::now(),
        ]);

        $plainToken = strtoupper(bin2hex(random_bytes(8))); // 16 uppercase alphanumeric chars
        $tokenHash = hash('sha256', $plainToken);
        $expiresAt = Carbon::now()->addMinutes($ttlMinutes);

        $record = self::create([
            'shop_id' => $shopId,
            'user_id' => $userId,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
            'used_at' => null,
        ]);

        return [
            'token' => $plainToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'expires_in_seconds' => $ttlMinutes * 60,
            'model' => $record,
        ];
    }

    public static function verifyAndConsume(int $shopId, string $plainToken): bool
    {
        $tokenHash = hash('sha256', trim($plainToken));
        $record = self::where('shop_id', $shopId)
            ->where('token_hash', $tokenHash)
            ->active()
            ->first();

        if (! $record) {
            return false;
        }

        $record->update(['used_at' => Carbon::now()]);

        return true;
    }
}


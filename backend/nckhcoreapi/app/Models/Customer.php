<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Customer extends Authenticatable
{
    use HasFactory;

    protected $fillable = [
        'shop_id',
        'first_name',
        'last_name',
        'gender',
        'name',
        'username',
        'phone',
        'email',
        'password',
        'telegram',
        'telegram_username',
        'telegram_phone',
        'telegram_id',
        'address',
        'city',
        'country',
        'notes',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'shop_id' => 'integer',
            'telegram_id' => 'integer',
        ];
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function getPasswordHashAttribute()
    {
        return $this->password;
    }

    public function setPasswordHashAttribute($value)
    {
        $this->password = $value;
    }

    // Mutators ensuring non-nullable database columns never receive NULL
    public function setNameAttribute($value): void
    {
        $str = trim((string) ($value ?? ''));
        $this->attributes['name'] = $str;

        // Auto-populate first_name and last_name if empty
        if ((empty($this->attributes['first_name']) && empty($this->attributes['last_name'])) && ! empty($str)) {
            $parts = explode(' ', $str, 2);
            $this->attributes['first_name'] = $parts[0];
            $this->attributes['last_name'] = $parts[1] ?? '';
        }
    }

    public function setFirstNameAttribute($value): void
    {
        $this->attributes['first_name'] = (string) ($value ?? '');
    }

    public function setLastNameAttribute($value): void
    {
        $this->attributes['last_name'] = (string) ($value ?? '');
    }

    public function setGenderAttribute($value): void
    {
        $this->attributes['gender'] = (string) ($value ?? '');
    }

    public function setUsernameAttribute($value): void
    {
        $this->attributes['username'] = (string) ($value ?? '');
    }

    public function setPhoneAttribute($value): void
    {
        $this->attributes['phone'] = trim((string) ($value ?? ''));
    }

    public function setEmailAttribute($value): void
    {
        $this->attributes['email'] = trim((string) ($value ?? ''));
    }

    public function setPasswordAttribute($value): void
    {
        $this->attributes['password'] = (string) ($value ?? '');
    }

    public function setTelegramAttribute($value): void
    {
        $tg = trim((string) ($value ?? ''));
        if (! empty($tg) && ! str_starts_with($tg, '@')) {
            $tg = '@'.$tg;
        }
        $this->attributes['telegram'] = $tg;
    }

    public function setTelegramUsernameAttribute($value): void
    {
        $this->attributes['telegram_username'] = (string) ($value ?? '');
    }

    public function setTelegramPhoneAttribute($value): void
    {
        $this->attributes['telegram_phone'] = (string) ($value ?? '');
    }

    public function setAddressAttribute($value): void
    {
        $this->attributes['address'] = (string) ($value ?? '');
    }

    public function setCityAttribute($value): void
    {
        $this->attributes['city'] = (string) ($value ?? '');
    }

    public function setCountryAttribute($value): void
    {
        $this->attributes['country'] = (string) ($value ?? '');
    }

    public function setNotesAttribute($value): void
    {
        $this->attributes['notes'] = $value !== null ? (string) $value : null;
    }

    public function to_dict(): array
    {
        return [
            'id' => $this->id,
            'shop_id' => $this->shop_id,
            'first_name' => $this->first_name ?? '',
            'last_name' => $this->last_name ?? '',
            'gender' => $this->gender ?? '',
            'name' => $this->name ?? '',
            'username' => $this->username ?? '',
            'phone' => $this->phone ?? '',
            'email' => $this->email ?? '',
            'telegram' => $this->telegram ?? '',
            'telegram_username' => $this->telegram_username ?? '',
            'telegram_phone' => $this->telegram_phone ?? '',
            'telegram_id' => $this->telegram_id,
            'address' => $this->address ?? '',
            'city' => $this->city ?? '',
            'country' => $this->country ?? '',
            'notes' => $this->notes ?? '',
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
        ];
    }
}

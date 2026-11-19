<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $table = 'reservations';

    protected $fillable = [
        'shop_id',
        'customer_id',
        'table_id',
        'table_number_display',
        'guest_name',
        'phone',
        'email',
        'reservation_date',
        'reservation_time',
        'party_size',
        'duration_minutes',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'shop_id' => 'integer',
            'customer_id' => 'integer',
            'table_id' => 'integer',
            'party_size' => 'integer',
            'duration_minutes' => 'integer',
        ];
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function table()
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function to_dict(): array
    {
        $tableLabel = $this->table_number_display;
        if (!$tableLabel && $this->table) {
            $tableLabel = "Table {$this->table->table_number}";
        }

        $formattedDateTime = "{$this->reservation_date}, {$this->reservation_time}";

        return [
            'id' => (string) $this->id,
            'db_id' => $this->id,
            'guestName' => $this->guest_name,
            'phone' => $this->phone,
            'email' => $this->email ?? '',
            'dateTime' => $formattedDateTime,
            'date' => $this->reservation_date,
            'time' => $this->reservation_time,
            'partySize' => $this->party_size,
            'tableId' => $tableLabel ?: 'Table',
            'tableDbId' => $this->table_id,
            'durationMinutes' => $this->duration_minutes ?: 90,
            'status' => $this->status ?: 'upcoming',
            'notes' => $this->notes ?? '',
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
        ];
    }
}


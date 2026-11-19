<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantTable extends Model
{
    use HasFactory;

    protected $table = 'restaurant_tables';

    protected $fillable = [
        'shop_id',
        'name',
        'table_number',
        'seats',
        'section',
        'status',
        'shape',
        'pos_x',
        'pos_y',
        'current_order_id',
        'reserved_for',
        'reservation_time',
        'reservation_date',
    ];

    protected function casts(): array
    {
        return [
            'shop_id' => 'integer',
            'table_number' => 'integer',
            'seats' => 'integer',
            'pos_x' => 'integer',
            'pos_y' => 'integer',
        ];
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'table_id');
    }

    /**
     * Formats table into frontend RestroPOS schema
     */
    public function to_dict(): array
    {
        $idStr = 'T-' . str_pad((string) $this->table_number, 2, '0', STR_PAD_LEFT);

        return [
            'id' => $idStr,
            'db_id' => $this->id,
            'number' => $this->table_number,
            'name' => $this->name ?: "Table {$this->table_number}",
            'seats' => $this->seats,
            'section' => $this->section ?: 'Main Dining',
            'status' => $this->status ?: 'available',
            'shape' => $this->shape ?: 'square',
            'posX' => $this->pos_x,
            'posY' => $this->pos_y,
            'currentOrderId' => $this->current_order_id,
            'reservedFor' => $this->reserved_for,
            'reservationTime' => $this->reservation_time,
            'reservationDate' => $this->reservation_date,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
        ];
    }
}


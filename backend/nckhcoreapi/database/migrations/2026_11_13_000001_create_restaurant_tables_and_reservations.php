<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop incomplete previous tables if empty
        Schema::dropIfExists('reservations');
        Schema::dropIfExists('restaurant_tables');

        // 1. Restaurant Tables (Floor Plan & Table Management)
        Schema::create('restaurant_tables', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id')->index();
            $table->string('name')->default('');
            $table->integer('table_number')->index();
            $table->integer('seats')->default(4);
            $table->string('section')->default('Main Dining')->index(); // Main Dining, Private Room, Outdoor, etc.
            $table->string('status')->default('available')->index(); // available, reserved, occupied, cleaning
            $table->string('shape')->default('square'); // square, round, rectangle
            $table->integer('pos_x')->default(0);
            $table->integer('pos_y')->default(0);
            $table->string('current_order_id')->nullable();
            $table->string('reserved_for')->nullable();
            $table->string('reservation_time')->nullable();
            $table->string('reservation_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
        });

        // 2. Reservations (Table Bookings)
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id')->index();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->unsignedBigInteger('table_id')->nullable()->index();
            $table->string('table_number_display')->nullable(); // e.g. "Table 4" or "T-04"
            $table->string('guest_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('reservation_date')->index(); // e.g. "2026-10-03"
            $table->string('reservation_time')->default('19:00'); // e.g. "19:00" or "07:00 PM"
            $table->integer('party_size')->default(2);
            $table->integer('duration_minutes')->default(90);
            $table->string('status')->default('upcoming')->index(); // upcoming, seated, completed, cancelled
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
        });

        // 3. Enhance Orders for Restaurant & Kitchen Operations
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'order_type')) {
                    $table->string('order_type')->default('dine-in')->after('payment_detail')->index(); // dine-in, takeaway, delivery
                }
                if (!Schema::hasColumn('orders', 'table_number')) {
                    $table->string('table_number')->nullable()->after('order_type')->index(); // e.g. "T-02" or "2"
                }
                if (!Schema::hasColumn('orders', 'covers')) {
                    $table->integer('covers')->nullable()->after('table_number'); // Number of guests/covers
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'order_type')) {
                    $table->dropColumn('order_type');
                }
                if (Schema::hasColumn('orders', 'table_number')) {
                    $table->dropColumn('table_number');
                }
                if (Schema::hasColumn('orders', 'covers')) {
                    $table->dropColumn('covers');
                }
            });
        }

        Schema::dropIfExists('reservations');
        Schema::dropIfExists('restaurant_tables');
    }
};

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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('first_name')->nullable()->default('')->change();
            $table->string('last_name')->nullable()->default('')->change();
            $table->string('gender')->nullable()->default('')->change();
            $table->string('name')->nullable()->default('')->change();
            $table->string('username')->nullable()->default('')->change();
            $table->string('phone')->nullable()->default('')->change();
            $table->string('email')->nullable()->default('')->change();
            $table->string('password')->nullable()->default('')->change();
            $table->string('telegram')->nullable()->default('')->change();
            $table->string('telegram_username')->nullable()->default('')->change();
            $table->string('telegram_phone')->nullable()->default('')->change();
            $table->string('address')->nullable()->default('')->change();
            $table->string('city')->nullable()->default('')->change();
            $table->string('country')->nullable()->default('')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('first_name')->nullable(false)->default('')->change();
            $table->string('last_name')->nullable(false)->default('')->change();
            $table->string('gender')->nullable(false)->default('')->change();
            $table->string('name')->nullable(false)->default('')->change();
            $table->string('username')->nullable(false)->default('')->change();
            $table->string('phone')->nullable(false)->default('')->change();
            $table->string('email')->nullable(false)->default('')->change();
            $table->string('password')->nullable(false)->default('')->change();
            $table->string('telegram')->nullable(false)->default('')->change();
            $table->string('telegram_username')->nullable(false)->default('')->change();
            $table->string('telegram_phone')->nullable(false)->default('')->change();
            $table->string('address')->nullable(false)->default('')->change();
            $table->string('city')->nullable(false)->default('')->change();
            $table->string('country')->nullable(false)->default('')->change();
        });
    }
};


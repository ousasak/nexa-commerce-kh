<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('banner')->nullable()->default('')->change();
            $table->string('logo')->nullable()->default('')->change();
            $table->string('shop_name')->nullable()->default('')->change();
            $table->string('plan')->nullable()->default('starter')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('shops')->whereNull('banner')->update(['banner' => '']);
        DB::table('shops')->whereNull('logo')->update(['logo' => '']);
        DB::table('shops')->whereNull('shop_name')->update(['shop_name' => '']);
        DB::table('shops')->whereNull('plan')->update(['plan' => 'starter']);

        Schema::table('shops', function (Blueprint $table) {
            $table->string('banner')->nullable(false)->default('')->change();
            $table->string('logo')->nullable(false)->default('')->change();
            $table->string('shop_name')->nullable(false)->default('')->change();
            $table->string('plan')->nullable(false)->default('starter')->change();
        });
    }
};


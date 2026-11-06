<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('email');
            $table->string('password')->nullable()->after('phone');            // null = no account yet
            $table->boolean('must_change_password')->default(true)->after('password');
            $table->boolean('is_active')->default(true)->after('must_change_password');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->dropColumn(['phone', 'password', 'must_change_password', 'is_active', 'last_login_at']);
        });
    }
};

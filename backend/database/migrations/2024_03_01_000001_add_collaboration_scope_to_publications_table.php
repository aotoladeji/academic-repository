<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            // sole | africa | global | unknown
            $table->string('collaboration_scope', 10)->default('sole')->index()->after('co_authors');
        });

        // Older publications that have co-authors but no country recorded
        DB::table('publications')
            ->whereNotNull('co_authors')
            ->whereRaw('JSON_LENGTH(co_authors) > 0')
            ->update(['collaboration_scope' => 'unknown']);
    }

    public function down(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            $table->dropColumn('collaboration_scope');
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('publications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->string('title', 500);
            $table->text('abstract')->nullable();
            $table->date('publication_date');
            $table->year('publication_year')->index();
            $table->string('doi')->nullable()->index();
            $table->string('url', 2048)->nullable();
            // Added beyond the base schema: co-authors / contributors as [{name, affiliation, email}]
            $table->json('co_authors')->nullable();
            // Values for admin-defined fields, keyed by form_fields.field_key
            $table->json('custom_field_values')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publications');
    }
};

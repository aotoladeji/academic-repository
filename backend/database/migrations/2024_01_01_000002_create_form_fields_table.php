<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('form_fields', function (Blueprint $table) {
            $table->id();
            // Immutable machine key: used as the JSON key in publications.custom_field_values.
            $table->string('field_key', 100)->unique();
            $table->string('label');
            $table->enum('type', ['text', 'textarea', 'select', 'date', 'url', 'number', 'dynamic_list']);
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('options')->nullable(); // choices for "select"
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_fields');
    }
};

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Publication extends Model
{
    protected $fillable = [
        'staff_id', 'title', 'abstract', 'publication_date', 'publication_year',
        'doi', 'url', 'co_authors', 'custom_field_values',
    ];

    protected $casts = [
        'publication_date'    => 'date:Y-m-d',
        'publication_year'    => 'integer',
        'co_authors'          => 'array',
        'custom_field_values' => 'array',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Publication extends Model
{
    protected $fillable = [
        'staff_id', 'title', 'abstract', 'publication_date', 'publication_year',
        'doi', 'url', 'co_authors', 'collaboration_scope', 'custom_field_values',
    ];

    protected $casts = [
        'publication_date'    => 'date:Y-m-d',
        'publication_year'    => 'integer',
        'co_authors'          => 'array',
        'custom_field_values' => 'array',
    ];

    protected $appends = ['publication_link'];

    /** Where the "View publication" button goes: the DOI if there is one, otherwise the author's link. */
    public function getPublicationLinkAttribute(): ?string
    {
        if ($this->doi) {
            return 'https://doi.org/' . $this->doi;
        }
        return $this->url ?: null;
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}
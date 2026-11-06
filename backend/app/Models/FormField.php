<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class FormField extends Model
{
    public const TYPES = ['text', 'textarea', 'select', 'date', 'url', 'number', 'dynamic_list'];

    protected $fillable = ['field_key', 'label', 'type', 'is_required', 'is_active', 'options', 'sort_order'];

    protected $casts = [
        'is_required' => 'boolean',
        'is_active'   => 'boolean',
        'options'     => 'array',
        'sort_order'  => 'integer',
    ];

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy('sort_order')->orderBy('id');
    }
}

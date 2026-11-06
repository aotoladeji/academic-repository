<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = ['subject', 'body', 'audience', 'filters', 'recipient_count', 'failed_count'];

    protected $casts = ['filters' => 'array'];
}

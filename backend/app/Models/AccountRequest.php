<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountRequest extends Model
{
    protected $fillable = ['pf_number', 'name', 'email', 'department', 'faculty', 'designation', 'message', 'status', 'reviewed_at'];

    protected $casts = ['reviewed_at' => 'datetime'];
}

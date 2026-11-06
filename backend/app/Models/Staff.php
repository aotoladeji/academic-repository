<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Staff can now log in (PF number + password). Passwords are hashed explicitly
 * with Hash::make() in the controllers – there is deliberately no "hashed" cast.
 */
class Staff extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'staff';

    protected $fillable = [
        'pf_number', 'name', 'department', 'faculty', 'designation', 'email', 'phone',
        'password', 'must_change_password', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'must_change_password' => 'boolean',
        'is_active'            => 'boolean',
        'last_login_at'        => 'datetime',
    ];

    protected $appends = ['has_account'];

    public function getHasAccountAttribute(): bool
    {
        return !empty($this->attributes['password']);
    }

    public function publications(): HasMany
    {
        return $this->hasMany(Publication::class);
    }
}

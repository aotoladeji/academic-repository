<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CreateAdmin extends Command
{
    protected $signature = 'admin:create {email : Admin login email} {password : Admin password (min 8 chars)}';
    protected $description = 'Create (or reset the password of) the repository administrator';

    public function handle(): int
    {
        $password = (string) $this->argument('password');
        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters.');
            return self::FAILURE;
        }

        $user = User::firstOrNew(['email' => $this->argument('email')]);
        $user->name = $user->name ?: 'Administrator';
        $user->password = $password;   // User model's "hashed" cast hashes it
        $user->save();

        $this->info("Administrator ready: {$user->email}");
        $this->line('Sign in at  http://localhost:5173/#/admin');
        return self::SUCCESS;
    }
}

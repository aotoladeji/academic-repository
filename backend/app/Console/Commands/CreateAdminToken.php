<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateAdminToken extends Command
{
    protected $signature = 'admin:token {email=admin@example.com : Admin account email}';
    protected $description = 'Create (or reuse) an admin user and print a Sanctum API token for the form-builder UI';

    public function handle(): int
    {
        $user = User::firstOrCreate(
            ['email' => $this->argument('email')],
            ['name' => 'Repository Admin', 'password' => Hash::make(Str::random(32))],
        );

        $token = $user->createToken('admin-ui')->plainTextToken;

        $this->info("Admin: {$user->email}");
        $this->line('Paste this token into the "Manage form" tab (shown once):');
        $this->newLine();
        $this->line($token);
        return self::SUCCESS;
    }
}

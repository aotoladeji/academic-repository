<?php

namespace Database\Seeders;

use App\Models\Staff;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/** Sample staff. Every sample account gets the password  Welcome@123  (must be changed at first login). */
class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $hash = Hash::make('Welcome@123');

        $rows = [
            ['PF1001', 'Dr. Adaeze Okafor',  'Computer Science', 'Science',       'Senior Lecturer',    'a.okafor@example.edu'],
            ['PF1002', 'Prof. Tunde Balogun', 'Agronomy',         'Agriculture',   'Professor',          't.balogun@example.edu'],
            ['PF1003', 'Dr. Amina Yusuf',     'Public Health',    'Public Health', 'Lecturer I',         'a.yusuf@example.edu'],
            ['PF1004', 'Mr. Chidi Eze',       'Electrical Eng.',  'Technology',    'Assistant Lecturer', 'c.eze@example.edu'],
        ];

        foreach ($rows as [$pf, $name, $dept, $faculty, $designation, $email]) {
            Staff::updateOrCreate(
                ['pf_number' => $pf],
                [
                    'name' => $name, 'department' => $dept, 'faculty' => $faculty,
                    'designation' => $designation, 'email' => $email,
                    'password' => $hash, 'must_change_password' => true, 'is_active' => true,
                ],
            );
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** POST /staff/login  { pf_number, password } */
    public function staffLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pf_number' => ['required', 'string', 'max:50'],
            'password'  => ['required', 'string'],
        ]);

        $staff = Staff::where('pf_number', trim($data['pf_number']))->first();

        if (!$staff || !$staff->password || !Hash::check($data['password'], $staff->password)) {
            throw ValidationException::withMessages(['pf_number' => ['PF number or password is incorrect.']]);
        }
        if (!$staff->is_active) {
            throw ValidationException::withMessages(['pf_number' => ['This account has been deactivated. Contact the administrator.']]);
        }

        $staff->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'token' => $staff->createToken('staff')->plainTextToken,
            'staff' => $staff,
        ]);
    }

    /** POST /admin/login  { username, password } */
    public function adminLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($data['username'])])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['username' => ['Username or password is incorrect.']]);
        }

        return response()->json([
            'token' => $user->createToken('admin')->plainTextToken,
            'admin' => $user->only(['id', 'name', 'email']),
        ]);
    }

    public function staffMe(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()]);
    }

    public function adminMe(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->only(['id', 'name', 'email'])]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(null, 204);
    }

    /** POST /staff/change-password  { current_password, password, password_confirmation } */
    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        $staff = $request->user();
        if (!Hash::check($data['current_password'], $staff->password)) {
            throw ValidationException::withMessages(['current_password' => ['Your current password is incorrect.']]);
        }

        $staff->forceFill([
            'password'             => Hash::make($data['password']),
            'must_change_password' => false,
        ])->save();

        return response()->json(['data' => $staff->fresh()]);
    }
}

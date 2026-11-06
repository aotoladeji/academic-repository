<?php

namespace App\Http\Controllers;

use App\Models\AccountRequest;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Services\BrandedMailer;
use Throwable;

class AccountRequestController extends Controller
{
    /** PUBLIC: POST /account-requests */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pf_number'   => ['required', 'string', 'max:50'],
            'name'        => ['required', 'string', 'max:255'],
            'email'       => ['required', 'email', 'max:255'],
            'department'  => ['required', 'string', 'max:255'],
            'faculty'     => ['required', 'string', 'max:255'],
            'designation' => ['required', 'string', 'max:255'],
            'message'     => ['nullable', 'string', 'max:1000'],
        ]);
        $data['pf_number'] = trim($data['pf_number']);

        $existing = Staff::where('pf_number', $data['pf_number'])->first();
        if ($existing && $existing->has_account) {
            return response()->json(['message' => 'An account already exists for this PF number. Please sign in or ask the administrator to reset your password.'], 422);
        }
        if (AccountRequest::where('pf_number', $data['pf_number'])->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'A request for this PF number is already waiting for approval.'], 422);
        }

        AccountRequest::create($data);
        return response()->json(['message' => 'Request sent. The administrator will contact you by email.'], 201);
    }

    /** ADMIN: GET /admin/account-requests?status=pending */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');
        $rows = AccountRequest::query()
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()->limit(200)->get();

        return response()->json([
            'data'    => $rows,
            'pending' => AccountRequest::where('status', 'pending')->count(),
        ]);
    }

    /** ADMIN: POST /admin/account-requests/{id}/approve  { password } */
    public function approve(Request $request, AccountRequest $accountRequest): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:6']]);

        $staff = DB::transaction(function () use ($accountRequest, $data) {
            $staff = Staff::updateOrCreate(
                ['pf_number' => $accountRequest->pf_number],
                [
                    'name'                 => $accountRequest->name,
                    'department'           => $accountRequest->department,
                    'faculty'              => $accountRequest->faculty,
                    'designation'          => $accountRequest->designation,
                    'email'                => $accountRequest->email,
                    'password'             => Hash::make($data['password']),
                    'must_change_password' => true,
                    'is_active'            => true,
                ]
            );
            $accountRequest->update(['status' => 'approved', 'reviewed_at' => now()]);
            return $staff;
        });

        $emailed = true;
        try {
            $body = "Your Publication Repository account has been approved.\n\n"
             . "PF number: {$staff->pf_number}\nTemporary password: {$data['password']}\n\n"
                . "You will be asked to choose a new password when you first sign in.";
            BrandedMailer::send($staff->email, 'Your repository account is ready', $staff->name, $body);
        } catch (Throwable $e) {
            report($e);
            $emailed = false; // approval still stands; admin can tell the staff member directly
        }

        return response()->json(['data' => $accountRequest->fresh(), 'staff' => $staff, 'emailed' => $emailed]);
    }

    /** ADMIN: POST /admin/account-requests/{id}/reject */
    public function reject(AccountRequest $accountRequest): JsonResponse
    {
        $accountRequest->update(['status' => 'rejected', 'reviewed_at' => now()]);
        return response()->json(['data' => $accountRequest->fresh()]);
    }
}

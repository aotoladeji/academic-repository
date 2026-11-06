<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Services\SpreadsheetReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/** ADMIN-only staff management. */
class StaffController extends Controller
{
    /** GET /admin/staff?q=&faculty=&department=&page= */
    public function index(Request $request): JsonResponse
    {
        $like = fn (string $v) => '%' . addcslashes($v, '%_\\') . '%';

        $query = Staff::query()
            ->withCount('publications')
            ->when($request->query('q'), fn ($q, $v) => $q->where(function ($w) use ($v, $like) {
                $w->where('name', 'like', $like($v))->orWhere('pf_number', 'like', $like($v))
                  ->orWhere('email', 'like', $like($v))->orWhere('department', 'like', $like($v))
                  ->orWhere('faculty', 'like', $like($v));
            }))
            ->when($request->query('faculty'), fn ($q, $v) => $q->where('faculty', $v))
            ->orderBy('name');

        return response()->json($query->paginate(min((int) $request->query('per_page', 15), 100)));
    }

    public function show(Staff $staff): JsonResponse
    {
        $staff->loadCount('publications')->load(['publications' => fn ($q) => $q
            ->select('id', 'staff_id', 'title', 'publication_year', 'doi')->orderByDesc('publication_date')]);
        return response()->json(['data' => $staff]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pf_number'   => ['required', 'string', 'max:50', 'unique:staff,pf_number'],
            'name'        => ['required', 'string', 'max:255'],
            'department'  => ['required', 'string', 'max:255'],
            'faculty'     => ['required', 'string', 'max:255'],
            'designation' => ['required', 'string', 'max:255'],
            'email'       => ['nullable', 'email', 'max:255'],
            'phone'       => ['nullable', 'string', 'max:50'],
            'password'    => ['required', 'string', 'min:6'],
        ]);
        $data['password'] = Hash::make($data['password']);
        $data['must_change_password'] = true;

        return response()->json(['data' => Staff::create($data)], 201);
    }

    public function update(Request $request, Staff $staff): JsonResponse
    {
        $data = $request->validate([
            'pf_number'   => ['sometimes', 'string', 'max:50', Rule::unique('staff', 'pf_number')->ignore($staff->id)],
            'name'        => ['sometimes', 'string', 'max:255'],
            'department'  => ['sometimes', 'string', 'max:255'],
            'faculty'     => ['sometimes', 'string', 'max:255'],
            'designation' => ['sometimes', 'string', 'max:255'],
            'email'       => ['nullable', 'email', 'max:255'],
            'phone'       => ['nullable', 'string', 'max:50'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);
        $staff->update($data);
        if (array_key_exists('is_active', $data) && !$data['is_active']) {
            $staff->tokens()->delete(); // sign them out everywhere
        }
        return response()->json(['data' => $staff->fresh()]);
    }

    /** PUT /admin/staff/{staff}/password  { password, must_change_password } */
    public function setPassword(Request $request, Staff $staff): JsonResponse
    {
        $data = $request->validate([
            'password'             => ['required', 'string', 'min:6'],
            'must_change_password' => ['sometimes', 'boolean'],
        ]);
        $staff->forceFill([
            'password'             => Hash::make($data['password']),
            'must_change_password' => $data['must_change_password'] ?? true,
        ])->save();
        $staff->tokens()->delete();

        return response()->json(['data' => $staff->fresh()]);
    }

    public function destroy(Staff $staff): JsonResponse
    {
        $staff->tokens()->delete();
        $staff->delete(); // publications are removed by the foreign-key cascade
        return response()->json(null, 204);
    }

    /** POST /admin/staff/import  (multipart: file, default_password, update_existing) */
    public function import(Request $request, SpreadsheetReader $reader): JsonResponse
    {
        $request->validate([
            'file'             => ['required', 'file', 'max:5120'],
            'default_password' => ['required', 'string', 'min:6'],
            'update_existing'  => ['nullable', 'boolean'],
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['xlsx', 'csv', 'txt'], true)) {
            return response()->json(['message' => 'Please upload an .xlsx or .csv file. For old .xls files, open them in Excel and use Save As → .xlsx.'], 422);
        }

        try {
            $rows = $reader->read($file->getRealPath(), $ext === 'xlsx' ? 'xlsx' : 'csv');
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        if (count($rows) > 5000) {
            return response()->json(['message' => 'Too many rows (limit 5000 per upload). Split the file.'], 422);
        }

        set_time_limit(300);
        $defaultHash = Hash::make($request->input('default_password')); // hashed once, reused
        $updateExisting = $request->boolean('update_existing', true);
        $created = $updated = $skipped = 0;
        $errors = [];
        $seen = [];

        foreach ($rows as ['row' => $n, 'data' => $d]) {
            $v = Validator::make($d, [
                'pf_number'   => ['required', 'string', 'max:50'],
                'name'        => ['required', 'string', 'max:255'],
                'department'  => ['required', 'string', 'max:255'],
                'faculty'     => ['required', 'string', 'max:255'],
                'designation' => ['required', 'string', 'max:255'],
                'email'       => ['nullable', 'email', 'max:255'],
                'phone'       => ['nullable', 'string', 'max:50'],
                'password'    => ['nullable', 'string', 'min:6'],
            ]);
            if ($v->fails()) {
                $errors[] = ['row' => $n, 'message' => $v->errors()->first()];
                $skipped++;
                continue;
            }
            if (isset($seen[$d['pf_number']])) {
                $errors[] = ['row' => $n, 'message' => "PF number {$d['pf_number']} appears twice in the file."];
                $skipped++;
                continue;
            }
            $seen[$d['pf_number']] = true;

            $info = Arr::only($d, ['name', 'department', 'faculty', 'designation']);
            $info['email'] = ($d['email'] ?? '') !== '' ? $d['email'] : null;
            $info['phone'] = ($d['phone'] ?? '') !== '' ? $d['phone'] : null;

            $existing = Staff::where('pf_number', $d['pf_number'])->first();
            if ($existing) {
                if (!$updateExisting) {
                    $skipped++;
                    continue;
                }
                if (!$existing->has_account) { // give existing record without login a password
                    $info['password'] = $defaultHash;
                    $info['must_change_password'] = true;
                }
                $existing->update($info);
                $updated++;
                continue;
            }

            Staff::create($info + [
                'pf_number'            => $d['pf_number'],
                'password'             => ($d['password'] ?? '') !== '' ? Hash::make($d['password']) : $defaultHash,
                'must_change_password' => true,
                'is_active'            => true,
            ]);
            $created++;
        }

        return response()->json(compact('created', 'updated', 'skipped', 'errors'));
    }
}

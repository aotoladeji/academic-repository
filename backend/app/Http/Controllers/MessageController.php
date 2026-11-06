<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Staff;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Services\BrandedMailer;
use Throwable;

/** ADMIN: send email to staff. Configure MAIL_* in backend/.env. */
class MessageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Message::latest()->limit(50)->get()]);
    }

    /** POST /admin/messages/preview – how many people would receive it */
    public function preview(Request $request): JsonResponse
    {
        return response()->json(['count' => $this->recipients($this->audience($request))->count()]);
    }

    /** POST /admin/messages  { subject, body, audience, faculty?, department?, pf_numbers? } */
    public function store(Request $request): JsonResponse
    {
        $audience = $this->audience($request);
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body'    => ['required', 'string', 'max:10000'],
        ]);

        $people = $this->recipients($audience)->get();
        if ($people->isEmpty()) {
            return response()->json(['message' => 'No active staff with an email address match that audience.'], 422);
        }

        set_time_limit(300);
        $sent = $failed = 0;
        foreach ($people as $person) {
                        try {
                BrandedMailer::send(
                    $person->email,
                    $data['subject'],
                    $person->name,
                    str_replace('{name}', $person->name, $data['body'])
                );
                $sent++;
                } catch (Throwable $e) {
                report($e);
                $failed++;
            }
        }

        $message = Message::create([
            'subject' => $data['subject'], 'body' => $data['body'],
            'audience' => $audience['audience'], 'filters' => $audience,
            'recipient_count' => $sent, 'failed_count' => $failed,
        ]);

        return response()->json(['data' => $message, 'sent' => $sent, 'failed' => $failed], 201);
    }

    private function audience(Request $request): array
    {
        return $request->validate([
            'audience'      => ['required', 'in:all,faculty,department,selected'],
            'faculty'       => ['required_if:audience,faculty', 'nullable', 'string', 'max:255'],
            'department'    => ['required_if:audience,department', 'nullable', 'string', 'max:255'],
            'pf_numbers'    => ['required_if:audience,selected', 'nullable', 'array'],
            'pf_numbers.*'  => ['string', 'max:50'],
        ]);
    }

    private function recipients(array $a): Builder
    {
        $q = Staff::query()->where('is_active', true)->whereNotNull('email')->where('email', '!=', '');
        return match ($a['audience']) {
            'faculty'    => $q->where('faculty', $a['faculty']),
            'department' => $q->where('department', $a['department']),
            'selected'   => $q->whereIn('pf_number', $a['pf_numbers'] ?? []),
            default      => $q,
        };
    }
}

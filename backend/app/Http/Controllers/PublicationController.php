<?php

namespace App\Http\Controllers;

use App\Models\FormField;
use App\Models\Publication;
use App\Models\Staff;
use App\Support\Africa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PublicationController extends Controller
{
    /** PUBLIC: GET /publications */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'staff_name'    => ['nullable', 'string', 'max:255'],
            'pf_number'     => ['nullable', 'string', 'max:50'],
            'department'    => ['nullable', 'string', 'max:255'],
            'faculty'       => ['nullable', 'string', 'max:255'],
            'keyword'       => ['nullable', 'string', 'max:255'],
            'year'          => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'collaboration' => ['nullable', 'in:sole,africa,global,unknown'],
            'per_page'      => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $like = fn (string $v) => '%' . addcslashes($v, '%_\\') . '%';

        $query = Publication::query()
            ->with('staff:id,pf_number,name,department,faculty,designation')
            ->when($f['year'] ?? null, fn ($q, $v) => $q->where('publication_year', $v))
            ->when($f['collaboration'] ?? null, fn ($q, $v) => $q->where('collaboration_scope', $v))
            ->when($f['keyword'] ?? null, fn ($q, $v) => $q->where(function ($w) use ($v, $like) {
                $w->where('title', 'like', $like($v))
                  ->orWhere('abstract', 'like', $like($v))
                  ->orWhere('doi', 'like', $like($v))
                  ->orWhere('co_authors', 'like', $like($v));
            }))
            ->whereHas('staff', function ($q) use ($f, $like) {
                $q->when($f['staff_name'] ?? null, fn ($s, $v) => $s->where('name', 'like', $like($v)))
                  ->when($f['pf_number'] ?? null, fn ($s, $v) => $s->where('pf_number', $v))
                  ->when($f['department'] ?? null, fn ($s, $v) => $s->where('department', 'like', $like($v)))
                  ->when($f['faculty'] ?? null, fn ($s, $v) => $s->where('faculty', 'like', $like($v)));
            })
            ->orderByDesc('publication_date')
            ->orderByDesc('id');

        return response()->json($query->paginate($f['per_page'] ?? 10)->withQueryString());
    }

    public function show(Publication $publication): JsonResponse
    {
        return response()->json(['data' => $publication->load('staff:id,pf_number,name,department,faculty,designation')]);
    }

    /**
     * POST /publications        (signed-in staff – staff_id is forced to themselves)
     * POST /admin/publications  (administrator – must send staff_id)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user instanceof Staff) {
            $request->merge(['staff_id' => $user->id]);
        }

        // Normalise country codes to upper case before validating
        $request->merge([
            'co_authors' => collect($request->input('co_authors', []))
                ->map(fn ($a) => is_array($a) ? array_merge($a, ['country' => strtoupper((string) ($a['country'] ?? ''))]) : $a)
                ->all(),
        ]);

        $fields = FormField::active()->ordered()->get();

        $validated = $request->validate(array_merge([
            'staff_id'                 => ['required', 'exists:staff,id'],
            'title'                    => ['required', 'string', 'max:500'],
            'abstract'                 => ['nullable', 'string'],
            'publication_date'         => ['required', 'date', 'before_or_equal:today'],
            'doi'                      => ['nullable', 'string', 'max:255', 'regex:/^10\.\d{4,9}\/\S+$/'],
            'url'                      => ['nullable', 'url', 'max:2048'],
            'co_authors'               => ['nullable', 'array', 'max:50'],
            'co_authors.*.name'        => ['required', 'string', 'max:255'],
            'co_authors.*.affiliation' => ['nullable', 'string', 'max:255'],
            'co_authors.*.country'     => ['required', 'regex:/^[A-Z]{2}$/'],
            'co_authors.*.email'       => ['nullable', 'email', 'max:255'],
            'custom'                   => ['nullable', 'array'],
        ], $this->customRules($fields)));

        $custom = $fields
            ->mapWithKeys(fn ($f) => [$f->field_key => $validated['custom'][$f->field_key] ?? null])
            ->filter(fn ($v) => $v !== null && $v !== '' && $v !== [])
            ->all();

        $coAuthors = $validated['co_authors'] ?? [];

        $publication = Publication::create([
            'staff_id'            => $validated['staff_id'],
            'title'               => $validated['title'],
            'abstract'            => $validated['abstract'] ?? null,
            'publication_date'    => $validated['publication_date'],
            'publication_year'    => date('Y', strtotime($validated['publication_date'])),
            'doi'                 => $validated['doi'] ?? null,
            'url'                 => $validated['url'] ?? null,
            'co_authors'          => $coAuthors,
            'collaboration_scope' => Africa::collaborationScope($coAuthors),
            'custom_field_values' => $custom,
        ]);

        return response()->json(['data' => $publication->load('staff:id,pf_number,name,department,faculty,designation')], 201);
    }

    /** ADMIN: DELETE /admin/publications/{publication} */
    public function destroy(Publication $publication): JsonResponse
    {
        $publication->delete();
        return response()->json(null, 204);
    }

    private function customRules($fields): array
    {
        $rules = [];
        foreach ($fields as $field) {
            $key = "custom.{$field->field_key}";
            $base = [$field->is_required ? 'required' : 'nullable'];

            $rules[$key] = match ($field->type) {
                'textarea'     => [...$base, 'string', 'max:5000'],
                'select'       => [...$base, Rule::in($field->options ?? [])],
                'date'         => [...$base, 'date'],
                'url'          => [...$base, 'url', 'max:2048'],
                'number'       => [...$base, 'numeric'],
                'dynamic_list' => [...$base, 'array', 'max:50'],
                default        => [...$base, 'string', 'max:255'],
            };

            if ($field->type === 'dynamic_list') {
                $rules["{$key}.*"] = ['nullable', 'string', 'max:500'];
            }
        }
        return $rules;
    }
}
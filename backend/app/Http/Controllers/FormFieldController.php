<?php

namespace App\Http\Controllers;

use App\Models\FormField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FormFieldController extends Controller
{
    /** Public: active fields only, used by the submission form. */
    public function index(): JsonResponse
    {
        return response()->json(['data' => FormField::active()->ordered()->get()]);
    }

    /** Admin: every field, including inactive ones. */
    public function adminIndex(): JsonResponse
    {
        return response()->json(['data' => FormField::ordered()->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['field_key'] = $this->uniqueKey($data['label']);
        $data['sort_order'] = (FormField::max('sort_order') ?? 0) + 1;

        return response()->json(['data' => FormField::create($data)], 201);
    }

    public function update(Request $request, FormField $formField): JsonResponse
    {
        // field_key is intentionally immutable so stored publication values never get orphaned.
        $formField->update($this->validated($request, partial: true));
        return response()->json(['data' => $formField->fresh()]);
    }

    public function destroy(FormField $formField): JsonResponse
    {
        $formField->delete(); // existing JSON values on publications are kept but no longer rendered
        return response()->json(null, 204);
    }

    /** PUT /admin/form-fields/reorder  { "ids": [3, 1, 2] } */
    public function reorder(Request $request): JsonResponse
    {
        $ids = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:form_fields,id'],
        ])['ids'];

        DB::transaction(function () use ($ids) {
            foreach ($ids as $position => $id) {
                FormField::whereKey($id)->update(['sort_order' => $position + 1]);
            }
        });

        return response()->json(['data' => FormField::ordered()->get()]);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'label'       => [$required, 'string', 'max:255'],
            'type'        => [$required, Rule::in(FormField::TYPES)],
            'is_required' => ['sometimes', 'boolean'],
            'is_active'   => ['sometimes', 'boolean'],
            'options'     => ['nullable', 'array'],
            'options.*'   => ['string', 'max:255'],
        ]);
    }

    private function uniqueKey(string $label): string
    {
        $base = Str::slug($label, '_') ?: 'field';
        $key = $base;
        $i = 2;
        while (FormField::where('field_key', $key)->exists()) {
            $key = "{$base}_{$i}";
            $i++;
        }
        return $key;
    }
}

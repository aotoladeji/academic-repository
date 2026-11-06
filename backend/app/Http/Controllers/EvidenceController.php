<?php

namespace App\Http\Controllers;

use App\Models\Publication;
use App\Support\Africa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ADMIN: finds publications that answer a reporting question, for example
 * "20 joint papers with scholars from other African countries, published in international outlets".
 */
class EvidenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'partner'      => ['nullable', 'in:other_african,outside_home,any'],
            'home_country' => ['nullable', 'alpha', 'size:2'],
            'indexed_in'   => ['nullable', 'array'],
            'indexed_in.*' => ['string', 'max:255'],
            'year_from'    => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'year_to'      => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'with_link'    => ['nullable', 'boolean'],
        ]);

        $home       = strtoupper($f['home_country'] ?? config('repository.home_country', 'NG'));
        $partner    = $f['partner'] ?? 'other_african';
        $indexed    = $f['indexed_in'] ?? [];
        $indexKey   = config('repository.indexing_field_key', 'indexing_database');
        $journalKey = config('repository.journal_field_key', 'journal_name');
        $withLink   = $request->boolean('with_link', true);

        $rows = Publication::query()
            ->with('staff:id,pf_number,name,department,faculty')
            ->whereNotNull('co_authors')
            ->when($f['year_from'] ?? null, fn ($q, $v) => $q->where('publication_year', '>=', $v))
            ->when($f['year_to'] ?? null, fn ($q, $v) => $q->where('publication_year', '<=', $v))
            ->orderByDesc('publication_date')
            ->limit(2000)
            ->get();

        $out = [];
        foreach ($rows as $p) {
            $co = collect($p->co_authors ?? []);
            if ($co->isEmpty()) {
                continue; // sole-author papers are never "joint"
            }

            $codes = $co->pluck('country')->filter()->map(fn ($c) => strtoupper($c))->unique()->values();

            $partners = (match ($partner) {
                'other_african' => $codes->filter(fn ($c) => Africa::isAfrican($c) && $c !== $home),
                'outside_home'  => $codes->filter(fn ($c) => $c !== $home),
                default         => $codes,
            })->values();

            if ($partner !== 'any' && $partners->isEmpty()) {
                continue;
            }
            if ($withLink && !$p->publication_link) {
                continue;
            }

            $value = data_get($p->custom_field_values, $indexKey);
            $indexedValues = is_array($value) ? $value : ($value ? [$value] : []);
            if ($indexed && !array_intersect($indexed, $indexedValues)) {
                continue;
            }

            $journal = data_get($p->custom_field_values, $journalKey);

            $out[] = [
                'id'               => $p->id,
                'title'            => $p->title,
                'publication_year' => $p->publication_year,
                'publication_link' => $p->publication_link,
                'doi'              => $p->doi,
                'journal'          => is_string($journal) ? $journal : null,
                'indexed_in'       => array_values($indexedValues),
                'partners'         => $partners->all(),
                'staff'            => $p->staff?->only(['name', 'pf_number', 'department', 'faculty']),
            ];
        }

        return response()->json([
            'data' => $out,
            'meta' => ['home_country' => $home, 'total' => count($out)],
        ]);
    }
}
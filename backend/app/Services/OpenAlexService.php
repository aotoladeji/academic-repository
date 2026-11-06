<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Thin client over the free OpenAlex API (https://docs.openalex.org).
 * Finds works similar to a given title/DOI, globally or scoped to Africa / one country.
 */
class OpenAlexService
{
    private const BASE = 'https://api.openalex.org/works';
    private const SELECT = 'id,doi,title,publication_year,cited_by_count,relevance_score,authorships,primary_location,abstract_inverted_index';

    /**
     * @param  string      $scope        global | africa | country
     * @param  string|null $countryCode  ISO-3166 alpha-2 (e.g. NG), used when scope = country
     * @return array<int, array<string, mixed>>
     */
    public function findSimilar(string $title, ?string $doi = null, string $scope = 'global', ?string $countryCode = null, int $limit = 10): array
    {
        $params = [
            'search'   => $this->cleanTitle($title),
            'per-page' => min(max($limit, 1), 25) + 1, // +1 so we can drop the source work itself
            'select'   => self::SELECT,
            'sort'     => 'relevance_score:desc',
        ];

        if ($filter = $this->scopeFilter($scope, $countryCode)) {
            $params['filter'] = $filter;
        }
        if ($mailto = config('services.openalex.mailto')) {
            $params['mailto'] = $mailto; // OpenAlex "polite pool": faster, more reliable
        }

        $cacheKey = 'openalex:' . md5(json_encode([$params, $doi]));

        $results = Cache::remember($cacheKey, now()->addHour(), function () use ($params) {
            $response = Http::timeout(15)->retry(2, 300)->acceptJson()->get(self::BASE, $params);
            $response->throw();
            return $response->json('results', []);
        });

        $normalisedDoi = $this->normaliseDoi($doi);
        $maxScore = collect($results)->max('relevance_score') ?: 1;

        return collect($results)
            ->reject(fn ($w) => $normalisedDoi && $this->normaliseDoi($w['doi'] ?? null) === $normalisedDoi)
            ->map(fn ($w) => $this->transform($w, $title, (float) $maxScore))
            ->sortByDesc('similarity')
            ->take($limit)
            ->values()
            ->all();
    }

    private function scopeFilter(string $scope, ?string $countryCode): ?string
    {
        return match ($scope) {
            'africa'  => 'authorships.institutions.continent:africa',
            'country' => $countryCode
                ? 'authorships.institutions.country_code:' . strtoupper(preg_replace('/[^A-Za-z]/', '', $countryCode))
                : null,
            default   => null,
        };
    }

    private function transform(array $work, string $sourceTitle, float $maxScore): array
    {
        $authors = collect($work['authorships'] ?? []);
        $titleSim = $this->tokenSimilarity($sourceTitle, $work['title'] ?? '');
        $relevance = $maxScore > 0 ? ($work['relevance_score'] ?? 0) / $maxScore : 0;
        $doi = $this->normaliseDoi($work['doi'] ?? null);

        return [
            'openalex_id'    => $work['id'] ?? null,
            'title'          => $work['title'] ?? 'Untitled',
            'year'           => $work['publication_year'] ?? null,
            'doi'            => $doi,
            'doi_url'        => $doi ? "https://doi.org/{$doi}" : null,
            'landing_url'    => $work['primary_location']['landing_page_url'] ?? ($work['id'] ?? null),
            'venue'          => $work['primary_location']['source']['display_name'] ?? null,
            'cited_by_count' => $work['cited_by_count'] ?? 0,
            'authors'        => $authors->take(6)->pluck('author.display_name')->filter()->values()->all(),
            'institutions'   => $authors->flatMap(fn ($a) => collect($a['institutions'] ?? [])->pluck('display_name'))
                                        ->filter()->unique()->take(4)->values()->all(),
            'snippet'        => Str::limit($this->rebuildAbstract($work['abstract_inverted_index'] ?? null), 280),
            // Blend of title overlap (60%) and OpenAlex relevance (40%) → 0-100
            'similarity'     => (int) round(min(1, 0.6 * $titleSim + 0.4 * $relevance) * 100),
        ];
    }

    /** OpenAlex ships abstracts as an inverted index {word: [positions]}. */
    private function rebuildAbstract(?array $index): string
    {
        if (!$index) {
            return '';
        }
        $words = [];
        foreach ($index as $word => $positions) {
            foreach ($positions as $p) {
                $words[$p] = $word;
            }
        }
        ksort($words);
        return implode(' ', $words);
    }

    private function tokenSimilarity(string $a, string $b): float
    {
        $tok = fn (string $s) => collect(preg_split('/\W+/u', Str::lower($s), -1, PREG_SPLIT_NO_EMPTY))
            ->reject(fn ($w) => mb_strlen($w) < 3)->unique();
        $x = $tok($a);
        $y = $tok($b);
        $union = $x->merge($y)->unique()->count();
        return $union ? $x->intersect($y)->count() / $union : 0.0; // Jaccard
    }

    private function normaliseDoi(?string $doi): ?string
    {
        if (!$doi) {
            return null;
        }
        return Str::lower(trim(preg_replace('#^https?://(dx\.)?doi\.org/#i', '', $doi)));
    }

    private function cleanTitle(string $title): string
    {
        return Str::limit(trim(preg_replace('/[^\p{L}\p{N}\s\-]/u', ' ', $title)), 300, '');
    }
}

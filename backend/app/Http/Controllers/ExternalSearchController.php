<?php

namespace App\Http\Controllers;

use App\Services\OpenAlexService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExternalSearchController extends Controller
{
    public function __construct(private readonly OpenAlexService $openAlex) {}

    /**
     * GET /external/similar?title=...&doi=...&scope=global|africa|country&country_code=NG&limit=10
     */
    public function similar(Request $request): JsonResponse
    {
        $v = $request->validate([
            'title'        => ['required', 'string', 'min:3', 'max:500'],
            'doi'          => ['nullable', 'string', 'max:255'],
            'scope'        => ['nullable', Rule::in(['global', 'africa', 'country'])],
            'country_code' => ['nullable', 'string', 'size:2', 'required_if:scope,country'],
            'limit'        => ['nullable', 'integer', 'min:1', 'max:25'],
        ]);

        try {
            $results = $this->openAlex->findSimilar(
                $v['title'],
                $v['doi'] ?? null,
                $v['scope'] ?? 'global',
                $v['country_code'] ?? null,
                (int) ($v['limit'] ?? 10),
            );
        } catch (RequestException $e) {
            report($e);
            return response()->json(['message' => 'The OpenAlex service is unavailable. Try again shortly.'], 502);
        }

        return response()->json([
            'data' => $results,
            'meta' => ['scope' => $v['scope'] ?? 'global', 'source' => 'OpenAlex'],
        ]);
    }
}

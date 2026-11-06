<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Lets only administrator (users table) tokens through. */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!($request->user() instanceof User)) {
            abort(403, 'Administrator access only.');
        }
        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\Staff;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Lets only staff tokens through (and blocks deactivated accounts). */
class EnsureStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!($user instanceof Staff)) {
            abort(403, 'Please sign in with your PF number.');
        }
        if (!$user->is_active) {
            abort(403, 'This account has been deactivated.');
        }
        return $next($request);
    }
}

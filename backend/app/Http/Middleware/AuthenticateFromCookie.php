<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AuthenticateFromCookie
{
    /**
     * Handle an incoming request by injecting the auth_token cookie into the Authorization header.
     */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->bearerToken() && $request->hasCookie('auth_token')) {
            $request->headers->set('Authorization', 'Bearer ' . $request->cookie('auth_token'));
        }

        return $next($request);
    }
}

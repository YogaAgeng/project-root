<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Login and return JWT token and user info.
     *
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (! $token = Auth::guard('api')->attempt($credentials)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $user = Auth::guard('api')->user();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout (invalidate JWT token).
     *
     * POST /api/auth/logout
     */
    public function logout()
    {
        Auth::guard('api')->logout();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Get the authenticated user.
     *
     * GET /api/auth/me
     */
    public function me()
    {
        return response()->json([
            'user' => Auth::guard('api')->user(),
        ]);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Phân quyền Role: admin hoặc user
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (! $request->user()) {
            return redirect()->route('login')->with('error', 'Vui lòng đăng nhập.');
        }

        if ($request->user()->role !== $role) {
            abort(403, "Tài khoản vai trò '{$request->user()->role}' không có quyền truy cập chức năng này.");
        }

        return $next($request);
    }
}

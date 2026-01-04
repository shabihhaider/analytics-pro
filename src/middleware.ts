import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Skip authentication for:
    // 1. Static assets
    // 2. Webhooks (they have their own signature verification)
    // 3. NON-API routes (let the page load so iframe can render)
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api/webhooks') ||
        pathname === '/favicon.ico' ||
        !pathname.startsWith('/api') // ← KEY: Don't block page loads
    ) {
        return NextResponse.next();
    }

    // Extract token from request
    let token: string | null = request.headers.get('x-whop-user-token');

    // Development mode: allow through without token
    if (!token && process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Dev mode: Allowing API request without token');
        return NextResponse.next();
    }

    // Production: API routes MUST have token
    if (!token) {
        console.error('[Middleware] API request missing x-whop-user-token header');
        return NextResponse.json(
            { error: 'Unauthorized: Missing authentication token' },
            { status: 401 }
        );
    }

    // Forward the token in headers for getUser() to access
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-whop-user-token', token);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    // Only match API routes (not page loads)
    matcher: '/api/:path*',
};

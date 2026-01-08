import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * IMPORTANT: Whop's Cloudflare proxy strips custom headers on client-side fetch calls.
 * The x-whop-user-token is ONLY available on the initial HTML page load.
 * 
 * Authentication Strategy:
 * 1. Layout.tsx captures token on initial load → injects to window.__WHOP_TOKEN__
 * 2. API routes receive token via cookie OR from client headers (if not stripped)
 * 3. If no token available, API routes use WHOP_API_KEY for server-to-server calls
 * 
 * This middleware is now simplified to:
 * - Skip static assets and webhooks
 * - Forward any available token
 * - NOT block requests that lack a token (auth handled in route handlers)
 */
export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Skip static assets and webhooks
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api/webhooks') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // For API routes: Check for token but DON'T block if missing
    // The route handlers will use WHOP_API_KEY as fallback
    if (pathname.startsWith('/api')) {
        const token = request.headers.get('x-whop-user-token');

        if (token) {
            console.log('[Middleware] Token found, forwarding...');
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-whop-user-token', token);

            return NextResponse.next({
                request: { headers: requestHeaders }
            });
        } else {
            // No token - let route handler use server API key
            console.log('[Middleware] No token in headers, allowing request (route will use API key)');
            return NextResponse.next();
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};

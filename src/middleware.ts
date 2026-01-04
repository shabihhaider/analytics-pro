import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Whop } from '@whop/sdk';

export async function middleware(request: NextRequest) {
    // 1. Skip Auth for static resources and webhooks
    const pathname = request.nextUrl.pathname;
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api/webhooks') ||
        pathname === '/favicon.ico' ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.map')
    ) {
        return NextResponse.next();
    }

    // 2. Extract Token with Priority: Header > Authorization > Cookie
    let token: string | null = request.headers.get('x-whop-user-token');

    // Check Authorization Bearer token
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    // Check cookie as last resort
    if (!token) {
        const cookie = request.cookies.get('whop_user_token');
        if (cookie?.value) {
            token = cookie.value;
        }
    }

    // 3. Development Mode Fallback (MUST have DEV_COMPANY_ID)
    if (!token && process.env.NODE_ENV === 'development') {
        if (!process.env.DEV_COMPANY_ID) {
            console.error('[Middleware] DEV_COMPANY_ID required for development mode');
            return NextResponse.json(
                { error: 'Development environment not configured' },
                { status: 500 }
            );
        }
        console.log('[Middleware] ⚠️ Dev mode: Allowing request without token');
        return NextResponse.next();
    }

    // 4. Require Token in Production
    if (!token) {
        console.error('[Middleware] No token found in headers, auth, or cookies');
        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing authentication token' },
                { status: 401 }
            );
        }
        return new NextResponse('Unauthorized: Missing Whop Token', { status: 401 });
    }

    // 5. Validate Token
    try {
        const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
        await whop.verifyUserToken(token);

        // 6. Create Response with Token in Headers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-whop-user-token', token);
        requestHeaders.set('authorization', `Bearer ${token}`); // Also set Bearer token

        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        // 7. Set Cookie (even though it might be blocked, worth trying)
        // This helps with same-origin requests after initial load
        response.cookies.set('whop_user_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only secure in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return response;

    } catch (error: any) {
        console.error('[Middleware] Token validation failed:', error?.message || error);

        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    details: process.env.NODE_ENV === 'development'
                        ? error?.message
                        : undefined
                },
                { status: 401 }
            );
        }
        return new NextResponse('Unauthorized: Invalid Whop Token', { status: 401 });
    }
}

export const config = {
    // Match all paths except static resources and webhooks
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map)).*)',
    ],
};

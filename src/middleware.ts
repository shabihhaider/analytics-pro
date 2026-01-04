import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Whop } from '@whop/sdk';

export async function middleware(request: NextRequest) {
    // 1. Skip Auth for formatting, static files, and webhooks
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.startsWith('/api/webhooks') ||
        request.nextUrl.pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // 2. Extract Token
    // Priority: Header (Initial Load) > Authorization Header > Cookie
    let token = request.headers.get('x-whop-user-token');

    // Check Authorization: Bearer <token>
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    let hasCookie = false;

    if (!token) {
        const cookie = request.cookies.get('whop_user_token');
        if (cookie) {
            token = cookie.value;
            hasCookie = true;
        }
    }

    // Dev Proxy / Local fallback
    if (!token && process.env.NODE_ENV === 'development') {
        console.log('[Middleware Debug] Allowing request without token in Dev Mode');
        return NextResponse.next();
    }

    // 3. Validate Token
    if (!token) {
        if (request.nextUrl.pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return new NextResponse('Unauthorized: Missing Whop Token', { status: 401 });
    }

    try {
        // Only verify if we haven't already verified (optimization: you might skip verify on every API call if valid cookie)
        // For now, verification on every request is safer.
        const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
        await whop.verifyUserToken(token);

        // Pass the token to the request headers for downstream use
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-whop-user-token', token);

        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        // SET COOKIE if it came from header (fresh session) or we just want to refresh it
        response.cookies.set('whop_user_token', token, {
            httpOnly: true,
            secure: true, // Always secure in production (Vercel is HTTPS)
            sameSite: 'none', // Critical for iframe support
            path: '/',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return response;

    } catch (error) {
        console.error('Token validation failed:', error);
        if (request.nextUrl.pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }
        return new NextResponse('Unauthorized: Invalid Whop Token', { status: 401 });
    }
}

export const config = {
    matcher: ['/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)'],
};

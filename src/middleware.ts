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
    // iframe passes token in x-whop-user-token header
    let token = request.headers.get('x-whop-user-token');

    // Dev Proxy / Local fallback: check cookie if header is missing
    if (!token && process.env.NODE_ENV === 'development') {
        const cookieToken = request.cookies.get('whop_user_token');
        console.log('[Middleware Debug] Cookies:', request.cookies.getAll().map(c => c.name));
        console.log('[Middleware Debug] Headers:', Array.from(request.headers.keys()));
        if (cookieToken) {
            token = cookieToken.value;
            console.log('[Middleware Debug] Found token in cookie');
        } else {
            console.log('[Middleware Debug] No token in cookie');
        }
    }

    // 3. Validate Token
    if (!token) {
        if (process.env.NODE_ENV === 'development') {
            console.log('[Middleware Debug] Allowing request without token in Dev Mode');
            return NextResponse.next();
        }
        if (request.nextUrl.pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return new NextResponse('Unauthorized: Missing Whop Token', { status: 401 });
    }

    try {
        // Validate using the SDK
        const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
        await whop.verifyUserToken(token);

        // Pass the token to the request headers for downstream use if needed
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-whop-user-token', token);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
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

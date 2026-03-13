import { NextResponse, NextRequest } from 'next/server';

// ── Password Protection (Pre-Launch) ───────────────────────────────────────
const PASSWORD_PROTECTION_ENABLED = true;     // Set false to disable — ONE TOGGLE
const SITE_PASSWORD                = '2026';
const PASSWORD_COOKIE_NAME         = 'site-access';
// const PASSWORD_COOKIE_MAX_AGE   = 60 * 60 * 24 * 7; // 7 days (used in API route)

// ── Hotlinking Protection ──────────────────────────────────────────────────
// Domains allowed to embed images (your own site + dev environments)
const ALLOWED_REFERRERS = [
  'enolvallina.com',
  'www.enolvallina.com',
  'vercel.app',   // Vercel preview deployments
  'localhost',    // Local development
];

// Allow requests with no referer header (direct visits, bookmarks,
// social card crawlers, and most search engine bots don't send one)
const ALLOW_EMPTY_REFERER = true;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Password gate ──────────────────────────────────────────────────────
  if (PASSWORD_PROTECTION_ENABLED) {
    const isPublicPath =
      pathname === '/login' ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/images/og/') ||   // OG image must be public for social previews
      pathname.startsWith('/images/psw/') ||  // Login page bg — public but hotlink-protected below
      /\.(ico|svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$/.test(pathname);

    if (!isPublicPath) {
      const cookie = request.cookies.get(PASSWORD_COOKIE_NAME);
      if (!cookie || cookie.value !== SITE_PASSWORD) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // ── 2. Hotlinking protection (project + philosophy images only) ───────────
  // OG images are always allowed (social platforms need them)
  if (pathname.startsWith('/images/og/')) {
    return NextResponse.next();
  }

  const referer = request.headers.get('referer');

  // Allow empty referer
  if (!referer && ALLOW_EMPTY_REFERER) {
    return NextResponse.next();
  }

  // Check if referer is from an allowed domain
  if (referer) {
    try {
      const refererHost = new URL(referer).hostname;
      if (ALLOWED_REFERRERS.some(
        allowed => refererHost === allowed || refererHost.endsWith('.' + allowed)
      )) {
        return NextResponse.next();
      }
    } catch {
      // Unparseable referer — block it
    }
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export const config = {
  matcher: [
    // Page routes — for password protection
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Image routes — for hotlinking protection
    '/images/projects/:path*',
    '/images/philosophy/:path*',
    '/images/psw/:path*',
  ],
};

import { NextResponse, NextRequest } from 'next/server';

// Domains allowed to hotlink images (your own site + dev environments)
const ALLOWED_REFERRERS = [
  'enolvallina.com',
  'www.enolvallina.com',
  'vercel.app',   // Vercel preview deployments
  'localhost',    // Local development
];

// Allow requests with no referer header (direct browser visits, bookmarks,
// social card crawlers, and most search engine bots don't send one)
const ALLOW_EMPTY_REFERER = true;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OG images must be fetchable by social platforms — always allow
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
  // Only intercept project and philosophy images — leave categories, ui, og untouched
  matcher: ['/images/projects/:path*', '/images/philosophy/:path*'],
};

import { NextResponse, NextRequest } from 'next/server';

// ── Password Protection (Pre-Launch) ───────────────────────────────────────
const PASSWORD_PROTECTION_ENABLED = false;    // Set true to enable — ONE TOGGLE
const SITE_PASSWORD                = '2026';
const PASSWORD_COOKIE_NAME         = 'site-access';

// ── Hotlinking Protection ──────────────────────────────────────────────────
const ALLOWED_REFERRERS = [
  'enolvallina.com',
  'www.enolvallina.com',
  'vercel.app',
  'localhost',
];
const ALLOW_EMPTY_REFERER = true;

// ── Paths that are ALWAYS public (even with password enabled) ──────────────
// These must be accessible to social crawlers, search bots, and browsers
const ALWAYS_PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/profile',           // bot-readable profile page
  '/sitemap.xml',       // search engine sitemap
  '/manifest.json',     // iOS web app manifest
  '/robots.txt',        // search engine rules
  '/favicon.ico',
];

// Prefixes that are always public
const ALWAYS_PUBLIC_PREFIXES = [
  '/_next/',            // Next.js static assets
  '/images/og/',        // OG social preview images
];

// File extensions that are always public (static assets)
const PUBLIC_EXTENSIONS = /\.(ico|svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot|json|xml|txt)$/;

// ── Known bot user agents ──────────────────────────────────────────────────
// When password is enabled, these bots still need to access the main page
// to read OG meta tags and index the site
const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',    // Facebook/Meta link previews
  'facebot',
  'linkedinbot',            // LinkedIn link previews
  'whatsapp',               // WhatsApp link previews
  'twitterbot',             // Twitter/X link previews
  'discordbot',             // Discord link previews
  'slackbot',               // Slack link previews
  'telegrambot',            // Telegram link previews
  'applebot',               // Apple/Siri
  'semrushbot',
  'ahrefsbot',
  'pinterest',
  'embedly',
  'quora link preview',
  'outbrain',
  'redditbot',
  'rogerbot',
  'showyoubot',
  'site-shot',              // Screenshot services
  'vkshare',
  'w3c_validator',
  'chatgpt-user',           // ChatGPT browsing
  'claude-web',             // Claude web search
  'perplexitybot',          // Perplexity AI
  'anthropic-ai',
  'cohere-ai',
  'gptbot',                 // OpenAI GPT crawler
];

function isBot(request: NextRequest): boolean {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

function isAlwaysPublic(pathname: string): boolean {
  // Exact matches
  if (ALWAYS_PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;
  // Prefix matches
  if (ALWAYS_PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  // File extension matches
  if (PUBLIC_EXTENSIONS.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 0. Always allow public paths — no checks needed ───────────────────
  if (isAlwaysPublic(pathname)) {
    return NextResponse.next();
  }

  // ── 1. Allow bots through even when password is on ────────────────────
  // Bots need to read the page HTML to extract OG tags and index content
  if (isBot(request)) {
    return NextResponse.next();
  }

  // ── 2. Password gate (when enabled) ───────────────────────────────────
  if (PASSWORD_PROTECTION_ENABLED) {
    const cookie = request.cookies.get(PASSWORD_COOKIE_NAME);
    if (!cookie || cookie.value !== SITE_PASSWORD) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ── 3. Hotlinking protection — ONLY for protected image paths ─────────
  const isProtectedImagePath =
    pathname.startsWith('/images/projects/') ||
    pathname.startsWith('/images/philosophy/') ||
    pathname.startsWith('/images/psw/');

  if (!isProtectedImagePath) {
    return NextResponse.next();
  }

  // Check referer for protected images
  const referer = request.headers.get('referer');

  if (!referer && ALLOW_EMPTY_REFERER) {
    return NextResponse.next();
  }

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
    '/((?!_next/static|_next/image).*)',
    // Image routes — for hotlinking protection
    '/images/projects/:path*',
    '/images/philosophy/:path*',
    '/images/psw/:path*',
  ],
};

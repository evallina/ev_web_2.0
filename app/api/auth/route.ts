import { NextRequest, NextResponse } from 'next/server';

const SITE_PASSWORD       = '2026';
const PASSWORD_COOKIE_NAME = 'site-access';
const PASSWORD_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password  = formData.get('password') as string | null;

  if (password === SITE_PASSWORD) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(PASSWORD_COOKIE_NAME, SITE_PASSWORD, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production' && !request.headers.get('host')?.startsWith('192.168.'),
      sameSite: 'lax',
      maxAge:   PASSWORD_COOKIE_MAX_AGE,
      path:     '/',
    });
    return response;
  }

  return NextResponse.redirect(new URL('/login?error=1', request.url));
}

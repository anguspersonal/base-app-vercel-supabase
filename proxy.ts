import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  if (!isDashboard) return NextResponse.next();

  const hasAccessToken = req.cookies.get('sb-access-token') || req.cookies.get('sb:token');
  if (!hasAccessToken) {
    const url = new URL('/login', req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};


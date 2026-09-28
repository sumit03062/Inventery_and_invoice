import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(request: NextRequest) {
  if (!request.cookies.get('sessionid')?.value) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/billing/:path*', '/invoices/:path*', '/products/:path*', '/customers/:path*', '/ledger/:path*', '/reports/:path*', '/staff/:path*', '/settings/:path*'] };

import { NextRequest, NextResponse } from 'next/server';

// The dashboard has no login, so it only answers requests addressed to this machine.
// This also blocks DNS-rebinding, where a malicious web page points its own domain at 127.0.0.1 to read your data.
// `npm run dev:lan` sets DASHBOARD_ALLOW_LAN=1 to deliberately allow other devices on your network.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function proxy(req: NextRequest) {
  if (process.env.DASHBOARD_ALLOW_LAN === '1') return NextResponse.next();
  const host = req.headers.get('host') ?? '';
  if (!LOCAL.test(host)) return new NextResponse('This dashboard only accepts connections from the machine it runs on.', { status: 403 });
  // State-changing requests must come from the dashboard's own pages, not from another site open in the browser.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin');
    if (origin && !LOCAL.test(origin.replace(/^https?:\/\//, ''))) return new NextResponse('Cross-site request blocked.', { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };

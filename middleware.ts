import { NextResponse, type NextRequest } from "next/server";

// Protects the app with one shared password (HTTP Basic Auth - your browser will just
// pop up a plain login box, no custom page needed). /api/og stays public on purpose:
// Discord/Mastodon/Bluesky/Telegram all need to fetch that image link from the outside.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next(); // no password set = app stays open (not recommended)

  const auth = req.headers.get("authorization");
  if (auth) {
    const [, encoded] = auth.split(" ");
    const [, pass] = atob(encoded || "").split(":");
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Vasukii Marketing"' },
  });
}

export const config = {
  matcher: ["/((?!api/og|_next/static|_next/image|favicon.ico|logo.png).*)"],
};

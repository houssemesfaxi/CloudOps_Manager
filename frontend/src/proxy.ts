import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/token";

const AUTH_PAGES = ["/login", "/register"];

/**
 * Route protection (Next.js 16 "proxy", formerly "middleware"):
 * - no token -> /login?next=<page asked>
 * - token on /login or /register -> dashboard
 * It only checks that the cookie exists. The backend checks the token itself
 * on every API call, and an expired token sends the user back to /login.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!hasToken && !isAuthPage) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Every page, except Next.js files and static files (favicon, images...).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

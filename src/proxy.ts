import { NextResponse, type NextRequest } from "next/server";

// Optimistic auth check: redirect to /login if no Supabase session cookie found.
// The actual session validation happens in server components via supabase.auth.getUser().
export function proxy(request: NextRequest) {
  const hasCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

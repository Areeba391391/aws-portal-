import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session cookies before reading the user.
  await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Protect dashboard routes server-side (not just client RequireAuth)
  const dashMatch = pathname.match(/^\/dashboard\/(student|team|admin)(\/|$)/);
  if (dashMatch) {
    const requiredRole = dashMatch[1];
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();
    if (!profile || profile.status === "Inactive") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "inactive");
      return NextResponse.redirect(loginUrl);
    }
    if (profile.role !== requiredRole) {
      return NextResponse.redirect(new URL(`/dashboard/${profile.role}`, request.url));
    }
  }

  // Legacy sign-up URL always resolves to the invite request flow.
  if (pathname === "/register") {
    return NextResponse.redirect(new URL("/request-credentials", request.url));
  }

  // Security headers on every response
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

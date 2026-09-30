import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  // Define protected routes
  const isProtectedRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/favorites");

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isAdminLoginPage = nextUrl.pathname === "/admin/login";
  const isHomePage = nextUrl.pathname === "/";

  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    isAdminLoginPage;

  const dashboardPath = isAdmin ? "/admin/dashboard" : "/dashboard";

  // Redirect to login if trying to access that our protected route if this user is not logged in.
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Send signed-in users away from public entry points to their own dashboard.
  if (isLoggedIn && (isHomePage || isAuthPage)) {
    return NextResponse.redirect(new URL(dashboardPath, nextUrl.origin));
  }

  // Allow signed-out visitors to reach the admin login page.
  if (isAdminLoginPage) {
    return NextResponse.next();
  }

  /// Redireact to admin login if tryting to access amdin route and not as admin
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/dashboard" : "/admin/login", nextUrl.origin)
    );
  }

  return NextResponse.next();
});

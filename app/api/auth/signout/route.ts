import { signOut } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    const cookieStore = await cookies();

    // Delete all auth- related cookies
    cookieStore.getAll().forEach((cookie) => {
      if (
        cookie.name.startsWith("authjs") ||
        cookie.name.startsWith("next-auth")
      ) {
        cookieStore.delete(cookie.name);
      }
    });

    // Sign out without redirect
    await signOut({ redirect: false });

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Sign out error", error);
    return NextResponse.json({ error: "Filed to sign out" }, { status: 500 });
  }
}

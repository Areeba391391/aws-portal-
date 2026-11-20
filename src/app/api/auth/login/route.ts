import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json(
      { error: "Incorrect email or password. If you need access, request credentials from the team." },
      { status: 401 }
    );
  }

  // After sign-in, cookie-based SSR clients can still look unauthenticated in
  // the same request. Load the profile with the service client keyed by the
  // authenticated user id (password already verified above).
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, email, role, department, status, created_at")
    .eq("id", data.user.id)
    .maybeSingle();

  // Fallback if an older DB is missing optional columns such as department.
  let resolved = profile;
  if (profileError || !resolved) {
    const fallback = await admin
      .from("profiles")
      .select("id, full_name, email, role, status, created_at")
      .eq("id", data.user.id)
      .maybeSingle();
    resolved = fallback.data ? { ...fallback.data, department: null } : null;
  }

  if (!resolved) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Account found but no profile exists yet — contact your admin." },
      { status: 403 }
    );
  }

  if (resolved.status === "Inactive") {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account has been deactivated. Contact your admin." }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: resolved.id,
      fullName: resolved.full_name,
      email: resolved.email,
      role: resolved.role,
      department: resolved.department ?? undefined,
      status: resolved.status,
      createdAt: resolved.created_at,
    },
  });
}

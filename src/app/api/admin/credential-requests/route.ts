import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildActivationLink, resolveSiteOrigin } from "@/lib/siteUrl";
import { isRealGmailAddress } from "@/lib/emailPolicy";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Supabase only emails a working link when the project's redirect allow-list
 * contains this deployment. Generating the token ourselves gives the admin a
 * link on our own domain that always resolves.
 */
async function createActivationLink(admin: AdminClient, email: string, origin: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return null;
  return buildActivationLink(origin, tokenHash, "recovery");
}

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.status !== "Active") {
    return { ok: false as const, status: 403, error: "Admin access required." };
  }
  return { ok: true as const, userId: user.id };
}

const decisionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "activation-link"]),
});

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credential_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const { data: credentialRequest, error: fetchError } = await admin
    .from("credential_requests")
    .select("*")
    .eq("id", parsed.data.id)
    .single();

  if (fetchError || !credentialRequest) {
    return NextResponse.json({ error: "Credential request not found." }, { status: 404 });
  }

  const origin = resolveSiteOrigin(request);

  if (parsed.data.action === "activation-link") {
    if (credentialRequest.status !== "approved") {
      return NextResponse.json({ error: "Approve the request before generating a link." }, { status: 409 });
    }
    const activationLink = await createActivationLink(admin, credentialRequest.email, origin);
    if (!activationLink) {
      return NextResponse.json({ error: "Could not generate an activation link." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      activationLink,
      message: "Fresh activation link generated. It expires in about an hour.",
    });
  }

  if (credentialRequest.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  }

  if (parsed.data.action === "reject") {
    const { error } = await admin
      .from("credential_requests")
      .update({
        status: "rejected",
        reviewed_by: check.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const gmail = isRealGmailAddress(credentialRequest.email);
  if (!gmail.ok) {
    return NextResponse.json({ error: gmail.error }, { status: 400 });
  }

  // Mark approved first so the invite-only auth trigger permits this email.
  const reviewedAt = new Date().toISOString();
  const { error: approveError } = await admin
    .from("credential_requests")
    .update({
      status: "approved",
      reviewed_by: check.userId,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq("id", parsed.data.id)
    .eq("status", "pending");

  if (approveError) return NextResponse.json({ error: approveError.message }, { status: 500 });

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    gmail.email,
    {
      data: {
        full_name: credentialRequest.full_name,
        role: "student",
        department: credentialRequest.department_session,
        study_year: credentialRequest.study_year,
      },
      redirectTo: `${origin}/reset-password`,
    }
  );

  if (inviteError) {
    await admin
      .from("credential_requests")
      .update({ status: "pending", reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id);
    return NextResponse.json({ error: `Invite email failed: ${inviteError.message}` }, { status: 400 });
  }

  await admin
    .from("credential_requests")
    .update({ invited_user_id: inviteData.user.id, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  const activationLink = await createActivationLink(admin, gmail.email, origin);

  return NextResponse.json({
    ok: true,
    activationLink,
    message: activationLink
      ? "Approved and an invitation email was sent. Copy the backup activation link below if the email link fails."
      : "Approved. A secure invitation email was sent.",
  });
}

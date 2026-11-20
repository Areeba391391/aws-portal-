import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const lookupSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export async function POST(request: NextRequest) {
  const parsed = lookupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the email address you applied with." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credential_requests")
    .select("status, created_at, reviewed_at")
    .ilike("email", parsed.data.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not check the status right now." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ found: false });
  }

  // Only the decision is exposed — never reviewer identity or internal notes.
  return NextResponse.json({
    found: true,
    status: data.status as "pending" | "approved" | "rejected",
    submittedAt: data.created_at,
    reviewedAt: data.reviewed_at,
  });
}

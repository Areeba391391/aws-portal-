import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRealGmailAddress } from "@/lib/emailPolicy";

const requestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value.toLowerCase())
    .superRefine((value, ctx) => {
      const check = isRealGmailAddress(value);
      if (!check.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error });
    }),
  departmentSession: z.string().trim().min(2).max(160),
  studyYear: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"]),
  website: z.string().optional(), // honeypot — non-empty values are discarded below
});

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 10_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return NextResponse.json(
      { error: first && first !== "Required" ? first : "Please check the form and try again." },
      { status: 400 }
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true }); // silently discard bots
  }

  const admin = createAdminClient();
  const { fullName, email, departmentSession, studyYear } = parsed.data;

  const { data: existingUser } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json(
      { error: "An account already exists for this email. Please use Login or Forgot Password." },
      { status: 409 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256")
    .update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12) ?? "sbg"}`)
    .digest("hex");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("credential_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many requests. Please try again tomorrow." }, { status: 429 });
  }

  const { error } = await admin.from("credential_requests").insert({
    full_name: fullName,
    email,
    department_session: departmentSession,
    study_year: studyYear,
    ip_hash: ipHash,
  });

  if (error?.code === "23505") {
    return NextResponse.json(
      { error: "A request for this email is already waiting for review." },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json({ error: "Could not submit the request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

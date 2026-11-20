"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { isRealGmailAddress } from "@/lib/emailPolicy";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const check = isRealGmailAddress(value);
      if (!check.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error });
    }),
  departmentSession: z.string().trim().min(2, "Enter your department or session").max(160),
  studyYear: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"]),
});

type FormState = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  fullName: "",
  email: "",
  departmentSession: "",
  studyYear: "1st Year",
};

export default function RequestCredentialsPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path[0] as keyof FormState] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const response = await fetch("/api/credential-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, website: "" }),
    });
    const body = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setServerError(body.error ?? "Could not submit your request.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <GridBackground className="min-h-screen pt-28 pb-20">
      <div className="container-page">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <span className="badge-hackathon">
              <ShieldCheck className="h-3.5 w-3.5" /> Invite-only portal
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-white md:text-5xl">
              Request your AWS SBG credentials
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-white/65">
              Submit your student details for review. You do not choose a password here — once the AWS SBG
              administration approves you, a secure one-time invitation link lets you set your own password.
            </p>
            <div className="mt-8 space-y-3 text-sm text-white/60">
              <p className="flex items-center gap-3"><span className="text-orange">01</span> Submit your academic details</p>
              <p className="flex items-center gap-3"><span className="text-orange">02</span> Administration reviews your request</p>
              <p className="flex items-center gap-3"><span className="text-orange">03</span> Open the invite email and choose your own password</p>
              <p className="flex items-center gap-3"><span className="text-orange">04</span> Log in with your email and that password</p>
            </div>
            <p className="mt-8 text-sm text-white/50">
              Already applied?{" "}
              <Link href="/request-status" className="font-semibold text-orange">Check your request status</Link>
            </p>
          </div>

          <div className="card-grid !border-border-dark !bg-card-dark p-6 sm:p-8">
            {submitted ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h2 className="mt-4 text-xl font-bold text-white">Request received</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/60">
                  The admin team will review your details. If approved, an invitation email arrives at{" "}
                  <span className="text-white">{form.email}</span> with a link to set your password.
                </p>
                <div className="mt-7 flex flex-col items-center gap-3">
                  <Link href="/request-status" className="btn-primary">Check request status</Link>
                  <Link href="/" className="text-sm text-white/50 hover:text-orange">Return home</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/15">
                    <KeyRound className="h-5 w-5 text-orange" />
                  </span>
                  <div>
                    <h2 className="font-bold text-white">Student details</h2>
                    <p className="text-xs text-white/45">Use your real personal Gmail — placeholders like a@gmail.com are blocked</p>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-4" noValidate>
                  <Field label="Full name" error={errors.fullName}>
                    <input
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="input-field"
                      autoComplete="name"
                      maxLength={120}
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field label="Email address" error={errors.email}>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-field"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="your.name@gmail.com"
                    />
                  </Field>
                  <Field label="Department or session" error={errors.departmentSession}>
                    <input
                      value={form.departmentSession}
                      onChange={(e) => setForm({ ...form, departmentSession: e.target.value })}
                      className="input-field"
                      maxLength={160}
                      placeholder="Computer Science — Session 2026"
                    />
                  </Field>
                  <Field label="Current study year" error={errors.studyYear}>
                    <select
                      value={form.studyYear}
                      onChange={(e) => setForm({ ...form, studyYear: e.target.value as FormState["studyYear"] })}
                      className="select-field-dark"
                    >
                      {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </Field>

                  <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

                  <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/55">
                    No password is collected here. After approval you will receive an email invitation with a
                    one-time link where you create your own password.
                  </p>

                  {serverError && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{serverError}</p>}
                  <button disabled={submitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : "Request Credentials"}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-white/45">
                  Already invited? <Link href="/login" className="font-semibold text-orange">Login</Link>
                  {" · "}
                  <Link href="/request-status" className="font-semibold text-orange">Check status</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </GridBackground>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

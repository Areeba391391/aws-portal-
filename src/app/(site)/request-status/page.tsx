"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, Search, XCircle } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";

type Result =
  | { found: false }
  | { found: true; status: "pending" | "approved" | "rejected"; submittedAt: string; reviewedAt: string | null };

const copy = {
  pending: {
    icon: Clock3,
    tone: "text-orange",
    title: "Pending review",
    body: "Your request is in the queue. The AWS SBG administration reviews new applications regularly — you will receive an invitation email as soon as it is approved.",
  },
  approved: {
    icon: CheckCircle2,
    tone: "text-emerald-400",
    title: "Approved",
    body: "An invitation email has been sent to this address. Open it and follow the link to choose your own password, then sign in. If it has not arrived, check your spam folder or contact the team for a fresh link.",
  },
  rejected: {
    icon: XCircle,
    tone: "text-red-400",
    title: "Not approved",
    body: "This request was not approved. If you believe this is a mistake, contact the AWS SBG team and submit a new request with your correct academic details.",
  },
} as const;

export default function RequestStatusPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    const response = await fetch("/api/credential-requests/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "Could not check the status right now.");
      return;
    }
    setResult(body as Result);
  }

  const detail = result?.found ? copy[result.status] : null;
  const DetailIcon = detail?.icon;

  return (
    <GridBackground className="min-h-screen pt-28 pb-20">
      <div className="container-page">
        <div className="mx-auto max-w-lg">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Check your request status</h1>
          <p className="mt-4 text-white/65">
            Enter the email you applied with to see whether your credential request is pending, approved, or rejected.
          </p>

          <form onSubmit={check} className="card-grid !border-border-dark !bg-card-dark mt-8 space-y-4 p-6 sm:p-8">
            <label className="block">
              <span className="text-sm font-medium text-white">Email address</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                className="input-field mt-2 !text-white"
              />
            </label>
            {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
            <button disabled={loading} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : <><Search className="h-4 w-4" /> Check status</>}
            </button>
          </form>

          {result && !result.found && (
            <div className="card-grid !border-border-dark !bg-card-dark mt-6 p-6 text-center">
              <p className="text-sm text-white/70">
                No request found for that email.{" "}
                <Link href="/request-credentials" className="font-semibold text-orange">Submit a request</Link>.
              </p>
            </div>
          )}

          {result?.found && detail && DetailIcon && (
            <div className="card-grid !border-border-dark !bg-card-dark mt-6 p-6">
              <div className="flex items-start gap-4">
                <DetailIcon className={`h-8 w-8 flex-shrink-0 ${detail.tone}`} />
                <div>
                  <h2 className="font-bold text-white">{detail.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{detail.body}</p>
                  <p className="mt-4 text-xs text-white/40">
                    Submitted {new Date(result.submittedAt).toLocaleDateString()}
                    {result.reviewedAt && ` · Reviewed ${new Date(result.reviewedAt).toLocaleDateString()}`}
                  </p>
                  {result.status === "approved" && (
                    <Link href="/login" className="btn-primary mt-5 !py-2.5 !px-5 text-sm">Go to login</Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GridBackground>
  );
}

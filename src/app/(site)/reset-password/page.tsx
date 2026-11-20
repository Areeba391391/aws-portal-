"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GridBackground } from "@/components/GridBackground";

const schema = z.object({
  password: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(Boolean(searchParams.get("token_hash")));
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const tokenHash = searchParams.get("token_hash");
  const tokenType = searchParams.get("type");

  // Invitation links point at this page with a one-time token instead of relying
  // on the Supabase redirect allow-list, so redeem it before showing the form.
  useEffect(() => {
    if (!tokenHash) return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType === "invite" ? "invite" : "recovery",
      });
      if (cancelled) return;
      if (verifyError) {
        setError("This link has expired or was already used. Ask the AWS SBG team for a fresh invitation.");
      }
      setVerifying(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tokenHash, tokenType]);

  async function onSubmit({ password }: FormValues) {
    setError(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Your invitation link is no longer valid. Ask the AWS SBG team for a fresh invitation.");
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  }

  return (
    <GridBackground minHeight="100vh" className="flex items-center justify-center px-4 py-28">
      <div className="w-full max-w-md card-grid !bg-card-dark !border-border-dark p-8">
        <h1 className="text-xl font-bold text-white font-heading">Set your password</h1>
        <p className="mt-2 text-sm text-white/55">
          Choose the password you will use to sign in to the AWS SBG portal.
        </p>

        {verifying ? (
          <div className="flex items-center gap-2 py-10 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-orange" /> Verifying your invitation...
          </div>
        ) : done ? (
          <div className="mt-6 space-y-4">
            <p className="text-emerald-400 text-sm">Password updated successfully.</p>
            <Link href="/login" className="btn-primary w-full text-center">Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-white">New Password</label>
              <input {...register("password")} type="password" autoComplete="new-password" className="input-field mt-2 !text-white" />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="text-sm text-white">Confirm Password</label>
              <input {...register("confirm")} type="password" autoComplete="new-password" className="input-field mt-2 !text-white" />
              {errors.confirm && <p className="text-xs text-red-400 mt-1">{errors.confirm.message}</p>}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
              {isSubmitting ? "Saving..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </GridBackground>
  );
}

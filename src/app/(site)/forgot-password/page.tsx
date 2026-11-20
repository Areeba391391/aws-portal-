"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: FormValues) {
    setError(null);
    const result = await resetPassword(email);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <GridBackground minHeight="100vh" className="flex items-center justify-center px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-grid !bg-card-dark !border-border-dark p-8"
      >
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-orange mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/20">
            <Mail className="h-5 w-5 text-orange" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white font-heading">Reset Password</h1>
            <p className="text-sm text-white/50">We&apos;ll email you a secure reset link.</p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-400">
            Check your email for a password reset link. If you don&apos;t see it, check spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Email</label>
              <input {...register("email")} type="email" className="input-field mt-2 !border-border-dark !text-white" placeholder="you@university.edu" />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </motion.div>
    </GridBackground>
  );
}

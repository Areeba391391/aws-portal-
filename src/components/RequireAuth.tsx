"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";

export function RequireAuth({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const { user, loading, sessionUserId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!sessionUserId) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && user.role !== role) {
      router.replace(`/dashboard/${user.role}`);
    }
  }, [loading, sessionUserId, user, role, router, pathname]);

  if (loading || !sessionUserId || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
        <Loader2 className="h-6 w-6 animate-spin text-orange" />
      </div>
    );
  }

  return <>{children}</>;
}

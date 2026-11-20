"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Role } from "@/types";
import { createClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  department?: string;
  status: "Active" | "Inactive";
  createdAt?: string;
}

interface NewUserInput {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
  department?: string;
  status?: "Active" | "Inactive";
}

interface AuthContextValue {
  user: AuthUser | null;
  users: AuthUser[];
  loading: boolean;
  sessionUserId: string | null;
  login: (data: { email: string; password: string }) => Promise<{ error?: string; user?: AuthUser }>;
  logout: () => void;
  adminAddUser: (data: NewUserInput) => Promise<{ error?: string }>;
  adminUpdateUser: (id: string, data: Partial<Omit<NewUserInput, "password">> & { password?: string }) => Promise<void>;
  adminDeleteUser: (id: string) => Promise<void>;
  updateProfile: (data: { fullName: string; department?: string }) => Promise<void>;
  refreshUsers: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  department: string | null;
  status: "Active" | "Inactive";
  created_at?: string;
};

function toAuthUser(p: ProfileRow): AuthUser {
  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    role: p.role,
    department: p.department ?? undefined,
    status: p.status,
    createdAt: p.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const loading = !sessionChecked || (sessionUserId !== null && !profileReady);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) setUser(toAuthUser(data as ProfileRow));
      return data ? toAuthUser(data as ProfileRow) : null;
    },
    [supabase]
  );

  const refreshUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setUsers((data as ProfileRow[]).map(toAuthUser));
  }, [supabase]);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      setSessionUserId(session?.user?.id ?? null);
      setSessionChecked(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Never await Supabase calls here — it deadlocks signInWithPassword.
      setSessionUserId(session?.user?.id ?? null);
      setSessionChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!sessionChecked) return;

    if (!sessionUserId) {
      setUser(null);
      setProfileReady(true);
      return;
    }

    let cancelled = false;
    setProfileReady(false);

    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", sessionUserId).single();
      if (cancelled) return;
      if (data) setUser(toAuthUser(data as ProfileRow));
      setProfileReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionUserId, sessionChecked, supabase]);

  useEffect(() => {
    if (user?.role === "team" || user?.role === "admin") {
      refreshUsers();
    } else {
      setUsers([]);
    }
  }, [user?.id, user?.role, refreshUsers]);

  async function login({ email, password }: { email: string; password: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json.error || "Sign-in failed. Try again." };

    const authUser = json.user as AuthUser;
    setSessionUserId(authUser.id);
    setSessionChecked(true);
    setUser(authUser);
    setProfileReady(true);
    return { user: authUser };
  }

  function logout() {
    supabase.auth.signOut();
    setUser(null);
    setSessionUserId(null);
    setProfileReady(true);
  }

  async function adminAddUser(data: NewUserInput) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    if (!res.ok) return { error: json.error || `Failed to invite user (server returned ${res.status}).` };
    await refreshUsers();
    return {};
  }

  async function adminUpdateUser(id: string, data: Partial<Omit<NewUserInput, "password">> & { password?: string }) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    await refreshUsers();
    if (user && user.id === id) await loadProfile(id);
  }

  async function adminDeleteUser(id: string) {
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refreshUsers();
  }

  async function updateProfile(data: { fullName: string; department?: string }) {
    if (!user) return;
    await supabase.from("profiles").update({ full_name: data.fullName, department: data.department }).eq("id", user.id);
    await loadProfile(user.id);
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        loading,
        sessionUserId,
        login,
        logout,
        adminAddUser,
        adminUpdateUser,
        adminDeleteUser,
        updateProfile,
        refreshUsers,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

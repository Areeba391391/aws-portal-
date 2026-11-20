"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { StoredEventRegistration } from "@/lib/crossUserStores";

interface RegisterOptions {
  formResponses?: Record<string, string>;
  teamName?: string;
}

interface EventRegistrationContextValue {
  loading: boolean;
  isRegistered: (eventId: string) => boolean;
  register: (eventId: string, options?: RegisterOptions) => Promise<{ error?: string }>;
  unregister: (eventId: string) => Promise<void>;
  myRegistrations: () => StoredEventRegistration[];
  registrationCount: (eventId: string) => number;
}

const EventRegistrationContext = createContext<EventRegistrationContextValue | null>(null);

export function EventRegistrationProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const { user } = useAuth();
  const [mine, setMine] = useState<StoredEventRegistration[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setMine([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("event_registrations")
      .select("event_id,registered_at,form_responses,team_name")
      .eq("student_id", userId);
    setMine(
      (data ?? []).map((r: any) => ({
        eventId: r.event_id,
        registeredAt: r.registered_at,
        formResponses: r.form_responses ?? {},
        teamName: r.team_name ?? undefined,
      }))
    );
    setLoading(false);
  }, [supabase, userId]);

  const refreshCounts = useCallback(async () => {
    const { data } = await supabase.from("event_registrations").select("event_id");
    const tally: Record<string, number> = {};
    for (const row of data ?? []) {
      const eid = (row as any).event_id;
      tally[eid] = (tally[eid] ?? 0) + 1;
    }
    setCounts(tally);
  }, [supabase]);

  useEffect(() => {
    refresh();
    refreshCounts();
  }, [refresh, refreshCounts]);

  function isRegistered(eventId: string) {
    return mine.some((r) => r.eventId === eventId);
  }

  function registrationCount(eventId: string) {
    return counts[eventId] ?? 0;
  }

  async function register(eventId: string, options?: RegisterOptions) {
    if (!user) return { error: "You must be logged in to register." };
    if (isRegistered(eventId)) return { error: "Already registered." };

    const { error } = await supabase.from("event_registrations").insert({
      event_id: eventId,
      student_id: user.id,
      form_responses: options?.formResponses ?? {},
      team_name: options?.teamName ?? null,
    });

    if (error) {
      if (error.code === "23505") return { error: "You are already registered for this event." };
      return { error: error.message };
    }

    setMine((list) => [
      ...list,
      {
        eventId,
        registeredAt: new Date().toISOString(),
        formResponses: options?.formResponses,
        teamName: options?.teamName,
      },
    ]);
    setCounts((c) => ({ ...c, [eventId]: (c[eventId] ?? 0) + 1 }));
    return {};
  }

  async function unregister(eventId: string) {
    if (!user) return;
    await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("student_id", user.id);
    setMine((list) => list.filter((r) => r.eventId !== eventId));
    setCounts((c) => ({ ...c, [eventId]: Math.max(0, (c[eventId] ?? 1) - 1) }));
  }

  return (
    <EventRegistrationContext.Provider
      value={{ loading, isRegistered, register, unregister, myRegistrations: () => mine, registrationCount }}
    >
      {children}
    </EventRegistrationContext.Provider>
  );
}

export function useEventRegistration() {
  const ctx = useContext(EventRegistrationContext);
  if (!ctx) throw new Error("useEventRegistration must be used within EventRegistrationProvider");
  return ctx;
}

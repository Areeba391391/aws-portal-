"use client";

import { getBrowserSupabase } from "@/lib/supabase/browserSingleton";

/**
 * Browser-side Supabase client.
 * Uses the public URL + anon/publishable key only — safe to expose to the client.
 * Returns a process-wide singleton so hooks do not open duplicate auth sessions.
 */
export function createClient() {
  return getBrowserSupabase();
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Copy, Link2, Loader2, Mail, RefreshCw, UserRoundCheck, X } from "lucide-react";

type CredentialRequest = {
  id: string;
  full_name: string;
  email: string;
  department_session: string;
  study_year: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export default function CredentialRequestsPage() {
  const [requests, setRequests] = useState<CredentialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CredentialRequest["status"] | "all">("pending");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [activationLinks, setActivationLinks] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/credential-requests", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "Could not load requests.");
    else setRequests(body.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => requests.filter((request) => filter === "all" || request.status === filter),
    [requests, filter]
  );

  async function decide(id: string, action: "approve" | "reject" | "activation-link") {
    if (action === "reject" && !window.confirm("Reject this credential request?")) return;
    setActingId(id);
    setError("");
    setNotice("");
    const response = await fetch("/api/admin/credential-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const body = await response.json().catch(() => ({}));
    setActingId(null);
    if (!response.ok) {
      setError(body.error ?? "The request could not be updated.");
      return;
    }
    if (body.activationLink) {
      setActivationLinks((prev) => ({ ...prev, [id]: body.activationLink }));
    }
    setNotice(body.message ?? `Request ${action === "approve" ? "approved" : "rejected"}.`);
    if (action !== "activation-link") await load();
  }

  async function copyLink(id: string) {
    const link = activationLinks[id];
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  }

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Credential Requests</h1>
          <p className="mt-1 text-sm text-paragraph-light dark:text-paragraph-dark">
            Approve students and send secure one-time portal invitations. Approved students set their own password
            from the invite link — you never handle their password.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary !px-4 !py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Pending" value={counts.pending} icon={Clock3} tone="text-orange" />
        <Summary label="Approved" value={counts.approved} icon={UserRoundCheck} tone="text-emerald-500" />
        <Summary label="Rejected" value={counts.rejected} icon={X} tone="text-red-400" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${
              filter === item
                ? "bg-orange text-white"
                : "border border-border-light bg-card-light text-paragraph-light dark:border-border-dark dark:bg-card-dark dark:text-paragraph-dark"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {notice && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500">{notice}</p>}
      {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</p>}

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-orange" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <Mail className="mx-auto h-8 w-8 text-orange/50" />
            <p className="mt-3 text-sm text-paragraph-light dark:text-paragraph-dark">No {filter === "all" ? "" : filter} requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {visible.map((request) => (
              <article key={request.id} className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-heading-light dark:text-heading-dark">{request.full_name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        request.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : request.status === "rejected"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-orange/10 text-orange"
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-sm text-paragraph-light dark:text-paragraph-dark">{request.email}</p>
                    <p className="mt-2 text-xs text-paragraph-light dark:text-paragraph-dark">
                      {request.department_session} · {request.study_year} · Requested {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>

                  {request.status === "pending" ? (
                    <div className="flex flex-shrink-0 gap-2">
                      <button
                        onClick={() => decide(request.id, "reject")}
                        disabled={actingId === request.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => decide(request.id, "approve")}
                        disabled={actingId === request.id}
                        className="btn-primary !px-4 !py-2 text-xs disabled:opacity-50"
                      >
                        {actingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve & Invite
                      </button>
                    </div>
                  ) : request.status === "approved" ? (
                    <button
                      onClick={() => decide(request.id, "activation-link")}
                      disabled={actingId === request.id}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border-light px-4 py-2 text-xs font-semibold text-paragraph-light hover:border-orange hover:text-orange disabled:opacity-50 dark:border-border-dark dark:text-paragraph-dark"
                    >
                      {actingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                      Activation link
                    </button>
                  ) : null}
                </div>

                {activationLinks[request.id] && (
                  <div className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-4">
                    <p className="text-xs font-semibold text-orange">Backup activation link</p>
                    <p className="mt-1 text-xs text-paragraph-light dark:text-paragraph-dark">
                      Share this with the student if the invitation email link does not work. It expires in about an
                      hour and can only be used once.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        readOnly
                        value={activationLinks[request.id]}
                        onFocus={(event) => event.currentTarget.select()}
                        className="input-field flex-1 !py-2 text-xs"
                      />
                      <button
                        onClick={() => copyLink(request.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-3 py-2 text-xs font-semibold text-white"
                      >
                        <Copy className="h-3.5 w-3.5" /> {copiedId === request.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: string;
}) {
  return (
    <div className="card-surface flex items-center gap-4 p-5">
      <Icon className={`h-6 w-6 ${tone}`} />
      <div>
        <p className="font-numbers text-2xl font-bold text-heading-light dark:text-heading-dark">{value}</p>
        <p className="text-xs text-paragraph-light dark:text-paragraph-dark">{label}</p>
      </div>
    </div>
  );
}

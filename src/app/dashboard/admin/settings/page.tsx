"use client";

import { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";

export default function AdminSettingsPage() {
  const { siteSettings, updateSiteSettings } = useData();
  const [form, setForm] = useState(siteSettings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(siteSettings);
  }, [siteSettings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateSiteSettings(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">System Settings</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          Configure global platform settings — saved to Supabase.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-surface p-7 space-y-5">
        <div>
          <label className="text-sm font-medium text-heading-light dark:text-heading-dark">Platform Name</label>
          <input
            value={form.platformName}
            onChange={(e) => setForm((f) => ({ ...f, platformName: e.target.value }))}
            className="input-field mt-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-heading-light dark:text-heading-dark">University Name</label>
          <input
            value={form.universityName}
            onChange={(e) => setForm((f) => ({ ...f, universityName: e.target.value }))}
            className="input-field mt-2"
            placeholder="e.g. Your University"
          />
          <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-1">Shown in hero bar and branding.</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-orange/20 bg-orange/5 p-4">
          <div>
            <p className="text-sm font-medium text-heading-light dark:text-heading-dark">Invite-only access</p>
            <p className="text-xs text-paragraph-light dark:text-paragraph-dark">Public sign-up is permanently disabled. Approve users from Credential Requests.</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">Enabled</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-heading-light dark:text-heading-dark">Maintenance mode</p>
            <p className="text-xs text-paragraph-light dark:text-paragraph-dark">Temporarily restricts public portal activity.</p>
          </div>
          <input
            type="checkbox"
            checked={form.maintenanceMode}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceMode: e.target.checked }))}
            className="accent-orange h-5 w-5"
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

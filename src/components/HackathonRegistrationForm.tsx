"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField, EventItem, eventNeedsTeamName } from "@/types";
import { Loader2 } from "lucide-react";

function buildSchema(fields: FormField[], needsTeamName: boolean) {
  const shape: Record<string, z.ZodTypeAny> = {};
  if (needsTeamName) {
    shape.teamName = z.string().min(2, "Team name is required").max(80);
  }
  for (const f of fields) {
    let rule: z.ZodTypeAny = z.string();
    if (f.type === "email") rule = z.string().email("Invalid email");
    if (f.type === "number") rule = z.coerce.number();
    if (f.required) {
      if (f.type === "number") rule = z.coerce.number({ invalid_type_error: `${f.label} is required` });
      else rule = (rule as z.ZodString).min(1, `${f.label} is required`);
    } else {
      rule = rule.optional();
    }
    shape[f.id] = rule;
  }
  return z.object(shape);
}

export function HackathonRegistrationForm({
  event,
  onSubmit,
  submitting,
}: {
  event: EventItem;
  onSubmit: (data: { formResponses: Record<string, string>; teamName?: string }) => Promise<void>;
  submitting: boolean;
}) {
  const fields = event.registrationForm ?? [];
  const needsTeamName = eventNeedsTeamName(event);
  const schema = buildSchema(fields, needsTeamName);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onFormSubmit(values: Record<string, unknown>) {
    const formResponses: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.id];
      if (v !== undefined && v !== "") formResponses[f.id] = String(v);
    }
    await onSubmit({
      formResponses,
      teamName: needsTeamName ? String(values.teamName ?? "") : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {needsTeamName && (
        <div>
          <label className="text-sm font-medium text-heading-dark">Team Name *</label>
          <input {...register("teamName")} className="input-field mt-2" placeholder="Cloud Crusaders" />
          {"teamName" in errors && (
            <p className="text-xs text-red-400 mt-1">{(errors as Record<string, { message?: string }>).teamName?.message}</p>
          )}
        </div>
      )}

      {fields.map((f) => (
        <div key={f.id}>
          <label className="text-sm font-medium text-heading-dark">
            {f.label}
            {f.required && " *"}
          </label>
          {f.type === "textarea" ? (
            <textarea
              {...register(f.id)}
              rows={3}
              className="input-field mt-2 resize-none"
              placeholder={f.placeholder}
            />
          ) : f.type === "select" ? (
            <select {...register(f.id)} className="select-field-dark mt-2">
              <option value="">Select...</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              {...register(f.id)}
              type={f.type === "number" ? "number" : f.type}
              className="input-field mt-2"
              placeholder={f.placeholder}
            />
          )}
          {errors[f.id] && (
            <p className="text-xs text-red-400 mt-1">{(errors[f.id] as { message?: string })?.message}</p>
          )}
        </div>
      ))}

      {fields.length === 0 && !needsTeamName && (
        <p className="text-sm text-paragraph-dark">Click register to confirm your spot.</p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</>
        ) : (
          "Complete Registration"
        )}
      </button>
    </form>
  );
}

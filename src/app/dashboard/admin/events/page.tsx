"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, MapPin, Users, ChevronDown, Video, Ban, RotateCcw } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { EventItem, EventType, EVENT_TYPES, FormField, eventNeedsTeamName } from "@/types";
import { readAllEventRegistrations } from "@/lib/crossUserStores";
import { EventStatus, getEventStatus, isValidMeetingLink, toDateInputValue } from "@/lib/eventDates";

const emptyForm = {
  title: "",
  type: "Workshop" as EventType,
  date: new Date().toISOString().slice(0, 10),
  mode: "Online" as EventItem["mode"],
  description: "",
  venue: "",
  maxParticipants: undefined as number | undefined,
  registrationOpen: true,
  prizes: "",
  teamSizeMax: 4,
  rules: "",
  registrationForm: [] as FormField[],
  meetingLink: "",
  teamRegistration: false,
  isCancelled: false,
};

const typeFilters = ["All", ...EVENT_TYPES] as const;
const statusFilters = ["All", "Upcoming", "Ongoing", "Completed", "Cancelled"] as const;

export default function AdminEventsPage() {
  const { events, addEvent, updateEvent, deleteEvent } = useData();
  const { users } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [regStore, setRegStore] = useState<Record<string, { eventId: string }[]>>({});
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("All");

  useEffect(() => {
    readAllEventRegistrations().then(setRegStore);
  }, [modalOpen]);

  const decorated = useMemo(
    () =>
      events
        .map((ev) => ({ ev, status: getEventStatus(ev.date, { cancelled: ev.isCancelled }) }))
        .sort((a, b) => b.ev.date.localeCompare(a.ev.date)),
    [events]
  );

  const visible = decorated.filter(
    ({ ev, status }) =>
      (typeFilter === "All" || ev.type === typeFilter) && (statusFilter === "All" || status === statusFilter)
  );

  const statusCounts = decorated.reduce<Record<EventStatus, number>>(
    (acc, { status }) => ({ ...acc, [status]: acc[status] + 1 }),
    { Upcoming: 0, Ongoing: 0, Completed: 0, Cancelled: 0 }
  );

  function registrantsFor(eventId: string) {
    return Object.entries(regStore)
      .filter(([, regs]) => regs.some((r) => r.eventId === eventId))
      .map(([userId]) => users.find((u) => u.id === userId))
      .filter((u): u is NonNullable<typeof u> => Boolean(u));
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(ev: EventItem) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      type: ev.type,
      date: toDateInputValue(ev.date),
      mode: ev.mode,
      description: ev.description,
      venue: ev.venue ?? "",
      maxParticipants: ev.maxParticipants,
      registrationOpen: ev.registrationOpen ?? true,
      prizes: ev.prizes ?? "",
      teamSizeMax: ev.teamSizeMax ?? 4,
      rules: ev.rules ?? "",
      registrationForm: ev.registrationForm ?? [],
      meetingLink: ev.meetingLink ?? "",
      teamRegistration: ev.teamRegistration ?? false,
      isCancelled: ev.isCancelled ?? false,
    });
    setFormError("");
    setModalOpen(true);
  }

  function addFormField() {
    setForm((f) => ({
      ...f,
      registrationForm: [
        ...f.registrationForm,
        { id: `f_${Date.now()}`, label: "New field", type: "text", required: false },
      ],
    }));
  }

  function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!isValidMeetingLink(form.meetingLink)) {
      setFormError("Enter a full meeting URL starting with https:// (e.g. https://meet.google.com/abc-defg-hij).");
      return;
    }
    const payload = { ...form, meetingLink: form.meetingLink.trim() };
    if (editingId) {
      updateEvent(editingId, payload);
    } else {
      addEvent(payload);
    }
    setModalOpen(false);
  }

  const needsMeetingLink = form.mode === "Online" || form.mode === "Hybrid";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">All Events</h1>
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
            Workshops, bootcamps, seminars, and hackathons in one place — filter by category or status.
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary !py-2.5 !px-5 text-sm">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      <div className="card-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-paragraph-light dark:text-paragraph-dark mr-1">Category</span>
          {typeFilters.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                typeFilter === t
                  ? "bg-orange text-white"
                  : "border border-border-light dark:border-border-dark text-paragraph-light dark:text-paragraph-dark hover:border-orange/50"
              }`}
            >
              {t}
              {t !== "All" && ` (${decorated.filter(({ ev }) => ev.type === t).length})`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-paragraph-light dark:text-paragraph-dark mr-1">Status</span>
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === s
                  ? "bg-orange text-white"
                  : "border border-border-light dark:border-border-dark text-paragraph-light dark:text-paragraph-dark hover:border-orange/50"
              }`}
            >
              {s}
              {s !== "All" && ` (${statusCounts[s as EventStatus]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {visible.length === 0 && (
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark text-center py-10">
            {events.length === 0 ? "No events yet." : "No events match these filters."}
          </p>
        )}
        {visible.map(({ ev, status }, i) => {
          const date = new Date(ev.date);
          const registrants = registrantsFor(ev.id);
          const isOpen = expanded === ev.id;
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.06 }}
              className={`card-surface p-5 ${status === "Completed" || status === "Cancelled" ? "opacity-75" : ""}`}
            >
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-navy dark:bg-white/10 flex flex-col items-center justify-center text-white">
                  <span className="text-[10px] font-semibold text-orange">
                    {date.toLocaleString("en-US", { month: "short" }).toUpperCase()}
                  </span>
                  <span className="font-numbers text-xl font-bold">{date.getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-orange">{ev.type}</span>
                    <EventStatusBadge status={status} />
                  </div>
                  <h4 className="font-heading font-semibold text-heading-light dark:text-heading-dark truncate">{ev.title}</h4>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paragraph-light dark:text-paragraph-dark mt-1">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {ev.mode}</span>
                    {ev.meetingLink && (
                      <span className="flex items-center gap-1.5 text-skyblue"><Video className="h-3.5 w-3.5" /> Meeting link added</span>
                    )}
                    {eventNeedsTeamName(ev) && <span>Team registration</span>}
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-orange/10 text-orange px-3 py-1.5 text-xs font-semibold"
                >
                  <Users className="h-3.5 w-3.5" /> {registrants.length} <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => updateEvent(ev.id, { isCancelled: !ev.isCancelled })}
                    className={ev.isCancelled ? "text-emerald-500 hover:text-emerald-600" : "text-amber-500 hover:text-amber-600"}
                    title={ev.isCancelled ? "Restore event" : "Mark as cancelled"}
                  >
                    {ev.isCancelled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEditModal(ev)} className="text-skyblue hover:text-orange transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteEvent(ev.id)} className="text-red-500 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                  {registrants.length === 0 ? (
                    <p className="text-xs text-paragraph-light dark:text-paragraph-dark">No one has registered yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {registrants.map((u) => (
                        <li key={u.id} className="text-xs text-paragraph-light dark:text-paragraph-dark flex justify-between">
                          <span className="text-heading-light dark:text-heading-dark font-medium">{u.fullName}</span>
                          <span>{u.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Event" : "New Event"}>
        <form onSubmit={saveEvent} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">Event Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field mt-2"
              placeholder="AWS Cloud Workshop"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-heading-light dark:text-white">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                className="select-field mt-2"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-heading-light dark:text-white">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as EventItem["mode"] })}
                className="select-field mt-2"
              >
                <option value="Online">Online</option>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">
              Meeting Link {needsMeetingLink ? "" : "(optional)"}
            </label>
            <input
              type="url"
              inputMode="url"
              value={form.meetingLink}
              onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
              className="input-field mt-2"
              placeholder="https://meet.google.com/abc-defg-hij"
            />
            <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-1.5">
              Zoom, Google Meet, or Teams URL. Shown to registered participants on the event page.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="input-field mt-2 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-heading-light dark:text-white">Venue (optional)</label>
              <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="input-field mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-heading-light dark:text-white">Max participants</label>
              <input type="number" min={1} value={form.maxParticipants ?? ""} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value ? Number(e.target.value) : undefined })} className="input-field mt-2" />
            </div>
          </div>

          {form.type === "Hackathon" ? (
            <>
              <div>
                <label className="text-sm font-medium text-heading-light dark:text-white">Prizes</label>
                <textarea value={form.prizes} onChange={(e) => setForm({ ...form, prizes: e.target.value })} rows={2} className="input-field mt-2 resize-none" placeholder="1st: $500 AWS credits..." />
              </div>
              <div>
                <label className="text-sm font-medium text-heading-light dark:text-white">Rules</label>
                <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} rows={2} className="input-field mt-2 resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-heading-light dark:text-white">Max team size</label>
                <input type="number" min={1} max={10} value={form.teamSizeMax} onChange={(e) => setForm({ ...form, teamSizeMax: Number(e.target.value) })} className="input-field mt-2" />
              </div>
            </>
          ) : (
            <label className="flex items-start gap-2.5 text-sm text-heading-light dark:text-white">
              <input
                type="checkbox"
                checked={form.teamRegistration}
                onChange={(e) => setForm({ ...form, teamRegistration: e.target.checked })}
                className="accent-orange mt-0.5"
              />
              <span>
                Team-based registration
                <span className="block text-xs text-paragraph-light dark:text-paragraph-dark">
                  Leave unchecked for solo events — the Team Name field is then hidden from registrants.
                </span>
              </span>
            </label>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-heading-light dark:text-white">Registration form fields</label>
              <button type="button" onClick={addFormField} className="text-xs text-orange font-semibold">+ Add field</button>
            </div>
            <div className="mt-2 space-y-2">
              {form.registrationForm.length === 0 && (
                <p className="text-xs text-paragraph-light dark:text-paragraph-dark">
                  No extra fields — registrants only confirm their spot.
                </p>
              )}
              {form.registrationForm.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <input
                    value={field.label}
                    onChange={(e) => {
                      const next = [...form.registrationForm];
                      next[idx] = { ...field, label: e.target.value };
                      setForm({ ...form, registrationForm: next });
                    }}
                    className="input-field flex-1"
                    placeholder="Field label"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => {
                      const next = [...form.registrationForm];
                      next[idx] = { ...field, type: e.target.value as FormField["type"] };
                      setForm({ ...form, registrationForm: next });
                    }}
                    className="select-field-sm w-32"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="textarea">Long text</option>
                    <option value="select">Dropdown</option>
                    <option value="number">Number</option>
                  </select>
                  <label className="text-xs flex items-center gap-1 text-paragraph-light dark:text-paragraph-dark whitespace-nowrap">
                    <input type="checkbox" checked={field.required} onChange={(e) => {
                      const next = [...form.registrationForm];
                      next[idx] = { ...field, required: e.target.checked };
                      setForm({ ...form, registrationForm: next });
                    }} className="accent-orange" />
                    Req
                  </label>
                  <button type="button" onClick={() => setForm({ ...form, registrationForm: form.registrationForm.filter((_, i) => i !== idx) })} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-heading-light dark:text-white">
              <input type="checkbox" checked={form.registrationOpen} onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })} className="accent-orange" />
              Registration open
            </label>
            <label className="flex items-center gap-2 text-sm text-heading-light dark:text-white">
              <input type="checkbox" checked={form.isCancelled} onChange={(e) => setForm({ ...form, isCancelled: e.target.checked })} className="accent-orange" />
              Cancelled
            </label>
          </div>

          {formError && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{formError}</p>}

          <button type="submit" className="btn-primary w-full justify-center">
            {editingId ? "Save Changes" : "Create Event"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

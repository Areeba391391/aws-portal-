"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { useData } from "@/context/DataContext";
import { EventItem, EventType, EVENT_TYPES } from "@/types";
import { getEventStatus, isValidMeetingLink, toDateInputValue } from "@/lib/eventDates";

const emptyForm = {
  title: "",
  type: "Workshop" as EventType,
  date: new Date().toISOString().slice(0, 10),
  mode: "Online" as EventItem["mode"],
  description: "",
  meetingLink: "",
};

export default function TeamEventsPage() {
  const { events, addEvent, updateEvent, deleteEvent } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

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
      meetingLink: ev.meetingLink ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!isValidMeetingLink(form.meetingLink)) {
      setFormError("Enter a full meeting URL starting with https://");
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

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Manage Events</h1>
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
            Changes here appear instantly on the public Events page and student dashboards.
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary !py-2.5 !px-5 text-sm">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      <div className="space-y-4">
        {events.length === 0 && (
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark text-center py-10">
            No events yet — click "New Event" to create one.
          </p>
        )}
        {events.map((ev, i) => {
          const date = new Date(ev.date);
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="card-surface p-5 flex items-center gap-5"
            >
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-navy dark:bg-white/10 flex flex-col items-center justify-center text-white">
                <span className="text-[10px] font-semibold text-orange">
                  {date.toLocaleString("en-US", { month: "short" }).toUpperCase()}
                </span>
                <span className="font-numbers text-xl font-bold">{date.getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-orange">{ev.type}</span>
                  <EventStatusBadge status={getEventStatus(ev.date, { cancelled: ev.isCancelled })} />
                </div>
                <h4 className="font-heading font-semibold text-heading-light dark:text-heading-dark truncate">{ev.title}</h4>
                <p className="flex items-center gap-1.5 text-xs text-paragraph-light dark:text-paragraph-dark mt-1">
                  <MapPin className="h-3.5 w-3.5" /> {ev.mode}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => openEditModal(ev)} className="text-skyblue hover:text-orange transition-colors"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deleteEvent(ev.id)} className="text-red-500 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Event" : "New Event"}>
        <form onSubmit={saveEvent} className="space-y-4">
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
            <label className="text-sm font-medium text-heading-light dark:text-white">Meeting Link (optional)</label>
            <input
              type="url"
              inputMode="url"
              value={form.meetingLink}
              onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
              className="input-field mt-2"
              placeholder="https://meet.google.com/abc-defg-hij"
            />
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
          {formError && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{formError}</p>}
          <button type="submit" className="btn-primary w-full justify-center">
            {editingId ? "Save Changes" : "Create Event"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

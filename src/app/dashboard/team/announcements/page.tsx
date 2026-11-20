"use client";

import { useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useData } from "@/context/DataContext";

export default function TeamAnnouncementsPage() {
  const { announcements, addAnnouncement, deleteAnnouncement } = useData();
  const globalAnnouncements = announcements.filter((item) => !item.courseId);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setPosting(true);
    await addAnnouncement({ title: title.trim(), message: message.trim() });
    setTitle("");
    setMessage("");
    setPosting(false);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Announcements</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          Broadcast updates to all students — saved to the database and visible on student dashboards.
        </p>
      </div>

      <form onSubmit={post} className="card-surface p-5 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          className="input-field"
          maxLength={120}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message for all students..."
          rows={3}
          className="input-field resize-none"
          maxLength={1000}
        />
        <button type="submit" disabled={posting} className="btn-primary !py-2 !px-4 text-sm">
          <Plus className="h-4 w-4" /> {posting ? "Posting..." : "Post Announcement"}
        </button>
      </form>

      <div className="space-y-3">
        {globalAnnouncements.length === 0 && (
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark text-center py-10">No announcements yet.</p>
        )}
        {globalAnnouncements.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-surface p-5 flex items-start gap-4"
          >
            <Megaphone className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-heading-light dark:text-heading-dark">{a.title}</p>
              {a.message && <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">{a.message}</p>}
              <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-2">
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
            <button onClick={() => deleteAnnouncement(a.id)} className="text-red-400 hover:text-red-500 p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

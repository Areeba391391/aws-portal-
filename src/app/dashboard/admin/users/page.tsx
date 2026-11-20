"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Mail } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";

const emptyForm = {
  fullName: "",
  email: "",
  role: "student" as Role,
  department: "",
  status: "Active" as "Active" | "Inactive",
};

export default function AdminUsersPage() {
  const { users, user: currentUser, adminAddUser, adminUpdateUser, adminDeleteUser } = useAuth();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openAddModal() {
    setEditingId(null);
    setFormError(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    setEditingId(id);
    setFormError(null);
    setForm({ fullName: u.fullName, email: u.email, role: u.role, department: u.department ?? "", status: u.status });
    setModalOpen(true);
  }

  function removeUser(id: string) {
    const admins = users.filter((u) => u.role === "admin");
    if (admins.length === 1 && admins[0].id === id) {
      alert("You can't remove the last remaining admin account.");
      return;
    }
    if (id === currentUser?.id) {
      alert("You can't remove your own account while logged in.");
      return;
    }
    adminDeleteUser(id);
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.fullName.trim() || !form.email.trim()) return;

    if (editingId) {
      const admins = users.filter((u) => u.role === "admin");
      if (admins.length === 1 && admins[0].id === editingId && form.role !== "admin") {
        setFormError("You can't demote the last remaining admin account.");
        return;
      }
      await adminUpdateUser(editingId, {
        fullName: form.fullName,
        role: form.role,
        department: form.department,
        status: form.status,
      });
    } else {
      const { error } = await adminAddUser({
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        department: form.department,
        status: form.status,
      });
      if (error) {
        setFormError(error);
        return;
      }
    }
    setModalOpen(false);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Users Management</h1>
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
            Invite founding team members and manage every portal account. New users receive a secure
            email link to choose their own password.
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary !py-2.5 !px-5 text-sm">
          <Plus className="h-4 w-4" /> Invite User
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-paragraph-light dark:text-paragraph-dark" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full rounded-xl border border-border-light dark:border-border-dark bg-transparent pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange"
        />
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-bg-light dark:bg-white/5 text-left text-xs uppercase text-paragraph-light dark:text-paragraph-dark">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-paragraph-light dark:text-paragraph-dark">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border-light dark:border-border-dark hover:bg-orange/5 transition-colors">
                <td className="px-5 py-3.5 font-medium text-heading-light dark:text-heading-dark whitespace-nowrap">
                  {u.fullName} {u.id === currentUser?.id && <span className="text-orange text-xs font-normal">(you)</span>}
                </td>
                <td className="px-5 py-3.5 text-paragraph-light dark:text-paragraph-dark whitespace-nowrap">{u.email}</td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-skyblue/10 text-skyblue capitalize">{u.role}</span>
                </td>
                <td className="px-5 py-3.5 text-paragraph-light dark:text-paragraph-dark whitespace-nowrap">{u.department || "—"}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEditModal(u.id)} className="text-skyblue hover:text-orange transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => removeUser(u.id)} className="text-red-500 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit User" : "Invite User"}>
        <form onSubmit={saveUser} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">Full Name</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="mt-2 w-full rounded-xl border border-border-light dark:border-white/20 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-orange dark:text-white"
              placeholder="Full name"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!!editingId}
              className="mt-2 w-full rounded-xl border border-border-light dark:border-white/20 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-orange dark:text-white disabled:opacity-50"
              placeholder="name@gmail.com"
              required
            />
          </div>

          {!editingId && (
            <div className="flex items-start gap-3 rounded-xl border border-orange/20 bg-orange/5 p-4">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange" />
              <p className="text-xs leading-relaxed text-paragraph-light dark:text-white/60">
                A secure invitation will be sent to this email. The recipient sets their own password;
                no password is shared or stored in plain text.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-heading-light dark:text-white">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="select-field mt-2"
              >
                <option value="student">Student</option>
                <option value="team">Team</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-heading-light dark:text-white">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Inactive" })}
                className="select-field mt-2"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-heading-light dark:text-white">Department</label>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="mt-2 w-full rounded-xl border border-border-light dark:border-white/20 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-orange dark:text-white"
              placeholder="Computer Science"
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <button type="submit" className="btn-primary w-full justify-center">
            {editingId ? "Save Changes" : "Send Secure Invitation"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

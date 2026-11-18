import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  KeyRound,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  AccountStatus,
  ClassRoom,
  LeaderboardEntry,
  UserAccount,
  UserRole,
} from '../types';
import { soundFx } from '../utils/sound';
import { AvatarBadge } from './AvatarBadge';

interface AccountManagerProps {
  currentUser: UserAccount;
  users: UserAccount[];
  leaderboard: LeaderboardEntry[];
  onRefresh: () => Promise<void>;
  onUserUpdate?: (updated: UserAccount) => void;
  onNotify?: (message: string) => void;
}

const STUDENT_CLASSES: ClassRoom[] = ['VII-A', 'VII-B', 'VIII-A', 'VIII-B', 'IX-A', 'IX-B'];

const STATUS_META: Record<AccountStatus, { label: string; textClass: string }> = {
  approved: { label: 'Aktif (ACC)', textClass: 'text-emerald-700' },
  pending: { label: 'Menunggu ACC', textClass: 'text-amber-700' },
  rejected: { label: 'Ditolak', textClass: 'text-red-700' },
};

export const AccountManager: React.FC<AccountManagerProps> = ({
  currentUser,
  users,
  leaderboard,
  onRefresh,
  onUserUpdate,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [roleClassFilter, setRoleClassFilter] = useState<string>('ALL');

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newNisOrEmail, setNewNisOrEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newClassName, setNewClassName] = useState<ClassRoom>('VII-A');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit / Reset password modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editNisOrEmail, setEditNisOrEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editClassName, setEditClassName] = useState<ClassRoom>('VII-A');
  const [editStatus, setEditStatus] = useState<AccountStatus>('approved');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline delete confirmation & row action state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const statsMap = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    for (const entry of leaderboard) {
      map.set(entry.studentId, entry);
    }
    return map;
  }, [leaderboard]);

  const counts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let teachers = 0;
    for (const u of users) {
      const st = u.status || 'approved';
      if (st === 'approved') approved++;
      else if (st === 'pending') pending++;
      else if (st === 'rejected') rejected++;
      if (u.role === 'teacher') teachers++;
    }
    return { total: users.length, approved, pending, rejected, teachers };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const st = u.status || 'approved';
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (roleClassFilter === 'TEACHER' && u.role !== 'teacher') return false;
      if (
        roleClassFilter !== 'ALL' &&
        roleClassFilter !== 'TEACHER' &&
        (u.role !== 'student' || u.className !== roleClassFilter)
      ) {
        return false;
      }
      if (q) {
        const hay = `${u.fullName} ${u.nisOrEmail} ${u.className}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, searchQuery, statusFilter, roleClassFilter]);

  function openEditModal(target: UserAccount) {
    setEditingUser(target);
    setEditFullName(target.fullName);
    setEditNisOrEmail(target.nisOrEmail);
    setEditRole(target.role);
    setEditClassName(target.className === 'Guru' ? 'VII-A' : target.className);
    setEditStatus(target.status || 'approved');
    setEditPassword('');
    setEditError('');
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName,
          nisOrEmail: newNisOrEmail,
          role: newRole,
          className: newRole === 'teacher' ? 'Guru' : newClassName,
          password: newPassword,
          status: 'approved',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Gagal membuat akun baru.');
        soundFx.wrong();
        return;
      }
      soundFx.correct();
      const created = data.user as UserAccount;
      setCreateOpen(false);
      setNewFullName('');
      setNewNisOrEmail('');
      setNewRole('student');
      setNewClassName('VII-A');
      setNewPassword('');
      const msg = `Akun baru ${created.fullName} (${created.role === 'teacher' ? 'Guru/Admin' : `Kelas ${created.className}`}) berhasil ditambahkan.`;
      setFeedback({ type: 'success', text: msg });
      onNotify?.(msg);
      await onRefresh();
    } catch {
      setCreateError('Gagal terhubung ke server.');
    } finally {
      setCreating(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setSavingEdit(true);
    try {
      const payload: Record<string, string> = {
        fullName: editFullName,
        nisOrEmail: editNisOrEmail,
        role: editRole,
        className: editRole === 'teacher' ? 'Guru' : editClassName,
        status: editStatus,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Gagal memperbarui akun.');
        soundFx.wrong();
        return;
      }
      soundFx.correct();
      const updated = data.user as UserAccount;
      if (updated.id === currentUser.id) {
        onUserUpdate?.(updated);
      }
      setEditingUser(null);
      const msg = editPassword.trim()
        ? `Data akun & kata sandi baru untuk ${updated.fullName} berhasil disimpan.`
        : `Data akun ${updated.fullName} berhasil diperbarui.`;
      setFeedback({ type: 'success', text: msg });
      onNotify?.(msg);
      await onRefresh();
    } catch {
      setEditError('Gagal terhubung ke server.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleQuickStatus(target: UserAccount, nextStatus: AccountStatus) {
    setBusyId(target.id);
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Gagal mengubah status akun.' });
        return;
      }
      soundFx.click();
      const label =
        nextStatus === 'approved'
          ? 'diaktifkan (ACC)'
          : nextStatus === 'rejected'
          ? 'dinonaktifkan/ditolak'
          : 'dikembalikan ke antrean ACC';
      const msg = `Akun ${target.fullName} berhasil ${label}.`;
      setFeedback({ type: 'success', text: msg });
      onNotify?.(msg);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteUser(target: UserAccount) {
    setBusyId(target.id);
    try {
      const res = await fetch(`/api/users/${target.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Gagal menghapus akun.' });
        return;
      }
      soundFx.click();
      setConfirmDeleteId(null);
      const msg = `Akun ${target.fullName} (${target.nisOrEmail}) telah dihapus dari sistem.`;
      setFeedback({ type: 'success', text: msg });
      onNotify?.(msg);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Akun Pengguna (Siswa & Guru)
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Kelola pendaftaran siswa, ubah kelas/peran, reset kata sandi, dan tambahkan akun pengajar secara langsung.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{counts.total} Total Akun</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">{counts.approved} Aktif</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-700 font-semibold">{counts.pending} Menunggu ACC</span>
              <span aria-hidden="true">·</span>
              <span className="text-red-700 font-semibold">{counts.rejected} Ditolak</span>
              <span aria-hidden="true">·</span>
              <span>{counts.teachers} Guru/Admin</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundFx.click();
            setCreateError('');
            setCreateOpen(true);
          }}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Tambah Akun Baru
        </button>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          className={`mt-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pemberitahuan"
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama lengkap, NIS, atau email..."
            aria-label="Cari akun pengguna"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-emerald-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'approved', label: 'Aktif' },
                { id: 'pending', label: `Pending (${counts.pending})` },
                { id: 'rejected', label: 'Ditolak' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter peran atau kelas"
            value={roleClassFilter}
            onChange={(e) => setRoleClassFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-700"
          >
            <option value="ALL">Semua Peran & Kelas</option>
            <option value="TEACHER">Guru / Admin</option>
            {STUDENT_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                Siswa {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th className="py-3 pr-4">Pengguna</th>
              <th className="py-3 pr-4">Peran & Kelas</th>
              <th className="py-3 pr-4">Status Akun</th>
              <th className="py-3 pr-4 text-right">Aktivitas & Skor</th>
              <th className="py-3 text-right">Tindakan Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => {
              const status = u.status || 'approved';
              const statusMeta = STATUS_META[status];
              const stat = statsMap.get(u.id);
              const isPrimaryAdmin = u.id === 'teacher-1';
              const isSelf = u.id === currentUser.id;
              const isConfirmingDelete = confirmDeleteId === u.id;

              return (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <AvatarBadge
                        photo={u.avatarPhoto}
                        icon={u.avatarIcon}
                        color={u.avatarColor}
                        alt={u.fullName}
                        sizeClass="h-9 w-9"
                        textClass="text-base"
                        roundedClass="rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {u.fullName}{' '}
                          {isSelf && (
                            <span className="font-normal text-xs text-emerald-700">(Anda)</span>
                          )}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-500">{u.nisOrEmail}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 pr-4 text-xs text-slate-700">
                    {u.role === 'teacher' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <Shield className="h-3.5 w-3.5 text-emerald-700" />
                        Guru / Admin
                      </span>
                    ) : (
                      <span>Siswa · Kelas {u.className}</span>
                    )}
                  </td>

                  <td className="py-3 pr-4 text-xs">
                    <span className={`font-semibold ${statusMeta.textClass}`}>
                      {statusMeta.label}
                    </span>
                    <span className="block font-mono text-[11px] text-slate-400 tabular-nums">
                      Daftar{' '}
                      {new Date(u.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>

                  <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {u.role === 'teacher' ? (
                      <span className="text-slate-400">Pengelola</span>
                    ) : stat ? (
                      <span>
                        {stat.gamesPlayed} game ·{' '}
                        <strong className="text-emerald-700">{stat.totalScore} pts</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400">0 game · 0 pts</span>
                    )}
                  </td>

                  <td className="py-3 text-right">
                    {isConfirmingDelete ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <span className="text-xs font-medium text-red-700">Hapus akun?</span>
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => handleDeleteUser(u)}
                          className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 whitespace-nowrap"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === u.id}
                              onClick={() => handleQuickStatus(u, 'approved')}
                              title="Setujui akun"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap"
                            >
                              <Check className="h-3.5 w-3.5" />
                              ACC
                            </button>
                            <button
                              type="button"
                              disabled={busyId === u.id}
                              onClick={() => handleQuickStatus(u, 'rejected')}
                              title="Tolak akun"
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 whitespace-nowrap"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {status === 'rejected' && (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleQuickStatus(u, 'approved')}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 whitespace-nowrap"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Aktifkan
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit / Sandi
                        </button>
                        {!isPrimaryAdmin && !isSelf && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(u.id)}
                            aria-label={`Hapus akun ${u.fullName}`}
                            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  Tidak ada akun yang cocok dengan pencarian atau filter saat ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create New User Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 id="create-user-title" className="text-lg font-bold text-slate-900">
                  Tambah Akun Baru
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Akun yang dibuat admin langsung berstatus Aktif (ACC) dan siap digunakan masuk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Tutup formulir tambah akun"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzan"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  NIS atau Email Login
                </label>
                <input
                  type="text"
                  required
                  value={newNisOrEmail}
                  onChange={(e) => setNewNisOrEmail(e.target.value)}
                  placeholder="Contoh: 20260725 atau ustadzah@almumtaz.sch.id"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Peran Akun</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                  >
                    <option value="student">Siswa</option>
                    <option value="teacher">Guru / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Kelas</label>
                  {newRole === 'teacher' ? (
                    <input
                      type="text"
                      disabled
                      value="Guru"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                    />
                  ) : (
                    <select
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value as ClassRoom)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                    >
                      {STUDENT_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Kata Sandi Awal</label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>

              {createError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" />
                  {creating ? 'Menyimpan...' : 'Simpan Akun Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account & Reset Password Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 id="edit-user-title" className="text-lg font-bold text-slate-900">
                  Edit Akun & Reset Kata Sandi
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Perbarui identitas, kelas, status akses, atau atur ulang kata sandi pengguna.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Tutup modal edit akun"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  NIS atau Email Login
                </label>
                <input
                  type="text"
                  required
                  value={editNisOrEmail}
                  onChange={(e) => setEditNisOrEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Peran Akun</label>
                  <select
                    value={editRole}
                    disabled={editingUser.id === 'teacher-1'}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="student">Siswa</option>
                    <option value="teacher">Guru / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Kelas</label>
                  {editRole === 'teacher' ? (
                    <input
                      type="text"
                      disabled
                      value="Guru"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                    />
                  ) : (
                    <select
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value as ClassRoom)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                    >
                      {STUDENT_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Status Akses</label>
                <select
                  value={editStatus}
                  disabled={editingUser.id === 'teacher-1'}
                  onChange={(e) => setEditStatus(e.target.value as AccountStatus)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="approved">Aktif (Disetujui / ACC)</option>
                  <option value="pending">Menunggu Persetujuan (Pending)</option>
                  <option value="rejected">Ditolak / Nonaktif</option>
                </select>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-700" />
                  Reset Kata Sandi Baru (Opsional)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengganti sandi"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>

              {editError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

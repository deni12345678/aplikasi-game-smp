import React, { useRef, useState } from 'react';
import { Camera, Trash2, X, UserPlus, LogIn } from 'lucide-react';
import { AVATAR_CHOICES } from '../data/tikCurriculum';
import type { ClassRoom, UserAccount } from '../types';
import { processAvatarFile } from '../utils/avatarPhoto';
import { soundFx } from '../utils/sound';
import { AvatarBadge } from './AvatarBadge';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
}

const CLASS_OPTIONS: ClassRoom[] = ['VII-A', 'VII-B', 'VIII-A', 'VIII-B', 'IX-A', 'IX-B'];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [nisOrEmail, setNisOrEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState<ClassRoom>('VII-A');
  const [avatarIcon, setAvatarIcon] = useState<string>(AVATAR_CHOICES[0].icon);
  const [avatarPhoto, setAvatarPhoto] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingNotice, setPendingNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const processed = await processAvatarFile(file);
      soundFx.click();
      setAvatarPhoto(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPendingNotice('');
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        tab === 'login'
          ? { nisOrEmail, password }
          : { nisOrEmail, fullName, className, password, avatarIcon, avatarPhoto };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan saat memproses akun.');
        soundFx.wrong();
      } else if (data.pendingApproval) {
        soundFx.correct();
        setPendingNotice(
          data.message ||
            'Pendaftaran terkirim! Akun Anda menunggu persetujuan (ACC) dari Admin Deni Santoso, M.M sebelum dapat masuk.'
        );
        setTab('login');
        setPassword('');
      } else {
        soundFx.correct();
        onSuccess(data.user);
        onClose();
      }
    } catch {
      setError('Gagal terhubung ke server sekolah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-slate-900">
              {tab === 'login' ? 'Masuk Portal TIK' : 'Daftar Akun Siswa'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              SMP IT Al Mumtaz YPII · Sistem Akun Mandiri
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
              setPendingNotice('');
            }}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
              setPendingNotice('');
            }}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Daftar Siswa
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Nadia Khairunnisa"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Kelas</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value as ClassRoom)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                >
                  {CLASS_OPTIONS.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Foto Profil / Ikon Pemain
                </label>

                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <AvatarBadge
                    photo={avatarPhoto}
                    icon={avatarIcon}
                    alt={fullName || 'Avatar Siswa'}
                    sizeClass="h-12 w-12"
                    textClass="text-2xl"
                    roundedClass="rounded-xl"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoPick}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {avatarPhoto ? 'Ganti Foto Sendiri' : 'Unggah Foto Sendiri'}
                    </button>
                    {avatarPhoto && (
                      <button
                        type="button"
                        onClick={() => setAvatarPhoto(undefined)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2">
                  {AVATAR_CHOICES.map((av) => {
                    const selected = !avatarPhoto && avatarIcon === av.icon;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        title={av.label}
                        onClick={() => {
                          soundFx.click();
                          setAvatarIcon(av.icon);
                        }}
                        className={`flex h-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                          selected
                            ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {av.icon}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              {tab === 'login' ? 'NIS / Email Sekolah' : 'NIS atau Email Sekolah'}
            </label>
            <input
              type="text"
              required
              value={nisOrEmail}
              onChange={(e) => setNisOrEmail(e.target.value)}
              placeholder={
                tab === 'login'
                  ? 'Masukkan NIS siswa atau email guru/admin'
                  : 'Contoh: 20260719'
              }
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Kata Sandi</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 4 karakter"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          {pendingNotice && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
              <p className="font-semibold">Menunggu Persetujuan Admin (ACC)</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">{pendingNotice}</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading
              ? 'Memproses...'
              : tab === 'login'
              ? 'Masuk Sekarang'
              : 'Buat Akun Siswa'}
          </button>
        </form>
      </div>
    </div>
  );
};

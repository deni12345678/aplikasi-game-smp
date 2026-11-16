import React, { useEffect, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, KeyRound, Lock, PlayCircle, User } from 'lucide-react';
import { AVATAR_CHOICES, CATEGORY_LABELS, computeStudentBadges, GAME_META } from '../data/tikCurriculum';
import type {
  GameSession,
  GameType,
  QuestionCategory,
  ScoreRecord,
  SessionMode,
  UserAccount,
} from '../types';
import { soundFx } from '../utils/sound';

interface StudentHubProps {
  user: UserAccount;
  onJoinSession: (
    gameType: GameType,
    mode: SessionMode,
    roomCode?: string,
    category?: QuestionCategory
  ) => void;
  onEnterLobby?: (roomCode: string) => void;
  onUserUpdate?: (updated: UserAccount) => void;
}

export const StudentHub: React.FC<StudentHubProps> = ({
  user,
  onJoinSession,
  onEnterLobby,
  onUserUpdate,
}) => {
  const [roomInput, setRoomInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [myScores, setMyScores] = useState<ScoreRecord[]>([]);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});

    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.recentScores || []) as ScoreRecord[];
        setMyScores(list.filter((s) => s.studentId === user.id || s.studentName === user.fullName));
      })
      .catch(() => {});
  }, [user.id, user.fullName]);

  async function handleRoomJoin(e: React.FormEvent) {
    e.preventDefault();
    setRoomError('');
    const code = roomInput.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch(`/api/sessions/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setRoomError(data.error || 'Kode room tidak ditemukan.');
        return;
      }
      const sess = data.session as GameSession;
      if (sess.status === 'waiting' && onEnterLobby) {
        onEnterLobby(sess.code);
      } else {
        onJoinSession(sess.gameType, sess.mode, sess.code, sess.category || 'tik');
      }
    } catch {
      setRoomError('Gagal memeriksa kode room.');
    }
  }

  async function handleSelectAvatar(icon: string) {
    soundFx.click();
    setSavingAvatar(true);
    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarIcon: icon }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: UserAccount };
        onUserUpdate?.(data.user);
      }
    } finally {
      setSavingAvatar(false);
    }
  }

  const badges = computeStudentBadges(myScores);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Gabung Room Live */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <KeyRound className="h-4 w-4" />
            Mode Multiplayer Kelas
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Gabung dengan Kode Room Guru</h2>
          <p className="mt-1 text-sm text-slate-600">
            Masukkan 6 karakter kode room dari Guru untuk bermain bersama teman sekelas secara
            langsung.
          </p>

          <form onSubmit={handleRoomJoin} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="Masukkan Kode (cth: TIK701)"
              maxLength={8}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-emerald-700"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
            >
              Masuk Room
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {roomError && <p className="mt-2 text-xs font-medium text-red-600">{roomError}</p>}
        </div>

        {/* Kartu Identitas Siswa */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <User className="h-4 w-4 text-emerald-700" />
            Profil Pelajar SMP IT Al Mumtaz YPII
          </div>
          <div className="mt-3 flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-xs"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.avatarIcon || '🎓'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
              <p className="text-sm text-slate-600">
                Kelas {user.className} · ID/NIS {user.nisOrEmail}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500">
              Ikon / Avatar Pemain {savingAvatar ? '(Menyimpan...)' : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AVATAR_CHOICES.map((av) => {
                const selected = (user.avatarIcon || '🎓') === av.icon;
                return (
                  <button
                    key={av.id}
                    type="button"
                    title={av.label}
                    onClick={() => handleSelectAvatar(av.icon)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${
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

          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-500">Total Sesi</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {myScores.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Skor Tertinggi</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                {myScores.length > 0 ? Math.max(...myScores.map((s) => s.score)) : 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Rata-Rata</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {myScores.length > 0
                  ? Math.round(myScores.reduce((a, b) => a + b.score, 0) / myScores.length)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lencana Pencapaian (Gamification) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <Award className="h-4 w-4" />
              Lencana Pencapaian Siswa
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Koleksi Lencana Belajar</h3>
          </div>
          <span className="font-mono text-xs font-bold text-slate-600 tabular-nums">
            {badges.filter((b) => b.earned).length}/{badges.length} Terbuka
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                badge.earned
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50/60 opacity-75'
              }`}
            >
              {badge.earned ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              ) : (
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">{badge.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daftar Sesi Kelas Aktif */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Sesi Kelas & Tugas Mandiri Tersedia</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {sessions.map((sess) => (
            <div
              key={sess.code}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
            >
              <div>
                <p className="text-xs text-slate-500">
                  <span className="font-mono font-bold text-emerald-700">{sess.code}</span> ·{' '}
                  {sess.mode === 'live' ? 'Live Kelas' : 'Tugas Mandiri'} ·{' '}
                  {sess.status === 'waiting'
                    ? 'Ruang Tunggu'
                    : sess.status === 'finished'
                    ? 'Selesai'
                    : 'Aktif'}{' '}
                  · {CATEGORY_LABELS[sess.category || 'tik']}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">{sess.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{GAME_META[sess.gameType].title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (sess.status === 'waiting' && onEnterLobby) {
                    onEnterLobby(sess.code);
                  } else {
                    onJoinSession(sess.gameType, sess.mode, sess.code, sess.category || 'tik');
                  }
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <PlayCircle className="h-4 w-4" />
                {sess.status === 'waiting' ? 'Masuk Lobby' : 'Ikuti'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Riwayat Nilai Pribadi */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Riwayat Nilai Saya</h3>
        {myScores.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Kamu belum menyelesaikan permainan. Pilih salah satu dari 6 wahana game untuk mencatat
            skor pertamamu.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Game</th>
                  <th className="py-2.5 pr-4">Mode</th>
                  <th className="py-2.5 pr-4 text-right">Ketepatan</th>
                  <th className="py-2.5 text-right">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myScores.map((sc) => (
                  <tr key={sc.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      {GAME_META[sc.gameType].title}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {sc.mode === 'live' ? `Live (${sc.roomCode || '-'})` : 'Mandiri'}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-slate-700 tabular-nums">
                      {sc.correctCount}/{sc.totalQuestions}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {sc.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

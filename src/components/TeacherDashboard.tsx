import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Users,
  BarChart3,
  Award,
  Radio,
  Download,
  Bell,
  Check,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS, GAME_META } from '../data/tikCurriculum';
import type {
  AnalyticsSummary,
  GameSession,
  GameType,
  QuestionCategory,
  SessionMode,
  UserAccount,
} from '../types';
import { soundFx } from '../utils/sound';

interface TeacherDashboardProps {
  user: UserAccount;
  onLaunchGame?: (
    gameType: GameType,
    mode: SessionMode,
    roomCode?: string,
    category?: QuestionCategory
  ) => void;
  onOpenLobby?: (roomCode: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  onLaunchGame,
  onOpenLobby,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [gameFilter, setGameFilter] = useState<string>('ALL');

  // Create session form
  const [title, setTitle] = useState('');
  const [gameType, setGameType] = useState<GameType>('racing');
  const [mode, setMode] = useState<SessionMode>('live');
  const [category, setCategory] = useState<QuestionCategory>('tik');
  const [targetClass, setTargetClass] = useState('Semua Kelas');
  const [startInLobby, setStartInLobby] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<GameSession | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [liveNotification, setLiveNotification] = useState<string | null>(null);
  const prevPendingCountRef = useRef<number | null>(null);

  function applyAnalytics(nextData: AnalyticsSummary) {
    const nextPending = nextData.pendingStudents || [];
    if (
      prevPendingCountRef.current !== null &&
      nextPending.length > prevPendingCountRef.current
    ) {
      const newest = nextPending[0];
      setLiveNotification(
        newest
          ? `Notifikasi Baru: ${newest.fullName} (${newest.className}) mendaftar akun dan menunggu ACC Admin.`
          : 'Ada pendaftaran akun siswa baru yang menunggu ACC Admin.'
      );
      soundFx.correct();
    }
    prevPendingCountRef.current = nextPending.length;
    setAnalytics(nextData);
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = (await res.json()) as AnalyticsSummary;
        applyAnalytics(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();

    let wsConnected = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => {
      wsConnected = true;
      ws.send(JSON.stringify({ event: 'dashboard:subscribe' }));
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as { event: string; payload: AnalyticsSummary };
        if (msg.event === 'dashboard:update' && msg.payload) {
          applyAnalytics(msg.payload);
        }
      } catch {
        // Ignore parse error
      }
    };
    ws.onerror = () => {
      wsConnected = false;
    };
    ws.onclose = () => {
      wsConnected = false;
    };

    const pollTimer = window.setInterval(() => {
      if (wsConnected && ws.readyState === WebSocket.OPEN) return;
      fetch('/api/analytics')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) applyAnalytics(data as AnalyticsSummary);
        })
        .catch(() => {});
    }, 4000);

    return () => {
      window.clearInterval(pollTimer);
      ws.close();
    };
  }, []);

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          gameType,
          mode,
          category,
          targetClass,
          createdBy: user.fullName,
          startInLobby: mode === 'live' ? startInLobby : false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSession(data.session);
        setTitle('');
        fetchAnalytics();
      }
    } finally {
      setCreating(false);
    }
  }

  async function updateSession(
    code: string,
    patch: { status?: 'waiting' | 'active' | 'finished'; category?: QuestionCategory }
  ) {
    const res = await fetch(`/api/sessions/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      fetchAnalytics();
    }
  }

  async function handleApproval(studentId: string, status: 'approved' | 'rejected') {
    setProcessingId(studentId);
    try {
      const res = await fetch(`/api/users/${studentId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: UserAccount };
        soundFx.click();
        setLiveNotification(
          status === 'approved'
            ? `Akun ${data.user.fullName} (${data.user.className}) telah di-ACC dan kini dapat masuk ke portal.`
            : `Pendaftaran akun ${data.user.fullName} telah ditolak.`
        );
        await fetchAnalytics();
      }
    } finally {
      setProcessingId(null);
    }
  }

  function exportCsvReport() {
    if (!analytics) return;
    const rows = analytics.recentScores.filter((s) => {
      if (classFilter !== 'ALL' && s.className !== classFilter) return false;
      if (gameFilter !== 'ALL' && s.gameType !== gameFilter) return false;
      return true;
    });
    const header = ['Nama Siswa', 'Kelas', 'Game', 'Kategori', 'Mode', 'Kode Room', 'Benar', 'Total Soal', 'Rata Waktu (s)', 'Skor'];
    const csvLines = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${r.studentName.replace(/"/g, '""')}"`,
          r.className,
          `"${GAME_META[r.gameType].title}"`,
          `"${CATEGORY_LABELS[r.category || 'tik']}"`,
          r.mode,
          r.roomCode || '-',
          r.correctCount,
          r.totalQuestions,
          r.avgTimeSec,
          r.score,
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-nilai-almumtaz-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading && !analytics) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Memuat data analitik real-time Dasbor Guru...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
        Gagal memuat data dasbor. Silakan muat ulang halaman.
      </div>
    );
  }

  const pendingStudents = analytics.pendingStudents || [];

  const filteredScores = analytics.recentScores.filter((s) => {
    if (classFilter !== 'ALL' && s.className !== classFilter) return false;
    if (gameFilter !== 'ALL' && s.gameType !== gameFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Dasbor Admin Guru · Sinkronisasi WebSocket Aktif
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Pusat Pemantauan Pembelajaran TIK
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Selamat datang, {user.fullName}. Pantau skor siswa, sesi kelas live, dan analisis
            pemahaman materi secara langsung.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold ${
              pendingStudents.length > 0
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <Bell className={`h-3.5 w-3.5 ${pendingStudents.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Menunggu ACC: {pendingStudents.length}</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Segarkan Data
          </button>
        </div>
      </div>

      {/* 4 Key KPI Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Siswa Terdaftar</span>
            <Users className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {analytics.totalStudents}
          </p>
          <p className="mt-1 text-xs text-slate-500">Akun mandiri aktif</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Permainan Selesai</span>
            <Radio className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {analytics.totalGamesPlayed}
          </p>
          <p className="mt-1 text-xs text-slate-500">Gabungan live & tugas mandiri</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Rata-Rata Skor</span>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
            {analytics.averageScore}
          </p>
          <p className="mt-1 text-xs text-slate-500">Skala poin 0–1000</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Akurasi Jawaban</span>
            <BarChart3 className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {analytics.averageAccuracy}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Ketepatan konsep TIK</p>
        </div>
      </div>

      {/* Notifikasi & Persetujuan Akun Siswa (ACC Admin) */}
      {(pendingStudents.length > 0 || liveNotification) && (
        <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Notifikasi & Persetujuan Akun Siswa (ACC Admin)
                </h2>
                <p className="text-xs text-slate-600">
                  Siswa baru hanya dapat masuk setelah mendapat persetujuan dari {user.fullName}.
                </p>
              </div>
            </div>
            {liveNotification && (
              <button
                type="button"
                onClick={() => setLiveNotification(null)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Tutup Info
              </button>
            )}
          </div>

          {liveNotification && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800">
              {liveNotification}
            </div>
          )}

          {pendingStudents.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {pendingStudents.map((stu) => (
                <div
                  key={stu.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xl">
                      {stu.avatarIcon || '🎓'}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{stu.fullName}</p>
                      <p className="text-xs text-slate-600">
                        Kelas {stu.className} · NIS/Email:{' '}
                        <span className="font-mono font-medium text-slate-800">
                          {stu.nisOrEmail}
                        </span>{' '}
                        · Daftar{' '}
                        {new Date(stu.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={processingId === stu.id}
                      onClick={() => handleApproval(stu.id, 'approved')}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      ACC / Setujui
                    </button>
                    <button
                      type="button"
                      disabled={processingId === stu.id}
                      onClick={() => handleApproval(stu.id, 'rejected')}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create Room & Topic Mastery Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Buat Sesi Kelas */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="text-lg font-bold text-slate-900">Buat Sesi Game / Room Kelas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Buat kode room live untuk dimainkan serentak di kelas atau sebagai tugas rumah.
          </p>

          <form onSubmit={handleCreateSession} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Judul Evaluasi</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Ujian Harian Keamanan Siber VII-A"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Jenis Game</label>
                <select
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value as GameType)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                >
                  <option value="quiz">A. Quiz Interaktif</option>
                  <option value="flag">B. Tebak Bendera Dunia</option>
                  <option value="matching">C. Game Balasan</option>
                  <option value="clue">D. Tebak Clue</option>
                  <option value="puzzle">E. Teka-Teki & Logika</option>
                  <option value="racing">F. Code Racer 2D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as SessionMode)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                >
                  <option value="live">Live Kelas (Multiplayer)</option>
                  <option value="homework">Tugas Mandiri (PR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Kategori Soal</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
                >
                  <option value="tik">TIK & Adab Digital</option>
                  <option value="umum">Pengetahuan Umum</option>
                  <option value="campuran">Campuran TIK & Umum</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Target Kelas</label>
                <input
                  type="text"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            {mode === 'live' && (
              <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startInLobby}
                  onChange={(e) => setStartInLobby(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                Mulai di Ruang Tunggu (Lobby) sebelum menekan Start Game
              </label>
            )}

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Membuat Room...' : 'Terbitkan Kode Room'}
            </button>
          </form>

          {createdSession && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm">
              <p className="font-semibold text-emerald-950">Room berhasil dibuat!</p>
              <p className="mt-1 text-xs text-emerald-800">
                Bagikan kode berikut ke siswa:{' '}
                <strong className="font-mono text-base tracking-wider">{createdSession.code}</strong>
              </p>
              {onOpenLobby && (
                <button
                  type="button"
                  onClick={() => onOpenLobby(createdSession.code)}
                  className="mt-2.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Buka Ruang Tunggu (Lobby)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Analisis Penguasaan Materi */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-lg font-bold text-slate-900">Analisis Jawaban per Topik TIK</h2>
          <p className="mt-1 text-xs text-slate-500">
            Persentase jawaban benar siswa berdasarkan log respons setiap game.
          </p>

          <div className="mt-5 space-y-4">
            {analytics.topicAccuracy.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data analisis jawaban.</p>
            ) : (
              analytics.topicAccuracy.map((t) => (
                <div key={t.topic}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{t.topic}</span>
                    <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                      {t.correctAttempts}/{t.totalAttempts} benar · {t.accuracyPct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        t.accuracyPct >= 75
                          ? 'bg-emerald-600'
                          : t.accuracyPct >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${t.accuracyPct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">Monitor Sesi & Balapan Aktif</h3>
            <div className="mt-3 space-y-2.5">
              {analytics.sessions.slice(0, 4).map((sess) => (
                <div
                  key={sess.code}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="mr-2 font-mono text-emerald-700">{sess.code}</span>
                      {sess.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {GAME_META[sess.gameType].title} ·{' '}
                      {CATEGORY_LABELS[sess.category || 'tik']} ·{' '}
                      {sess.mode === 'live' ? 'Live Kelas' : 'Tugas Mandiri'} ·{' '}
                      {sess.status === 'waiting'
                        ? 'Ruang Tunggu'
                        : sess.status === 'finished'
                        ? 'Selesai'
                        : 'Aktif'}{' '}
                      · {sess.participants.length} peserta
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Ubah kategori sesi ${sess.code}`}
                      value={sess.category || 'tik'}
                      onChange={(e) =>
                        updateSession(sess.code, {
                          category: e.target.value as QuestionCategory,
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <option value="tik">TIK</option>
                      <option value="umum">Umum</option>
                      <option value="campuran">Campuran</option>
                    </select>
                    {sess.status === 'waiting' ? (
                      <button
                        type="button"
                        onClick={() => updateSession(sess.code, { status: 'active' })}
                        className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        Mulai Game
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          updateSession(sess.code, {
                            status: sess.status === 'finished' ? 'active' : 'finished',
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {sess.status === 'finished' ? 'Aktifkan' : 'Akhiri'}
                      </button>
                    )}
                    {onOpenLobby && (
                      <button
                        type="button"
                        onClick={() => onOpenLobby(sess.code)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Lobby
                      </button>
                    )}
                    {onLaunchGame && (
                      <button
                        type="button"
                        onClick={() =>
                          onLaunchGame(
                            sess.gameType,
                            sess.mode,
                            sess.code,
                            sess.category || 'tik'
                          )
                        }
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Buka
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Race Monitor if any room has participants */}
      {analytics.sessions.some((s) => s.participants.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Posisi Balapan & Lobby Live (Real-Time)
          </h2>
          <div className="mt-4 space-y-3">
            {analytics.sessions
              .filter((s) => s.participants.length > 0)
              .map((sess) => (
                <div key={sess.code} className="space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                  <p className="font-mono text-xs font-bold text-emerald-700">
                    ROOM {sess.code} · {sess.title}
                  </p>
                  {sess.participants
                    .slice()
                    .sort((a, b) => b.progress - a.progress || b.score - a.score)
                    .map((p, rank) => (
                      <div key={p.studentId} className="flex items-center gap-4 text-sm">
                        <span className="w-6 font-mono font-bold text-slate-500 tabular-nums">
                          #{rank + 1}
                        </span>
                        <span className="w-48 truncate font-medium text-slate-900">
                          <span className="mr-1.5">{p.avatarIcon || '🎓'}</span>
                          {p.studentName} ({p.className})
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="w-28 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {p.progress}% · {p.score} pts
                        </span>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Score History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Riwayat Skor & Aktivitas Siswa</h2>
            <p className="text-xs text-slate-500">
              Seluruh hasil permainan tersimpan otomatis dan dapat difilter per kelas atau jenis game.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">Semua Kelas</option>
              <option value="VII-A">VII-A</option>
              <option value="VII-B">VII-B</option>
              <option value="VIII-A">VIII-A</option>
              <option value="VIII-B">VIII-B</option>
              <option value="IX-A">IX-A</option>
              <option value="IX-B">IX-B</option>
            </select>
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">Semua Game</option>
              <option value="quiz">A. Quiz Interaktif</option>
              <option value="flag">B. Tebak Bendera Dunia</option>
              <option value="matching">C. Game Balasan</option>
              <option value="clue">D. Tebak Clue</option>
              <option value="puzzle">E. Teka-Teki & Logika</option>
              <option value="racing">F. Code Racer 2D</option>
            </select>
            <button
              type="button"
              onClick={exportCsvReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              Ekspor CSV
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Nama Siswa</th>
                <th className="py-3 pr-4">Kelas</th>
                <th className="py-3 pr-4">Game</th>
                <th className="py-3 pr-4">Mode</th>
                <th className="py-3 pr-4 text-right">Benar</th>
                <th className="py-3 pr-4 text-right">Rata Waktu</th>
                <th className="py-3 text-right">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredScores.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60">
                  <td className="py-3 pr-4 font-medium text-slate-900">{rec.studentName}</td>
                  <td className="py-3 pr-4 text-slate-600">{rec.className}</td>
                  <td className="py-3 pr-4 text-slate-700">{GAME_META[rec.gameType].title}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">
                    {rec.mode === 'live' ? `Live (${rec.roomCode || '-'})` : 'Mandiri'}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-slate-700 tabular-nums">
                    {rec.correctCount}/{rec.totalQuestions}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-slate-600 tabular-nums">
                    {rec.avgTimeSec}s
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    {rec.score}
                  </td>
                </tr>
              ))}
              {filteredScores.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    Tidak ada catatan skor yang cocok dengan filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

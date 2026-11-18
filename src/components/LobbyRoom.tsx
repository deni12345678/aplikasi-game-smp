import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Copy, Play, Radio, RotateCcw, Shuffle, Trash2, Users } from 'lucide-react';
import { AVATAR_CHOICES, CATEGORY_LABELS, GAME_META } from '../data/tikCurriculum';
import type { GameSession, GameType, QuestionCategory, QuestionMode, UserAccount } from '../types';
import { processAvatarFile } from '../utils/avatarPhoto';
import { soundFx } from '../utils/sound';
import { AvatarBadge } from './AvatarBadge';

interface LobbyRoomProps {
  roomCode: string;
  user: UserAccount;
  onExit: () => void;
  onSessionStarted: (session: GameSession) => void;
  onUserUpdate?: (updated: UserAccount) => void;
}

const ALL_GAMES: GameType[] = ['quiz', 'flag', 'clue', 'puzzle', 'racing', 'horse'];

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  roomCode,
  user,
  onExit,
  onSessionStarted,
  onUserUpdate,
}) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [starting, setStarting] = useState(false);
  const [updatingGame, setUpdatingGame] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const launchedRef = useRef(false);
  const prevStatusRef = useRef<'waiting' | 'active' | 'finished' | null>(null);

  useEffect(() => {
    let active = true;
    launchedRef.current = false;
    prevStatusRef.current = null;

    fetch(`/api/sessions/${roomCode.toUpperCase()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Kode room tidak ditemukan.');
        return (await res.json()) as { session: GameSession };
      })
      .then((data) => {
        if (!active) return;
        setSession(data.session);
        prevStatusRef.current = data.session.status;
        setLoading(false);
        if (user.role !== 'teacher' && data.session.status === 'active' && !launchedRef.current) {
          launchedRef.current = true;
          onSessionStarted(data.session);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat ruang tunggu.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roomCode, user.role, onSessionStarted]);

  useEffect(() => {
    const codeUpper = roomCode.toUpperCase();
    const participantPayload = {
      studentId: user.id,
      studentName: user.fullName,
      className: user.className,
      carColor: user.avatarColor,
      avatarIcon: user.avatarIcon || '🎓',
      avatarPhoto: user.avatarPhoto,
      progress: 0,
      speedKmh: 80,
      score: 0,
      streak: 0,
      statusEffect: 'normal' as const,
    };

    const applySessionState = (sess: GameSession) => {
      const prevStatus = prevStatusRef.current;
      prevStatusRef.current = sess.status;
      setSession(sess);

      // Students enter automatically when room is active.
      // Teachers stay in lobby if room was already active on arrival, and auto-enter when transitioning from waiting -> active.
      const shouldTeacherLaunch =
        user.role === 'teacher' && (prevStatus === 'waiting' || starting) && sess.status === 'active';
      const shouldStudentLaunch = user.role !== 'teacher' && sess.status === 'active';

      if ((shouldTeacherLaunch || shouldStudentLaunch) && !launchedRef.current) {
        launchedRef.current = true;
        soundFx.nitro();
        onSessionStarted(sess);
      }
    };

    fetch(`/api/sessions/${codeUpper}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant: participantPayload }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.session) applySessionState(data.session as GameSession);
      })
      .catch(() => {});

    let wsConnected = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      wsConnected = true;
      ws.send(
        JSON.stringify({
          event: 'room:join',
          payload: {
            code: codeUpper,
            participant: participantPayload,
          },
        })
      );
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as { event: string; payload: GameSession };
        if (msg.event === 'room:state' && msg.payload) {
          applySessionState(msg.payload);
        }
      } catch {
        // Ignore malformed message
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
      fetch(`/api/sessions/${codeUpper}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.session) applySessionState(data.session as GameSession);
        })
        .catch(() => {});
    }, 2000);

    return () => {
      window.clearInterval(pollTimer);
      ws.close();
      wsRef.current = null;
    };
  }, [
    roomCode,
    user.id,
    user.fullName,
    user.className,
    user.avatarColor,
    user.avatarIcon,
    user.avatarPhoto,
    user.role,
    starting,
    onSessionStarted,
  ]);

  function broadcastAvatarToRoom(updatedUser: UserAccount) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'room:join',
          payload: {
            code: roomCode.toUpperCase(),
            participant: {
              studentId: updatedUser.id,
              studentName: updatedUser.fullName,
              className: updatedUser.className,
              carColor: updatedUser.avatarColor,
              avatarIcon: updatedUser.avatarIcon || '🎓',
              avatarPhoto: updatedUser.avatarPhoto,
              progress: 0,
              speedKmh: 80,
              score: 0,
              streak: 0,
              statusEffect: 'normal',
            },
          },
        })
      );
    }
  }

  async function handleSelectAvatar(icon: string) {
    soundFx.click();
    setPhotoError('');
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
        broadcastAvatarToRoom(data.user);
      }
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setSavingAvatar(true);
    try {
      const avatarPhoto = await processAvatarFile(file);
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarPhoto }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: UserAccount };
        soundFx.correct();
        onUserUpdate?.(data.user);
        broadcastAvatarToRoom(data.user);
      } else {
        const err = await res.json();
        setPhotoError(err.error || 'Gagal menyimpan foto.');
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setSavingAvatar(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setPhotoError('');
    setSavingAvatar(true);
    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarPhoto: null }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: UserAccount };
        soundFx.click();
        onUserUpdate?.(data.user);
        broadcastAvatarToRoom(data.user);
      }
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleUpdateGame(
    nextGameType?: GameType,
    nextCategory?: QuestionCategory,
    nextQuestionMode?: QuestionMode
  ) {
    if (!session || user.role !== 'teacher') return;
    soundFx.click();
    setUpdatingGame(true);
    const codeUpper = roomCode.toUpperCase();
    const gameType = nextGameType ?? session.gameType;
    const category = nextCategory ?? session.category ?? 'tik';
    const questionMode = nextQuestionMode ?? session.questionMode ?? 'varied';

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'room:update_game',
            payload: { code: codeUpper, gameType, category, questionMode },
          })
        );
      }
      const res = await fetch(`/api/sessions/${codeUpper}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, category, questionMode }),
      });
      if (res.ok) {
        const data = (await res.json()) as { session: GameSession };
        setSession(data.session);
      }
    } finally {
      setUpdatingGame(false);
    }
  }

  async function handleResetLobby() {
    if (!session || user.role !== 'teacher') return;
    soundFx.click();
    const codeUpper = roomCode.toUpperCase();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'room:reset_lobby',
          payload: { code: codeUpper },
        })
      );
    }
    const res = await fetch(`/api/sessions/${codeUpper}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'waiting', resetParticipants: true }),
    });
    if (res.ok) {
      const data = (await res.json()) as { session: GameSession };
      prevStatusRef.current = 'waiting';
      setSession(data.session);
    }
  }

  async function handleHostStart() {
    if (!session) return;
    soundFx.nitro();
    setStarting(true);
    const codeUpper = roomCode.toUpperCase();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'room:host_start',
          payload: { code: codeUpper },
        })
      );
    }
    const res = await fetch(`/api/sessions/${codeUpper}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    if (res.ok) {
      const data = (await res.json()) as { session: GameSession };
      if (!launchedRef.current) {
        launchedRef.current = true;
        onSessionStarted(data.session);
      }
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(roomCode.toUpperCase()).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Menghubungkan ke Ruang Tunggu Kelas ({roomCode.toUpperCase()})...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-red-700">{error || 'Room tidak ditemukan.'}</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Keluar Lobby
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <Radio className="h-4 w-4 animate-pulse" />
          Sinkronisasi Ruang Kelas Real-Time Aktif
        </div>
      </div>

      {/* Room Header Banner */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
          <p className="text-xs font-semibold text-emerald-700">
            Ruang Tunggu Interaktif · Game {GAME_META[session.gameType]?.code || 'A'}:{' '}
            {GAME_META[session.gameType]?.title || 'Permainan'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{session.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kategori: <strong>{CATEGORY_LABELS[session.category || 'tik']}</strong> · Target:{' '}
            <strong>{session.targetClass}</strong> · Pengajar: {session.createdBy}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
            <Shuffle className="h-3.5 w-3.5 text-emerald-700" />
            {session.gameType === 'horse'
              ? 'Balapan 3D Murni Tanpa Soal: Adu kecepatan pacu, perpindahan jalur, dan stamina secara real-time'
              : (session.questionMode || 'varied') === 'varied'
              ? 'Mode Soal Bervariasi: Setiap siswa menerima susunan soal & opsi berbeda secara acak'
              : 'Mode Soal Seragam: Seluruh siswa mengerjakan soal dengan urutan yang sama'}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
            <div>
              <p className="text-xs text-slate-500">Kode Room</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-2xl font-extrabold tracking-widest text-slate-900">
                  {session.code}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Disalin' : 'Salin'}
                </button>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {user.role === 'teacher' ? (
                <>
                  {session.status !== 'waiting' && (
                    <button
                      type="button"
                      onClick={handleResetLobby}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Siapkan Ronde Baru
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={starting}
                    onClick={handleHostStart}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                  >
                    <Play className="h-4 w-4" />
                    {starting
                      ? 'Memulai Game...'
                      : session.status === 'active'
                      ? 'Masuk & Mulai Game Bersama'
                      : 'Mulai Permainan Sekarang (Start Game)'}
                  </button>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
                  {session.status === 'waiting'
                    ? 'Menunggu Ustadz/Ustadzah menekan tombol Start Game...'
                    : session.status === 'active'
                    ? 'Permainan sedang dimulai...'
                    : 'Sesi ini sudah berakhir.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Picker Card inside Lobby */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
          <p className="text-xs font-semibold text-slate-500">Foto & Ikon Pemain</p>
          <div className="mt-2 flex items-center gap-3">
            <AvatarBadge
              photo={user.avatarPhoto}
              icon={user.avatarIcon}
              color={user.avatarColor}
              alt={user.fullName}
              sizeClass="h-12 w-12"
              textClass="text-2xl"
              roundedClass="rounded-xl"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500">
                Kelas {user.className} {savingAvatar ? '· Menyimpan...' : ''}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              disabled={savingAvatar}
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" />
              {user.avatarPhoto ? 'Ganti Foto' : 'Masukan Foto Sendiri'}
            </button>
            {user.avatarPhoto && (
              <button
                type="button"
                disabled={savingAvatar}
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
          </div>
          {photoError && <p className="mt-1.5 text-xs text-red-600">{photoError}</p>}

          <p className="mt-4 text-xs font-medium text-slate-600">Atau Pilih Ikon Sebelum Mulai:</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {AVATAR_CHOICES.map((av) => {
              const selected = !user.avatarPhoto && (user.avatarIcon || '🎓') === av.icon;
              return (
                <button
                  key={av.id}
                  type="button"
                  title={av.label}
                  onClick={() => handleSelectAvatar(av.icon)}
                  className={`flex h-10 items-center justify-center rounded-lg border text-xl transition-colors ${
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
      </div>

      {/* Game Selector di dalam Room (untuk Guru) */}
      {user.role === 'teacher' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Menu Pilihan Game di Dalam Room (Main Bersama)
              </h2>
              <p className="text-xs text-slate-500">
                Pilih salah satu dari 7 wahana game untuk dimainkan serentak oleh seluruh siswa di room ini.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['varied', 'uniform'] as QuestionMode[]).map((qMode) => (
                  <button
                    key={qMode}
                    type="button"
                    disabled={updatingGame}
                    onClick={() => handleUpdateGame(undefined, undefined, qMode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      (session.questionMode || 'varied') === qMode
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {qMode === 'varied' ? 'Soal Acak per Siswa' : 'Soal Sama Semua'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['tik', 'umum', 'campuran'] as QuestionCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={updatingGame}
                    onClick={() => handleUpdateGame(undefined, cat, undefined)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      (session.category || 'tik') === cat
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'tik' ? 'TIK' : cat === 'umum' ? 'Umum' : 'Campuran'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_GAMES.map((gType) => {
              const meta = GAME_META[gType];
              const isSelected = session.gameType === gType;
              return (
                <button
                  key={gType}
                  type="button"
                  disabled={updatingGame}
                  onClick={() => handleUpdateGame(gType, undefined)}
                  className={`flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/15'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    Game {meta.code} · {meta.estimatedMinutes} Menit
                  </span>
                  <span className="mt-1 text-sm font-bold text-slate-900">{meta.title}</span>
                  <span className="mt-1 text-xs text-slate-500 line-clamp-2">{meta.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Participant Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Peserta di Ruang Tunggu ({session.participants.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Ikon pemain tampil langsung saat bergabung
          </span>
        </div>

        {session.participants.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Belum ada siswa di lobby. Bagikan kode <strong className="font-mono">{session.code}</strong>{' '}
            kepada siswa untuk masuk bersama.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {session.participants.map((p) => {
              const isMe = p.studentId === user.id;
              return (
                <div
                  key={p.studentId}
                  className={`flex items-center gap-3 rounded-lg border p-3.5 ${
                    isMe ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <AvatarBadge
                    photo={p.avatarPhoto}
                    icon={p.avatarIcon}
                    color={p.carColor || '#047857'}
                    alt={p.studentName}
                    sizeClass="h-10 w-10"
                    textClass="text-xl"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {p.studentName} {isMe ? '(Kamu)' : ''}
                    </p>
                    <p className="text-xs text-slate-500">Kelas {p.className}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

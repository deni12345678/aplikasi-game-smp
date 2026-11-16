import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Check, Play, Radio, Users } from 'lucide-react';
import { AVATAR_CHOICES, CATEGORY_LABELS, GAME_META } from '../data/tikCurriculum';
import type { GameSession, UserAccount } from '../types';
import { soundFx } from '../utils/sound';

interface LobbyRoomProps {
  roomCode: string;
  user: UserAccount;
  onExit: () => void;
  onSessionStarted: (session: GameSession) => void;
  onUserUpdate?: (updated: UserAccount) => void;
}

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
  const [starting, setStarting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const launchedRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/sessions/${roomCode.toUpperCase()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Kode room tidak ditemukan.');
        return (await res.json()) as { session: GameSession };
      })
      .then((data) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
        if (data.session.status === 'active' && !launchedRef.current) {
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
  }, [roomCode, onSessionStarted]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          event: 'room:join',
          payload: {
            code: roomCode.toUpperCase(),
            participant: {
              studentId: user.id,
              studentName: user.fullName,
              className: user.className,
              carColor: user.avatarColor,
              avatarIcon: user.avatarIcon || '🎓',
              progress: 0,
              speedKmh: 80,
              score: 0,
              streak: 0,
              statusEffect: 'normal',
            },
          },
        })
      );
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as { event: string; payload: GameSession };
        if (msg.event === 'room:state' && msg.payload) {
          setSession(msg.payload);
          if (msg.payload.status === 'active' && !launchedRef.current) {
            launchedRef.current = true;
            soundFx.nitro();
            onSessionStarted(msg.payload);
          }
        }
      } catch {
        // Ignore malformed message
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomCode, user.id, user.fullName, user.className, user.avatarColor, user.avatarIcon, onSessionStarted]);

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
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              event: 'room:join',
              payload: {
                code: roomCode.toUpperCase(),
                participant: {
                  studentId: user.id,
                  studentName: user.fullName,
                  className: user.className,
                  carColor: user.avatarColor,
                  avatarIcon: icon,
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
    } finally {
      setSavingAvatar(false);
    }
  }

  function handleHostStart() {
    soundFx.nitro();
    setStarting(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'room:host_start',
          payload: { code: roomCode.toUpperCase() },
        })
      );
    } else {
      fetch(`/api/sessions/${roomCode.toUpperCase()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      }).catch(() => {});
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
          Sinkronisasi Real-Time Aktif
        </div>
      </div>

      {/* Room Header Banner */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
          <p className="text-xs font-semibold text-emerald-700">
            Ruang Tunggu Interaktif · {GAME_META[session.gameType].title}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{session.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kategori: <strong>{CATEGORY_LABELS[session.category || 'tik']}</strong> · Target:{' '}
            <strong>{session.targetClass}</strong> · Pengajar: {session.createdBy}
          </p>

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

            <div className="ml-auto">
              {user.role === 'teacher' ? (
                <button
                  type="button"
                  disabled={starting}
                  onClick={handleHostStart}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                >
                  <Play className="h-4 w-4" />
                  {starting ? 'Memulai Game...' : 'Mulai Permainan Sekarang (Start Game)'}
                </button>
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
          <p className="text-xs font-semibold text-slate-500">Ikon / Avatar Kamu</p>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-xs"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.avatarIcon || '🎓'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500">
                Kelas {user.className} {savingAvatar ? '· Menyimpan...' : ''}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-600">Ganti Ikon Sebelum Mulai:</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {AVATAR_CHOICES.map((av) => {
              const selected = (user.avatarIcon || '🎓') === av.icon;
              return (
                <button
                  key={av.id}
                  type="button"
                  title={av.label}
                  onClick={() => handleSelectAvatar(av.icon)}
                  className={`flex h-11 items-center justify-center rounded-lg border text-xl transition-colors ${
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
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                    style={{ backgroundColor: p.carColor || '#047857' }}
                  >
                    {p.avatarIcon || '🎓'}
                  </div>
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

import React from 'react';
import { Camera, Radio, Trophy, Users } from 'lucide-react';
import type { LiveRaceParticipant } from '../types';
import { AvatarBadge } from './AvatarBadge';

interface LiveRoomStandingsProps {
  roomCode?: string;
  peers: LiveRaceParticipant[];
  currentUserId: string;
  variantCode?: string;
  variant?: 'banner' | 'panel';
}

export const LiveRoomStandings: React.FC<LiveRoomStandingsProps> = ({
  roomCode,
  peers,
  currentUserId,
  variantCode,
  variant = 'panel',
}) => {
  if (!roomCode) return null;

  const sorted = peers
    .slice()
    .sort((a, b) => b.score - a.score || b.progress - a.progress);

  const liveCamCount = sorted.filter((p) => p.cameraActive).length;

  if (variant === 'banner') {
    return (
      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <Radio className="h-4 w-4 animate-pulse text-emerald-700" />
            <span>
              Arena Main Bersama Live · Room{' '}
              <strong className="font-mono">{roomCode.toUpperCase()}</strong> ({peers.length}{' '}
              peserta · {liveCamCount} on camera)
            </span>
          </div>
          {variantCode && (
            <span className="font-mono text-xs font-semibold text-slate-600">
              Paket Soal Unik #{variantCode}
            </span>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.slice(0, 8).map((p, idx) => {
              const isMe = p.studentId === currentUserId;
              const hasLiveCam = Boolean(p.cameraActive && p.cameraFrame);
              return (
                <div
                  key={p.studentId}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                    isMe
                      ? 'border-emerald-400 bg-white shadow-2xs'
                      : 'border-emerald-100 bg-white/80'
                  }`}
                >
                  <div className="relative shrink-0">
                    {hasLiveCam ? (
                      <img
                        src={p.cameraFrame}
                        alt={`Kamera ${p.studentName}`}
                        className="h-10 w-12 rounded-md border border-emerald-500 bg-slate-900 object-cover"
                      />
                    ) : (
                      <AvatarBadge
                        photo={p.avatarPhoto}
                        icon={p.avatarIcon}
                        color={p.carColor}
                        alt={p.studentName}
                        sizeClass="h-10 w-10"
                        textClass="text-base"
                      />
                    )}
                    {p.cameraActive && (
                      <span
                        title="Kamera Aktif Real-Time"
                        className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] text-white ring-2 ring-white"
                      >
                        <Camera className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="truncate font-bold text-slate-900">
                        #{idx + 1} {p.studentName.split(' ')[0]}
                        {isMe ? ' (Kamu)' : ''}
                      </span>
                      <span className="shrink-0 font-mono font-bold text-emerald-700 tabular-nums">
                        {p.score}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          p.statusEffect === 'finished' ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, p.progress))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <Users className="h-4 w-4" />
          <span>Papan Peringkat & Kamera Live ({roomCode.toUpperCase()})</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {variantCode && (
            <span className="font-mono text-slate-600">Paket #{variantCode}</span>
          )}
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
            <Camera className="h-3.5 w-3.5" />
            {liveCamCount}/{peers.length} On Cam
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
            {peers.length} peserta
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          Menghubungkan peserta ruang kelas {roomCode.toUpperCase()}...
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {sorted.map((p, idx) => {
            const isMe = p.studentId === currentUserId;
            const hasLiveCam = Boolean(p.cameraActive && p.cameraFrame);
            return (
              <div
                key={p.studentId}
                className={`rounded-lg border px-3.5 py-2.5 ${
                  isMe
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-100 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5 font-medium text-slate-800">
                    <span className="font-mono text-xs font-bold text-slate-500 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="relative shrink-0">
                      {hasLiveCam ? (
                        <img
                          src={p.cameraFrame}
                          alt={`Kamera ${p.studentName}`}
                          className="h-9 w-11 rounded-md border border-emerald-500 bg-slate-900 object-cover"
                        />
                      ) : (
                        <AvatarBadge
                          photo={p.avatarPhoto}
                          icon={p.avatarIcon}
                          color={p.carColor}
                          alt={p.studentName}
                          sizeClass="h-8 w-8"
                          textClass="text-sm"
                        />
                      )}
                      {p.cameraActive && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>
                    <span className="truncate">
                      {p.studentName} {isMe ? '(Kamu)' : ''} ·{' '}
                      <span className="text-xs text-slate-500">{p.className}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs font-bold text-emerald-700 tabular-nums">
                    {p.score} pts · {p.progress}%
                    {p.statusEffect === 'finished' ? ' · Selesai' : ''}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      p.statusEffect === 'finished' ? 'bg-emerald-600' : 'bg-sky-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

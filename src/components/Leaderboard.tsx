import React, { useEffect, useState } from 'react';
import { Award, Medal, RefreshCw, Trophy } from 'lucide-react';
import { GAME_META } from '../data/tikCurriculum';
import type { AnalyticsSummary, LeaderboardEntry, UserAccount } from '../types';
import { soundFx } from '../utils/sound';

interface LeaderboardProps {
  currentUser?: UserAccount | null;
  compact?: boolean;
  onViewFull?: () => void;
}

const CLASS_FILTERS = ['ALL', 'VII-A', 'VII-B', 'VIII-A', 'VIII-B', 'IX-A', 'IX-B'] as const;

export const Leaderboard: React.FC<LeaderboardProps> = ({
  currentUser,
  compact = false,
  onViewFull,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  async function fetchLeaderboard(cls: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/leaderboard?className=${encodeURIComponent(cls)}&limit=10`
      );
      if (!res.ok) {
        throw new Error('Gagal memuat papan peringkat.');
      }
      const data = (await res.json()) as { entries: LeaderboardEntry[] };
      setEntries(data.entries || []);
    } catch {
      setError('Tidak dapat memuat data peringkat saat ini.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard(selectedClass);
  }, [selectedClass]);

  // Real-time WebSocket listener so Top 10 updates immediately when any student finishes a game
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'dashboard:subscribe' }));
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as { event: string; payload: AnalyticsSummary };
        if (msg.event === 'dashboard:update' && msg.payload?.leaderboard) {
          const allEntries = msg.payload.leaderboard;
          const filtered =
            selectedClass === 'ALL'
              ? allEntries
              : allEntries.filter((e) => e.className === selectedClass);
          const reRanked = filtered.slice(0, 10).map((item, idx) => ({
            ...item,
            rank: idx + 1,
          }));
          setEntries(reRanked);
        }
      } catch {
        // Ignore malformed messages
      }
    };
    return () => ws.close();
  }, [selectedClass]);

  function getRankIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-600 shrink-0" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-500 shrink-0" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-700 shrink-0" />;
    return null;
  }

  const topThree = entries.slice(0, 3);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Papan Peringkat Global · Akumulasi 6 Wahana Game
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            10 Siswa dengan Total Skor Tertinggi
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Total poin dihitung otomatis dari seluruh sesi Quiz Interaktif, Tebak Bendera, Game
            Balasan, Tebak Clue, Teka-Teki, dan Code Racer 2D.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLeaderboard(selectedClass)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Perbarui
          </button>
          {compact && onViewFull && (
            <button
              type="button"
              onClick={onViewFull}
              className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
            >
              Buka Halaman Peringkat
            </button>
          )}
        </div>
      </div>

      {/* Interactive Class Filter Tabs */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-200/70 p-1 w-fit"
        role="tablist"
        aria-label="Filter peringkat berdasarkan kelas"
      >
        {CLASS_FILTERS.map((cls) => {
          const active = selectedClass === cls;
          return (
            <button
              key={cls}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                soundFx.click();
                setSelectedClass(cls);
              }}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cls === 'ALL' ? 'Semua Kelas' : `Kelas ${cls}`}
            </button>
          );
        })}
      </div>

      {/* Top 3 Highlight Row (only when not compact and >= 1 entry) */}
      {!compact && !loading && !error && topThree.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {topThree.map((item) => {
            const isMe = currentUser?.id === item.studentId;
            return (
              <div
                key={item.studentId}
                className={`rounded-xl border p-5 ${
                  item.rank === 1
                    ? 'border-amber-300 bg-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-800">
                    {getRankIcon(item.rank)}
                    Peringkat #{item.rank}
                  </span>
                  <span>Kelas {item.className}</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-lg font-bold text-white"
                    style={{ backgroundColor: item.avatarColor }}
                  >
                    {item.avatarIcon ||
                      item.studentName
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900">
                      {item.studentName} {isMe ? '(Kamu)' : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.gamesPlayed} sesi · Akurasi {item.avgAccuracyPct}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">Total Akumulasi Skor</span>
                  <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                    {item.totalScore.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top 10 Global Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading && entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Memuat peringkat siswa...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-700">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada catatan skor untuk {selectedClass === 'ALL' ? 'kelas mana pun' : `Kelas ${selectedClass}`}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 pl-6 pr-3 w-20">Peringkat</th>
                  <th className="py-3.5 px-3">Nama Siswa</th>
                  <th className="py-3.5 px-3">Kelas</th>
                  <th className="py-3.5 px-3">Variasi Game</th>
                  <th className="py-3.5 px-3 text-right">Sesi</th>
                  <th className="py-3.5 px-3 text-right">Akurasi</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Total Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((row) => {
                  const isCurrent = currentUser?.id === row.studentId;
                  const gameLabels = row.gameTypesPlayed
                    .map((g) => GAME_META[g]?.code)
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <tr
                      key={row.studentId}
                      className={isCurrent ? 'bg-emerald-50/60' : 'hover:bg-slate-50/70'}
                    >
                      <td className="py-3.5 pl-6 pr-3 font-mono font-bold text-slate-800 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {getRankIcon(row.rank)}
                          #{row.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-base font-bold text-white"
                            style={{ backgroundColor: row.avatarColor }}
                          >
                            {row.avatarIcon || row.studentName[0]?.toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {row.studentName}
                            {isCurrent ? ' (Kamu)' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{row.className}</td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-500">
                        Game {gameLabels || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {row.gamesPlayed}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {row.avgAccuracyPct}%
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right font-mono text-base font-bold text-emerald-700 tabular-nums">
                        {row.totalScore.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

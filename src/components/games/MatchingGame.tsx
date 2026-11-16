import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Cloud,
  Cpu,
  Footprints,
  Globe,
  Layers,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  Table,
  Wifi,
} from 'lucide-react';
import {
  createVariantSeed,
  MATCHING_LEVELS,
  shortVariantCode,
  shuffleWithSeed,
} from '../../data/tikCurriculum';
import { useRoomSync } from '../../hooks/useRoomSync';
import type { AnswerDetail, ScoreRecord, SessionMode, UserAccount } from '../../types';
import { soundFx } from '../../utils/sound';
import { LiveRoomStandings } from '../LiveRoomStandings';

interface MatchingGameProps {
  user: UserAccount;
  mode: SessionMode;
  roomCode?: string;
  onExit: () => void;
  onScoreSubmitted?: (record: ScoreRecord) => void;
}

function renderTermIcon(iconKey: string) {
  const cls = 'h-4 w-4 text-emerald-700 shrink-0';
  switch (iconKey) {
    case 'cpu':
      return <Cpu className={cls} />;
    case 'layers':
      return <Layers className={cls} />;
    case 'wifi':
      return <Wifi className={cls} />;
    case 'table':
      return <Table className={cls} />;
    case 'globe':
      return <Globe className={cls} />;
    case 'cloud':
      return <Cloud className={cls} />;
    case 'shield':
      return <Shield className={cls} />;
    case 'check':
      return <CheckCircle2 className={cls} />;
    case 'alert':
      return <ShieldAlert className={cls} />;
    case 'lock':
      return <Lock className={cls} />;
    case 'footprint':
      return <Footprints className={cls} />;
    default:
      return <BookOpen className={cls} />;
  }
}

export const MatchingGame: React.FC<MatchingGameProps> = ({
  user,
  mode,
  roomCode,
  onExit,
  onScoreSubmitted,
}) => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [draggedTermId, setDraggedTermId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [startTimeMs, setStartTimeMs] = useState<number>(Date.now());
  const [phase, setPhase] = useState<'playing' | 'summary'>('playing');
  const [playNonce, setPlayNonce] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [saving, setSaving] = useState(false);

  const { session, peers, sendProgress } = useRoomSync({ roomCode, user });

  const variantSeed = useMemo(
    () =>
      createVariantSeed(
        user.id,
        roomCode,
        session?.roundSeed,
        session?.questionMode || 'varied',
        playNonce
      ),
    [user.id, roomCode, session?.roundSeed, session?.questionMode, playNonce]
  );
  const variantCode = useMemo(() => shortVariantCode(variantSeed), [variantSeed]);

  const level = MATCHING_LEVELS[levelIdx];

  const shuffledTerms = useMemo(
    () => shuffleWithSeed(level.pairs, `${variantSeed}-terms-${levelIdx}`),
    [level, levelIdx, variantSeed]
  );

  const shuffledDefinitions = useMemo(
    () => shuffleWithSeed(level.pairs, `${variantSeed}-defs-${levelIdx}`),
    [level, levelIdx, variantSeed]
  );

  function attemptMatch(termId: string, targetDefId: string) {
    if (matchedIds.includes(targetDefId) || matchedIds.includes(termId)) return;

    if (termId === targetDefId) {
      soundFx.correct();
      const nextMatched = [...matchedIds, termId];
      setMatchedIds(nextMatched);
      setSelectedTermId(null);
      setDraggedTermId(null);
      const pairObj = level.pairs.find((p) => p.id === termId);
      setFeedback({ text: `Cocok! ${pairObj?.term} dipasangkan dengan benar.`, ok: true });

      if (nextMatched.length === level.pairs.length) {
        completeLevel(nextMatched);
      } else {
        const partialPct = Math.round((nextMatched.length / level.pairs.length) * 100);
        const partialScore = Math.round(
          (nextMatched.length / level.pairs.length) * Math.max(250, 900 - wrongAttempts * 45)
        );
        sendProgress({
          progress: partialPct,
          score: partialScore,
          streak: nextMatched.length,
          statusEffect: 'normal',
        });
      }
    } else {
      soundFx.wrong();
      setWrongAttempts((w) => w + 1);
      setSelectedTermId(null);
      setDraggedTermId(null);
      setFeedback({ text: 'Pasangan belum tepat. Coba cermati kembali fungsinya.', ok: false });
    }
  }

  async function completeLevel(completedIds: string[]) {
    soundFx.victory();
    const elapsedSec = Math.max(1, Math.round((Date.now() - startTimeMs) / 1000));
    const computedScore = Math.max(250, 900 - wrongAttempts * 45 - elapsedSec * 3);
    setFinalScore(computedScore);
    setPhase('summary');
    setSaving(true);
    sendProgress({
      progress: 100,
      score: computedScore,
      streak: Math.max(1, level.pairs.length - wrongAttempts),
      statusEffect: 'finished',
      finishedAt: Date.now(),
    });

    const answers: AnswerDetail[] = level.pairs.map((p) => ({
      questionId: p.id,
      topic: p.category,
      prompt: `Cocokkan: ${p.term}`,
      isCorrect: completedIds.includes(p.id),
      responseTimeMs: Math.round((elapsedSec * 1000) / level.pairs.length),
    }));

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentName: user.fullName,
          className: user.className,
          gameType: 'matching',
          mode,
          roomCode,
          score: computedScore,
          correctCount: level.pairs.length,
          totalQuestions: level.pairs.length,
          avgTimeSec: Number((elapsedSec / level.pairs.length).toFixed(1)),
          maxStreak: Math.max(1, level.pairs.length - wrongAttempts),
          answers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onScoreSubmitted?.(data.score);
      }
    } finally {
      setSaving(false);
    }
  }

  function resetLevel(newIdx = levelIdx) {
    soundFx.click();
    setPlayNonce((n) => n + 1);
    setLevelIdx(newIdx);
    setMatchedIds([]);
    setSelectedTermId(null);
    setDraggedTermId(null);
    setWrongAttempts(0);
    setFeedback(null);
    setStartTimeMs(Date.now());
    setPhase('playing');
    sendProgress({ progress: 0, score: 0, streak: 0, statusEffect: 'normal' });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Arena
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-semibold text-emerald-700">
            Paket #{variantCode}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {roomCode ? `Live Room ${roomCode.toUpperCase()}` : mode === 'live' ? 'Live Kelas' : 'Mode Mandiri'}
          </span>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
            {MATCHING_LEVELS.map((lvl, idx) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => resetLevel(idx)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  levelIdx === idx
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Level {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <LiveRoomStandings
        roomCode={roomCode}
        peers={peers}
        currentUserId={user.id}
        variantCode={variantCode}
        variant="banner"
      />

      {phase === 'playing' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-semibold text-emerald-700">Game C · Pencocokan Konsep</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{level.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Seret kartu istilah di kiri ke fungsi yang sesuai di kanan (atau ketuk istilah lalu
                ketuk fungsinya pada layar sentuh HP).
              </p>
            </div>
            <div className="flex items-center gap-5 font-mono text-sm tabular-nums">
              <span className="text-slate-700">
                Terpasang: <strong className="text-emerald-700">{matchedIds.length}/{level.pairs.length}</strong>
              </span>
              <span className="text-slate-500">Salah: {wrongAttempts}</span>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-4 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                feedback.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">
                Istilah & Ikon TIK (Seret atau Ketuk)
              </p>
              {shuffledTerms.map((item) => {
                const isMatched = matchedIds.includes(item.id);
                const isSelected = selectedTermId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable={!isMatched}
                    disabled={isMatched}
                    onDragStart={() => {
                      setDraggedTermId(item.id);
                      setSelectedTermId(item.id);
                    }}
                    onClick={() => {
                      soundFx.click();
                      setSelectedTermId(isSelected ? null : item.id);
                    }}
                    className={`flex min-h-[58px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                      isMatched
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 opacity-75'
                        : isSelected
                        ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/20'
                        : 'cursor-grab border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {renderTermIcon(item.iconKey)}
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {item.term}
                        </span>
                        <span className="block text-xs text-slate-500">{item.category}</span>
                      </span>
                    </span>
                    {isMatched && <CheckCircle2 className="h-5 w-5 text-emerald-700" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">
                Fungsi & Penjelasan (Lepas atau Ketuk di Sini)
              </p>
              {shuffledDefinitions.map((defItem) => {
                const isMatched = matchedIds.includes(defItem.id);
                return (
                  <button
                    key={defItem.id}
                    type="button"
                    disabled={isMatched}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      const activeTerm = draggedTermId || selectedTermId;
                      if (activeTerm) attemptMatch(activeTerm, defItem.id);
                    }}
                    onClick={() => {
                      if (selectedTermId) {
                        attemptMatch(selectedTermId, defItem.id);
                      }
                    }}
                    className={`flex min-h-[58px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : selectedTermId
                        ? 'border-dashed border-emerald-500 bg-emerald-50/30 text-slate-800 hover:bg-emerald-50'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700'
                    }`}
                  >
                    <span>{defItem.definition}</span>
                    {isMatched && (
                      <span className="shrink-0 font-mono text-xs font-bold text-emerald-700">
                        {defItem.term}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-xs font-semibold text-emerald-700">Pencocokan Selesai</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Seluruh Konsep Berhasil Dipasangkan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {saving
              ? 'Menyimpan skor ke Dasbor Guru...'
              : 'Nilai pencocokan konsep telah dikirim ke Dasbor Admin Guru.'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 border-y border-slate-100 py-6">
            <div>
              <p className="text-xs text-slate-500">Skor Akhir</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                {finalScore}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pasangan Tepat</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {level.pairs.length}/{level.pairs.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Kesalahan Coba</p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-600 tabular-nums">
                {wrongAttempts}x
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => resetLevel((levelIdx + 1) % MATCHING_LEVELS.length)}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Mainkan Level {((levelIdx + 1) % MATCHING_LEVELS.length) + 1}
            </button>
            <button
              type="button"
              onClick={() => resetLevel(levelIdx)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Ulangi Level Ini
            </button>
          </div>
        </div>
      )}

      <LiveRoomStandings
        roomCode={roomCode}
        peers={peers}
        currentUserId={user.id}
        variantCode={variantCode}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Eye, HelpCircle, RotateCcw } from 'lucide-react';
import { CATEGORY_LABELS, getClueCards } from '../../data/tikCurriculum';
import { useRoomSync } from '../../hooks/useRoomSync';
import type {
  AnswerDetail,
  QuestionCategory,
  ScoreRecord,
  SessionMode,
  UserAccount,
} from '../../types';
import { soundFx } from '../../utils/sound';
import { LiveRoomStandings } from '../LiveRoomStandings';

interface ClueGameProps {
  user: UserAccount;
  mode: SessionMode;
  category?: QuestionCategory;
  roomCode?: string;
  onExit: () => void;
  onScoreSubmitted?: (record: ScoreRecord) => void;
}

const CARD_TIME_SEC = 30;

export const ClueGame: React.FC<ClueGameProps> = ({
  user,
  mode,
  category = 'tik',
  roomCode,
  onExit,
  onScoreSubmitted,
}) => {
  const cards = getClueCards(category);
  const [cardIdx, setCardIdx] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(CARD_TIME_SEC);
  const [cardResult, setCardResult] = useState<'pending' | 'correct' | 'timeout'>('pending');
  const [wrongMsg, setWrongMsg] = useState('');
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [phase, setPhase] = useState<'playing' | 'summary'>('playing');
  const [saving, setSaving] = useState(false);

  const { peers, sendProgress } = useRoomSync({ roomCode, user });

  const card = cards[cardIdx];

  useEffect(() => {
    if (phase !== 'playing' || cardResult !== 'pending') return;
    if (timeLeft <= 0) {
      soundFx.wrong();
      setCardResult('timeout');
      setAnswers((prev) => [
        ...prev,
        {
          questionId: card.id,
          topic: card.topic,
          prompt: `Tebak: ${card.answer}`,
          isCorrect: false,
          responseTimeMs: CARD_TIME_SEC * 1000,
        },
      ]);
      sendProgress({
        progress: Math.round(((cardIdx + 1) / cards.length) * 100),
        score,
        streak: 0,
        statusEffect: cardIdx + 1 >= cards.length ? 'finished' : 'normal',
        finishedAt: cardIdx + 1 >= cards.length ? Date.now() : undefined,
      });
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, cardResult, timeLeft, card, cardIdx, cards.length, score, sendProgress]);

  function revealNextClue() {
    if (revealedClues < 3 && cardResult === 'pending') {
      soundFx.click();
      setRevealedClues((c) => c + 1);
    }
  }

  function handleGuessSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cardResult !== 'pending' || !guess.trim()) return;
    const normalized = guess.trim().toUpperCase();
    const isMatch = card.acceptedAliases.some((a) => a.toUpperCase() === normalized);

    if (isMatch) {
      soundFx.correct();
      const basePoints = revealedClues === 1 ? 200 : revealedClues === 2 ? 150 : 100;
      const timeBonus = Math.round(timeLeft * 2);
      const nextScore = score + basePoints + timeBonus;
      const nextCorrect = answers.filter((a) => a.isCorrect).length + 1;
      setScore(nextScore);
      setCardResult('correct');
      setWrongMsg('');
      setAnswers((prev) => [
        ...prev,
        {
          questionId: card.id,
          topic: card.topic,
          prompt: `Tebak: ${card.answer}`,
          isCorrect: true,
          responseTimeMs: (CARD_TIME_SEC - timeLeft) * 1000,
        },
      ]);
      sendProgress({
        progress: Math.round(((cardIdx + 1) / cards.length) * 100),
        score: nextScore,
        streak: nextCorrect,
        statusEffect: cardIdx + 1 >= cards.length ? 'finished' : 'normal',
        finishedAt: cardIdx + 1 >= cards.length ? Date.now() : undefined,
      });
    } else {
      soundFx.wrong();
      setWrongMsg('Belum tepat. Coba periksa ejaan atau buka petunjuk berikutnya.');
    }
  }

  async function nextCard() {
    soundFx.click();
    if (cardIdx + 1 < cards.length) {
      setCardIdx((i) => i + 1);
      setRevealedClues(1);
      setGuess('');
      setTimeLeft(CARD_TIME_SEC);
      setCardResult('pending');
      setWrongMsg('');
    } else {
      await finishGame();
    }
  }

  async function finishGame() {
    soundFx.victory();
    setPhase('summary');
    setSaving(true);
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const avgTimeSec =
      answers.length > 0
        ? Number((answers.reduce((a, b) => a + b.responseTimeMs, 0) / answers.length / 1000).toFixed(1))
        : 0;

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentName: user.fullName,
          className: user.className,
          gameType: 'clue',
          mode,
          category,
          roomCode,
          score,
          correctCount,
          totalQuestions: cards.length,
          avgTimeSec,
          maxStreak: correctCount,
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

  function restartGame() {
    soundFx.click();
    setCardIdx(0);
    setRevealedClues(1);
    setGuess('');
    setTimeLeft(CARD_TIME_SEC);
    setCardResult('pending');
    setWrongMsg('');
    setScore(0);
    setAnswers([]);
    setPhase('playing');
    sendProgress({ progress: 0, score: 0, streak: 0, statusEffect: 'normal' });
  }

  const hintPattern = card.answer
    .split('')
    .map((ch, idx) => (idx === 0 || idx === card.answer.length - 1 ? ch : '_'))
    .join(' ');

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Arena
        </button>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>Game D · {CATEGORY_LABELS[category]}</span>
          <span aria-hidden="true">·</span>
          <span>Kartu {cardIdx + 1}/{cards.length}</span>
          <span aria-hidden="true">·</span>
          <span>{roomCode ? `Live Room ${roomCode.toUpperCase()}` : mode === 'live' ? 'Live Kelas' : 'Mode Mandiri'}</span>
        </div>
      </div>

      {phase === 'playing' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700">{card.topic}</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Tebak Istilah dari Petunjuk Bertahap
              </h2>
            </div>
            <div className="flex items-center gap-5 font-mono text-sm tabular-nums">
              <span className="font-bold text-emerald-700">Skor {score}</span>
              <span
                className={`flex items-center gap-1.5 font-bold ${
                  timeLeft <= 7 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                <Clock className="h-4 w-4" />
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {card.clues.slice(0, revealedClues).map((clueText, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
              >
                <span className="mr-2 font-mono text-xs font-bold text-emerald-700">
                  Clue {i + 1}:
                </span>
                {clueText}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs text-slate-500">
              Pola huruf: <span className="font-bold tracking-widest text-slate-800">{hintPattern}</span>
            </p>
            {revealedClues < 3 && cardResult === 'pending' && (
              <button
                type="button"
                onClick={revealNextClue}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Buka Clue {revealedClues + 1} (Poin dasar {revealedClues === 1 ? '150' : '100'})
              </button>
            )}
          </div>

          {cardResult === 'pending' ? (
            <form onSubmit={handleGuessSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Ketik jawaban istilah TIK di sini..."
                className="flex-1 rounded-lg border border-slate-200 px-4 py-3 font-mono text-sm uppercase text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Kirim Jawaban
              </button>
            </form>
          ) : (
            <div
              className={`mt-6 rounded-lg border p-4 ${
                cardResult === 'correct'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-amber-200 bg-amber-50 text-amber-950'
              }`}
            >
              <p className="text-sm font-bold">
                {cardResult === 'correct'
                  ? `Tepat! Jawabannya adalah ${card.answer}.`
                  : `Waktu habis! Jawaban yang benar adalah ${card.answer}.`}
              </p>
              <p className="mt-1.5 text-xs text-slate-700">
                <HelpCircle className="mr-1 inline h-3.5 w-3.5 text-emerald-700" />
                {card.islamicNote}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={nextCard}
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  {cardIdx + 1 < cards.length ? 'Kartu Berikutnya' : 'Selesai & Simpan Skor'}
                </button>
              </div>
            </div>
          )}

          {wrongMsg && cardResult === 'pending' && (
            <p className="mt-2 text-sm text-red-600">{wrongMsg}</p>
          )}
        </div>
      )}

      {phase === 'summary' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-xs font-semibold text-emerald-700">Flashcard Clue Selesai</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Hasil Tebak Clue Digital</h2>
          <p className="mt-1 text-sm text-slate-600">
            {saving ? 'Menyimpan hasil...' : 'Hasil tersimpan secara real-time di Dasbor Guru.'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 border-y border-slate-100 py-6">
            <div>
              <p className="text-xs text-slate-500">Total Skor</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                {score}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tertebak Benar</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {answers.filter((a) => a.isCorrect).length}/{cards.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Akurasi</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {Math.round((answers.filter((a) => a.isCorrect).length / cards.length) * 100)}%
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={restartGame}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <RotateCcw className="h-4 w-4" />
              Main Lagi
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Arena
            </button>
          </div>
        </div>
      )}

      <LiveRoomStandings roomCode={roomCode} peers={peers} currentUserId={user.id} />
    </div>
  );
};

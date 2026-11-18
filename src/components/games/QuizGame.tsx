import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Flame, RotateCcw, XCircle } from 'lucide-react';
import {
  CATEGORY_LABELS,
  createVariantSeed,
  getQuizQuestions,
  shortVariantCode,
} from '../../data/tikCurriculum';
import { useCustomQuestions } from '../../hooks/useCustomQuestions';
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

interface QuizGameProps {
  user: UserAccount;
  mode: SessionMode;
  category?: QuestionCategory;
  roomCode?: string;
  onExit: () => void;
  onScoreSubmitted?: (record: ScoreRecord) => void;
}

const QUESTION_TIME_SEC = 18;

export const QuizGame: React.FC<QuizGameProps> = ({
  user,
  mode,
  category = 'tik',
  roomCode,
  onExit,
  onScoreSubmitted,
}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'summary'>('ready');
  const [playNonce, setPlayNonce] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SEC);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [questionStartMs, setQuestionStartMs] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);

  const customQuestions = useCustomQuestions();
  const { session, peers: roomPeers, sendProgress } = useRoomSync({ roomCode, user });

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

  const questions = useMemo(
    () => getQuizQuestions(category, variantSeed, customQuestions, 25),
    [category, variantSeed, customQuestions]
  );

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (phase !== 'playing' || selectedOption !== null) return;
    if (timeLeft <= 0) {
      handleSelectOption(-1);
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, selectedOption]);

  function startQuiz() {
    soundFx.click();
    if (phase === 'summary') {
      setPlayNonce((n) => n + 1);
    }
    setPhase('playing');
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setAnswers([]);
    setSelectedOption(null);
    setTimeLeft(QUESTION_TIME_SEC);
    setQuestionStartMs(Date.now());
    sendProgress({ progress: 0, score: 0, streak: 0, statusEffect: 'normal' });
  }

  function handleSelectOption(idx: number) {
    if (selectedOption !== null) return;
    const elapsedMs = Date.now() - questionStartMs;
    const isCorrect = idx === currentQuestion.correctIndex;
    setSelectedOption(idx);

    let nextScore = score;
    let nextStreak = streak;
    if (isCorrect) {
      soundFx.correct();
      const speedBonus = Math.max(0, timeLeft * 5);
      nextStreak = streak + 1;
      const streakBonus = nextStreak >= 2 ? 25 : 0;
      nextScore = score + 100 + speedBonus + streakBonus;
      setScore(nextScore);
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
    } else {
      soundFx.wrong();
      nextStreak = 0;
      setStreak(0);
    }

    if (roomCode) {
      sendProgress({
        progress: Math.round(((currentIndex + 1) / questions.length) * 100),
        score: nextScore,
        streak: nextStreak,
        statusEffect: currentIndex + 1 >= questions.length ? 'finished' : 'normal',
        finishedAt: currentIndex + 1 >= questions.length ? Date.now() : undefined,
      });
    }

    const detail: AnswerDetail = {
      questionId: currentQuestion.id,
      topic: currentQuestion.topic,
      prompt: currentQuestion.question.slice(0, 48),
      isCorrect,
      responseTimeMs: elapsedMs,
    };
    setAnswers((prev) => [...prev, detail]);
  }

  async function nextQuestion() {
    soundFx.click();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setTimeLeft(QUESTION_TIME_SEC);
      setQuestionStartMs(Date.now());
    } else {
      await finishQuiz();
    }
  }

  async function finishQuiz() {
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
          gameType: 'quiz',
          mode,
          category,
          roomCode,
          score,
          correctCount,
          totalQuestions: questions.length,
          avgTimeSec,
          maxStreak,
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
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>Game A · {CATEGORY_LABELS[category]}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-xs font-semibold text-emerald-700">
            Paket Soal #{variantCode}
          </span>
          <span aria-hidden="true">·</span>
          <span>{mode === 'live' ? `Live Room ${roomCode || 'Kelas'}` : 'Mode Mandiri'}</span>
        </div>
      </div>

      <LiveRoomStandings
        roomCode={roomCode}
        peers={roomPeers}
        currentUserId={user.id}
        variantCode={variantCode}
        variant="banner"
      />

      {phase === 'ready' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-xs font-semibold tracking-wide text-emerald-700">
            Kategori: {CATEGORY_LABELS[category]}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Quiz Interaktif Berbasis Waktu
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Jawab {questions.length} soal Pilihan Ganda dan Benar/Salah secara cepat dan tepat.
            Semakin cepat dan beruntun jawaban benarmu, semakin besar bonus poinnya.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Jumlah Soal</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {questions.length} Soal
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Waktu Per Soal</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {QUESTION_TIME_SEC} Detik
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pemain</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {user.fullName} · {user.className}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={startQuiz}
              className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Mulai Quiz Sekarang
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                Soal {currentIndex + 1}/{questions.length}
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentQuestion.topic}</span>
              <span aria-hidden="true">·</span>
              <span>{currentQuestion.type === 'tf' ? 'Benar / Salah' : 'Pilihan Ganda'}</span>
            </div>

            <div className="flex items-center gap-5 font-mono text-sm tabular-nums">
              <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                <Flame className="h-4 w-4" />
                Streak {streak}x
              </span>
              <span className="font-bold text-emerald-700">Skor {score}</span>
              <span
                className={`flex items-center gap-1.5 font-bold ${
                  timeLeft <= 5 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                <Clock className="h-4 w-4" />
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${
                timeLeft <= 5 ? 'bg-red-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${(timeLeft / QUESTION_TIME_SEC) * 100}%` }}
            />
          </div>

          <h3 className="mt-6 text-xl font-bold leading-snug text-slate-900">
            {currentQuestion.question}
          </h3>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentQuestion.options.map((opt, idx) => {
              const isAnswered = selectedOption !== null;
              const isRight = idx === currentQuestion.correctIndex;
              const isChosen = idx === selectedOption;

              let btnClass =
                'border-slate-200 bg-white text-slate-800 hover:border-emerald-600 hover:bg-emerald-50/40';
              if (isAnswered) {
                if (isRight) {
                  btnClass = 'border-emerald-600 bg-emerald-50 text-emerald-950';
                } else if (isChosen && !isRight) {
                  btnClass = 'border-red-500 bg-red-50 text-red-900';
                } else {
                  btnClass = 'border-slate-200 bg-slate-50 text-slate-400';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`flex min-h-[56px] items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left text-sm font-medium transition-colors ${btnClass}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </span>
                  {isAnswered && isRight && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />}
                  {isAnswered && isChosen && !isRight && (
                    <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedOption === currentQuestion.correctIndex
                    ? 'Tepat! Poin & kecepatan tercatat.'
                    : selectedOption === -1
                    ? 'Waktu habis! Mari pelajari pembahasannya.'
                    : 'Kurang tepat. Mari perhatikan pembahasannya.'}
                </p>
              </div>
              <p className="mt-1.5 text-sm text-slate-700">{currentQuestion.explanation}</p>
              <p className="mt-2 text-xs font-medium text-emerald-800">
                Nilai Karakter TIK: {currentQuestion.islamicValue}
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  {currentIndex + 1 < questions.length ? 'Soal Berikutnya' : 'Lihat Hasil Akhir'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <LiveRoomStandings
        roomCode={roomCode}
        peers={roomPeers}
        currentUserId={user.id}
        variantCode={variantCode}
      />

      {phase === 'summary' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-xs font-semibold text-emerald-700">Sesi Selesai</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Alhamdulillah, Quiz Diselesaikan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {saving
              ? 'Menyimpan skor dan analisis jawaban ke Dasbor Guru...'
              : 'Skor dan analisis jawaban telah tersimpan secara real-time di Dasbor Guru.'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Total Skor</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                {score}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Jawaban Benar</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {answers.filter((a) => a.isCorrect).length}/{questions.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Streak Terbaik</p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-600 tabular-nums">
                {maxStreak}x
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Rata-rata Respon</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {answers.length > 0
                  ? (answers.reduce((a, b) => a + b.responseTimeMs, 0) / answers.length / 1000).toFixed(1)
                  : '0.0'}
                s
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startQuiz}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <RotateCcw className="h-4 w-4" />
              Main Lagi
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Pilih Game Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

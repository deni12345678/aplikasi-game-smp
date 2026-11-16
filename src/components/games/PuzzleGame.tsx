import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  ALGORITHM_CHALLENGES,
  createVariantSeed,
  CROSSWORD_WORDS,
  shortVariantCode,
  shuffleWithSeed,
} from '../../data/tikCurriculum';
import { useRoomSync } from '../../hooks/useRoomSync';
import type { AnswerDetail, ScoreRecord, SessionMode, UserAccount } from '../../types';
import { soundFx } from '../../utils/sound';
import { LiveRoomStandings } from '../LiveRoomStandings';

interface PuzzleGameProps {
  user: UserAccount;
  mode: SessionMode;
  roomCode?: string;
  onExit: () => void;
  onScoreSubmitted?: (record: ScoreRecord) => void;
}

const GRID_SIZE = 11;

export const PuzzleGame: React.FC<PuzzleGameProps> = ({
  user,
  mode,
  roomCode,
  onExit,
  onScoreSubmitted,
}) => {
  const [subMode, setSubMode] = useState<'tts' | 'algo'>('tts');
  const [userGrid, setUserGrid] = useState<Record<string, string>>({});
  const [checkedTts, setCheckedTts] = useState(false);

  const [algoIdx, setAlgoIdx] = useState(0);
  const currentAlgo = ALGORITHM_CHALLENGES[algoIdx];

  const [algoOrder, setAlgoOrder] = useState<string[]>(() => {
    const arr = [...ALGORITHM_CHALLENGES[0].correctOrder];
    return [arr[2], arr[0], arr[4], arr[1], arr[3]];
  });
  const [algoChecked, setAlgoChecked] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  const { session, peers, sendProgress } = useRoomSync({ roomCode, user });

  const variantSeed = useMemo(
    () =>
      createVariantSeed(
        user.id,
        roomCode,
        session?.roundSeed,
        session?.questionMode || 'varied',
        algoIdx
      ),
    [user.id, roomCode, session?.roundSeed, session?.questionMode, algoIdx]
  );
  const variantCode = useMemo(() => shortVariantCode(variantSeed), [variantSeed]);

  const cellSolutionMap = useMemo(() => {
    const map = new Map<string, { char: string; numbers: number[] }>();
    for (const w of CROSSWORD_WORDS) {
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        const key = `${r}-${c}`;
        const existing = map.get(key) ?? { char: w.answer[i], numbers: [] };
        if (i === 0) {
          existing.numbers.push(w.number);
        }
        map.set(key, existing);
      }
    }
    return map;
  }, []);

  function syncGridProgress(nextGrid: Record<string, string>) {
    if (!roomCode || cellSolutionMap.size === 0) return;
    let filled = 0;
    cellSolutionMap.forEach((_val, key) => {
      if (nextGrid[key]) filled += 1;
    });
    const pct = Math.min(90, Math.round((filled / cellSolutionMap.size) * 90));
    sendProgress({ progress: pct, score: savedScore ?? 0, streak: 0, statusEffect: 'normal' });
  }

  function handleCellChange(r: number, c: number, val: string) {
    const clean = val.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
    const nextGrid = { ...userGrid, [`${r}-${c}`]: clean };
    setUserGrid(nextGrid);
    setCheckedTts(false);
    syncGridProgress(nextGrid);
  }

  function switchAlgoChallenge(nextIdx: number) {
    soundFx.click();
    setAlgoIdx(nextIdx);
    const seed = createVariantSeed(
      user.id,
      roomCode,
      session?.roundSeed,
      session?.questionMode || 'varied',
      nextIdx
    );
    setAlgoOrder(shuffleWithSeed(ALGORITHM_CHALLENGES[nextIdx].correctOrder, `${seed}-algo`));
    setAlgoChecked(null);
  }

  function moveAlgoStep(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= algoOrder.length) return;
    soundFx.click();
    const copy = [...algoOrder];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setAlgoOrder(copy);
    setAlgoChecked(null);
    const matched = copy.filter((step, idx) => step === currentAlgo.correctOrder[idx]).length;
    sendProgress({
      progress: Math.min(90, Math.round((matched / currentAlgo.correctOrder.length) * 90)),
      score: matched * 100,
      streak: matched,
      statusEffect: 'normal',
    });
  }

  async function submitTtsCheck() {
    setCheckedTts(true);
    let solvedWords = 0;
    const answers: AnswerDetail[] = [];

    for (const w of CROSSWORD_WORDS) {
      let ok = true;
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        if ((userGrid[`${r}-${c}`] || '') !== w.answer[i]) {
          ok = false;
        }
      }
      if (ok) solvedWords += 1;
      answers.push({
        questionId: `tts-${w.number}`,
        topic: w.answer === 'AMANAH' ? 'Adab Digital & Literasi' : 'Dasar Pemrograman',
        prompt: `TTS ${w.number} ${w.direction === 'across' ? 'Mendatar' : 'Menurun'}`,
        isCorrect: ok,
        responseTimeMs: 4500,
      });
    }

    if (solvedWords === CROSSWORD_WORDS.length) {
      soundFx.victory();
    } else if (solvedWords > 0) {
      soundFx.correct();
    } else {
      soundFx.wrong();
    }

    const totalScore = solvedWords * 115;
    sendProgress({
      progress: 100,
      score: totalScore,
      streak: solvedWords,
      statusEffect: 'finished',
      finishedAt: Date.now(),
    });
    await persistPuzzleScore(totalScore, solvedWords, CROSSWORD_WORDS.length, answers);
  }

  async function submitAlgoCheck() {
    const matchedPos = algoOrder.filter((step, idx) => step === currentAlgo.correctOrder[idx]).length;
    const isPerfect = matchedPos === currentAlgo.correctOrder.length;
    setAlgoChecked(isPerfect);
    if (isPerfect) {
      soundFx.victory();
      sendProgress({
        progress: 100,
        score: 900,
        streak: 5,
        statusEffect: 'finished',
        finishedAt: Date.now(),
      });
      await persistPuzzleScore(900, 5, 5, [
        {
          questionId: currentAlgo.id,
          topic: 'Dasar Pemrograman',
          prompt: currentAlgo.title,
          isCorrect: true,
          responseTimeMs: 5200,
        },
      ]);
    } else {
      soundFx.wrong();
      sendProgress({
        progress: Math.round((matchedPos / currentAlgo.correctOrder.length) * 80),
        score: matchedPos * 100,
        streak: matchedPos,
        statusEffect: 'normal',
      });
    }
  }

  async function persistPuzzleScore(
    score: number,
    correctCount: number,
    totalQuestions: number,
    answers: AnswerDetail[]
  ) {
    setSaving(true);
    setSavedScore(score);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentName: user.fullName,
          className: user.className,
          gameType: 'puzzle',
          mode,
          roomCode,
          score,
          correctCount,
          totalQuestions,
          avgTimeSec: 6.5,
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

  function fillHintLetter() {
    soundFx.click();
    const emptyKeys: string[] = [];
    cellSolutionMap.forEach((val, key) => {
      if ((userGrid[key] || '') !== val.char) {
        emptyKeys.push(key);
      }
    });
    if (emptyKeys.length > 0) {
      const targetKey = emptyKeys[0];
      const sol = cellSolutionMap.get(targetKey);
      if (sol) {
        const nextGrid = { ...userGrid, [targetKey]: sol.char };
        setUserGrid(nextGrid);
        setCheckedTts(false);
        syncGridProgress(nextGrid);
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
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
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                soundFx.click();
                setSubMode('tts');
              }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                subMode === 'tts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teka-Teki Silang TIK
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.click();
                setSubMode('algo');
              }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                subMode === 'algo'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Puzzle Alur Algoritma
            </button>
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

      {subMode === 'tts' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Game E · Teka-Teki Silang</p>
                <h2 className="text-xl font-bold text-slate-900">TTS Konsep TIK & Karakter</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fillHintLetter}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Buka 1 Huruf
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserGrid({});
                    setCheckedTts(false);
                    setSavedScore(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div
                className="mx-auto grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(34px, 42px))`,
                  width: 'fit-content',
                }}
              >
                {Array.from({ length: GRID_SIZE }).map((_, r) =>
                  Array.from({ length: GRID_SIZE }).map((__, c) => {
                    const key = `${r}-${c}`;
                    const cell = cellSolutionMap.get(key);
                    if (!cell) {
                      return <div key={key} className="h-10 w-10 rounded-md bg-slate-100/70" />;
                    }
                    const currentVal = userGrid[key] || '';
                    const isCorrect = checkedTts && currentVal === cell.char;
                    const isWrong = checkedTts && currentVal !== cell.char;

                    return (
                      <div key={key} className="relative h-10 w-10">
                        {cell.numbers.length > 0 && (
                          <span className="pointer-events-none absolute top-0.5 left-1 font-mono text-[10px] font-bold text-slate-500">
                            {cell.numbers[0]}
                          </span>
                        )}
                        <input
                          type="text"
                          maxLength={1}
                          value={currentVal}
                          onChange={(e) => handleCellChange(r, c, e.target.value)}
                          aria-label={`Baris ${r + 1} Kolom ${c + 1}`}
                          className={`h-full w-full rounded-md border text-center font-mono text-base font-bold uppercase outline-none transition-colors ${
                            isCorrect
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                              : isWrong
                              ? 'border-red-400 bg-red-50 text-red-900'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={submitTtsCheck}
                disabled={saving}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                {saving ? 'Menyimpan...' : 'Periksa & Simpan Skor TTS'}
              </button>
              {savedScore !== null && (
                <p className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                  Skor Tercatat: {savedScore}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <h3 className="text-base font-bold text-slate-900">Petunjuk Teka-Teki Silang</h3>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Mendatar</p>
                <ul className="mt-2 space-y-2.5 text-sm text-slate-700">
                  {CROSSWORD_WORDS.filter((w) => w.direction === 'across').map((w) => (
                    <li key={w.number} className="leading-relaxed">
                      <span className="mr-1.5 font-mono font-bold text-slate-900">
                        {w.number}.
                      </span>
                      {w.clue}{' '}
                      <span className="font-mono text-xs text-slate-400">
                        ({w.answer.length} huruf)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-amber-700">Menurun</p>
                <ul className="mt-2 space-y-2.5 text-sm text-slate-700">
                  {CROSSWORD_WORDS.filter((w) => w.direction === 'down').map((w) => (
                    <li key={w.number} className="leading-relaxed">
                      <span className="mr-1.5 font-mono font-bold text-slate-900">
                        {w.number}.
                      </span>
                      {w.clue}{' '}
                      <span className="font-mono text-xs text-slate-400">
                        ({w.answer.length} huruf)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {subMode === 'algo' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Game E · Puzzle Berpikir Komputasional
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{currentAlgo.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{currentAlgo.context}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALGORITHM_CHALLENGES.map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => switchAlgoChallenge(idx)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    algoIdx === idx
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Studi Kasus {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {algoOrder.map((step, idx) => {
              const isCorrectPos =
                algoChecked !== null && step === currentAlgo.correctOrder[idx];
              return (
                <div
                  key={step}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3.5 ${
                    algoChecked === null
                      ? 'border-slate-200 bg-slate-50/70'
                      : isCorrectPos
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-amber-300 bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white font-mono text-xs font-bold text-slate-700 border border-slate-200">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{step}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveAlgoStep(idx, -1)}
                      aria-label="Geser ke atas"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === algoOrder.length - 1}
                      onClick={() => moveAlgoStep(idx, 1)}
                      aria-label="Geser ke bawah"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={submitAlgoCheck}
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Verifikasi Urutan Algoritma
            </button>

            {algoChecked === true && (
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Urutan algoritma 100% tepat! Skor 900 tercatat di Dasbor Guru.
              </p>
            )}
            {algoChecked === false && (
              <p className="text-sm font-medium text-amber-700">
                Beberapa langkah belum berurutan. Perhatikan blok kuning lalu susun kembali.
              </p>
            )}
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

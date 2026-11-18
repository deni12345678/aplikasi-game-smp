import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import {
  ALGORITHM_CHALLENGES,
  createVariantSeed,
  CROSSWORD_WORDS,
  shortVariantCode,
  shuffleWithSeed,
} from '../../data/tikCurriculum';
import { useRoomSync } from '../../hooks/useRoomSync';
import type { AnswerDetail, CrosswordWord, ScoreRecord, SessionMode, UserAccount } from '../../types';
import { soundFx } from '../../utils/sound';
import { LiveRoomStandings } from '../LiveRoomStandings';

interface PuzzleGameProps {
  user: UserAccount;
  mode: SessionMode;
  roomCode?: string;
  onExit: () => void;
  onScoreSubmitted?: (record: ScoreRecord) => void;
}

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

  const [difficulty, setDifficulty] = useState<'mudah' | 'sedang' | 'sulit'>('mudah');
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [celebratingCells, setCelebratingCells] = useState<
    Record<string, { step: number; seq: number }>
  >({});
  const [celebrationBanner, setCelebrationBanner] = useState<{
    label: string;
    seq: number;
  } | null>(null);
  const prevSolvedWordsRef = useRef<Set<number>>(new Set());
  const celebrationSeqRef = useRef(0);
  const celebrationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

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

  const activeCrosswords = useMemo(
    () => CROSSWORD_WORDS.filter((w) => (w.difficulty || 'mudah') === difficulty),
    [difficulty]
  );

  const cellSolutionMap = useMemo(() => {
    const map = new Map<
      string,
      { char: string; numbers: number[]; across?: CrosswordWord; down?: CrosswordWord }
    >();
    for (const w of activeCrosswords) {
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        const key = `${r}-${c}`;
        const existing = map.get(key) ?? { char: w.answer[i], numbers: [] };
        if (i === 0 && !existing.numbers.includes(w.number)) {
          existing.numbers.push(w.number);
        }
        if (w.direction === 'across') {
          existing.across = w;
        } else {
          existing.down = w;
        }
        map.set(key, existing);
      }
    }
    return map;
  }, [activeCrosswords]);

  const gridBounds = useMemo(() => {
    if (activeCrosswords.length === 0) {
      return { minRow: 0, maxRow: 11, minCol: 0, maxCol: 11 };
    }
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    for (const w of activeCrosswords) {
      const endR = w.direction === 'down' ? w.row + w.answer.length - 1 : w.row;
      const endC = w.direction === 'across' ? w.col + w.answer.length - 1 : w.col;
      minRow = Math.min(minRow, w.row);
      maxRow = Math.max(maxRow, endR);
      minCol = Math.min(minCol, w.col);
      maxCol = Math.max(maxCol, endC);
    }
    return { minRow, maxRow, minCol, maxCol };
  }, [activeCrosswords]);

  const rowIndices = useMemo(() => {
    const rows: number[] = [];
    for (let r = gridBounds.minRow; r <= gridBounds.maxRow; r++) rows.push(r);
    return rows;
  }, [gridBounds]);

  const colIndices = useMemo(() => {
    const cols: number[] = [];
    for (let c = gridBounds.minCol; c <= gridBounds.maxCol; c++) cols.push(c);
    return cols;
  }, [gridBounds]);

  const activeWord = useMemo<CrosswordWord | null>(() => {
    if (!selectedCell) return activeCrosswords[0] ?? null;
    const cell = cellSolutionMap.get(`${selectedCell.r}-${selectedCell.c}`);
    if (!cell) return activeCrosswords[0] ?? null;
    if (activeDirection === 'across') {
      return cell.across ?? cell.down ?? activeCrosswords[0] ?? null;
    }
    return cell.down ?? cell.across ?? activeCrosswords[0] ?? null;
  }, [selectedCell, activeDirection, cellSolutionMap, activeCrosswords]);

  const activeWordKeys = useMemo(() => {
    const set = new Set<string>();
    if (!activeWord) return set;
    for (let i = 0; i < activeWord.answer.length; i++) {
      const r = activeWord.direction === 'across' ? activeWord.row : activeWord.row + i;
      const c = activeWord.direction === 'across' ? activeWord.col + i : activeWord.col;
      set.add(`${r}-${c}`);
    }
    return set;
  }, [activeWord]);

  const liveSolvedWords = useMemo(() => {
    const solved = new Set<number>();
    for (const w of activeCrosswords) {
      let ok = true;
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        if ((userGrid[`${r}-${c}`] || '') !== w.answer[i]) {
          ok = false;
          break;
        }
      }
      if (ok) solved.add(w.number);
    }
    return solved;
  }, [activeCrosswords, userGrid]);

  const solvedCellKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const w of activeCrosswords) {
      if (!liveSolvedWords.has(w.number)) continue;
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        keys.add(`${r}-${c}`);
      }
    }
    return keys;
  }, [activeCrosswords, liveSolvedWords]);

  const wordStatusMap = useMemo(() => {
    const status = new Map<number, boolean>();
    if (!checkedTts) return status;
    for (const w of activeCrosswords) {
      status.set(w.number, liveSolvedWords.has(w.number));
    }
    return status;
  }, [checkedTts, activeCrosswords, liveSolvedWords]);

  const filledCellCount = useMemo(() => {
    let count = 0;
    cellSolutionMap.forEach((_val, key) => {
      if (userGrid[key]) count += 1;
    });
    return count;
  }, [cellSolutionMap, userGrid]);

  function clearCelebrations() {
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }
    prevSolvedWordsRef.current = new Set();
    setCelebratingCells({});
    setCelebrationBanner(null);
  }

  function checkWordCompletions(nextGrid: Record<string, string>) {
    const nextSolved = new Set<number>();
    const newlySolved: CrosswordWord[] = [];

    for (const w of activeCrosswords) {
      let ok = true;
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        if ((nextGrid[`${r}-${c}`] || '') !== w.answer[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        nextSolved.add(w.number);
        if (!prevSolvedWordsRef.current.has(w.number)) {
          newlySolved.push(w);
        }
      }
    }

    prevSolvedWordsRef.current = nextSolved;
    if (newlySolved.length === 0) return;

    const seq = ++celebrationSeqRef.current;
    const waveMap: Record<string, { step: number; seq: number }> = {};

    newlySolved.forEach((w, wordIdx) => {
      soundFx.pop(wordIdx);
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        const key = `${r}-${c}`;
        if (!waveMap[key] || i < waveMap[key].step) {
          waveMap[key] = { step: i, seq };
        }
      }
    });

    if (nextSolved.size === activeCrosswords.length && activeCrosswords.length > 0) {
      window.setTimeout(() => soundFx.victory(), 140);
    }

    const summaryLabel =
      nextSolved.size === activeCrosswords.length
        ? `Luar biasa! Semua ${activeCrosswords.length} kata berhasil terisi!`
        : newlySolved.length === 1
        ? `Kata #${newlySolved[0].number} ${newlySolved[0].answer} terisi tepat!`
        : `${newlySolved.length} kata sekaligus terisi tepat!`;

    setCelebratingCells(waveMap);
    setCelebrationBanner({ label: summaryLabel, seq });

    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebratingCells({});
      setCelebrationBanner(null);
      celebrationTimerRef.current = null;
    }, 1500);
  }

  function focusCell(r: number, c: number) {
    setSelectedCell({ r, c });
    requestAnimationFrame(() => {
      const el = inputRefs.current[`${r}-${c}`];
      el?.focus();
      el?.select();
    });
  }

  function handleSelectCell(r: number, c: number) {
    const cell = cellSolutionMap.get(`${r}-${c}`);
    if (!cell) return;
    if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
      if (cell.across && cell.down) {
        setActiveDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      }
      return;
    }
    if (activeDirection === 'across' && !cell.across && cell.down) {
      setActiveDirection('down');
    } else if (activeDirection === 'down' && !cell.down && cell.across) {
      setActiveDirection('across');
    }
    setSelectedCell({ r, c });
  }

  function handleSelectClue(word: CrosswordWord) {
    soundFx.click();
    setActiveDirection(word.direction);
    // Focus first empty cell in the selected clue, or its start cell
    for (let i = 0; i < word.answer.length; i++) {
      const r = word.direction === 'across' ? word.row : word.row + i;
      const c = word.direction === 'across' ? word.col + i : word.col;
      if (!userGrid[`${r}-${c}`]) {
        focusCell(r, c);
        return;
      }
    }
    focusCell(word.row, word.col);
  }

  function syncGridProgress(nextGrid: Record<string, string>) {
    if (!roomCode || cellSolutionMap.size === 0) return;
    let filled = 0;
    cellSolutionMap.forEach((_val, key) => {
      if (nextGrid[key]) filled += 1;
    });
    const pct = Math.min(90, Math.round((filled / cellSolutionMap.size) * 90));
    sendProgress({ progress: pct, score: savedScore ?? 0, streak: 0, statusEffect: 'normal' });
  }

  function stepAlongActiveWord(r: number, c: number, delta: 1 | -1) {
    if (!activeWord) return;
    const dr = activeWord.direction === 'down' ? delta : 0;
    const dc = activeWord.direction === 'across' ? delta : 0;
    const nr = r + dr;
    const nc = c + dc;
    if (cellSolutionMap.has(`${nr}-${nc}`)) {
      focusCell(nr, nc);
    }
  }

  function handleCellChange(r: number, c: number, val: string) {
    const clean = val.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
    const nextGrid = { ...userGrid, [`${r}-${c}`]: clean };
    setUserGrid(nextGrid);
    setCheckedTts(false);
    syncGridProgress(nextGrid);
    checkWordCompletions(nextGrid);
    if (clean) {
      stepAlongActiveWord(r, c, 1);
    }
  }

  function handleCellKeyDown(r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const key = `${r}-${c}`;
    if (e.key === 'Backspace') {
      if (!userGrid[key]) {
        e.preventDefault();
        if (activeWord) {
          const dr = activeWord.direction === 'down' ? -1 : 0;
          const dc = activeWord.direction === 'across' ? -1 : 0;
          const pr = r + dr;
          const pc = c + dc;
          if (cellSolutionMap.has(`${pr}-${pc}`)) {
            const nextGrid = { ...userGrid, [`${pr}-${pc}`]: '' };
            setUserGrid(nextGrid);
            setCheckedTts(false);
            syncGridProgress(nextGrid);
            checkWordCompletions(nextGrid);
            focusCell(pr, pc);
          }
        }
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (cellSolutionMap.has(`${r}-${c + 1}`)) {
        setActiveDirection('across');
        focusCell(r, c + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (cellSolutionMap.has(`${r}-${c - 1}`)) {
        setActiveDirection('across');
        focusCell(r, c - 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cellSolutionMap.has(`${r + 1}-${c}`)) {
        setActiveDirection('down');
        focusCell(r + 1, c);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cellSolutionMap.has(`${r - 1}-${c}`)) {
        setActiveDirection('down');
        focusCell(r - 1, c);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      const cell = cellSolutionMap.get(key);
      if (cell?.across && cell?.down) {
        setActiveDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      }
    }
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

    for (const w of activeCrosswords) {
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
        topic: w.topic || (w.answer === 'AMANAH' ? 'Adab Digital & Literasi' : 'Umum & Logika'),
        prompt: `TTS ${w.number} ${w.direction === 'across' ? 'Mendatar' : 'Menurun'}`,
        isCorrect: ok,
        responseTimeMs: 4500,
      });
    }

    if (solvedWords === activeCrosswords.length) {
      soundFx.victory();
    } else if (solvedWords > 0) {
      soundFx.correct();
    } else {
      soundFx.wrong();
    }

    const totalScore = Math.round((solvedWords / Math.max(1, activeCrosswords.length)) * 1000);
    sendProgress({
      progress: 100,
      score: totalScore,
      streak: solvedWords,
      statusEffect: 'finished',
      finishedAt: Date.now(),
    });
    await persistPuzzleScore(totalScore, solvedWords, activeCrosswords.length, answers);
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
    // Prefer filling an empty cell inside the active word first
    const candidateKeys: string[] = [];
    if (activeWord) {
      for (let i = 0; i < activeWord.answer.length; i++) {
        const r = activeWord.direction === 'across' ? activeWord.row : activeWord.row + i;
        const c = activeWord.direction === 'across' ? activeWord.col + i : activeWord.col;
        const key = `${r}-${c}`;
        const sol = cellSolutionMap.get(key);
        if (sol && (userGrid[key] || '') !== sol.char) {
          candidateKeys.push(key);
        }
      }
    }
    if (candidateKeys.length === 0) {
      cellSolutionMap.forEach((val, key) => {
        if ((userGrid[key] || '') !== val.char) {
          candidateKeys.push(key);
        }
      });
    }
    if (candidateKeys.length > 0) {
      const targetKey = candidateKeys[0];
      const sol = cellSolutionMap.get(targetKey);
      if (sol) {
        const nextGrid = { ...userGrid, [targetKey]: sol.char };
        setUserGrid(nextGrid);
        setCheckedTts(false);
        syncGridProgress(nextGrid);
        checkWordCompletions(nextGrid);
        const [rs, cs] = targetKey.split('-').map(Number);
        focusCell(rs, cs);
      }
    }
  }

  const solvedWordCount = Array.from(wordStatusMap.values()).filter(Boolean).length;

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
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  Game D · Teka-Teki Silang (20 Soal Umum SMP)
                </p>
                <h2 className="text-xl font-bold text-slate-900">TTS Interaktif & Logika</h2>
                <div className="mt-2.5 flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 p-1">
                  {(['mudah', 'sedang', 'sulit'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        soundFx.click();
                        setDifficulty(lvl);
                        setUserGrid({});
                        setCheckedTts(false);
                        setSavedScore(null);
                        setSelectedCell(null);
                        clearCelebrations();
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                        difficulty === lvl
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
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
                    soundFx.click();
                    setUserGrid({});
                    setCheckedTts(false);
                    setSavedScore(null);
                    setSelectedCell(null);
                    clearCelebrations();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Active Clue Banner + Word Completion Celebration Banner */}
            {celebrationBanner && (
              <div
                key={`banner-${celebrationBanner.seq}`}
                className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-400 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>{celebrationBanner.label}</span>
              </div>
            )}

            {activeWord && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="mr-2 inline-block rounded bg-emerald-700 px-2 py-0.5 font-mono font-bold text-white">
                    {activeWord.number} {activeWord.direction === 'across' ? 'MENDATAR' : 'MENURUN'}
                  </span>
                  <span className="font-medium text-slate-800">{activeWord.clue}</span>
                  <span className="ml-1.5 font-mono text-slate-500">
                    ({activeWord.answer.length} huruf)
                  </span>
                </div>
                <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                  {liveSolvedWords.size}/{activeCrosswords.length} kata · {filledCellCount}/{cellSolutionMap.size} huruf
                </span>
              </div>
            )}

            <div className="overflow-x-auto pb-2">
              <div
                className="mx-auto grid gap-1 rounded-xl bg-slate-100 p-2"
                style={{
                  gridTemplateColumns: `repeat(${colIndices.length}, minmax(34px, 42px))`,
                  width: 'fit-content',
                }}
              >
                {rowIndices.map((r) =>
                  colIndices.map((c) => {
                    const key = `${r}-${c}`;
                    const cell = cellSolutionMap.get(key);
                    if (!cell) {
                      return <div key={key} className="h-10 w-10 rounded-md bg-slate-200/75" />;
                    }
                    const currentVal = userGrid[key] || '';
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const isInActiveWord = activeWordKeys.has(key);
                    const isSolvedCell = solvedCellKeys.has(key);
                    const celebration = celebratingCells[key];
                    const isCorrect = checkedTts && currentVal === cell.char;
                    const isWrong = checkedTts && currentVal !== cell.char;

                    return (
                      <div key={key} className="relative h-10 w-10">
                        {celebration && (
                          <div
                            key={`wave-${key}-${celebration.seq}`}
                            aria-hidden="true"
                            className="animate-tts-pop pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-emerald-500 bg-emerald-300/30"
                            style={{ animationDelay: `${celebration.step * 38}ms` }}
                          />
                        )}
                        {cell.numbers.length > 0 && (
                          <span className="pointer-events-none absolute top-0.5 left-1 z-20 font-mono text-[10px] leading-none font-bold text-slate-600">
                            {cell.numbers.join('/')}
                          </span>
                        )}
                        <input
                          ref={(el) => {
                            inputRefs.current[key] = el;
                          }}
                          type="text"
                          maxLength={1}
                          value={currentVal}
                          onFocus={() => handleSelectCell(r, c)}
                          onClick={() => handleSelectCell(r, c)}
                          onChange={(e) => handleCellChange(r, c, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(r, c, e)}
                          aria-label={`Baris ${r + 1} Kolom ${c + 1}`}
                          className={`relative z-0 h-full w-full rounded-md border pt-1.5 text-center font-mono text-base font-bold uppercase outline-none transition-colors ${
                            isCorrect
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                              : isWrong
                              ? 'border-red-400 bg-red-50 text-red-900'
                              : isSelected
                              ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-400/40'
                              : isSolvedCell
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                              : isInActiveWord
                              ? 'border-emerald-500 bg-emerald-50/70 text-slate-900'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-700'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-500">
              Tips: Klik kotak untuk memilih kata · Ketik huruf otomatis lanjut ke kotak berikutnya · Tekan Spasi pada persilangan untuk ganti arah.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={submitTtsCheck}
                disabled={saving}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Periksa & Simpan Skor TTS'}
              </button>
              {savedScore !== null && (
                <p className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                  Benar {solvedWordCount}/{activeCrosswords.length} kata · Skor: {savedScore}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5">
            <h3 className="text-base font-bold text-slate-900">Petunjuk Teka-Teki Silang</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Klik salah satu pertanyaan di bawah untuk langsung menyorot kotaknya.
            </p>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Mendatar</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {activeCrosswords
                    .filter((w) => w.direction === 'across')
                    .map((w) => {
                      const isActive = activeWord?.number === w.number;
                      const isLiveSolved = liveSolvedWords.has(w.number);
                      const isSolved = wordStatusMap.get(w.number);
                      return (
                        <li key={w.number}>
                          <button
                            type="button"
                            onClick={() => handleSelectClue(w)}
                            className={`w-full rounded-lg border px-3 py-2 text-left leading-relaxed transition-colors ${
                              isActive
                                ? 'border-emerald-400 bg-emerald-50 text-slate-900'
                                : isLiveSolved
                                ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                                : 'border-transparent hover:bg-slate-50'
                            }`}
                          >
                            <span className="mr-1.5 font-mono font-bold text-slate-900">
                              {w.number}.
                            </span>
                            {w.clue}{' '}
                            <span className="font-mono text-xs text-slate-400">
                              ({w.answer.length} huruf)
                            </span>
                            {checkedTts ? (
                              <span
                                className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isSolved
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {isSolved ? 'Benar' : 'Belum tepat'}
                              </span>
                            ) : (
                              isLiveSolved && (
                                <span className="ml-2 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Terisi ✓
                                </span>
                              )
                            )}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-amber-700">Menurun</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {activeCrosswords
                    .filter((w) => w.direction === 'down')
                    .map((w) => {
                      const isActive = activeWord?.number === w.number;
                      const isLiveSolved = liveSolvedWords.has(w.number);
                      const isSolved = wordStatusMap.get(w.number);
                      return (
                        <li key={w.number}>
                          <button
                            type="button"
                            onClick={() => handleSelectClue(w)}
                            className={`w-full rounded-lg border px-3 py-2 text-left leading-relaxed transition-colors ${
                              isActive
                                ? 'border-amber-400 bg-amber-50/70 text-slate-900'
                                : isLiveSolved
                                ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                                : 'border-transparent hover:bg-slate-50'
                            }`}
                          >
                            <span className="mr-1.5 font-mono font-bold text-slate-900">
                              {w.number}.
                            </span>
                            {w.clue}{' '}
                            <span className="font-mono text-xs text-slate-400">
                              ({w.answer.length} huruf)
                            </span>
                            {checkedTts ? (
                              <span
                                className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isSolved
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {isSolved ? 'Benar' : 'Belum tepat'}
                              </span>
                            ) : (
                              isLiveSolved && (
                                <span className="ml-2 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Terisi ✓
                                </span>
                              )
                            )}
                          </button>
                        </li>
                      );
                    })}
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
                Game D · Puzzle Berpikir Komputasional
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
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white font-mono text-xs font-bold text-slate-700">
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

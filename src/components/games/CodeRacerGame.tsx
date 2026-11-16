import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flame, Gauge, RotateCcw, Trophy, Zap } from 'lucide-react';
import { CATEGORY_LABELS, getRacingQuestions } from '../../data/tikCurriculum';
import type {
  AnswerDetail,
  GameSession,
  LiveRaceParticipant,
  QuestionCategory,
  ScoreRecord,
  SessionMode,
  UserAccount,
} from '../../types';
import { soundFx } from '../../utils/sound';

interface CodeRacerGameProps {
  user: UserAccount;
  mode: SessionMode;
  category?: QuestionCategory;
  roomCode?: string;
  onExit: () => void;
  onScoreSubmitted?: (record: ScoreRecord) => void;
}

export const CodeRacerGame: React.FC<CodeRacerGameProps> = ({
  user,
  mode,
  category = 'tik',
  roomCode,
  onExit,
  onScoreSubmitted,
}) => {
  const questions = getRacingQuestions(category);
  const TOTAL_QUESTIONS = questions.length;
  const [phase, setPhase] = useState<'ready' | 'racing' | 'finished'>('ready');
  const [qIndex, setQIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [visualProgress, setVisualProgress] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(80);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [statusEffect, setStatusEffect] = useState<'normal' | 'nitro' | 'skid' | 'finished'>(
    'normal'
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string>('');
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [qStartMs, setQStartMs] = useState<number>(Date.now());
  const [roomParticipants, setRoomParticipants] = useState<LiveRaceParticipant[]>([]);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animStateRef = useRef({
    targetProgress: 0,
    displayProgress: 0,
    speedKmh: 80,
    effect: 'normal' as 'normal' | 'nitro' | 'skid' | 'finished',
    roadOffset: 0,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    peers: [] as LiveRaceParticipant[],
  });

  const currentQuestion = questions[qIndex];

  // Sync ref for 60fps canvas animation loop
  useEffect(() => {
    animStateRef.current.targetProgress = progress;
    animStateRef.current.speedKmh = speedKmh;
    animStateRef.current.effect = statusEffect;
    animStateRef.current.peers = roomParticipants.filter((p) => p.studentId !== user.id);
  }, [progress, speedKmh, statusEffect, roomParticipants, user.id]);

  // Connect WebSocket (with REST/polling fallback for serverless environments like Vercel)
  useEffect(() => {
    if (!roomCode) return;
    const codeUpper = roomCode.toUpperCase();
    const participantPayload = {
      studentId: user.id,
      studentName: user.fullName,
      className: user.className,
      carColor: user.avatarColor,
      avatarIcon: user.avatarIcon || '🎓',
      progress: 0,
      speedKmh: 80,
      score: 0,
      streak: 0,
      statusEffect: 'normal' as const,
    };

    fetch(`/api/sessions/${codeUpper}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant: participantPayload }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.session?.participants) setRoomParticipants(data.session.participants);
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
        if (msg.event === 'room:state' && msg.payload?.participants) {
          setRoomParticipants(msg.payload.participants);
        }
      } catch {
        // Ignore parse errors
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
          if (data?.session?.participants) setRoomParticipants(data.session.participants);
        })
        .catch(() => {});
    }, 2000);

    return () => {
      window.clearInterval(pollTimer);
      ws.close();
      wsRef.current = null;
    };
  }, [roomCode, user]);

  function broadcastProgress(
    nextProgress: number,
    nextSpeed: number,
    nextScore: number,
    nextStreak: number,
    effect: 'normal' | 'nitro' | 'skid' | 'finished'
  ) {
    if (!roomCode) return;
    const codeUpper = roomCode.toUpperCase();
    const payload = {
      studentId: user.id,
      progress: nextProgress,
      speedKmh: nextSpeed,
      score: nextScore,
      streak: nextStreak,
      statusEffect: effect,
      finishedAt: effect === 'finished' ? Date.now() : undefined,
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'room:race_progress',
          payload: {
            code: codeUpper,
            ...payload,
          },
        })
      );
    } else {
      fetch(`/api/sessions/${codeUpper}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.session?.participants) setRoomParticipants(data.session.participants);
        })
        .catch(() => {});
    }
  }

  // 2D Canvas Race Track Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const drawCar = (
      x: number,
      y: number,
      bodyColor: string,
      label: string,
      effect: string,
      isPlayer: boolean
    ) => {
      ctx.save();
      const wobbleY = effect === 'skid' ? Math.sin(Date.now() * 0.05) * 2.5 : 0;
      ctx.translate(x, y + wobbleY);

      // Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-28, -11, 56, 26, 7);
      ctx.fill();

      // Nitro Flame Exhaust
      if (effect === 'nitro') {
        const flameLen = 18 + Math.random() * 14;
        const grad = ctx.createLinearGradient(-28 - flameLen, 0, -26, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.5, '#38BDF8');
        grad.addColorStop(1, '#F59E0B');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-26, -6);
        ctx.lineTo(-26 - flameLen, 0);
        ctx.lineTo(-26, 6);
        ctx.closePath();
        ctx.fill();
      }

      // Tires
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-20, -16, 12, 4);
      ctx.fillRect(8, -16, 12, 4);
      ctx.fillRect(-20, 12, 12, 4);
      ctx.fillRect(8, 12, 12, 4);

      // Car Chassis
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-26, -13, 52, 26, 8);
      ctx.fill();

      // Racing Stripe
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(-22, -2.5, 44, 5);

      // Windshield
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(2, -9, 13, 18, 3);
      ctx.fill();

      // Headlights
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(23, -10, 3, 5);
      ctx.fillRect(23, 5, 3, 5);

      // Nameplate
      ctx.font = `${isPlayer ? '700' : '600'} 11px "Plus Jakarta Sans", sans-serif`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = isPlayer ? '#047857' : '#334155';
      ctx.beginPath();
      ctx.roundRect(-textWidth / 2 - 6, -32, textWidth + 12, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -24);

      ctx.restore();
    };

    const render = () => {
      const state = animStateRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Smooth interpolation toward target progress
      state.displayProgress += (state.targetProgress - state.displayProgress) * 0.08;
      setVisualProgress(Math.round(state.displayProgress));

      const scrollFactor = state.effect === 'nitro' ? 9 : state.effect === 'skid' ? 1.5 : 4;
      state.roadOffset = (state.roadOffset + scrollFactor) % 48;

      // Spawn nitro or skid particles
      const playerX = 68 + (state.displayProgress / 100) * (w - 150);
      const laneCount = Math.max(2, 1 + state.peers.length);
      const trackTop = 28;
      const trackHeight = h - 56;
      const laneHeight = trackHeight / laneCount;
      const playerY = trackTop + laneHeight * 0.5;

      if (state.effect === 'nitro' && Math.random() < 0.7) {
        state.particles.push({
          x: playerX - 28,
          y: playerY + (Math.random() - 0.5) * 10,
          vx: -3 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 1,
          color: Math.random() > 0.5 ? '#38BDF8' : '#FBBF24',
        });
      } else if (state.effect === 'skid' && Math.random() < 0.55) {
        state.particles.push({
          x: playerX - 24,
          y: playerY + (Math.random() - 0.5) * 12,
          vx: -1.5,
          vy: -0.6 - Math.random(),
          life: 1,
          color: '#CBD5E1',
        });
      }

      // Draw Sky/Grass shoulder
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(0, 0, w, h);

      // Emerald & Gold Kerb Strips
      for (let kx = -state.roadOffset; kx < w; kx += 48) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(kx, trackTop - 8, 24, 8);
        ctx.fillRect(kx, trackTop + trackHeight, 24, 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(kx + 24, trackTop - 8, 24, 8);
        ctx.fillRect(kx + 24, trackTop + trackHeight, 24, 8);
      }

      // Asphalt surface
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, trackTop, w, trackHeight);

      // Lane Dividers
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([22, 26]);
      ctx.lineDashOffset = state.roadOffset;
      for (let i = 1; i < laneCount; i++) {
        const ly = trackTop + i * laneHeight;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(w, ly);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Checkered Finish Line
      const finishX = w - 64;
      const squareSize = 10;
      for (let fy = trackTop; fy < trackTop + trackHeight; fy += squareSize) {
        const rowOdd = Math.floor((fy - trackTop) / squareSize) % 2 === 0;
        ctx.fillStyle = rowOdd ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(finishX, fy, squareSize, squareSize);
        ctx.fillStyle = rowOdd ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(finishX + squareSize, fy, squareSize, squareSize);
      }

      // Draw particles
      state.particles = state.particles.filter((pt) => pt.life > 0.05);
      for (const pt of state.particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life *= 0.9;
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw Player Car in Lane 0
      drawCar(
        playerX,
        playerY,
        user.avatarColor || '#047857',
        `${user.avatarIcon ? `${user.avatarIcon} ` : ''}${user.fullName.split(' ')[0]} (Kamu)`,
        state.effect,
        true
      );

      // Draw Connected Room Peers or Benchmark Pace Marker
      if (state.peers.length > 0) {
        state.peers.slice(0, 4).forEach((peer, idx) => {
          const px = 68 + (peer.progress / 100) * (w - 150);
          const py = trackTop + laneHeight * (idx + 1.5);
          drawCar(
            px,
            py,
            peer.carColor || '#0284C7',
            `${peer.avatarIcon ? `${peer.avatarIcon} ` : ''}${peer.studentName.split(' ')[0]} · ${peer.className}`,
            peer.statusEffect,
            false
          );
        });
      } else {
        // Solo Mode: Pace Marker (not a fake student, labeled clearly as Target Pace)
        const targetPacePct = Math.min(100, (qIndex / TOTAL_QUESTIONS) * 100);
        const px = 68 + (targetPacePct / 100) * (w - 150);
        const py = trackTop + laneHeight * 1.5;
        drawCar(px, py, '#64748B', 'Target Pace Kelas', 'normal', false);
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [user.avatarColor, user.avatarIcon, user.fullName, qIndex]);

  function startRace() {
    soundFx.nitro();
    setPhase('racing');
    setQIndex(0);
    setProgress(0);
    setSpeedKmh(90);
    setStreak(0);
    setMaxStreak(0);
    setScore(0);
    setStatusEffect('normal');
    setFeedbackBanner('Jawab soal TIK dengan cepat untuk mengaktifkan Nitro Boost!');
    setAnswers([]);
    setQStartMs(Date.now());
    broadcastProgress(0, 90, 0, 0, 'normal');
  }

  async function handleRaceAnswer(optIdx: number) {
    if (phase !== 'racing') return;
    const elapsedMs = Date.now() - qStartMs;
    const isCorrect = optIdx === currentQuestion.correctIndex;
    const stepPct = 100 / TOTAL_QUESTIONS;

    let nextProgress = progress;
    let nextSpeed = speedKmh;
    let nextStreak = streak;
    let nextScore = score;
    let nextEffect: 'normal' | 'nitro' | 'skid' | 'finished' = 'normal';

    if (isCorrect) {
      nextStreak = streak + 1;
      setMaxStreak((m) => Math.max(m, nextStreak));
      const fastBonus = elapsedMs < 4000 ? 40 : 15;
      nextScore = score + 100 + fastBonus + (nextStreak >= 2 ? 30 : 0);
      nextProgress = Math.min(100, Math.round((qIndex + 1) * stepPct));

      if (nextStreak >= 2) {
        soundFx.nitro();
        nextEffect = 'nitro';
        nextSpeed = Math.min(230, 145 + nextStreak * 15);
        setFeedbackBanner(`NITRO BOOST ${nextStreak}x! Mobil melesat ${nextSpeed} km/h!`);
      } else {
        soundFx.correct();
        nextEffect = 'normal';
        nextSpeed = 135;
        setFeedbackBanner('Tepat! Mobil melaju kencang ke depan.');
      }
    } else {
      soundFx.wrong();
      nextStreak = 0;
      nextEffect = 'skid';
      nextSpeed = 48;
      // Still advance question, smaller progress gain so race concludes cleanly
      nextProgress = Math.min(95, progress + Math.round(stepPct * 0.35));
      setFeedbackBanner('Melambat! Jawaban kurang tepat — kecepatan turun sementara.');
    }

    const answerDetail: AnswerDetail = {
      questionId: currentQuestion.id,
      topic: currentQuestion.topic,
      prompt: currentQuestion.question.slice(0, 44),
      isCorrect,
      responseTimeMs: elapsedMs,
    };
    const nextAnswers = [...answers, answerDetail];
    setAnswers(nextAnswers);
    setProgress(nextProgress);
    setSpeedKmh(nextSpeed);
    setStreak(nextStreak);
    setScore(nextScore);
    setStatusEffect(nextEffect);

    const isLast = qIndex + 1 >= TOTAL_QUESTIONS;
    if (isLast) {
      const finalProgress = 100;
      setProgress(finalProgress);
      setStatusEffect('finished');
      broadcastProgress(finalProgress, nextSpeed, nextScore, nextStreak, 'finished');
      await finishRace(nextScore, nextAnswers, Math.max(maxStreak, nextStreak));
    } else {
      broadcastProgress(nextProgress, nextSpeed, nextScore, nextStreak, nextEffect);
      setQIndex((i) => i + 1);
      setQStartMs(Date.now());
    }
  }

  async function finishRace(
    finalScore: number,
    allAnswers: AnswerDetail[],
    bestStreak: number
  ) {
    soundFx.victory();
    setPhase('finished');
    setSaving(true);
    const correctCount = allAnswers.filter((a) => a.isCorrect).length;
    const avgTimeSec =
      allAnswers.length > 0
        ? Number((allAnswers.reduce((a, b) => a + b.responseTimeMs, 0) / allAnswers.length / 1000).toFixed(1))
        : 0;

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentName: user.fullName,
          className: user.className,
          gameType: 'racing',
          mode,
          category,
          roomCode,
          score: finalScore,
          correctCount,
          totalQuestions: TOTAL_QUESTIONS,
          avgTimeSec,
          maxStreak: bestStreak,
          answers: allAnswers,
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Arena
        </button>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>Game F · Code Racer 2D · {CATEGORY_LABELS[category]}</span>
          <span aria-hidden="true">·</span>
          <span>{roomCode ? `Live Room: ${roomCode}` : 'Mode Latihan Mandiri'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-bold text-emerald-700 tabular-nums">
            {visualProgress}% Garis Finis
          </span>
        </div>
      </div>

      {/* 2D Animated Race Track Canvas */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-3 text-xs text-slate-200">
          <div className="flex items-center gap-5 font-mono tabular-nums">
            <span className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-emerald-400" />
              Kecepatan: <strong className="text-white">{speedKmh} km/h</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" />
              Streak: <strong className="text-white">{streak}x</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-sky-400" />
              Status:{' '}
              <strong className="text-white">
                {statusEffect === 'nitro'
                  ? 'NITRO BOOST'
                  : statusEffect === 'skid'
                  ? 'MELAMBAT'
                  : statusEffect === 'finished'
                  ? 'FINIS'
                  : 'STABIL'}
              </strong>
            </span>
          </div>
          <div className="font-mono text-sm font-bold text-amber-400 tabular-nums">
            Skor Balapan: {score}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={960}
          height={240}
          className="block h-auto w-full"
        />
      </div>

      {phase === 'ready' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-xs font-semibold text-emerald-700">Balapan Edukasi TIK</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Siap Pacu Mobil Code Racer?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Mobilmu melaju ke garis finis setiap kali kamu menjawab soal TIK dengan benar. Jawab
            benar beruntun 2 kali atau lebih untuk memicu <strong>Nitro Boost</strong>! Jawaban
            salah membuat mobil melambat sementara. Posisi balapan terkirim langsung ke Dasbor
            Guru.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={startRace}
              className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Mulai Balapan Sekarang
            </button>
          </div>
        </div>
      )}

      {phase === 'racing' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <span className="font-mono text-xs font-bold text-slate-500 tabular-nums">
              Tantangan {qIndex + 1} / {TOTAL_QUESTIONS} · {currentQuestion.topic}
            </span>
            {feedbackBanner && (
              <span
                className={`text-xs font-semibold ${
                  statusEffect === 'nitro'
                    ? 'text-sky-700'
                    : statusEffect === 'skid'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {feedbackBanner}
              </span>
            )}
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">
            {currentQuestion.question}
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRaceAnswer(idx)}
                className="flex min-h-[54px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40 active:scale-[0.99]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-2 text-amber-600">
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-semibold">Garis Finis Tercapai</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Balapan Selesai — {user.fullName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {saving
              ? 'Mengirim catatan waktu & kecepatan ke Dasbor Guru...'
              : 'Skor kecepatan dan akurasi balapan sudah tercatat secara real-time di Dasbor Admin Guru.'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Skor Balapan</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                {score}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Jawaban Tepat</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {answers.filter((a) => a.isCorrect).length}/{TOTAL_QUESTIONS}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Nitro Streak Max</p>
              <p className="mt-1 font-mono text-2xl font-bold text-sky-700 tabular-nums">
                {maxStreak}x
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Kecepatan Finis</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {speedKmh} km/h
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startRace}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <RotateCcw className="h-4 w-4" />
              Balap Lagi
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
    </div>
  );
};

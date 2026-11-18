import React, { useEffect, useState } from 'react';
import {
  Award,
  CarFront,
  CheckSquare,
  Globe2,
  HelpCircle,
  Puzzle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { AvatarBadge } from './components/AvatarBadge';
import { ClueGame } from './components/games/ClueGame';
import { CodeRacerGame } from './components/games/CodeRacerGame';
import { FlagQuizGame } from './components/games/FlagQuizGame';
import { HorseRacingGame } from './components/games/HorseRacingGame';
import { PuzzleGame } from './components/games/PuzzleGame';
import { QuizGame } from './components/games/QuizGame';
import { Leaderboard } from './components/Leaderboard';
import { LobbyRoom } from './components/LobbyRoom';
import { MandatoryCameraGate } from './components/MandatoryCameraGate';
import { StudentHub } from './components/StudentHub';
import { TeacherDashboard } from './components/TeacherDashboard';
import { GAME_META } from './data/tikCurriculum';
import type {
  AnalyticsSummary,
  GameType,
  QuestionCategory,
  SessionMode,
  UserAccount,
} from './types';
import { getSoundMuted, setSoundMuted, soundFx } from './utils/sound';

type ActiveSection = 'home' | 'arena' | 'leaderboard' | 'classroom' | 'teacher';

const HERO_LAB_IMG = '/src/assets/images/hero_almumtaz_lab_1794806273145.jpg';
const EMBLEM_IMG = '/src/assets/images/emblem_almumtaz_tik_1794806272328.jpg';
const LOGO_DESSA_MENTARI = '/assets/aistudio/Logo_Pendidikan_Dessa_Mentari_6f1f1e2d.png';

const GAME_ORDER: GameType[] = ['quiz', 'flag', 'clue', 'puzzle', 'racing', 'horse'];

function renderGameIcon(type: GameType) {
  const cls = 'h-5 w-5 text-emerald-700';
  switch (type) {
    case 'quiz':
      return <CheckSquare className={cls} />;
    case 'flag':
      return <Globe2 className={cls} />;
    case 'clue':
      return <HelpCircle className={cls} />;
    case 'puzzle':
      return <Puzzle className={cls} />;
    case 'racing':
      return <CarFront className={cls} />;
    case 'horse':
      return <Award className={cls} />;
  }
}

function renderGamePreview(type: GameType) {
  switch (type) {
    case 'quiz':
      return (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>SOAL ACAK UNIK</span>
            <span className="font-bold text-emerald-700">15s</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
            <div className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800">
              A. Enkripsi
            </div>
            <div className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600">
              B. Phishing
            </div>
            <div className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600">
              C. Router
            </div>
            <div className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600">
              D. Firewall
            </div>
          </div>
        </div>
      );
    case 'flag':
      return (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>4 BENUA DUNIA</span>
            <span className="font-bold text-sky-700">LIVE</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
            <div className="rounded border border-slate-200 bg-white py-1.5">
              <div className="h-2.5 w-full bg-red-600" />
              <div className="h-2.5 w-full bg-white" />
              <span className="mt-1 block text-[10px] text-slate-600">Asia</span>
            </div>
            <div className="rounded border border-slate-200 bg-white py-1.5">
              <div className="flex h-5 w-full">
                <span className="flex-1 bg-emerald-700" />
                <span className="flex-1 bg-white" />
                <span className="flex-1 bg-emerald-700" />
              </div>
              <span className="mt-1 block text-[10px] text-slate-600">Afrika</span>
            </div>
            <div className="rounded border border-slate-200 bg-white py-1.5">
              <div className="flex h-5 w-full">
                <span className="flex-1 bg-blue-700" />
                <span className="flex-1 bg-white" />
                <span className="flex-1 bg-red-600" />
              </div>
              <span className="mt-1 block text-[10px] text-slate-600">Eropa</span>
            </div>
            <div className="rounded border border-slate-200 bg-white py-1.5">
              <div className="flex h-5 w-full">
                <span className="flex-1 bg-red-600" />
                <span className="flex-1 bg-white" />
                <span className="flex-1 bg-red-600" />
              </div>
              <span className="mt-1 block text-[10px] text-slate-600">Amerika</span>
            </div>
          </div>
        </div>
      );
    case 'clue':
      return (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>PETUNJUK BERTAHAP</span>
            <span className="font-bold text-amber-700">3 CLUE</span>
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-900">
              1. Mengatur lalu lintas paket data...
            </div>
            <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1 font-mono font-bold text-slate-700">
              <span>R _ U _ E _</span>
              <span className="text-[10px] text-emerald-700">+150 pts</span>
            </div>
          </div>
        </div>
      );
    case 'puzzle':
      return (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>TTS & ALUR LOGIKA</span>
            <span className="font-bold text-emerald-700">KOMPUTASIONAL</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="grid grid-cols-4 gap-0.5 font-mono text-[10px] font-bold">
              {['C', 'P', 'U', ' ', ' ', 'I', ' ', ' ', 'R', 'A', 'M', ' '].map((ch, i) => (
                <span
                  key={i}
                  className={`flex h-5 w-5 items-center justify-center rounded-xs ${
                    ch.trim()
                      ? 'border border-emerald-300 bg-white text-slate-900'
                      : 'bg-slate-200/70'
                  }`}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div className="flex-1 space-y-1 text-[10px] font-semibold text-slate-600">
              <div className="rounded border border-slate-200 bg-white px-2 py-0.5">1. Input Data</div>
              <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                2. Proses Logika
              </div>
            </div>
          </div>
        </div>
      );
    case 'racing':
      return (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3 text-white">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>CODE RACER 2D</span>
            <span className="font-bold text-amber-400">NITRO 2.5x</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs">🏎️</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                <div className="h-full w-4/5 bg-emerald-500" />
              </div>
              <span className="font-mono text-[10px] text-emerald-400">82%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">🤖</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                <div className="h-full w-3/5 bg-amber-400" />
              </div>
              <span className="font-mono text-[10px] text-amber-300">61%</span>
            </div>
          </div>
        </div>
      );
    case 'horse':
      return (
        <div className="mt-4 overflow-hidden rounded-lg border border-emerald-700/40 bg-gradient-to-b from-sky-200 via-emerald-600 to-emerald-800 p-3 text-white">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="rounded bg-slate-900/75 px-1.5 py-0.5 font-bold text-sky-200">
              3D STADION TURF
            </span>
            <span className="rounded bg-amber-400 px-1.5 py-0.5 font-bold text-slate-950">
              TANPA SOAL
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5 rounded bg-emerald-950/35 p-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>🏇 Joki Merah (Kamu)</span>
              <span className="font-mono text-amber-300">72 km/h</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-emerald-950/70">
              <div className="h-full w-4/5 bg-gradient-to-r from-lime-400 to-amber-300" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-emerald-100">
              <span>Lintasan Rumput 1.200m</span>
              <span>Irama Pacu · Sprint</span>
            </div>
          </div>
        </div>
      );
  }
}

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('almumtaz_user');
      return saved ? (JSON.parse(saved) as UserAccount) : null;
    } catch {
      return null;
    }
  });
  const [section, setSection] = useState<ActiveSection>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingLaunch, setPendingLaunch] = useState<{
    gameType: GameType;
    mode: SessionMode;
    roomCode?: string;
    category?: QuestionCategory;
  } | null>(null);

  const [activeGame, setActiveGame] = useState<{
    gameType: GameType;
    mode: SessionMode;
    roomCode?: string;
    category?: QuestionCategory;
  } | null>(null);
  const [activeLobbyCode, setActiveLobbyCode] = useState<string | null>(null);

  const [selectedMode, setSelectedMode] = useState<SessionMode>('homework');
  const [liveRoomCode, setLiveRoomCode] = useState<string>('TIK701');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory>('tik');
  const [muted, setMuted] = useState<boolean>(getSoundMuted());
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [emblemImgFailed, setEmblemImgFailed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch('/api/auth/sync-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: UserAccount } | null) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('almumtaz_user', JSON.stringify(data.user));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user?.role !== 'teacher') {
      setPendingCount(0);
      return;
    }

    let cancelled = false;
    const syncPending = () => {
      fetch('/api/analytics')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: AnalyticsSummary | null) => {
          if (!cancelled && data) {
            setPendingCount(data.pendingStudents?.length || 0);
          }
        })
        .catch(() => {});
    };

    syncPending();

    let wsConnected = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => {
      wsConnected = true;
      ws.send(JSON.stringify({ event: 'dashboard:subscribe' }));
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as { event: string; payload?: AnalyticsSummary };
        if (msg.event === 'dashboard:update' && msg.payload && !cancelled) {
          setPendingCount(msg.payload.pendingStudents?.length || 0);
        }
      } catch {
        // Ignore parse error
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
      syncPending();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      ws.close();
    };
  }, [user?.id, user?.role]);

  function handleUserSuccess(loggedUser: UserAccount) {
    setUser(loggedUser);
    localStorage.setItem('almumtaz_user', JSON.stringify(loggedUser));

    if (pendingLaunch) {
      setActiveGame(pendingLaunch);
      setPendingLaunch(null);
    } else if (loggedUser.role === 'teacher') {
      setSection('teacher');
    } else {
      setSection('arena');
    }
  }

  function handleUserUpdate(updated: UserAccount) {
    setUser(updated);
    localStorage.setItem('almumtaz_user', JSON.stringify(updated));
  }

  function handleLogout() {
    soundFx.click();
    setUser(null);
    localStorage.removeItem('almumtaz_user');
    setActiveGame(null);
    setActiveLobbyCode(null);
    setSection('home');
  }

  function launchGame(
    gameType: GameType,
    mode: SessionMode,
    roomCode?: string,
    category: QuestionCategory = selectedCategory
  ) {
    soundFx.click();
    if (!user) {
      setPendingLaunch({ gameType, mode, roomCode, category });
      setAuthOpen(true);
      return;
    }
    setActiveLobbyCode(null);
    setActiveGame({ gameType, mode, roomCode, category });
  }

  function openLobby(roomCode: string) {
    soundFx.click();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setActiveGame(null);
    setActiveLobbyCode(roomCode.toUpperCase());
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  }

  function handleNavClick(target: ActiveSection) {
    soundFx.click();
    setActiveGame(null);
    setActiveLobbyCode(null);
    if ((target === 'classroom' || target === 'teacher') && !user) {
      setAuthOpen(true);
      return;
    }
    if (target === 'teacher' && user && user.role !== 'teacher') {
      // Allow students to see classroom or prompt teacher login
      setAuthOpen(true);
      return;
    }
    setSection(target);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left font-display text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <img
              src={LOGO_DESSA_MENTARI}
              alt="Dessa Mentari Education"
              className="h-8 w-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
            />
            <span>Dessa Mentari Education</span>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                section === 'home' && !activeGame ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('arena')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                section === 'arena' && !activeGame ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              Arena Game
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('leaderboard')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                section === 'leaderboard' && !activeGame ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              Peringkat
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('classroom')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                section === 'classroom' && !activeGame ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              Ruang Kelas
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('teacher')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                section === 'teacher' && !activeGame ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              <span>Dasbor Guru</span>
              {user?.role === 'teacher' && pendingCount > 0 && (
                <span className="rounded-md bg-amber-500 px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-white tabular-nums">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <AvatarBadge
                  photo={user.avatarPhoto}
                  icon={user.avatarIcon}
                  color={user.avatarColor}
                  alt={user.fullName}
                  sizeClass="h-6 w-6"
                  textClass="text-xs"
                  roundedClass="rounded-md"
                />
                <span>Keluar ({user.fullName.split(' ')[0]})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:py-10">
        {(activeLobbyCode || activeGame) && user ? (
          <MandatoryCameraGate
            user={user}
            roomCode={activeLobbyCode || activeGame?.roomCode}
            required={Boolean(activeGame) || user.role !== 'teacher'}
            contextLabel={
              activeGame
                ? GAME_META[activeGame.gameType]?.title || 'Permainan'
                : 'Ruang Tunggu Live'
            }
            onExit={() => {
              setActiveLobbyCode(null);
              setActiveGame(null);
            }}
          >
            {activeLobbyCode ? (
              <LobbyRoom
                roomCode={activeLobbyCode}
                user={user}
                onExit={() => setActiveLobbyCode(null)}
                onUserUpdate={handleUserUpdate}
                onSessionStarted={(sess) => {
                  setActiveLobbyCode(null);
                  launchGame(sess.gameType, sess.mode, sess.code, sess.category || 'tik');
                }}
              />
            ) : activeGame ? (
              <>
                {activeGame.gameType === 'quiz' && (
                  <QuizGame
                    user={user}
                    mode={activeGame.mode}
                    category={activeGame.category || selectedCategory}
                    roomCode={activeGame.roomCode}
                    onExit={() => setActiveGame(null)}
                  />
                )}
                {activeGame.gameType === 'flag' && (
                  <FlagQuizGame
                    user={user}
                    mode={activeGame.mode}
                    category={activeGame.category || 'umum'}
                    roomCode={activeGame.roomCode}
                    onExit={() => setActiveGame(null)}
                  />
                )}
                {activeGame.gameType === 'clue' && (
                  <ClueGame
                    user={user}
                    mode={activeGame.mode}
                    category={activeGame.category || selectedCategory}
                    roomCode={activeGame.roomCode}
                    onExit={() => setActiveGame(null)}
                  />
                )}
                {activeGame.gameType === 'puzzle' && (
                  <PuzzleGame
                    user={user}
                    mode={activeGame.mode}
                    roomCode={activeGame.roomCode}
                    onExit={() => setActiveGame(null)}
                  />
                )}
                {activeGame.gameType === 'racing' && (
                  <CodeRacerGame
                    user={user}
                    mode={activeGame.mode}
                    category={activeGame.category || selectedCategory}
                    roomCode={activeGame.roomCode}
                    onExit={() => setActiveGame(null)}
                  />
                )}
                {activeGame.gameType === 'horse' && (
                  <HorseRacingGame
                    user={user}
                    mode={activeGame.mode}
                    roomCode={activeGame.roomCode}
                    onExit={() => setActiveGame(null)}
                  />
                )}
              </>
            ) : null}
          </MandatoryCameraGate>
        ) : section === 'leaderboard' ? (
          <Leaderboard currentUser={user} />
        ) : section === 'teacher' && user?.role === 'teacher' ? (
          <TeacherDashboard
            user={user}
            onUserUpdate={handleUserUpdate}
            onLaunchGame={launchGame}
            onOpenLobby={openLobby}
          />
        ) : section === 'classroom' && user ? (
          <StudentHub
            user={user}
            onJoinSession={launchGame}
            onEnterLobby={openLobby}
            onUserUpdate={handleUserUpdate}
          />
        ) : (
          <div className="space-y-12">
            {/* Hero Section on Home */}
            {section === 'home' && (
              <section className="space-y-8">
                <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
                  <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-8 lg:col-span-6 lg:p-10">
                    <p className="text-xs font-semibold text-emerald-700">
                      SMP IT Al Mumtaz YPII · Mata Pelajaran TIK
                    </p>
                    <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      Belajar Teknologi dengan Cerdas, Kompetitif, dan Beradab Islami
                    </h1>
                      <p className="mt-4 text-base leading-relaxed text-slate-600">
                      Platform game pembelajaran interaktif khusus siswa kelas VII–IX SMP IT Al
                      Mumtaz YPII. Kuasai perangkat keras, keamanan siber, logika pemrograman, dan
                      etika tabayyun digital melalui enam wahana permainan edukatif & ketangkasan terintegrasi.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSection('arena')}
                        className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
                      >
                        Jelajahi 6 Wahana Game
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavClick('classroom')}
                        className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                      >
                        Masuk Kode Room
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-8 lg:col-span-6 lg:p-12 text-center shadow-xs">
                    <img
                      src={LOGO_DESSA_MENTARI}
                      alt="Dessa Mentari Education Logo"
                      className="h-44 w-44 object-contain rounded-2xl shadow-md bg-white p-3 border border-amber-300"
                    />
                    <h2 className="mt-4 font-display text-2xl font-extrabold text-slate-900">
                      Dessa Mentari Education
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                      Tempat Belajar Terpercaya · Platform Pembelajaran Interaktif
                    </p>
                  </div>
                </div>

                {/* 4-column summary strip */}
                <div className="grid grid-cols-2 gap-4 border-y border-slate-200 py-6 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Koleksi Permainan</p>
                    <p className="mt-1 font-display text-lg font-bold text-slate-900">
                      6 Mode Interaktif
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Sistem Sesi</p>
                    <p className="mt-1 font-display text-lg font-bold text-slate-900">
                      Lobby Live & Mandiri
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Integrasi Karakter</p>
                    <p className="mt-1 font-display text-lg font-bold text-slate-900">
                      Amanah & Tabayyun Digital
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pemantauan Guru</p>
                    <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                      Dasbor Analitik Real-Time
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Arena 6 Game Pembelajaran TIK & Umum */}
            <section id="arena-section" className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-700">
                    Kurikulum TIK, Umum & Geografi Dunia · Wajib On Camera Real-Time
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Enam Wahana Permainan & Balapan
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                    {(['tik', 'umum', 'campuran'] as QuestionCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat === 'tik' ? 'TIK' : cat === 'umum' ? 'Umum' : 'Campuran'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMode('homework')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        selectedMode === 'homework'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mode Mandiri
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMode('live')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        selectedMode === 'live'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mode Live ({liveRoomCode.trim().toUpperCase() || 'TIK701'})
                    </button>
                  </div>

                  {selectedMode === 'live' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        aria-label="Kode Room Kelas Live"
                        value={liveRoomCode}
                        onChange={(e) => setLiveRoomCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        placeholder="Kode Room"
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-bold uppercase text-slate-900 outline-none focus:border-emerald-700"
                      />
                      <button
                        type="button"
                        onClick={() => openLobby(liveRoomCode.trim() || 'TIK701')}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                      >
                        Buka Lobby
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={muted ? 'Aktifkan efek suara' : 'Bisukan efek suara'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {muted ? 'Suara Mati' : 'Suara Aktif'}
                  </button>
                </div>
              </div>

              {selectedMode === 'live' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
                  <p className="font-medium">
                    <strong>Mode Kelas Bersama Aktif ({liveRoomCode.trim().toUpperCase() || 'TIK701'}):</strong>{' '}
                    Semua 7 wahana game di bawah tersinkronisasi real-time antar HP/laptop siswa secara langsung.
                  </p>
                  <button
                    type="button"
                    onClick={() => openLobby(liveRoomCode.trim() || 'TIK701')}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800"
                  >
                    Masuk Ruang Tunggu Bersama
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {GAME_ORDER.map((type) => {
                  const meta = GAME_META[type];
                  return (
                    <article
                      key={type}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-emerald-600"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">
                            Game {meta.code} · {meta.estimatedMinutes} Menit
                          </span>
                          {renderGameIcon(type)}
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-slate-900">{meta.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {meta.subtitle}
                        </p>
                        {renderGamePreview(type)}
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">{meta.topicFocus}</p>
                        <button
                          type="button"
                          onClick={() =>
                            launchGame(
                              type,
                              selectedMode,
                              selectedMode === 'live'
                                ? liveRoomCode.trim().toUpperCase() || 'TIK701'
                                : undefined,
                              selectedCategory
                            )
                          }
                          className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          {user
                            ? selectedMode === 'live'
                              ? `Main Bersama (${liveRoomCode.trim().toUpperCase() || 'TIK701'})`
                              : 'Mainkan Sekarang'
                            : 'Masuk & Mainkan'}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* Card 6: Institutional Context & Quick Access to Classroom / Teacher */}
                <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
                  <div className="flex items-start gap-4">
                    <img
                      src={LOGO_DESSA_MENTARI}
                      alt="Dessa Mentari Education"
                      className="h-14 w-14 shrink-0 rounded-lg object-contain bg-white p-1"
                    />
                    <div>
                      <p className="text-xs font-semibold text-amber-400">
                        Dessa Mentari Education
                      </p>
                      <h3 className="mt-1 text-lg font-bold">Ruang Kelas & Dasbor Pengajar</h3>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-300">
                    Seluruh skor permainan, kecepatan Code Racer, dan analisis pemahaman konsep
                    otomatis terpusat di dasbor Ustadz/Ustadzah secara real-time.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleNavClick('classroom')}
                      className="rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 whitespace-nowrap"
                    >
                      Ruang Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('teacher')}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700 whitespace-nowrap"
                    >
                      Dasbor Guru
                    </button>
                  </div>
                </article>
              </div>
            </section>

            {section === 'home' && (
              <Leaderboard
                currentUser={user}
                compact
                onViewFull={() => handleNavClick('leaderboard')}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile bottom nav for quick reachability within 15% viewport height cap */}
      <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-2 md:hidden">
        <div className="grid grid-cols-5 gap-1 text-center text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className={`rounded-md py-2 ${section === 'home' ? 'text-emerald-700 font-bold' : ''}`}
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('arena')}
            className={`rounded-md py-2 ${section === 'arena' ? 'text-emerald-700 font-bold' : ''}`}
          >
            Arena
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('leaderboard')}
            className={`rounded-md py-2 ${section === 'leaderboard' ? 'text-emerald-700 font-bold' : ''}`}
          >
            Peringkat
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('classroom')}
            className={`rounded-md py-2 ${section === 'classroom' ? 'text-emerald-700 font-bold' : ''}`}
          >
            Kelas
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('teacher')}
            className={`rounded-md py-2 ${section === 'teacher' ? 'text-emerald-700 font-bold' : ''}`}
          >
            {user?.role === 'teacher' && pendingCount > 0 ? `Guru (${pendingCount})` : 'Guru'}
          </button>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        SMP IT Al Mumtaz YPII · Platform Pembelajaran TIK & Adab Digital
      </footer>

      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingLaunch(null);
        }}
        onSuccess={handleUserSuccess}
      />
    </div>
  );
}

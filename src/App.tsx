import React, { useState } from 'react';
import {
  Award,
  CarFront,
  CheckSquare,
  Globe2,
  HelpCircle,
  LayoutGrid,
  Puzzle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { ClueGame } from './components/games/ClueGame';
import { CodeRacerGame } from './components/games/CodeRacerGame';
import { FlagQuizGame } from './components/games/FlagQuizGame';
import { MatchingGame } from './components/games/MatchingGame';
import { PuzzleGame } from './components/games/PuzzleGame';
import { QuizGame } from './components/games/QuizGame';
import { Leaderboard } from './components/Leaderboard';
import { LobbyRoom } from './components/LobbyRoom';
import { StudentHub } from './components/StudentHub';
import { TeacherDashboard } from './components/TeacherDashboard';
import { GAME_META } from './data/tikCurriculum';
import type { GameType, QuestionCategory, SessionMode, UserAccount } from './types';
import { getSoundMuted, setSoundMuted, soundFx } from './utils/sound';

type ActiveSection = 'home' | 'arena' | 'leaderboard' | 'classroom' | 'teacher';

const HERO_LAB_IMG = '/src/assets/images/hero_almumtaz_lab_1794806273145.jpg';
const EMBLEM_IMG = '/src/assets/images/emblem_almumtaz_tik_1794806272328.jpg';

const GAME_ORDER: GameType[] = ['quiz', 'flag', 'matching', 'clue', 'puzzle', 'racing'];

function renderGameIcon(type: GameType) {
  const cls = 'h-5 w-5 text-emerald-700';
  switch (type) {
    case 'quiz':
      return <CheckSquare className={cls} />;
    case 'flag':
      return <Globe2 className={cls} />;
    case 'matching':
      return <LayoutGrid className={cls} />;
    case 'clue':
      return <HelpCircle className={cls} />;
    case 'puzzle':
      return <Puzzle className={cls} />;
    case 'racing':
      return <CarFront className={cls} />;
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
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory>('tik');
  const [muted, setMuted] = useState<boolean>(getSoundMuted());
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [emblemImgFailed, setEmblemImgFailed] = useState(false);

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
            className="text-left font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Al Mumtaz TechQuest
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
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                section === 'teacher' && !activeGame ? 'text-emerald-700 font-semibold' : ''
              }`}
            >
              Dasbor Guru
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                Keluar ({user.fullName.split(' ')[0]})
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
        {activeLobbyCode && user ? (
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
        ) : activeGame && user ? (
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
            {activeGame.gameType === 'matching' && (
              <MatchingGame
                user={user}
                mode={activeGame.mode}
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
          </>
        ) : section === 'leaderboard' ? (
          <Leaderboard currentUser={user} />
        ) : section === 'teacher' && user?.role === 'teacher' ? (
          <TeacherDashboard user={user} onLaunchGame={launchGame} onOpenLobby={openLobby} />
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
                      etika tabayyun digital melalui lima permainan edukatif terintegrasi.
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

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 lg:col-span-6">
                    {!heroImgFailed ? (
                      <img
                        src={HERO_LAB_IMG}
                        alt="Laboratorium Komputer dan Studio Pembelajaran Digital SMP IT Al Mumtaz YPII"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImgFailed(true)}
                        className="h-72 w-full object-cover lg:h-full"
                      />
                    ) : (
                      <div className="flex h-72 w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-900 to-slate-900 p-8 text-center text-white lg:h-full">
                        <Award className="h-10 w-10 text-amber-400" />
                        <p className="mt-3 text-lg font-bold">Lab TIK SMP IT Al Mumtaz YPII</p>
                      </div>
                    )}
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
                    Kurikulum TIK, Umum & Geografi Dunia
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Enam Wahana Permainan Edukatif
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
                      Mode Live (TIK701)
                    </button>
                  </div>

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
                      </div>

                      <div className="mt-6 border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">{meta.topicFocus}</p>
                        <button
                          type="button"
                          onClick={() =>
                            launchGame(
                              type,
                              selectedMode,
                              selectedMode === 'live' ? 'TIK701' : undefined,
                              selectedCategory
                            )
                          }
                          className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          {user ? 'Mainkan Sekarang' : 'Masuk & Mainkan'}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* Card 6: Institutional Context & Quick Access to Classroom / Teacher */}
                <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
                  <div className="flex items-start gap-4">
                    {!emblemImgFailed ? (
                      <img
                        src={EMBLEM_IMG}
                        alt="Emblem TIK SMP IT Al Mumtaz YPII"
                        referrerPolicy="no-referrer"
                        onError={() => setEmblemImgFailed(true)}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover bg-white"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-800">
                        <Award className="h-7 w-7 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-amber-400">
                        SMP IT Al Mumtaz YPII
                      </p>
                      <h3 className="mt-1 text-lg font-bold">Ruang Kelas & Dasbor Guru</h3>
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
            Guru
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

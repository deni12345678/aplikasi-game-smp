import fs from 'fs';
import path from 'path';
import express, { type Express } from 'express';
import type {
  AccountStatus,
  AnalyticsSummary,
  ClassRoom,
  CustomQuestion,
  GameSession,
  GameType,
  LeaderboardEntry,
  LiveRaceParticipant,
  QuestionCategory,
  QuestionMode,
  ScoreRecord,
  SessionMode,
  UserAccount,
} from '../src/types';

export interface StoredUser extends UserAccount {
  password: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  scores: ScoreRecord[];
  sessions: GameSession[];
  customQuestions?: CustomQuestion[];
}

export interface RuntimeHooks {
  onRoomState?: (code: string, session: GameSession) => void;
  onDashboardUpdate?: (analytics: AnalyticsSummary) => void;
}

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'almumtaz-data')
  : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const AVATAR_COLORS = ['#047857', '#0284C7', '#D97706', '#7C3AED', '#DC2626', '#0D9488'];

export function createSeedDatabase(): DatabaseSchema {
  const now = Date.now();
  const users: StoredUser[] = [
    {
      id: 'teacher-1',
      nisOrEmail: 'guru@almumtaz-ypii.sch.id',
      fullName: 'Deni Santoso, M.M',
      className: 'Guru',
      role: 'teacher',
      avatarColor: '#047857',
      avatarIcon: '🧑‍🏫',
      status: 'approved',
      createdAt: new Date(now - 86400000 * 14).toISOString(),
      password: 'guru',
    },
  ];

  const scores: ScoreRecord[] = [];

  const sessions: GameSession[] = [
    {
      code: 'TIK701',
      title: 'Balapan Cepat Bab Jaringan & Adab Digital',
      gameType: 'racing',
      mode: 'live',
      category: 'tik',
      questionMode: 'varied',
      roundSeed: 'seed-tik701',
      createdBy: 'Deni Santoso, M.M',
      status: 'active',
      targetClass: 'Semua Kelas',
      createdAt: new Date(now - 3600000 * 6).toISOString(),
      participants: [],
    },
    {
      code: 'PR0802',
      title: 'Tugas Mandiri: Keamanan Siber & Wawasan Umum',
      gameType: 'quiz',
      mode: 'homework',
      category: 'campuran',
      questionMode: 'varied',
      roundSeed: 'seed-pr0802',
      createdBy: 'Deni Santoso, M.M',
      status: 'active',
      targetClass: 'VII-A & VII-B',
      createdAt: new Date(now - 3600000 * 4).toISOString(),
      participants: [],
    },
  ];

  return { users, scores, sessions, customQuestions: [] };
}

export function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const seed = createSeedDatabase();
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.users || !parsed.scores || !parsed.sessions) {
      throw new Error('Malformed DB');
    }
    if (!Array.isArray(parsed.customQuestions)) {
      parsed.customQuestions = [];
    }
    return parsed;
  } catch {
    return createSeedDatabase();
  }
}

export function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Graceful fallback if filesystem is read-only
  }
}

export function sanitizeUser(u: StoredUser): UserAccount {
  const { password: _pw, ...safe } = u;
  return {
    ...safe,
    avatarIcon: safe.avatarIcon || (safe.role === 'teacher' ? '🧑‍🏫' : '🎓'),
    status: safe.status || 'approved',
  };
}

export function buildLeaderboard(
  db: DatabaseSchema,
  classFilter?: string,
  limit = 10
): LeaderboardEntry[] {
  const userMap = new Map<string, StoredUser>();
  for (const u of db.users) {
    if (u.role === 'student') {
      userMap.set(u.id, u);
    }
  }

  const aggMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      className: ClassRoom;
      avatarColor: string;
      avatarIcon: string;
      avatarPhoto?: string;
      totalScore: number;
      gamesPlayed: number;
      correctSum: number;
      questionSum: number;
      bestSingleScore: number;
      gameTypes: Set<GameType>;
    }
  >();

  for (const sc of db.scores) {
    if (classFilter && classFilter !== 'ALL' && sc.className !== classFilter) {
      continue;
    }
    const existing = aggMap.get(sc.studentId);
    const userObj = userMap.get(sc.studentId);
    if (!existing) {
      aggMap.set(sc.studentId, {
        studentId: sc.studentId,
        studentName: userObj?.fullName || sc.studentName,
        className: (userObj?.className || sc.className) as ClassRoom,
        avatarColor: userObj?.avatarColor || '#047857',
        avatarIcon: userObj?.avatarIcon || '🎓',
        avatarPhoto: userObj?.avatarPhoto,
        totalScore: sc.score,
        gamesPlayed: 1,
        correctSum: sc.correctCount,
        questionSum: sc.totalQuestions,
        bestSingleScore: sc.score,
        gameTypes: new Set([sc.gameType]),
      });
    } else {
      existing.totalScore += sc.score;
      existing.gamesPlayed += 1;
      existing.correctSum += sc.correctCount;
      existing.questionSum += sc.totalQuestions;
      existing.bestSingleScore = Math.max(existing.bestSingleScore, sc.score);
      existing.gameTypes.add(sc.gameType);
    }
  }

  const sorted = Array.from(aggMap.values())
    .map((item) => ({
      studentId: item.studentId,
      studentName: item.studentName,
      className: item.className,
      avatarColor: item.avatarColor,
      avatarIcon: item.avatarIcon,
      avatarPhoto: item.avatarPhoto,
      totalScore: item.totalScore,
      gamesPlayed: item.gamesPlayed,
      avgAccuracyPct:
        item.questionSum > 0 ? Math.round((item.correctSum / item.questionSum) * 100) : 0,
      bestSingleScore: item.bestSingleScore,
      gameTypesPlayed: Array.from(item.gameTypes),
    }))
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        b.avgAccuracyPct - a.avgAccuracyPct ||
        b.gamesPlayed - a.gamesPlayed
    );

  return sorted.slice(0, limit).map((entry, idx) => ({
    rank: idx + 1,
    ...entry,
  }));
}

export function buildAnalytics(db: DatabaseSchema): AnalyticsSummary {
  const students = db.users
    .filter((u) => u.role === 'student' && (u.status || 'approved') === 'approved')
    .map(sanitizeUser);
  const pendingStudents = db.users
    .filter((u) => u.role === 'student' && u.status === 'pending')
    .map(sanitizeUser)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalGamesPlayed = db.scores.length;
  const averageScore =
    totalGamesPlayed > 0
      ? Math.round(db.scores.reduce((acc, s) => acc + s.score, 0) / totalGamesPlayed)
      : 0;

  let totalQ = 0;
  let totalCorrect = 0;
  const topicMap = new Map<string, { total: number; correct: number }>();
  const classMap = new Map<string, { attempts: number; sumScore: number }>();

  for (const sc of db.scores) {
    totalQ += sc.totalQuestions;
    totalCorrect += sc.correctCount;

    const cEntry = classMap.get(sc.className) ?? { attempts: 0, sumScore: 0 };
    cEntry.attempts += 1;
    cEntry.sumScore += sc.score;
    classMap.set(sc.className, cEntry);

    for (const ans of sc.answers ?? []) {
      const tEntry = topicMap.get(ans.topic) ?? { total: 0, correct: 0 };
      tEntry.total += 1;
      if (ans.isCorrect) tEntry.correct += 1;
      topicMap.set(ans.topic, tEntry);
    }
  }

  const averageAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  const topicAccuracy = Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    totalAttempts: data.total,
    correctAttempts: data.correct,
    accuracyPct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }));

  const classSummary = Array.from(classMap.entries()).map(([className, data]) => ({
    className,
    attempts: data.attempts,
    avgScore: Math.round(data.sumScore / data.attempts),
  }));

  const allUsers = db.users
    .map(sanitizeUser)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'teacher' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return {
    totalStudents: students.length,
    totalGamesPlayed,
    averageScore,
    averageAccuracy,
    recentScores: [...db.scores].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    students,
    pendingStudents,
    allUsers,
    customQuestions: db.customQuestions || [],
    sessions: db.sessions,
    leaderboard: buildLeaderboard(db, 'ALL', 100),
    topicAccuracy,
    classSummary,
  };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function createAppRuntime(hooks: RuntimeHooks = {}): {
  app: Express;
  db: DatabaseSchema;
} {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  const db = loadDatabase();

  const notifyRoom = (code: string, session: GameSession) => {
    hooks.onRoomState?.(code, session);
  };
  const notifyDashboard = () => {
    hooks.onDashboardUpdate?.(buildAnalytics(db));
  };

  // --- REST API ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, platform: process.env.VERCEL ? 'vercel' : 'node' });
  });

  app.post('/api/auth/register', (req, res) => {
    const { nisOrEmail, fullName, className, password, avatarIcon, avatarPhoto } = req.body as {
      nisOrEmail?: string;
      fullName?: string;
      className?: ClassRoom;
      password?: string;
      avatarIcon?: string;
      avatarPhoto?: string;
    };

    if (!nisOrEmail?.trim() || !fullName?.trim() || !className || !password?.trim()) {
      return res.status(400).json({ error: 'Semua kolom pendaftaran wajib diisi.' });
    }

    if (
      avatarPhoto &&
      (!avatarPhoto.startsWith('data:image/') || avatarPhoto.length > 350_000)
    ) {
      return res.status(400).json({ error: 'Format atau ukuran foto profil tidak valid.' });
    }

    const normalized = nisOrEmail.trim().toLowerCase();
    const existingUser = db.users.find((u) => u.nisOrEmail.toLowerCase() === normalized);
    if (existingUser) {
      if (existingUser.status === 'pending') {
        return res
          .status(409)
          .json({ error: 'NIS/email ini sudah terdaftar dan sedang menunggu ACC Admin.' });
      }
      return res
        .status(409)
        .json({ error: 'NIS atau email sekolah ini sudah terdaftar. Silakan masuk.' });
    }

    const newUser: StoredUser = {
      id: `stu-${Date.now()}`,
      nisOrEmail: nisOrEmail.trim(),
      fullName: fullName.trim(),
      className,
      role: 'student',
      avatarColor: AVATAR_COLORS[db.users.length % AVATAR_COLORS.length],
      avatarIcon: avatarIcon?.trim() || '🤖',
      ...(avatarPhoto ? { avatarPhoto } : {}),
      status: 'pending',
      createdAt: new Date().toISOString(),
      password: password.trim(),
    };

    db.users.push(newUser);
    saveDatabase(db);
    notifyDashboard();

    return res.status(201).json({
      pendingApproval: true,
      message:
        'Pendaftaran terkirim! Akun Anda menunggu persetujuan (ACC) dari Admin Deni Santoso, M.M sebelum dapat masuk.',
      user: sanitizeUser(newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { nisOrEmail, password } = req.body as { nisOrEmail?: string; password?: string };
    if (!nisOrEmail?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Masukkan NIS/email sekolah dan kata sandi.' });
    }

    const normalized = nisOrEmail.trim().toLowerCase();
    const found = db.users.find(
      (u) =>
        (u.nisOrEmail.toLowerCase() === normalized ||
          (u.id === 'teacher-1' && normalized === 'santosodeni3@gmail.com')) &&
        u.password === password.trim()
    );

    if (!found) {
      return res.status(401).json({ error: 'NIS/email atau kata sandi tidak cocok.' });
    }

    const status = found.status || 'approved';
    if (status === 'pending') {
      return res.status(403).json({
        error:
          'Akun Anda masih menunggu persetujuan (ACC) dari Admin (Deni Santoso, M.M). Silakan coba lagi setelah disetujui.',
      });
    }
    if (status === 'rejected') {
      return res.status(403).json({
        error: 'Pendaftaran akun ini ditolak oleh Admin. Silakan hubungi guru TIK.',
      });
    }

    return res.json({ user: sanitizeUser(found) });
  });

  app.patch('/api/users/:id/approval', (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status?: AccountStatus };
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status persetujuan harus approved atau rejected.' });
    }
    const found = db.users.find((u) => u.id === id && u.role === 'student');
    if (!found) {
      return res.status(404).json({ error: 'Akun siswa tidak ditemukan.' });
    }
    found.status = status;
    saveDatabase(db);
    notifyDashboard();
    return res.json({ user: sanitizeUser(found) });
  });

  app.post('/api/users', (req, res) => {
    const { nisOrEmail, fullName, className, role, password, avatarIcon, status } = req.body as {
      nisOrEmail?: string;
      fullName?: string;
      className?: ClassRoom;
      role?: 'student' | 'teacher';
      password?: string;
      avatarIcon?: string;
      status?: AccountStatus;
    };

    if (!nisOrEmail?.trim() || !fullName?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Nama lengkap, NIS/email, dan kata sandi wajib diisi.' });
    }
    if (password.trim().length < 4) {
      return res.status(400).json({ error: 'Kata sandi minimal 4 karakter.' });
    }

    const targetRole = role === 'teacher' ? 'teacher' : 'student';
    const targetClass: ClassRoom =
      targetRole === 'teacher' ? 'Guru' : className && className !== 'Guru' ? className : 'VII-A';

    const normalized = nisOrEmail.trim().toLowerCase();
    const duplicate = db.users.find((u) => u.nisOrEmail.toLowerCase() === normalized);
    if (duplicate) {
      return res.status(409).json({ error: 'NIS atau email tersebut sudah digunakan oleh akun lain.' });
    }

    const newUser: StoredUser = {
      id: `${targetRole === 'teacher' ? 'teacher' : 'stu'}-${Date.now()}`,
      nisOrEmail: nisOrEmail.trim(),
      fullName: fullName.trim(),
      className: targetClass,
      role: targetRole,
      avatarColor: AVATAR_COLORS[db.users.length % AVATAR_COLORS.length],
      avatarIcon: avatarIcon?.trim() || (targetRole === 'teacher' ? '🧑‍🏫' : '🎓'),
      status: status || 'approved',
      createdAt: new Date().toISOString(),
      password: password.trim(),
    };

    db.users.push(newUser);
    saveDatabase(db);
    notifyDashboard();
    return res.status(201).json({ user: sanitizeUser(newUser) });
  });

  app.patch('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { nisOrEmail, fullName, className, role, status, password, avatarIcon } = req.body as {
      nisOrEmail?: string;
      fullName?: string;
      className?: ClassRoom;
      role?: 'student' | 'teacher';
      status?: AccountStatus;
      password?: string;
      avatarIcon?: string;
    };

    const found = db.users.find((u) => u.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
    }

    if (nisOrEmail !== undefined) {
      const trimmed = nisOrEmail.trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'NIS atau email tidak boleh kosong.' });
      }
      const normalized = trimmed.toLowerCase();
      const duplicate = db.users.find(
        (u) => u.id !== id && u.nisOrEmail.toLowerCase() === normalized
      );
      if (duplicate) {
        return res.status(409).json({ error: 'NIS atau email sudah dipakai oleh akun lain.' });
      }
      found.nisOrEmail = trimmed;
    }

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({ error: 'Nama lengkap tidak boleh kosong.' });
      }
      found.fullName = fullName.trim();
    }

    if (role === 'student' || role === 'teacher') {
      if (id === 'teacher-1' && role !== 'teacher') {
        return res.status(400).json({ error: 'Akun admin utama tidak dapat diubah menjadi siswa.' });
      }
      found.role = role;
      if (role === 'teacher') {
        found.className = 'Guru';
      } else if (className && className !== 'Guru') {
        found.className = className;
      } else if (found.className === 'Guru') {
        found.className = 'VII-A';
      }
    } else if (className !== undefined && found.role === 'student' && className !== 'Guru') {
      found.className = className;
    }

    if (status === 'approved' || status === 'pending' || status === 'rejected') {
      if (id === 'teacher-1' && status !== 'approved') {
        return res.status(400).json({ error: 'Akun admin utama harus tetap aktif.' });
      }
      found.status = status;
    }

    if (password !== undefined && password.trim().length > 0) {
      if (password.trim().length < 4) {
        return res.status(400).json({ error: 'Kata sandi baru minimal 4 karakter.' });
      }
      found.password = password.trim();
    }

    if (avatarIcon?.trim()) {
      found.avatarIcon = avatarIcon.trim();
    }

    // Sync updated identity into active sessions
    for (const sess of db.sessions) {
      const pIdx = sess.participants.findIndex((p) => p.studentId === id);
      if (pIdx !== -1) {
        sess.participants[pIdx] = {
          ...sess.participants[pIdx],
          studentName: found.fullName,
          className: found.className,
          avatarIcon: found.avatarIcon,
        };
        notifyRoom(sess.code, sess);
      }
    }

    saveDatabase(db);
    notifyDashboard();
    return res.json({ user: sanitizeUser(found) });
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    if (id === 'teacher-1') {
      return res.status(400).json({ error: 'Akun admin utama tidak dapat dihapus.' });
    }
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
    }
    const [removed] = db.users.splice(idx, 1);
    for (const sess of db.sessions) {
      const before = sess.participants.length;
      sess.participants = sess.participants.filter((p) => p.studentId !== id);
      if (sess.participants.length !== before) {
        notifyRoom(sess.code, sess);
      }
    }
    saveDatabase(db);
    notifyDashboard();
    return res.json({ ok: true, deletedUser: sanitizeUser(removed) });
  });

  app.patch('/api/users/:id/avatar', (req, res) => {
    const { id } = req.params;
    const { avatarIcon, avatarPhoto } = req.body as {
      avatarIcon?: string;
      avatarPhoto?: string | null;
    };

    if (!avatarIcon?.trim() && avatarPhoto === undefined) {
      return res.status(400).json({ error: 'Pilih ikon avatar atau unggah foto profil.' });
    }

    if (
      typeof avatarPhoto === 'string' &&
      (!avatarPhoto.startsWith('data:image/') || avatarPhoto.length > 350_000)
    ) {
      return res.status(400).json({ error: 'Format atau ukuran foto terlalu besar.' });
    }

    const found = db.users.find((u) => u.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
    }

    if (avatarIcon?.trim()) {
      found.avatarIcon = avatarIcon.trim();
    }
    if (avatarPhoto === null) {
      delete found.avatarPhoto;
    } else if (typeof avatarPhoto === 'string') {
      found.avatarPhoto = avatarPhoto;
    }

    for (const sess of db.sessions) {
      const pIdx = sess.participants.findIndex((p) => p.studentId === id);
      if (pIdx !== -1) {
        sess.participants[pIdx] = {
          ...sess.participants[pIdx],
          avatarIcon: found.avatarIcon,
          avatarPhoto: found.avatarPhoto,
        };
        notifyRoom(sess.code, sess);
      }
    }
    saveDatabase(db);
    notifyDashboard();
    return res.json({ user: sanitizeUser(found) });
  });

  app.get('/api/sessions', (_req, res) => {
    res.json({ sessions: db.sessions });
  });

  app.get('/api/sessions/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const session = db.sessions.find((s) => s.code === code);
    if (!session) {
      return res.status(404).json({ error: 'Kode room tidak ditemukan.' });
    }
    return res.json({ session });
  });

  app.post('/api/sessions', (req, res) => {
    const {
      title,
      gameType,
      mode,
      category,
      questionMode,
      targetClass,
      createdBy,
      startInLobby,
    } = req.body as {
      title?: string;
      gameType?: GameType;
      mode?: SessionMode;
      category?: QuestionCategory;
      questionMode?: QuestionMode;
      targetClass?: string;
      createdBy?: string;
      startInLobby?: boolean;
    };

    if (!title?.trim() || !gameType || !mode) {
      return res.status(400).json({ error: 'Judul sesi, jenis game, dan mode wajib diisi.' });
    }

    const newSession: GameSession = {
      code: generateRoomCode(),
      title: title.trim(),
      gameType,
      mode,
      category: category || 'tik',
      questionMode: questionMode || 'varied',
      roundSeed: `r-${Date.now()}`,
      createdBy: createdBy || 'Deni Santoso, M.M',
      status: startInLobby ? 'waiting' : 'active',
      targetClass: targetClass || 'Semua Kelas',
      createdAt: new Date().toISOString(),
      participants: [],
    };

    db.sessions.unshift(newSession);
    saveDatabase(db);
    notifyDashboard();

    return res.status(201).json({ session: newSession });
  });

  app.patch('/api/sessions/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const session = db.sessions.find((s) => s.code === code);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }
    const { status, category, gameType, questionMode, resetParticipants } = req.body as {
      status?: 'waiting' | 'active' | 'finished';
      category?: QuestionCategory;
      gameType?: GameType;
      questionMode?: QuestionMode;
      resetParticipants?: boolean;
    };
    if (status) session.status = status;
    if (category) session.category = category;
    if (gameType) session.gameType = gameType;
    if (questionMode) session.questionMode = questionMode;
    if (resetParticipants) {
      session.roundSeed = `r-${Date.now()}`;
      session.participants = session.participants.map((p) => ({
        ...p,
        progress: 0,
        speedKmh: 80,
        score: 0,
        streak: 0,
        statusEffect: 'normal',
        finishedAt: undefined,
      }));
    }
    saveDatabase(db);
    notifyRoom(code, session);
    notifyDashboard();
    return res.json({ session });
  });

  app.get('/api/questions', (_req, res) => {
    res.json({ questions: db.customQuestions || [] });
  });

  app.post('/api/questions', (req, res) => {
    const body = req.body as {
      targetGame?: 'quiz' | 'racing' | 'clue';
      category?: 'tik' | 'umum';
      topic?: string;
      question?: string;
      options?: string[];
      correctIndex?: number;
      answer?: string;
      clues?: [string, string, string];
      explanation?: string;
    };

    if (!body.targetGame || !body.category || !body.topic?.trim()) {
      return res.status(400).json({ error: 'Target game, kategori, dan topik soal wajib diisi.' });
    }

    if (body.targetGame === 'clue') {
      if (!body.answer?.trim() || !body.clues || body.clues.some((c) => !c.trim())) {
        return res.status(400).json({ error: 'Jawaban dan 3 petunjuk (clue) wajib diisi.' });
      }
    } else {
      if (!body.question?.trim() || !body.options || body.options.length < 2) {
        return res.status(400).json({ error: 'Teks pertanyaan dan pilihan jawaban wajib diisi.' });
      }
    }

    const newQuestion: CustomQuestion = {
      id: `cq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      targetGame: body.targetGame,
      category: body.category,
      topic: body.topic.trim(),
      question: body.question?.trim() || `Tebak istilah: ${body.answer?.trim()}`,
      options: body.options?.map((o) => o.trim()),
      correctIndex: typeof body.correctIndex === 'number' ? body.correctIndex : 0,
      answer: body.answer?.trim().toUpperCase(),
      clues: body.clues?.map((c) => c.trim()) as [string, string, string] | undefined,
      explanation: body.explanation?.trim() || 'Soal tambahan dari Guru TIK SMP IT Al Mumtaz YPII.',
      createdAt: new Date().toISOString(),
    };

    if (!db.customQuestions) db.customQuestions = [];
    db.customQuestions.unshift(newQuestion);
    saveDatabase(db);
    notifyDashboard();
    return res.status(201).json({ question: newQuestion });
  });

  app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    if (!db.customQuestions) db.customQuestions = [];
    const before = db.customQuestions.length;
    db.customQuestions = db.customQuestions.filter((q) => q.id !== id);
    if (db.customQuestions.length === before) {
      return res.status(404).json({ error: 'Soal tidak ditemukan.' });
    }
    saveDatabase(db);
    notifyDashboard();
    return res.json({ ok: true });
  });

  // HTTP fallback endpoints for serverless hosts (e.g. Vercel) where WebSockets are unavailable
  app.post('/api/sessions/:code/join', (req, res) => {
    const code = req.params.code.toUpperCase();
    const session = db.sessions.find((s) => s.code === code);
    if (!session) {
      return res.status(404).json({ error: 'Kode room tidak ditemukan.' });
    }
    const { participant } = req.body as { participant?: LiveRaceParticipant };
    if (participant?.studentId) {
      const existingIdx = session.participants.findIndex(
        (item) => item.studentId === participant.studentId
      );
      if (existingIdx === -1) {
        session.participants.push(participant);
      } else {
        const prev = session.participants[existingIdx];
        session.participants[existingIdx] = {
          ...prev,
          studentName: participant.studentName || prev.studentName,
          className: participant.className || prev.className,
          carColor: participant.carColor || prev.carColor,
          avatarIcon: participant.avatarIcon || prev.avatarIcon,
          avatarPhoto:
            participant.avatarPhoto !== undefined ? participant.avatarPhoto : prev.avatarPhoto,
          progress: Math.max(prev.progress || 0, participant.progress || 0),
          speedKmh: prev.speedKmh || participant.speedKmh,
          score: Math.max(prev.score || 0, participant.score || 0),
          streak: Math.max(prev.streak || 0, participant.streak || 0),
          statusEffect:
            prev.statusEffect && prev.statusEffect !== 'normal'
              ? prev.statusEffect
              : participant.statusEffect,
          finishedAt: prev.finishedAt ?? participant.finishedAt,
          cameraActive: participant.cameraActive ?? prev.cameraActive,
          cameraFrame: participant.cameraFrame ?? prev.cameraFrame,
          cameraUpdatedAt: participant.cameraUpdatedAt ?? prev.cameraUpdatedAt,
        };
      }
      saveDatabase(db);
      notifyRoom(code, session);
      notifyDashboard();
    }
    return res.json({ session });
  });

  app.post('/api/sessions/:code/progress', (req, res) => {
    const code = req.params.code.toUpperCase();
    const session = db.sessions.find((s) => s.code === code);
    if (!session) {
      return res.status(404).json({ error: 'Kode room tidak ditemukan.' });
    }
    const payload = req.body as Partial<LiveRaceParticipant>;
    if (payload.studentId) {
      const idx = session.participants.findIndex((p) => p.studentId === payload.studentId);
      if (idx !== -1) {
        session.participants[idx] = {
          ...session.participants[idx],
          progress: Number(payload.progress ?? session.participants[idx].progress),
          speedKmh: Number(payload.speedKmh ?? session.participants[idx].speedKmh),
          score: Number(payload.score ?? session.participants[idx].score),
          streak: Number(payload.streak ?? session.participants[idx].streak),
          statusEffect: payload.statusEffect ?? session.participants[idx].statusEffect,
          finishedAt: payload.finishedAt ?? session.participants[idx].finishedAt,
        };
        saveDatabase(db);
        notifyRoom(code, session);
        notifyDashboard();
      }
    }
    return res.json({ session });
  });

  app.post('/api/sessions/:code/camera', (req, res) => {
    const code = req.params.code.toUpperCase();
    const session = db.sessions.find((s) => s.code === code);
    if (!session) {
      return res.status(404).json({ error: 'Kode room tidak ditemukan.' });
    }
    const { studentId, cameraActive, cameraFrame } = req.body as {
      studentId?: string;
      cameraActive?: boolean;
      cameraFrame?: string;
    };
    if (!studentId) {
      return res.status(400).json({ error: 'studentId wajib diisi.' });
    }
    if (
      typeof cameraFrame === 'string' &&
      (!cameraFrame.startsWith('data:image/jpeg;base64,') || cameraFrame.length > 55_000)
    ) {
      return res.status(400).json({ error: 'Format atau ukuran frame kamera tidak valid.' });
    }
    const idx = session.participants.findIndex((p) => p.studentId === studentId);
    if (idx !== -1) {
      session.participants[idx] = {
        ...session.participants[idx],
        cameraActive: Boolean(cameraActive),
        cameraFrame: cameraActive ? cameraFrame ?? session.participants[idx].cameraFrame : undefined,
        cameraUpdatedAt: Date.now(),
      };
      saveDatabase(db);
      notifyRoom(code, session);
      notifyDashboard();
    }
    return res.json({ session });
  });

  app.post('/api/scores', (req, res) => {
    const body = req.body as Omit<ScoreRecord, 'id' | 'createdAt'>;
    if (!body.studentId || !body.studentName || !body.gameType) {
      return res.status(400).json({ error: 'Data skor tidak lengkap.' });
    }

    const record: ScoreRecord = {
      ...body,
      id: `sc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    db.scores.push(record);
    saveDatabase(db);
    notifyDashboard();

    return res.status(201).json({ score: record });
  });

  app.get('/api/analytics', (_req, res) => {
    res.json(buildAnalytics(db));
  });

  app.get('/api/leaderboard', (req, res) => {
    const className = typeof req.query.className === 'string' ? req.query.className : 'ALL';
    const limit = Number(req.query.limit || 10);
    res.json({
      className,
      entries: buildLeaderboard(db, className, Number.isFinite(limit) ? limit : 10),
    });
  });

  return { app, db };
}

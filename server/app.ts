import fs from 'fs';
import path from 'path';
import express, { type Express } from 'express';
import type {
  AccountStatus,
  AnalyticsSummary,
  ClassRoom,
  GameSession,
  GameType,
  LeaderboardEntry,
  LiveRaceParticipant,
  QuestionCategory,
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
      createdBy: 'Deni Santoso, M.M',
      status: 'active',
      targetClass: 'VII-A & VII-B',
      createdAt: new Date(now - 3600000 * 4).toISOString(),
      participants: [],
    },
  ];

  return { users, scores, sessions };
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
  app.use(express.json());

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
    const { nisOrEmail, fullName, className, password, avatarIcon } = req.body as {
      nisOrEmail?: string;
      fullName?: string;
      className?: ClassRoom;
      password?: string;
      avatarIcon?: string;
    };

    if (!nisOrEmail?.trim() || !fullName?.trim() || !className || !password?.trim()) {
      return res.status(400).json({ error: 'Semua kolom pendaftaran wajib diisi.' });
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

  app.patch('/api/users/:id/avatar', (req, res) => {
    const { id } = req.params;
    const { avatarIcon } = req.body as { avatarIcon?: string };
    if (!avatarIcon?.trim()) {
      return res.status(400).json({ error: 'Ikon avatar tidak boleh kosong.' });
    }
    const found = db.users.find((u) => u.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
    }
    found.avatarIcon = avatarIcon.trim();
    for (const sess of db.sessions) {
      const pIdx = sess.participants.findIndex((p) => p.studentId === id);
      if (pIdx !== -1) {
        sess.participants[pIdx] = {
          ...sess.participants[pIdx],
          avatarIcon: found.avatarIcon,
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
    const { title, gameType, mode, category, targetClass, createdBy, startInLobby } = req.body as {
      title?: string;
      gameType?: GameType;
      mode?: SessionMode;
      category?: QuestionCategory;
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
    const { status, category, gameType, resetParticipants } = req.body as {
      status?: 'waiting' | 'active' | 'finished';
      category?: QuestionCategory;
      gameType?: GameType;
      resetParticipants?: boolean;
    };
    if (status) session.status = status;
    if (category) session.category = category;
    if (gameType) session.gameType = gameType;
    if (resetParticipants) {
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
        session.participants[existingIdx] = {
          ...session.participants[existingIdx],
          ...participant,
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

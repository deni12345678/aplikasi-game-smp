import fs from 'fs';
import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import type {
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
} from './src/types';

interface StoredUser extends UserAccount {
  password: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  scores: ScoreRecord[];
  sessions: GameSession[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const AVATAR_COLORS = ['#047857', '#0284C7', '#D97706', '#7C3AED', '#DC2626', '#0D9488'];

function createSeedDatabase(): DatabaseSchema {
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

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.users || !parsed.scores || !parsed.sessions) {
      throw new Error('Malformed DB');
    }
    return parsed;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveDatabase(db: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function sanitizeUser(u: StoredUser): UserAccount {
  const { password: _pw, ...safe } = u;
  return {
    ...safe,
    avatarIcon: safe.avatarIcon || (safe.role === 'teacher' ? '🧑‍🏫' : '🎓'),
  };
}

function buildLeaderboard(
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

function buildAnalytics(db: DatabaseSchema): AnalyticsSummary {
  const students = db.users.filter((u) => u.role === 'student').map(sanitizeUser);
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

async function startServer() {
  const app = express();
  app.use(express.json());

  const db = loadDatabase();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const roomSubscribers = new Map<string, Set<WebSocket>>();
  const dashboardSubscribers = new Set<WebSocket>();

  function broadcastToDashboard(event: string, payload: unknown) {
    const msg = JSON.stringify({ event, payload });
    for (const client of dashboardSubscribers) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  function broadcastToRoom(code: string, event: string, payload: unknown) {
    const set = roomSubscribers.get(code.toUpperCase());
    if (!set) return;
    const msg = JSON.stringify({ event, payload });
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  wss.on('connection', (ws) => {
    let joinedRoom: string | null = null;

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { event: string; payload?: any };
        const { event, payload } = parsed;

        if (event === 'dashboard:subscribe') {
          dashboardSubscribers.add(ws);
          ws.send(JSON.stringify({ event: 'dashboard:update', payload: buildAnalytics(db) }));
        }

        if (event === 'room:join' && payload?.code) {
          const code = String(payload.code).toUpperCase();
          joinedRoom = code;
          if (!roomSubscribers.has(code)) {
            roomSubscribers.set(code, new Set());
          }
          roomSubscribers.get(code)!.add(ws);

          const session = db.sessions.find((s) => s.code === code);
          if (session && payload.participant) {
            const p = payload.participant as LiveRaceParticipant;
            const existingIdx = session.participants.findIndex((item) => item.studentId === p.studentId);
            if (existingIdx === -1) {
              session.participants.push(p);
            } else {
              session.participants[existingIdx] = { ...session.participants[existingIdx], ...p };
            }
            saveDatabase(db);
            broadcastToRoom(code, 'room:state', session);
            broadcastToDashboard('dashboard:update', buildAnalytics(db));
          } else if (session) {
            ws.send(JSON.stringify({ event: 'room:state', payload: session }));
          }
        }

        if (event === 'room:race_progress' && payload?.code && payload?.studentId) {
          const code = String(payload.code).toUpperCase();
          const session = db.sessions.find((s) => s.code === code);
          if (session) {
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
              broadcastToRoom(code, 'room:state', session);
              broadcastToDashboard('dashboard:update', buildAnalytics(db));
            }
          }
        }

        if (event === 'room:host_start' && payload?.code) {
          const code = String(payload.code).toUpperCase();
          const session = db.sessions.find((s) => s.code === code);
          if (session) {
            session.status = 'active';
            saveDatabase(db);
            broadcastToRoom(code, 'room:state', session);
            broadcastToDashboard('dashboard:update', buildAnalytics(db));
          }
        }

        if (event === 'room:host_end' && payload?.code) {
          const code = String(payload.code).toUpperCase();
          const session = db.sessions.find((s) => s.code === code);
          if (session) {
            session.status = 'finished';
            saveDatabase(db);
            broadcastToRoom(code, 'room:state', session);
            broadcastToDashboard('dashboard:update', buildAnalytics(db));
          }
        }

        if (event === 'room:update_category' && payload?.code && payload?.category) {
          const code = String(payload.code).toUpperCase();
          const session = db.sessions.find((s) => s.code === code);
          if (session) {
            session.category = payload.category as QuestionCategory;
            saveDatabase(db);
            broadcastToRoom(code, 'room:state', session);
            broadcastToDashboard('dashboard:update', buildAnalytics(db));
          }
        }
      } catch {
        // Ignore malformed socket messages
      }
    });

    ws.on('close', () => {
      dashboardSubscribers.delete(ws);
      if (joinedRoom) {
        roomSubscribers.get(joinedRoom)?.delete(ws);
      }
    });
  });

  // --- REST API ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
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
    const exists = db.users.some((u) => u.nisOrEmail.toLowerCase() === normalized);
    if (exists) {
      return res.status(409).json({ error: 'NIS atau email sekolah ini sudah terdaftar. Silakan masuk.' });
    }

    const newUser: StoredUser = {
      id: `stu-${Date.now()}`,
      nisOrEmail: nisOrEmail.trim(),
      fullName: fullName.trim(),
      className,
      role: 'student',
      avatarColor: AVATAR_COLORS[db.users.length % AVATAR_COLORS.length],
      avatarIcon: avatarIcon?.trim() || '🤖',
      createdAt: new Date().toISOString(),
      password: password.trim(),
    };

    db.users.push(newUser);
    saveDatabase(db);
    broadcastToDashboard('dashboard:update', buildAnalytics(db));

    return res.status(201).json({ user: sanitizeUser(newUser) });
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
        broadcastToRoom(sess.code, 'room:state', sess);
      }
    }
    saveDatabase(db);
    broadcastToDashboard('dashboard:update', buildAnalytics(db));
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
    broadcastToDashboard('dashboard:update', buildAnalytics(db));

    return res.status(201).json({ session: newSession });
  });

  app.patch('/api/sessions/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const session = db.sessions.find((s) => s.code === code);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }
    const { status, category } = req.body as {
      status?: 'waiting' | 'active' | 'finished';
      category?: QuestionCategory;
    };
    if (status) session.status = status;
    if (category) session.category = category;
    saveDatabase(db);
    broadcastToRoom(code, 'room:state', session);
    broadcastToDashboard('dashboard:update', buildAnalytics(db));
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
    broadcastToDashboard('dashboard:update', buildAnalytics(db));

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

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Al Mumtaz TechQuest server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

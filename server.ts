import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { buildAnalytics, createAppRuntime, saveDatabase } from './server/app';
import type { GameSession, GameType, LiveRaceParticipant, QuestionCategory } from './src/types';

async function startServer() {
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

  const { app, db } = createAppRuntime({
    onRoomState: (code: string, session: GameSession) => {
      broadcastToRoom(code, 'room:state', session);
    },
    onDashboardUpdate: (analytics) => {
      broadcastToDashboard('dashboard:update', analytics);
    },
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

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
            const existingIdx = session.participants.findIndex(
              (item) => item.studentId === p.studentId
            );
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
              if (payload.statusEffect === 'finished' || Number(payload.progress) >= 100) {
                saveDatabase(db);
              }
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

        if (event === 'room:update_game' && payload?.code) {
          const code = String(payload.code).toUpperCase();
          const session = db.sessions.find((s) => s.code === code);
          if (session) {
            if (payload.gameType) session.gameType = payload.gameType as GameType;
            if (payload.category) session.category = payload.category as QuestionCategory;
            saveDatabase(db);
            broadcastToRoom(code, 'room:state', session);
            broadcastToDashboard('dashboard:update', buildAnalytics(db));
          }
        }

        if (event === 'room:reset_lobby' && payload?.code) {
          const code = String(payload.code).toUpperCase();
          const session = db.sessions.find((s) => s.code === code);
          if (session) {
            session.status = 'waiting';
            session.participants = session.participants.map((p) => ({
              ...p,
              progress: 0,
              speedKmh: 80,
              score: 0,
              streak: 0,
              statusEffect: 'normal',
              finishedAt: undefined,
            }));
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

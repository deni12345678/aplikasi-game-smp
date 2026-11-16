import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameSession, LiveRaceParticipant, UserAccount } from '../types';

interface UseRoomSyncOptions {
  roomCode?: string;
  user: UserAccount;
  initialSpeed?: number;
}

export interface ProgressUpdate {
  progress: number;
  score: number;
  streak?: number;
  speedKmh?: number;
  statusEffect?: 'normal' | 'nitro' | 'skid' | 'finished';
  finishedAt?: number;
}

export function useRoomSync({ roomCode, user, initialSpeed = 0 }: UseRoomSyncOptions) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [peers, setPeers] = useState<LiveRaceParticipant[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setSession(null);
      setPeers([]);
      return;
    }

    const codeUpper = roomCode.toUpperCase();
    const participantPayload: LiveRaceParticipant = {
      studentId: user.id,
      studentName: user.fullName,
      className: user.className,
      carColor: user.avatarColor,
      avatarIcon: user.avatarIcon || '🎓',
      progress: 0,
      speedKmh: initialSpeed,
      score: 0,
      streak: 0,
      statusEffect: 'normal',
    };

    const applySession = (sess: GameSession) => {
      setSession(sess);
      if (sess.participants) {
        setPeers(sess.participants);
      }
    };

    fetch(`/api/sessions/${codeUpper}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant: participantPayload }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.session) applySession(data.session as GameSession);
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
        if (msg.event === 'room:state' && msg.payload) {
          applySession(msg.payload);
        }
      } catch {
        // Ignore malformed socket message
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
          if (data?.session) applySession(data.session as GameSession);
        })
        .catch(() => {});
    }, 2200);

    return () => {
      window.clearInterval(pollTimer);
      ws.close();
      wsRef.current = null;
    };
  }, [roomCode, user.id, user.fullName, user.className, user.avatarColor, user.avatarIcon, initialSpeed]);

  const sendProgress = useCallback(
    (update: ProgressUpdate) => {
      if (!roomCode) return;
      const codeUpper = roomCode.toUpperCase();
      const payload = {
        studentId: user.id,
        progress: update.progress,
        speedKmh: update.speedKmh ?? initialSpeed,
        score: update.score,
        streak: update.streak ?? 0,
        statusEffect: update.statusEffect ?? 'normal',
        finishedAt: update.finishedAt,
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
            if (data?.session) {
              setSession(data.session as GameSession);
              if (data.session.participants) setPeers(data.session.participants);
            }
          })
          .catch(() => {});
      }
    },
    [roomCode, user.id, initialSpeed]
  );

  return { session, peers, sendProgress };
}

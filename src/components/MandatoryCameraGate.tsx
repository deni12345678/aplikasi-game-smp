import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CameraOff, Maximize2, Minimize2, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import type { UserAccount } from '../types';

interface CameraContextValue {
  cameraReady: boolean;
  stream: MediaStream | null;
  snapshot: string | null;
  cameraError: string | null;
  retryCamera: () => void;
}

const CameraContext = createContext<CameraContextValue>({
  cameraReady: false,
  stream: null,
  snapshot: null,
  cameraError: null,
  retryCamera: () => {},
});

export function useMandatoryCamera() {
  return useContext(CameraContext);
}

interface MandatoryCameraGateProps {
  user: UserAccount;
  roomCode?: string;
  required?: boolean;
  contextLabel?: string;
  onExit: () => void;
  children: React.ReactNode;
}

function describeCameraError(err: unknown): string {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'Browser atau koneksi ini tidak mendukung akses kamera real-time (pastikan membuka lewat HTTPS atau localhost).';
  }
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Izin kamera ditolak. Klik ikon kamera/gembok di bilah alamat browser, pilih Izinkan (Allow) Kamera, lalu tekan Coba Lagi.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Perangkat kamera (webcam) tidak terdeteksi. Sambungkan kamera terlebih dahulu lalu tekan Coba Lagi.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain yang memakai kamera lalu tekan Coba Lagi.';
  }
  return 'Gagal mengaktifkan kamera real-time. Pastikan izin kamera aktif dan perangkat tersedia.';
}

export const MandatoryCameraGate: React.FC<MandatoryCameraGateProps> = ({
  user,
  roomCode,
  required = true,
  contextLabel = 'Permainan',
  onExit,
  children,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [requesting, setRequesting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [retrySeq, setRetrySeq] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef(false);

  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraReady(false);
  }, []);

  const retryCamera = useCallback(() => {
    setRetrySeq((n) => n + 1);
  }, []);

  // Acquire & monitor mandatory live camera stream
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      stopActiveStream();
      setRequesting(true);
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setRequesting(false);
        setCameraError(describeCameraError(null));
        return;
      }

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }

        const videoTrack = media.getVideoTracks()[0];
        if (!videoTrack) {
          media.getTracks().forEach((t) => t.stop());
          setCameraError('Tidak ada track video kamera yang aktif.');
          setRequesting(false);
          return;
        }

        streamRef.current = media;
        setStream(media);

        const handleTrackLost = () => {
          if (cancelled) return;
          setCameraReady(false);
          setCameraError('Kamera terputus atau dimatikan. Aktifkan kembali kamera untuk melanjutkan.');
        };
        videoTrack.addEventListener('ended', handleTrackLost);
        videoTrack.addEventListener('mute', () => {
          if (!cancelled && videoTrack.readyState !== 'live') {
            handleTrackLost();
          }
        });

        const videoEl = captureVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = media;
          await videoEl.play().catch(() => {});
        }

        if (!cancelled) {
          setCameraReady(true);
          setRequesting(false);
        }
      } catch (err) {
        if (!cancelled) {
          setRequesting(false);
          setCameraReady(false);
          setCameraError(describeCameraError(err));
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      stopActiveStream();
    };
  }, [retrySeq, stopActiveStream]);

  // Attach live stream to visible preview video element whenever rendered or toggled
  useEffect(() => {
    const previewEl = previewVideoRef.current;
    if (!previewEl) return;
    if (previewEl.srcObject !== stream) {
      previewEl.srcObject = stream;
    }
    if (stream) {
      previewEl.play().catch(() => {});
    }
  }, [stream, cameraReady, minimized]);

  // Periodic health watchdog so disabled/covered/disconnected tracks immediately pause game
  useEffect(() => {
    if (!cameraReady) return;
    const timer = window.setInterval(() => {
      const media = streamRef.current;
      const track = media?.getVideoTracks()[0];
      const videoEl = captureVideoRef.current;
      if (
        !media ||
        !track ||
        track.readyState !== 'live' ||
        !track.enabled ||
        (videoEl && videoEl.ended)
      ) {
        setCameraReady(false);
        setCameraError('Kamera tidak aktif atau dimatikan. Wajib on camera real-time untuk melanjutkan.');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cameraReady]);

  // Room WebSocket connection for streaming real-time camera frames to peers & teacher
  useEffect(() => {
    if (!roomCode) {
      wsConnectedRef.current = false;
      return;
    }

    const codeUpper = roomCode.toUpperCase();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      wsConnectedRef.current = true;
      ws.send(
        JSON.stringify({
          event: 'room:join',
          payload: {
            code: codeUpper,
            participant: {
              studentId: user.id,
              studentName: user.fullName,
              className: user.className,
              carColor: user.avatarColor,
              avatarIcon: user.avatarIcon || '🎓',
              avatarPhoto: user.avatarPhoto,
              progress: 0,
              speedKmh: 0,
              score: 0,
              streak: 0,
              statusEffect: 'normal',
            },
          },
        })
      );
    };
    ws.onerror = () => {
      wsConnectedRef.current = false;
    };
    ws.onclose = () => {
      wsConnectedRef.current = false;
    };

    return () => {
      // Notify room that camera is off upon leaving room
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: 'room:camera_frame',
            payload: {
              code: codeUpper,
              studentId: user.id,
              cameraActive: false,
            },
          })
        );
      } else {
        fetch(`/api/sessions/${codeUpper}/camera`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: user.id, cameraActive: false }),
          keepalive: true,
        }).catch(() => {});
      }
      wsConnectedRef.current = false;
      ws.close();
      wsRef.current = null;
    };
  }, [roomCode, user.id, user.fullName, user.className, user.avatarColor, user.avatarIcon, user.avatarPhoto]);

  // Capture & broadcast lightweight 160x120 JPEG live frames every 1.4s
  useEffect(() => {
    if (!cameraReady) {
      if (roomCode) {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              event: 'room:camera_frame',
              payload: {
                code: roomCode.toUpperCase(),
                studentId: user.id,
                cameraActive: false,
              },
            })
          );
        } else {
          fetch(`/api/sessions/${roomCode.toUpperCase()}/camera`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: user.id, cameraActive: false }),
          }).catch(() => {});
        }
      }
      return;
    }

    const captureAndSend = () => {
      const videoEl = captureVideoRef.current;
      if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        canvasRef.current = canvas;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Mirror horizontally for natural selfie view & center-crop to 4:3
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const targetRatio = 160 / 120;
      const srcRatio = vw / vh;
      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;
      if (srcRatio > targetRatio) {
        sw = vh * targetRatio;
        sx = (vw - sw) / 2;
      } else {
        sh = vw / targetRatio;
        sy = (vh - sh) / 2;
      }

      ctx.save();
      ctx.translate(160, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, 160, 120);
      ctx.restore();

      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.52);
      setSnapshot(frameDataUrl);

      if (roomCode) {
        const codeUpper = roomCode.toUpperCase();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && wsConnectedRef.current) {
          wsRef.current.send(
            JSON.stringify({
              event: 'room:camera_frame',
              payload: {
                code: codeUpper,
                studentId: user.id,
                cameraActive: true,
                cameraFrame: frameDataUrl,
              },
            })
          );
        } else {
          fetch(`/api/sessions/${codeUpper}/camera`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: user.id,
              cameraActive: true,
              cameraFrame: frameDataUrl,
            }),
          }).catch(() => {});
        }
      }
    };

    const initialTimer = window.setTimeout(captureAndSend, 300);
    const interval = window.setInterval(captureAndSend, 1400);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [cameraReady, roomCode, user.id]);

  const blocked = required && !cameraReady;

  return (
    <CameraContext.Provider
      value={{
        cameraReady,
        stream,
        snapshot,
        cameraError,
        retryCamera,
      }}
    >
      {/* Hidden capture video element kept always mounted while inside gate */}
      <video
        ref={captureVideoRef}
        autoPlay
        playsInline
        muted
        className="pointer-events-none fixed -top-[9999px] -left-[9999px] h-1 w-1 opacity-0"
      />

      {children}

      {/* Mandatory Real-Time Camera Lock Overlay (no backdrop-blur over WebGL) */}
      {blocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-slate-950">
                <Camera className="h-3.5 w-3.5" />
                WAJIB ON CAMERA REAL-TIME
              </span>
              <span className="font-mono text-xs text-slate-400">
                {user.fullName.split(' ')[0]} · {user.className}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-white">
              Aktifkan Kamera untuk Memulai {contextLabel}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Setiap pemain wajib mengaktifkan kamera secara langsung (real-time) selama sesi
              berlangsung demi kejujuran dan pemantauan kelas.
            </p>

            <div className="mt-4 flex aspect-4/3 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 p-4 text-center">
              {requesting ? (
                <>
                  <Video className="h-10 w-10 text-emerald-400" />
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
                    Meminta izin kamera browser...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Klik <strong>Izinkan (Allow)</strong> pada pop-up izin kamera di pojok layar.
                  </p>
                </>
              ) : (
                <>
                  <CameraOff className="h-10 w-10 text-red-400" />
                  <p className="mt-2 text-sm font-semibold text-red-300">Kamera Belum Aktif</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {cameraError || 'Izin kamera diperlukan untuk masuk ke permainan.'}
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={retryCamera}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                <RefreshCw className="h-4 w-4" />
                {requesting ? 'Muat Ulang Kamera' : 'Aktifkan Kamera Sekarang'}
              </button>
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Live Camera Monitor Widget (Solid dark surface, zero backdrop-blur) */}
      {cameraReady && (
        <div className="fixed right-4 bottom-16 z-40 sm:bottom-4">
          {minimized ? (
            <button
              type="button"
              onClick={() => setMinimized(false)}
              title="Perbesar pratinjau kamera"
              className="flex items-center gap-2 rounded-xl border-2 border-emerald-500 bg-slate-900 p-1.5 pr-3 text-white shadow-xl transition-colors hover:border-emerald-400"
            >
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="h-9 w-12 -scale-x-100 rounded-lg bg-slate-950 object-cover"
              />
              <div className="text-left">
                <p className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  ON CAM
                </p>
                <p className="text-[11px] font-semibold text-slate-200">
                  {user.fullName.split(' ')[0]}
                </p>
              </div>
              <Maximize2 className="ml-1 h-3.5 w-3.5 text-slate-400" />
            </button>
          ) : (
            <div className="w-44 overflow-hidden rounded-xl border-2 border-emerald-500 bg-slate-900 text-white shadow-2xl sm:w-52">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-2.5 py-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  ON CAM · LIVE
                </span>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  aria-label="Perkecil jendela kamera"
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="relative aspect-4/3 w-full bg-slate-950">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full -scale-x-100 object-cover"
                />
                <div className="absolute right-1.5 bottom-1.5 left-1.5 flex items-center justify-between rounded bg-slate-950/85 px-2 py-0.5 text-[10px]">
                  <span className="truncate font-semibold text-white">
                    {user.fullName.split(' ')[0]} · {user.className}
                  </span>
                  <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </CameraContext.Provider>
  );
};

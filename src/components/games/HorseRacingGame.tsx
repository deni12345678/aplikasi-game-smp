import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flag,
  Gauge,
  Play,
  RotateCcw,
  Trophy,
  Zap,
} from 'lucide-react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useRoomSync } from '../../hooks/useRoomSync';
import type { LiveRaceParticipant, SessionMode, UserAccount } from '../../types';
import { soundFx } from '../../utils/sound';
import { LiveRoomStandings } from '../LiveRoomStandings';
import { horseAudio } from './horse3d/audio';
import {
  animateHorseGallop,
  createHorseAndJockey,
  createTrackEnvironment,
  HORSE_TRACK_LENGTH,
  LANE_X,
  TRACK_HALF_WIDTH,
  type HorseActorRig,
  type TrackFeature,
} from './horse3d/models';
import type { JockeySilkPattern } from './horse3d/textures';

interface HorseRacingGameProps {
  user: UserAccount;
  mode: SessionMode;
  roomCode?: string;
  onExit: () => void;
}

type RacePhase = 'ready' | 'countdown' | 'racing' | 'finished';
type CameraPreset = 'chase' | 'side' | 'aerial';

interface RacerStandingsItem {
  id: string;
  name: string;
  isPlayer: boolean;
  isPeer: boolean;
  progressPct: number;
  finishTimeSec: number | null;
  speedKmh: number;
  accentHex: string;
}

const AI_RIVAL_PRESETS = [
  {
    id: 'ai-1',
    name: 'Kilat Nusantara',
    coatColor: 0x451a03,
    maneColor: 0x1c1917,
    silkColor: 0xeab308,
    helmetColor: 0xfacc15,
    accentHex: '#eab308',
    avatarIcon: '⚡',
    silkPattern: 'flames' as JockeySilkPattern,
    baseSpeedMps: 17.9,
    burstAmp: 1.9,
    laneIndex: 1,
  },
  {
    id: 'ai-2',
    name: 'Bintang Samudra',
    coatColor: 0x7c2d12,
    maneColor: 0x111827,
    silkColor: 0x2563eb,
    helmetColor: 0x3b82f6,
    accentHex: '#2563eb',
    avatarIcon: '⭐',
    silkPattern: 'stars' as JockeySilkPattern,
    baseSpeedMps: 18.2,
    burstAmp: 2.1,
    laneIndex: 3,
  },
  {
    id: 'ai-3',
    name: 'Halilintar Hitam',
    coatColor: 0x1f2937,
    maneColor: 0x09090b,
    silkColor: 0x7c3aed,
    helmetColor: 0x8b5cf6,
    accentHex: '#7c3aed',
    avatarIcon: '🦅',
    silkPattern: 'diamonds' as JockeySilkPattern,
    baseSpeedMps: 17.5,
    burstAmp: 2.3,
    laneIndex: 0,
  },
  {
    id: 'ai-4',
    name: 'Embun Putih',
    coatColor: 0xcbd5e1,
    maneColor: 0x64748b,
    silkColor: 0x059669,
    helmetColor: 0x10b981,
    accentHex: '#059669',
    avatarIcon: '🍀',
    silkPattern: 'chevron' as JockeySilkPattern,
    baseSpeedMps: 17.7,
    burstAmp: 1.8,
    laneIndex: 4,
  },
] as const;

const PEER_COLORS = [
  { silk: 0x0284c7, coat: 0x5c2c16, hex: '#0284c7', pattern: 'chevron' as JockeySilkPattern },
  { silk: 0xd97706, coat: 0x292524, hex: '#d97706', pattern: 'diamonds' as JockeySilkPattern },
  { silk: 0x9333ea, coat: 0x78350f, hex: '#9333ea', pattern: 'stars' as JockeySilkPattern },
  { silk: 0x16a34a, coat: 0x94a3b8, hex: '#16a34a', pattern: 'flames' as JockeySilkPattern },
];

const JOCKEY_AVATAR_PRESETS = ['🏇', '⚡', '🦁', '🚀', '🤖', '🐉'];

// Deterministic track features (turf speed strips & mud patches) across 1.200m
function generateTrackFeatures(seedOffset = 0): TrackFeature[] {
  const features: TrackFeature[] = [];
  let s = 202607 + seedOffset * 97;
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  for (let dist = 95; dist < HORSE_TRACK_LENGTH - 60; dist += 65) {
    const boostLane = Math.floor(nextRand() * LANE_X.length);
    features.push({
      id: `boost-${dist}`,
      type: 'boost',
      x: LANE_X[boostLane],
      z: -dist,
      halfW: 1.7,
      halfL: 5.5,
    });

    // Place a mud patch on a different lane nearby
    const mudLane = (boostLane + 1 + Math.floor(nextRand() * 3)) % LANE_X.length;
    features.push({
      id: `mud-${dist}`,
      type: 'mud',
      x: LANE_X[mudLane],
      z: -(dist + 24),
      halfW: 1.85,
      halfL: 3.4,
    });
  }
  return features;
}

// Reusable module-scope math objects for zero-GC render loop
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _dummyMatrix = new THREE.Object3D();
const _tempColor = new THREE.Color();

const CELEBRATION_PALETTE = [
  0xfbbf24, // Gold
  0xef4444, // Crimson
  0x10b981, // Emerald
  0x38bdf8, // Sky Blue
  0xa855f7, // Violet
  0xf472b6, // Pink
  0xfef08a, // Bright Yellow
  0xffffff, // White
];

export const HorseRacingGame: React.FC<HorseRacingGameProps> = ({
  user,
  mode,
  roomCode,
  onExit,
}) => {
  const { peers, sendProgress } = useRoomSync({
    roomCode,
    user,
    initialSpeed: 0,
  });

  const [phase, setPhase] = useState<RacePhase>('ready');
  const [countdownVal, setCountdownVal] = useState<number>(3);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('chase');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [jockeyAvatar, setJockeyAvatar] = useState<string>(user.avatarIcon || '🏇');
  const jockeyAvatarOptions = useMemo(() => {
    const base = user.avatarIcon ? [user.avatarIcon, ...JOCKEY_AVATAR_PRESETS] : JOCKEY_AVATAR_PRESETS;
    return Array.from(new Set(base)).slice(0, 6);
  }, [user.avatarIcon]);

  // Live HUD state synced smoothly (~12Hz) from ref physics loop
  const [hud, setHud] = useState({
    distanceM: 0,
    speedKmh: 0,
    stamina: 100,
    rhythmMeter: 0,
    rank: 1,
    totalRacers: 5,
    elapsedSec: 0,
    boostsHit: 0,
    mudHits: 0,
    topSpeedKmh: 0,
    statusLabel: 'Siap di Gerbang Start',
    standings: [] as RacerStandingsItem[],
  });
  const [finalResult, setFinalResult] = useState<{
    placement: number;
    score: number;
    finishTimeSec: number;
    topSpeedKmh: number;
    boostsHit: number;
    mudHits: number;
    standings: RacerStandingsItem[];
  } | null>(null);
  const [savingScore, setSavingScore] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [finishBanner, setFinishBanner] = useState<{ placement: number; score: number } | null>(
    null
  );
  const podiumTimerRef = useRef<number | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<RacePhase>('ready');
  const cameraPresetRef = useRef<CameraPreset>('chase');
  const jockeyAvatarRef = useRef<string>(jockeyAvatar);
  const playerRigRef = useRef<HorseActorRig | null>(null);
  const peersRef = useRef<LiveRaceParticipant[]>([]);
  const sendProgressRef = useRef(sendProgress);
  const trackFeatures = useMemo(() => generateTrackFeatures(0), []);

  const handleSelectJockeyAvatar = useCallback((icon: string) => {
    jockeyAvatarRef.current = icon;
    setJockeyAvatar(icon);
    playerRigRef.current?.setAvatarIcon(icon);
  }, []);

  // Mutable 3D game physics state (never triggers React re-renders per frame)
  const simRef = useRef({
    playerX: 0,
    targetLaneIdx: 2,
    playerZ: 0, // 0 down to -HORSE_TRACK_LENGTH
    speedMps: 0,
    stamina: 100,
    rhythmBoost: 0, // 0..1 built by rhythmic Spur taps
    lastSpurMs: 0,
    whipTimer: 0,
    sprintHeld: false,
    boostTimer: 0,
    mudTimer: 0,
    triggeredFeatures: new Set<string>(),
    stridePhase: 0,
    lastHoofCycle: -1,
    lastHoofStep: -1,
    lastRivalHoofCycle: -1,
    lastRivalHoofStep: -1,
    elapsedSec: 0,
    finishTimeSec: null as number | null,
    boostsHit: 0,
    mudHits: 0,
    topSpeedKmh: 0,
    lastHudSyncMs: 0,
    lastNetSyncMs: 0,
    celebrating: false,
    celebrationElapsed: 0,
    nextFireworkAt: 0,
    podiumShown: false,
    aiRacers: AI_RIVAL_PRESETS.map((ai) => ({
      ...ai,
      x: LANE_X[ai.laneIndex],
      z: 0,
      speedMps: 0,
      stridePhase: Math.random() * Math.PI * 2,
      lastHoofCycle: -1,
      lastHoofStep: -1,
      finishTimeSec: null as number | null,
      seedPhase: Math.random() * 10,
    })),
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    sendProgressRef.current = sendProgress;
  }, [sendProgress]);

  const submitScoreToServer = useCallback(
    async (result: {
      placement: number;
      score: number;
      finishTimeSec: number;
      topSpeedKmh: number;
      boostsHit: number;
    }) => {
      setSavingScore(true);
      try {
        const res = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: user.id,
            studentName: user.fullName,
            className: user.className,
            gameType: 'horse',
            mode,
            category: 'umum',
            roomCode: roomCode?.toUpperCase(),
            score: result.score,
            correctCount: 0,
            totalQuestions: 0,
            avgTimeSec: Number(result.finishTimeSec.toFixed(1)),
            maxStreak: result.boostsHit,
            answers: [],
          }),
        });
        if (res.ok) {
          setScoreSaved(true);
        }
      } catch {
        // Ignore transient offline error
      } finally {
        setSavingScore(false);
      }
    },
    [user.id, user.fullName, user.className, mode, roomCode]
  );

  // Player actions
  const triggerSpur = useCallback(() => {
    if (phaseRef.current !== 'racing') return;
    const sim = simRef.current;
    const now = performance.now();
    const dtTap = now - sim.lastSpurMs;
    sim.lastSpurMs = now;

    // Optimal cadence (~160–420ms) builds strong rhythm boost; even fast/slow taps help
    const cadenceBonus = dtTap >= 140 && dtTap <= 460 ? 0.34 : 0.2;
    sim.rhythmBoost = Math.min(1, sim.rhythmBoost + cadenceBonus);
    sim.speedMps = Math.min(23.5, sim.speedMps + 1.15);
    const speedNorm = THREE.MathUtils.clamp((sim.speedMps - 8) / 16, 0.2, 1.3);
    horseAudio.hoofbeat({
      speedNorm,
      beatIndex: 3,
      surface: sim.mudTimer > 0 ? 'mud' : sim.boostTimer > 0 ? 'boost' : 'turf',
      volume: 0.95,
    });
  }, []);

  const triggerWhipSprint = useCallback(() => {
    if (phaseRef.current !== 'racing') return;
    const sim = simRef.current;
    if (sim.stamina < 16) return;
    sim.stamina = Math.max(0, sim.stamina - 18);
    sim.whipTimer = 0.65;
    sim.boostTimer = Math.max(sim.boostTimer, 1.05);
    sim.speedMps = Math.min(24.5, sim.speedMps + 3.2);
    horseAudio.whipSprint();
  }, []);

  const steerLane = useCallback((delta: -1 | 1) => {
    if (phaseRef.current !== 'racing' && phaseRef.current !== 'countdown') return;
    const sim = simRef.current;
    sim.targetLaneIdx = Math.max(0, Math.min(LANE_X.length - 1, sim.targetLaneIdx + delta));
    soundFx.click();
  }, []);

  const resetRaceState = useCallback(() => {
    const sim = simRef.current;
    sim.playerX = LANE_X[2];
    sim.targetLaneIdx = 2;
    sim.playerZ = 0;
    sim.speedMps = 0;
    sim.stamina = 100;
    sim.rhythmBoost = 0;
    sim.whipTimer = 0;
    sim.sprintHeld = false;
    sim.boostTimer = 0;
    sim.mudTimer = 0;
    sim.triggeredFeatures.clear();
    sim.stridePhase = 0;
    sim.lastHoofCycle = -1;
    sim.lastHoofStep = -1;
    sim.lastRivalHoofCycle = -1;
    sim.lastRivalHoofStep = -1;
    sim.elapsedSec = 0;
    sim.finishTimeSec = null;
    sim.boostsHit = 0;
    sim.mudHits = 0;
    sim.topSpeedKmh = 0;
    sim.celebrating = false;
    sim.celebrationElapsed = 0;
    sim.nextFireworkAt = 0;
    sim.podiumShown = false;
    if (podiumTimerRef.current !== null) {
      window.clearTimeout(podiumTimerRef.current);
      podiumTimerRef.current = null;
    }
    sim.aiRacers = AI_RIVAL_PRESETS.map((ai) => ({
      ...ai,
      x: LANE_X[ai.laneIndex],
      z: 0,
      speedMps: 0,
      stridePhase: Math.random() * Math.PI * 2,
      lastHoofCycle: -1,
      lastHoofStep: -1,
      finishTimeSec: null,
      seedPhase: Math.random() * 10,
    }));
    setFinalResult(null);
    setFinishBanner(null);
    setScoreSaved(false);
    setHud({
      distanceM: 0,
      speedKmh: 0,
      stamina: 100,
      rhythmMeter: 0,
      rank: 1,
      totalRacers: 5,
      elapsedSec: 0,
      boostsHit: 0,
      mudHits: 0,
      topSpeedKmh: 0,
      statusLabel: 'Bersiap di Gerbang Start',
      standings: [],
    });
  }, []);

  const startRace = useCallback(() => {
    resetRaceState();
    setPhase('countdown');
    setCountdownVal(3);
    soundFx.click();
  }, [resetRaceState]);

  // Countdown sequence (3 -> 2 -> 1 -> PACU!)
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownVal > 1) {
      const t = window.setTimeout(() => {
        soundFx.click();
        setCountdownVal((c) => c - 1);
      }, 850);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      horseAudio.startBell();
      simRef.current.speedMps = 13.5;
      simRef.current.aiRacers.forEach((ai) => {
        ai.speedMps = 13.0 + Math.random() * 1.4;
      });
      setPhase('racing');
    }, 850);
    return () => window.clearTimeout(t);
  }, [phase, countdownVal]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
        return;
      }
      if (phaseRef.current !== 'racing' && phaseRef.current !== 'countdown') return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (!e.repeat) steerLane(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        if (!e.repeat) steerLane(1);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) triggerSpur();
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW'
      ) {
        e.preventDefault();
        simRef.current.sprintHeld = true;
        if (!e.repeat) triggerWhipSprint();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW'
      ) {
        simRef.current.sprintHeld = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [steerLane, triggerSpur, triggerWhipSprint]);

  // Mount isolated Three.js WebGLRenderer & 3D Stadium Scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9bd2f7);
    scene.fog = new THREE.Fog(0xb9e0f8, 95, 430);

    // Studio reflection environment (mandatory on all devices)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.25, 650);
    camera.position.set(0, 3.2, 5.6);
    camera.lookAt(0, 1.35, -24);

    // Warm Sun Key Light + Cool Sky/Turf Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0xcbeafe, 0x2d5e1e, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6dd, 2.05);
    sunLight.position.set(28, 42, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 140;
    const d = 28;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Stadium & Striped Turf Track
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const env = createTrackEnvironment(scene, maxAniso, trackFeatures);

    // Player Horse & Crimson Jockey Rig (matches screenshot central subject!)
    const playerRig = createHorseAndJockey(
      {
        label: user.fullName.split(' ')[0] + ' (Kamu)',
        coatColor: 0x7c3416,
        maneColor: 0x1c120d,
        silkColor: 0xb91c1c,
        helmetColor: 0xdc2626,
        accentHex: '#dc2626',
        silkHex: '#b91c1c',
        silkPattern: 'stripes',
        avatarIcon: jockeyAvatarRef.current,
        isPlayer: true,
      },
      env.contactShadowTex
    );
    playerRig.root.position.set(LANE_X[2], 0, 0);
    scene.add(playerRig.root);
    playerRigRef.current = playerRig;

    // 4 AI Rival Rigs
    const aiRigs = AI_RIVAL_PRESETS.map((ai) => {
      const rig = createHorseAndJockey(
        {
          label: ai.name,
          coatColor: ai.coatColor,
          maneColor: ai.maneColor,
          silkColor: ai.silkColor,
          helmetColor: ai.helmetColor,
          accentHex: ai.accentHex,
          silkHex: ai.accentHex,
          silkPattern: ai.silkPattern,
          avatarIcon: ai.avatarIcon,
          isPlayer: false,
        },
        env.contactShadowTex
      );
      rig.root.position.set(LANE_X[ai.laneIndex], 0, 0);
      scene.add(rig.root);
      return rig;
    });

    // Dynamic Multiplayer Classmate Peer Rigs
    const peerRigs = new Map<
      string,
      { rig: HorseActorRig; smoothZ: number; smoothX: number; stride: number }
    >();

    // Pre-allocated Turf Clump & Dust Kickup Particle InstancedMesh (42 particles, zero GC)
    const particleCount = 42;
    const partGeo = new THREE.BoxGeometry(0.14, 0.08, 0.14);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0x3b7a22,
      roughness: 0.9,
      metalness: 0,
    });
    const particleMesh = new THREE.InstancedMesh(partGeo, partMat, particleCount);
    particleMesh.frustumCulled = false;
    scene.add(particleMesh);

    const particles = Array.from({ length: particleCount }, () => ({
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
    }));
    let partCursor = 0;

    // Pre-allocated 3D Victory Confetti Shower InstancedMesh (240 tumbling ribbons, zero GC)
    const confettiCount = 240;
    const confettiGeo = new THREE.BoxGeometry(0.18, 0.02, 0.11);
    const confettiMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.15,
      emissive: 0x222222,
      emissiveIntensity: 0.35,
    });
    const confettiMesh = new THREE.InstancedMesh(confettiGeo, confettiMat, confettiCount);
    confettiMesh.frustumCulled = false;
    scene.add(confettiMesh);

    const confettiParticles = Array.from({ length: confettiCount }, (_, idx) => {
      _dummyMatrix.position.set(0, -30, 0);
      _dummyMatrix.scale.set(0.01, 0.01, 0.01);
      _dummyMatrix.updateMatrix();
      confettiMesh.setMatrixAt(idx, _dummyMatrix.matrix);
      _tempColor.setHex(CELEBRATION_PALETTE[idx % CELEBRATION_PALETTE.length]);
      confettiMesh.setColorAt(idx, _tempColor);
      return {
        x: 0,
        y: -30,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        vrx: 0,
        vry: 0,
        life: 0,
        maxLife: 1,
      };
    });
    confettiMesh.instanceMatrix.needsUpdate = true;
    if (confettiMesh.instanceColor) confettiMesh.instanceColor.needsUpdate = true;

    // Pre-allocated 3D Aerial Fireworks InstancedMesh (220 glowing star sparks, zero GC)
    const fireworkCount = 220;
    const fireworkGeo = new THREE.SphereGeometry(0.16, 6, 6);
    const fireworkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const fireworkMesh = new THREE.InstancedMesh(fireworkGeo, fireworkMat, fireworkCount);
    fireworkMesh.frustumCulled = false;
    scene.add(fireworkMesh);

    const fireworkParticles = Array.from({ length: fireworkCount }, (_, idx) => {
      _dummyMatrix.position.set(0, -30, 0);
      _dummyMatrix.scale.set(0.01, 0.01, 0.01);
      _dummyMatrix.updateMatrix();
      fireworkMesh.setMatrixAt(idx, _dummyMatrix.matrix);
      _tempColor.setHex(CELEBRATION_PALETTE[idx % CELEBRATION_PALETTE.length]);
      fireworkMesh.setColorAt(idx, _tempColor);
      return {
        x: 0,
        y: -30,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
      };
    });
    fireworkMesh.instanceMatrix.needsUpdate = true;
    if (fireworkMesh.instanceColor) fireworkMesh.instanceColor.needsUpdate = true;
    let fireworkCursor = 0;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, Math.floor(entry.contentRect.width));
        const h = Math.max(240, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTimeMs = performance.now();

    function spawnTurfClump(hx: number, hz: number, count: number) {
      for (let i = 0; i < count; i++) {
        const p = particles[partCursor];
        partCursor = (partCursor + 1) % particleCount;
        p.x = hx + (Math.random() - 0.5) * 0.7;
        p.y = 0.12 + Math.random() * 0.15;
        p.z = hz + 0.8 + Math.random() * 0.5;
        p.vx = (Math.random() - 0.5) * 2.2;
        p.vy = 2.0 + Math.random() * 2.4;
        p.vz = 3.5 + Math.random() * 3.5;
        p.life = 0.5 + Math.random() * 0.25;
      }
    }

    function spawnConfettiBurst(centerX: number, centerZ: number) {
      for (let i = 0; i < confettiCount; i++) {
        const c = confettiParticles[i];
        c.x = centerX + (Math.random() - 0.5) * 20;
        c.y = 4.2 + Math.random() * 5.2;
        c.z = centerZ - 4 + (Math.random() - 0.5) * 14;
        c.vx = (Math.random() - 0.5) * 6.5;
        c.vy = 2.5 + Math.random() * 6.0;
        c.vz = (Math.random() - 0.5) * 6.5;
        c.rx = Math.random() * Math.PI * 2;
        c.ry = Math.random() * Math.PI * 2;
        c.rz = Math.random() * Math.PI * 2;
        c.vrx = (Math.random() - 0.5) * 10;
        c.vry = (Math.random() - 0.5) * 10;
        c.maxLife = 3.2 + Math.random() * 2.0;
        c.life = c.maxLife;
      }
    }

    function spawnFireworkShell(cx: number, cy: number, cz: number, colorHex: number) {
      const sparksPerShell = 44;
      let colorDirty = false;
      for (let i = 0; i < sparksPerShell; i++) {
        const idx = fireworkCursor;
        fireworkCursor = (fireworkCursor + 1) % fireworkCount;
        const f = fireworkParticles[idx];
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 7.5 + Math.random() * 6.5;
        f.x = cx;
        f.y = cy;
        f.z = cz;
        f.vx = Math.sin(phi) * Math.cos(theta) * speed;
        f.vy = Math.cos(phi) * speed + 2.2;
        f.vz = Math.sin(phi) * Math.sin(theta) * speed;
        f.maxLife = 1.15 + Math.random() * 0.65;
        f.life = f.maxLife;
        _tempColor.setHex(i % 4 === 0 ? 0xffffff : colorHex);
        fireworkMesh.setColorAt(idx, _tempColor);
        colorDirty = true;
      }
      if (colorDirty && fireworkMesh.instanceColor) {
        fireworkMesh.instanceColor.needsUpdate = true;
      }
      horseAudio.fireworkBurst(Math.random() * 2 - 1);
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;

      const sim = simRef.current;
      const curPhase = phaseRef.current;

      // 1. Update Simulation Physics
      if (curPhase === 'racing') {
        sim.elapsedSec += dt;

        // Rhythm decay & stamina recovery/drain
        sim.rhythmBoost = Math.max(0, sim.rhythmBoost - dt * 0.42);
        sim.whipTimer = Math.max(0, sim.whipTimer - dt);
        sim.boostTimer = Math.max(0, sim.boostTimer - dt);
        sim.mudTimer = Math.max(0, sim.mudTimer - dt);

        if (sim.sprintHeld && sim.stamina > 2) {
          sim.stamina = Math.max(0, sim.stamina - dt * 24);
          if (sim.whipTimer <= 0.05 && sim.stamina > 8) {
            sim.whipTimer = 0.25;
          }
        } else {
          sim.stamina = Math.min(100, sim.stamina + dt * 11.5);
        }

        // Base gallop speed + rhythm momentum + sprint + turf boost - mud penalty
        const baseGallop = 14.2;
        const rhythmGain = sim.rhythmBoost * 4.8;
        const sprintGain =
          (sim.sprintHeld && sim.stamina > 2 ? 3.2 : 0) + (sim.boostTimer > 0 ? 3.4 : 0);
        const mudPenalty = sim.mudTimer > 0 ? -4.8 : 0;

        // Draft slipstream bonus if close behind a rival in nearby lane
        let draftBonus = 0;
        for (const ai of sim.aiRacers) {
          const dz = sim.playerZ - ai.z; // positive when AI is ahead (more negative Z)
          if (dz > 1.8 && dz < 7.5 && Math.abs(ai.x - sim.playerX) < 2.2) {
            draftBonus = 1.15;
            break;
          }
        }

        const targetSpeed = Math.max(
          9.5,
          Math.min(25.2, baseGallop + rhythmGain + sprintGain + draftBonus + mudPenalty)
        );
        sim.speedMps = THREE.MathUtils.damp(sim.speedMps, targetSpeed, 4.2, dt);

        const prevX = sim.playerX;
        sim.playerX = THREE.MathUtils.damp(sim.playerX, LANE_X[sim.targetLaneIdx], 9.0, dt);
        const leanAngle = (prevX - sim.playerX) / Math.max(0.001, dt);

        if (sim.finishTimeSec === null) {
          sim.playerZ -= sim.speedMps * dt;
          if (sim.playerZ <= -HORSE_TRACK_LENGTH) {
            sim.playerZ = -HORSE_TRACK_LENGTH;
            sim.finishTimeSec = sim.elapsedSec;
          }
        } else {
          // Graceful cooldown trot past finish banner
          sim.speedMps = THREE.MathUtils.damp(sim.speedMps, 6.0, 2.5, dt);
          sim.playerZ = Math.max(-HORSE_TRACK_LENGTH - 32, sim.playerZ - sim.speedMps * dt);
        }

        const curKmh = Math.round(sim.speedMps * 3.6);
        if (curKmh > sim.topSpeedKmh) sim.topSpeedKmh = curKmh;

        // Check Track Features (Turf Speed Boosts & Mud Patches)
        if (sim.finishTimeSec === null) {
          for (const feat of trackFeatures) {
            if (sim.triggeredFeatures.has(feat.id)) continue;
            if (
              Math.abs(sim.playerX - feat.x) <= feat.halfW + 0.45 &&
              Math.abs(sim.playerZ - feat.z) <= feat.halfL
            ) {
              sim.triggeredFeatures.add(feat.id);
              if (feat.type === 'boost') {
                sim.boostTimer = 1.65;
                sim.stamina = Math.min(100, sim.stamina + 14);
                sim.boostsHit += 1;
                horseAudio.turfBoost();
              } else {
                sim.mudTimer = 1.35;
                sim.mudHits += 1;
                horseAudio.mudSplash();
              }
            }
          }
        }

        // Dynamic 4-beat gallop stride & speed-varied hoofbeat audio (plus nearby pack hooves!)
        const speedNorm = THREE.MathUtils.clamp((sim.speedMps - 8) / 16, 0.15, 1.3);
        sim.stridePhase += dt * (6.8 + speedNorm * 9.4);
        const TWO_PI = Math.PI * 2;
        const cycle = Math.floor(sim.stridePhase / TWO_PI);
        const cycleFrac = (sim.stridePhase % TWO_PI) / TWO_PI;
        // Asymmetric thoroughbred 4-beat gallop offsets inside each stride + brief suspension phase
        const beatStep =
          cycleFrac >= 0.78 ? 3 : cycleFrac >= 0.52 ? 2 : cycleFrac >= 0.22 ? 1 : 0;

        if (cycle !== sim.lastHoofCycle || beatStep !== sim.lastHoofStep) {
          sim.lastHoofCycle = cycle;
          sim.lastHoofStep = beatStep;
          const surface =
            sim.mudTimer > 0 ? 'mud' : sim.boostTimer > 0 ? 'boost' : 'turf';
          const volume = sim.finishTimeSec === null ? 0.85 : 0.45;
          horseAudio.hoofbeat({
            speedNorm,
            beatIndex: beatStep,
            surface,
            volume,
            pan: 0,
          });
          if (sim.finishTimeSec === null && (beatStep === 0 || beatStep === 3)) {
            spawnTurfClump(sim.playerX, sim.playerZ, 2);
          }
        }

        playerRig.root.position.set(sim.playerX, 0, sim.playerZ);
        animateHorseGallop(
          playerRig,
          sim.stridePhase,
          speedNorm,
          sim.whipTimer,
          THREE.MathUtils.clamp(leanAngle * 0.08, -0.7, 0.7)
        );

        // Update AI Rivals with realistic elastic pace + stereo pack hoofbeats when nearby
        let closestRival: (typeof sim.aiRacers)[number] | null = null;
        let closestRivalDist = 18;
        sim.aiRacers.forEach((ai, idx) => {
          const rig = aiRigs[idx];
          const wave = Math.sin(sim.elapsedSec * 0.85 + ai.seedPhase) * ai.burstAmp;
          // Gentle rubber-banding so race stays exciting
          const gapToPlayer = sim.playerZ - ai.z; // negative if AI is behind
          const elastic = THREE.MathUtils.clamp(gapToPlayer * -0.065, -1.6, 1.8);
          const aiTarget =
            ai.finishTimeSec === null ? ai.baseSpeedMps + wave + elastic : 5.5;
          ai.speedMps = THREE.MathUtils.damp(ai.speedMps, aiTarget, 2.8, dt);
          if (ai.finishTimeSec === null) {
            ai.z -= ai.speedMps * dt;
            if (ai.z <= -HORSE_TRACK_LENGTH) {
              ai.z = -HORSE_TRACK_LENGTH;
              ai.finishTimeSec = sim.elapsedSec;
            }
          } else {
            ai.z = Math.max(-HORSE_TRACK_LENGTH - 32, ai.z - ai.speedMps * dt);
          }
          const aiNorm = THREE.MathUtils.clamp((ai.speedMps - 8) / 16, 0.15, 1.25);
          ai.stridePhase += dt * (6.8 + aiNorm * 9.0);
          rig.root.position.set(ai.x, 0, ai.z);
          animateHorseGallop(rig, ai.stridePhase, aiNorm, 0, 0);

          const distToPlayer = Math.hypot(ai.x - sim.playerX, ai.z - sim.playerZ);
          if (distToPlayer < closestRivalDist) {
            closestRivalDist = distToPlayer;
            closestRival = ai;
          }
        });

        if (closestRival && sim.finishTimeSec === null) {
          const rival = closestRival as (typeof sim.aiRacers)[number];
          const rCycle = Math.floor(rival.stridePhase / TWO_PI);
          const rFrac = (rival.stridePhase % TWO_PI) / TWO_PI;
          const rStep = rFrac >= 0.78 ? 3 : rFrac >= 0.52 ? 2 : rFrac >= 0.22 ? 1 : 0;
          if (rCycle !== rival.lastHoofCycle || rStep !== rival.lastHoofStep) {
            rival.lastHoofCycle = rCycle;
            rival.lastHoofStep = rStep;
            const rivalNorm = THREE.MathUtils.clamp((rival.speedMps - 8) / 16, 0.15, 1.25);
            const atten = THREE.MathUtils.clamp(1 - closestRivalDist / 18, 0.12, 0.52);
            const pan = THREE.MathUtils.clamp((rival.x - sim.playerX) / 10, -0.85, 0.85);
            horseAudio.hoofbeat({
              speedNorm: rivalNorm,
              beatIndex: rStep,
              surface: 'turf',
              volume: atten,
              pan,
            });
          }
        }
      } else {
        // Ready / Countdown / Finished idle subtle breathing/trot pose
        const idlePhase = nowMs * 0.0025;
        playerRig.root.position.set(sim.playerX, 0, sim.playerZ);
        animateHorseGallop(playerRig, idlePhase * 0.35, 0.04, 0, 0);
        sim.aiRacers.forEach((ai, idx) => {
          const rig = aiRigs[idx];
          rig.root.position.set(ai.x, 0, ai.z);
          animateHorseGallop(rig, idlePhase * 0.35 + idx, 0.04, 0, 0);
        });
      }

      // 2. Update Live Multiplayer Peer Horses
      const activePeers = peersRef.current.filter((p) => p.studentId !== user.id);
      const seenIds = new Set<string>();
      activePeers.slice(0, 6).forEach((p, idx) => {
        seenIds.add(p.studentId);
        let entry = peerRigs.get(p.studentId);
        if (!entry) {
          const palette = PEER_COLORS[idx % PEER_COLORS.length];
          const rig = createHorseAndJockey(
            {
              label: p.studentName.split(' ')[0],
              coatColor: palette.coat,
              maneColor: 0x1c1917,
              silkColor: palette.silk,
              helmetColor: palette.silk,
              accentHex: p.carColor || palette.hex,
              silkHex: p.carColor || palette.hex,
              silkPattern: palette.pattern,
              avatarIcon: p.avatarIcon || '🏇',
              isPlayer: false,
            },
            env.contactShadowTex
          );
          const laneX = LANE_X[(idx + 1) % LANE_X.length] + (idx % 2 === 0 ? 1.2 : -1.2);
          scene.add(rig.root);
          entry = {
            rig,
            smoothZ: -(p.progress / 100) * HORSE_TRACK_LENGTH,
            smoothX: THREE.MathUtils.clamp(laneX, -TRACK_HALF_WIDTH + 2, TRACK_HALF_WIDTH - 2),
            stride: idx * 1.4,
          };
          peerRigs.set(p.studentId, entry);
        }
        const targetZ = -(p.progress / 100) * HORSE_TRACK_LENGTH;
        entry.smoothZ = THREE.MathUtils.damp(entry.smoothZ, targetZ, 5.0, dt);
        const speedNorm = THREE.MathUtils.clamp((p.speedKmh || 45) / 75, 0.15, 1.15);
        entry.stride += dt * (curPhase === 'racing' ? 7 + speedNorm * 8 : 1.5);
        entry.rig.root.position.set(entry.smoothX, 0, entry.smoothZ);
        animateHorseGallop(entry.rig, entry.stride, curPhase === 'racing' ? speedNorm : 0.04, 0, 0);
      });
      for (const [id, entry] of peerRigs.entries()) {
        if (!seenIds.has(id)) {
          scene.remove(entry.rig.root);
          entry.rig.dispose();
          peerRigs.delete(id);
        }
      }

      // 3. Update Turf Clump Particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        if (p.life > 0) {
          p.life -= dt;
          p.vy -= 9.8 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          _dummyMatrix.position.set(p.x, Math.max(0.02, p.y), p.z);
          const sc = Math.max(0.01, p.life * 1.8);
          _dummyMatrix.scale.set(sc, sc, sc);
          _dummyMatrix.rotation.set(p.life * 6, p.life * 4, 0);
        } else {
          _dummyMatrix.position.set(0, -20, 0);
          _dummyMatrix.scale.set(0.01, 0.01, 0.01);
        }
        _dummyMatrix.updateMatrix();
        particleMesh.setMatrixAt(i, _dummyMatrix.matrix);
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      // 3b. Update Victory Fireworks & Confetti Celebration
      if (sim.celebrating) {
        sim.celebrationElapsed += dt;
        if (sim.celebrationElapsed >= sim.nextFireworkAt && sim.celebrationElapsed < 12) {
          const shellX = (Math.random() - 0.5) * 22;
          const shellY = 8.5 + Math.random() * 6.5;
          const shellZ = -HORSE_TRACK_LENGTH - 10 - Math.random() * 20;
          const colorHex =
            CELEBRATION_PALETTE[Math.floor(Math.random() * CELEBRATION_PALETTE.length)];
          spawnFireworkShell(shellX, shellY, shellZ, colorHex);
          sim.nextFireworkAt = sim.celebrationElapsed + 0.45 + Math.random() * 0.45;
        }
      }

      let confettiActive = false;
      for (let i = 0; i < confettiCount; i++) {
        const c = confettiParticles[i];
        if (sim.celebrating && c.life > 0) {
          confettiActive = true;
          c.life -= dt;
          c.vy = Math.max(-2.8, c.vy - 4.2 * dt);
          c.vx += Math.sin(nowMs * 0.005 + i) * 1.4 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.z += c.vz * dt;
          c.rx += c.vrx * dt;
          c.ry += c.vry * dt;
          if (c.y < 0.08) {
            c.y = 0.08;
            c.vy = 0;
            c.vx *= 0.9;
            c.vz *= 0.9;
          }
          const fade = Math.min(1, c.life / 0.6);
          _dummyMatrix.position.set(c.x, c.y, c.z);
          _dummyMatrix.rotation.set(c.rx, c.ry, c.rz);
          _dummyMatrix.scale.set(1.2 * fade, 1.2 * fade, 1.2 * fade);
        } else {
          _dummyMatrix.position.set(0, -30, 0);
          _dummyMatrix.scale.set(0.01, 0.01, 0.01);
        }
        _dummyMatrix.updateMatrix();
        confettiMesh.setMatrixAt(i, _dummyMatrix.matrix);
      }
      if (confettiActive || !sim.celebrating) {
        confettiMesh.instanceMatrix.needsUpdate = true;
      }

      for (let i = 0; i < fireworkCount; i++) {
        const f = fireworkParticles[i];
        if (sim.celebrating && f.life > 0) {
          f.life -= dt;
          f.vy -= 5.4 * dt;
          f.vx *= 0.985;
          f.vz *= 0.985;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.z += f.vz * dt;
          const fade = Math.max(0.01, (f.life / f.maxLife) * 1.35);
          _dummyMatrix.position.set(f.x, Math.max(0.2, f.y), f.z);
          _dummyMatrix.rotation.set(0, 0, 0);
          _dummyMatrix.scale.set(fade, fade, fade);
        } else {
          _dummyMatrix.position.set(0, -30, 0);
          _dummyMatrix.scale.set(0.01, 0.01, 0.01);
        }
        _dummyMatrix.updateMatrix();
        fireworkMesh.setMatrixAt(i, _dummyMatrix.matrix);
      }
      fireworkMesh.instanceMatrix.needsUpdate = true;

      // 4. Keep Sunlight Shadow Camera tracking Player Horse cleanly
      sunLight.position.set(sim.playerX + 26, 40, sim.playerZ + 18);
      sunLight.target.position.set(sim.playerX, 0, sim.playerZ - 14);
      sunLight.target.updateMatrixWorld();

      // 5. Exponential Camera Damping (Default Chase Angle matches reference image!)
      const preset = cameraPresetRef.current;
      const speedRatio = THREE.MathUtils.clamp((sim.speedMps - 10) / 14, 0, 1);
      const bobY = curPhase === 'racing' ? Math.sin(sim.stridePhase * 2) * 0.045 * speedRatio : 0;

      if (preset === 'chase') {
        _camTargetPos.set(sim.playerX * 0.88, 3.05 + bobY, sim.playerZ + 5.15);
        _camTargetLook.set(sim.playerX * 0.55 - 0.65, 1.38, sim.playerZ - 26);
        const targetFov = 58 + speedRatio * 7.5;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
          camera.updateProjectionMatrix();
        }
      } else if (preset === 'side') {
        _camTargetPos.set(sim.playerX + 9.2, 2.75, sim.playerZ - 1.5);
        _camTargetLook.set(sim.playerX, 1.3, sim.playerZ - 5.5);
        if (Math.abs(camera.fov - 52) > 0.1) {
          camera.fov = THREE.MathUtils.damp(camera.fov, 52, 5, dt);
          camera.updateProjectionMatrix();
        }
      } else {
        _camTargetPos.set(0, 14.5, sim.playerZ + 16.5);
        _camTargetLook.set(0, 0.8, sim.playerZ - 32);
        if (Math.abs(camera.fov - 62) > 0.1) {
          camera.fov = THREE.MathUtils.damp(camera.fov, 62, 5, dt);
          camera.updateProjectionMatrix();
        }
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 7.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 7.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 12.0, dt);
      camera.lookAt(_camTargetLook);

      renderer.render(scene, camera);

      // 6. Throttled React HUD & Multiplayer Network Sync (~10Hz HUD, ~2.5Hz Net)
      if (curPhase === 'racing' && nowMs - sim.lastHudSyncMs >= 100) {
        sim.lastHudSyncMs = nowMs;
        const distM = Math.min(HORSE_TRACK_LENGTH, Math.round(Math.abs(sim.playerZ)));
        const progressPct = Math.min(100, Math.round((distM / HORSE_TRACK_LENGTH) * 100));
        const speedKmh = Math.round(sim.speedMps * 3.6);

        const allRacers: RacerStandingsItem[] = [
          {
            id: user.id,
            name: user.fullName.split(' ')[0] + ' (Kamu)',
            isPlayer: true,
            isPeer: false,
            progressPct,
            finishTimeSec: sim.finishTimeSec,
            speedKmh,
            accentHex: '#dc2626',
          },
          ...sim.aiRacers.map((ai) => ({
            id: ai.id,
            name: ai.name,
            isPlayer: false,
            isPeer: false,
            progressPct: Math.min(100, Math.round((Math.abs(ai.z) / HORSE_TRACK_LENGTH) * 100)),
            finishTimeSec: ai.finishTimeSec,
            speedKmh: Math.round(ai.speedMps * 3.6),
            accentHex: ai.accentHex,
          })),
          ...activePeers.map((p, idx) => ({
            id: p.studentId,
            name: p.studentName.split(' ')[0],
            isPlayer: false,
            isPeer: true,
            progressPct: Math.min(100, Math.round(p.progress)),
            finishTimeSec: p.finishedAt ? p.finishedAt : null,
            speedKmh: Math.round(p.speedKmh || 0),
            accentHex: p.carColor || PEER_COLORS[idx % PEER_COLORS.length].hex,
          })),
        ].sort((a, b) => {
          if (a.finishTimeSec !== null && b.finishTimeSec !== null) {
            return a.finishTimeSec - b.finishTimeSec;
          }
          if (a.finishTimeSec !== null) return -1;
          if (b.finishTimeSec !== null) return 1;
          return b.progressPct - a.progressPct;
        });

        const playerRank = Math.max(1, allRacers.findIndex((r) => r.isPlayer) + 1);
        const statusLabel =
          sim.boostTimer > 0
            ? 'Turbo Rumput Prima!'
            : sim.mudTimer > 0
            ? 'Terkena Lumpur!'
            : sim.sprintHeld
            ? 'Sprint Cambuk!'
            : 'Pacuan Stabil';

        setHud({
          distanceM: distM,
          speedKmh,
          stamina: Math.round(sim.stamina),
          rhythmMeter: Math.round(sim.rhythmBoost * 100),
          rank: playerRank,
          totalRacers: allRacers.length,
          elapsedSec: Number(sim.elapsedSec.toFixed(1)),
          boostsHit: sim.boostsHit,
          mudHits: sim.mudHits,
          topSpeedKmh: sim.topSpeedKmh,
          statusLabel,
          standings: allRacers,
        });

        // Live Room sync
        if (roomCode && nowMs - sim.lastNetSyncMs >= 420) {
          sim.lastNetSyncMs = nowMs;
          const liveScore = Math.max(0, Math.round(progressPct * 6 + sim.boostsHit * 25));
          sendProgressRef.current({
            progress: progressPct,
            score: liveScore,
            streak: sim.boostsHit,
            speedKmh,
            statusEffect:
              sim.finishTimeSec !== null
                ? 'finished'
                : sim.boostTimer > 0 || sim.sprintHeld
                ? 'nitro'
                : sim.mudTimer > 0
                ? 'skid'
                : 'normal',
            finishedAt: sim.finishTimeSec !== null ? Date.now() : undefined,
          });
        }

        // Handle finish crossing — launch fireworks & confetti immediately!
        if (sim.finishTimeSec !== null && !sim.celebrating) {
          sim.celebrating = true;
          sim.celebrationElapsed = 0;
          sim.nextFireworkAt = 0.35;
          spawnConfettiBurst(sim.playerX, -HORSE_TRACK_LENGTH);
          spawnFireworkShell(-6.5, 10.5, -HORSE_TRACK_LENGTH - 14, 0xfbbf24);
          spawnFireworkShell(6.5, 11.2, -HORSE_TRACK_LENGTH - 16, 0xef4444);

          const finishTimeSec = Number(sim.finishTimeSec.toFixed(2));
          const placementBonus = Math.max(250, 900 - (playerRank - 1) * 140);
          const timeBonus = Math.max(0, Math.round((85 - finishTimeSec) * 4));
          const finalScore = Math.min(
            1000,
            placementBonus + timeBonus + sim.boostsHit * 18 - sim.mudHits * 10
          );
          const resPayload = {
            placement: playerRank,
            score: Math.max(200, finalScore),
            finishTimeSec,
            topSpeedKmh: sim.topSpeedKmh,
            boostsHit: sim.boostsHit,
            mudHits: sim.mudHits,
            standings: allRacers,
          };
          setFinalResult(resPayload);
          setFinishBanner({ placement: playerRank, score: resPayload.score });
          soundFx.victory();
          if (roomCode) {
            sendProgressRef.current({
              progress: 100,
              score: resPayload.score,
              streak: sim.boostsHit,
              speedKmh,
              statusEffect: 'finished',
              finishedAt: Date.now(),
            });
          }
          submitScoreToServer(resPayload);

          // Let player admire fireworks & confetti over the finish line for 2.2s before podium card appears
          podiumTimerRef.current = window.setTimeout(() => {
            if (!disposed) {
              sim.podiumShown = true;
              setFinishBanner(null);
              setPhase('finished');
            }
          }, 2200);
        }
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (podiumTimerRef.current !== null) {
        window.clearTimeout(podiumTimerRef.current);
        podiumTimerRef.current = null;
      }
      resizeObserver.disconnect();
      playerRigRef.current = null;
      playerRig.dispose();
      aiRigs.forEach((r) => r.dispose());
      peerRigs.forEach((entry) => entry.rig.dispose());
      partGeo.dispose();
      partMat.dispose();
      confettiGeo.dispose();
      confettiMat.dispose();
      fireworkGeo.dispose();
      fireworkMat.dispose();
      env.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, [trackFeatures, user.id, user.fullName, roomCode, submitScoreToServer]);

  return (
    <div className="space-y-4">
      {/* Compact Header Outside 3D Viewport */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Keluar
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                Pacuan Kuda 3D Realistis
              </h1>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                TANPA SOAL · BALAPAN MURNI
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {mode === 'live' && roomCode
                ? `Mode Live Room ${roomCode.toUpperCase()} · Bersaing bersama teman kelas`
                : 'Mode Mandiri · Duel 1.200m melawan 4 joki tangguh di stadion rumput'}
            </p>
          </div>
        </div>

        {/* Live Telemetry Readout */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="text-slate-500">Posisi: </span>
            <strong className="text-emerald-700">
              #{hud.rank}/{hud.totalRacers}
            </strong>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="text-slate-500">Jarak: </span>
            <strong className="text-slate-900 tabular-nums">
              {hud.distanceM} / {HORSE_TRACK_LENGTH}m
            </strong>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="text-slate-500">Laju: </span>
            <strong className="text-sky-700 tabular-nums">{hud.speedKmh} km/h</strong>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="text-slate-500">Waktu: </span>
            <strong className="text-slate-900 tabular-nums">{hud.elapsedSec.toFixed(1)}s</strong>
          </div>
        </div>
      </div>

      {/* Live Room Standings Banner (outside WebGL canvas) */}
      {mode === 'live' && roomCode && (
        <LiveRoomStandings
          roomCode={roomCode}
          peers={peers}
          currentUserId={user.id}
          variant="banner"
        />
      )}

      {/* 3D Stadium Viewport Container */}
      <div className="relative h-[540px] sm:h-[600px] w-full overflow-hidden rounded-2xl border border-slate-300 bg-sky-200 shadow-sm select-none">
        {/* Isolated WebGL Mount */}
        <div ref={canvasMountRef} className="h-full w-full" />

        {/* Minimal Top-Left Race Progress Strip (no backdrop-blur over WebGL) */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/90 px-3 py-1.5 text-xs text-white">
            <span className="font-semibold text-amber-300">{hud.statusLabel}</span>
            <span className="mx-2 text-slate-500">|</span>
            <span className="font-mono text-emerald-300">
              Turf Boost: {hud.boostsHit} · Lumpur: {hud.mudHits}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/90 px-3 py-1.5 text-[11px] font-mono text-slate-200">
            <Flag className="h-3.5 w-3.5 text-emerald-400" />
            <span>{Math.min(100, Math.round((hud.distanceM / HORSE_TRACK_LENGTH) * 100))}%</span>
            <div className="h-2 w-28 overflow-hidden rounded bg-slate-700">
              <div
                className="h-full bg-emerald-400"
                style={{
                  width: `${Math.min(100, Math.round((hud.distanceM / HORSE_TRACK_LENGTH) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Ready Overlay */}
        {phase === 'ready' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                  STADION RUMPUT 3D · 1.200M
                </span>
                <span className="rounded bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-950">
                  TANPA SOAL
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-white">
                Siap Pacu Kuda Terbaikmu!
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Murni adu kecepatan, irama pacu, pindah jalur, dan manajemen stamina menuju garis
                finis. Tanpa pertanyaan kuis — fokus penuh di lintasan pacuan!
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <p className="font-bold text-amber-300">1. Irama Pacu</p>
                  <p className="mt-1 text-slate-300">
                    Tekan <strong>Spasi</strong> atau klik <strong>PACU</strong> berirama untuk
                    menambah kecepatan.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <p className="font-bold text-emerald-300">2. Pilih Jalur</p>
                  <p className="mt-1 text-slate-300">
                    Gunakan <strong>← / →</strong> atau <strong>A / D</strong> untuk injak{' '}
                    <span className="text-lime-300">Turf Boost</span> & hindari lumpur.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <p className="font-bold text-sky-300">3. Sprint Cambuk</p>
                  <p className="mt-1 text-slate-300">
                    Tahan <strong>Shift / W</strong> saat stamina cukup untuk akselerasi puncak!
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/90 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200">
                    Pilih Emblem Joki (Animasi Aktif Sesuai Kecepatan):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {jockeyAvatarOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => handleSelectJockeyAvatar(icon)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${
                          jockeyAvatar === icon
                            ? 'border-amber-400 bg-emerald-600 text-white shadow'
                            : 'border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={startRace}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-emerald-500"
              >
                <Play className="h-5 w-5" />
                Mulai Balapan Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="rounded-2xl border-2 border-amber-400 bg-slate-900/95 px-10 py-6 text-center text-white shadow-2xl">
              <p className="text-xs font-bold tracking-widest text-amber-300">
                GERBANG START SIAP
              </p>
              <p className="mt-1 font-mono text-6xl font-black text-white tabular-nums">
                {countdownVal}
              </p>
            </div>
          </div>
        )}

        {/* Celebratory Finish Crossing Banner (shows while fireworks & confetti burst over the 3D scene!) */}
        {phase === 'racing' && finishBanner && (
          <div className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2">
            <div className="rounded-2xl border-2 border-amber-400 bg-slate-900/95 px-8 py-4 text-center text-white shadow-2xl">
              <p className="text-xs font-bold tracking-widest text-amber-300">
                GARIS FINIS 1.200M TERCAPAI!
              </p>
              <p className="mt-1 font-display text-3xl font-black text-white">
                {finishBanner.placement === 1
                  ? 'JUARA #1!'
                  : `PERINGKAT #${finishBanner.placement}!`}
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-emerald-400">
                +{finishBanner.score} POIN
              </p>
            </div>
          </div>
        )}

        {/* Finish Podium Overlay (semi-transparent dark scrim so 3D fireworks continue visible behind) */}
        {phase === 'finished' && finalResult && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
                    <Trophy className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-300">
                      GARIS FINIS 1.200M TERCAPAI
                    </p>
                    <h2 className="text-2xl font-extrabold">
                      Peringkat #{finalResult.placement}
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Skor Balapan</p>
                  <p className="font-mono text-3xl font-black text-emerald-400 tabular-nums">
                    {finalResult.score}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-slate-800 bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Waktu Finis</p>
                  <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                    {finalResult.finishTimeSec}s
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Kecepatan Puncak</p>
                  <p className="mt-1 font-mono text-lg font-bold text-sky-300 tabular-nums">
                    {finalResult.topSpeedKmh} km/h
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Turf Boost</p>
                  <p className="mt-1 font-mono text-lg font-bold text-lime-300 tabular-nums">
                    {finalResult.boostsHit}x
                  </p>
                </div>
              </div>

              {/* Podium Standings List */}
              <div className="mt-4 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {finalResult.standings.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                      item.isPlayer
                        ? 'border-emerald-500 bg-emerald-950/60 font-bold'
                        : 'border-slate-800 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 font-mono font-bold text-amber-300">#{idx + 1}</span>
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: item.accentHex }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-300 tabular-nums">
                      {item.finishTimeSec !== null
                        ? `${item.finishTimeSec.toFixed(2)}s`
                        : `${item.progressPct}%`}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                {savingScore
                  ? 'Menyimpan skor ke papan peringkat...'
                  : scoreSaved
                  ? 'Skor berhasil disimpan ke papan peringkat kelas.'
                  : 'Hasil balapan siap dicatat.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startRace}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
                >
                  <RotateCcw className="h-4 w-4" />
                  Balapan Lagi
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                >
                  Kembali ke Arena
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Unified Bottom Control Dock (Zero Viewport Occlusion, No backdrop-blur) */}
        <div
          className={`absolute bottom-3 left-1/2 z-10 w-[94%] max-w-4xl -translate-x-1/2 transition-transform duration-300 ${
            dockCollapsed ? 'translate-y-[calc(100%-32px)]' : 'translate-y-0'
          }`}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700 bg-slate-900/95 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:text-white"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Tampilkan Kontrol (H)
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Sembunyikan Kontrol (H)
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Lane Steering */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => steerLane(-1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-white active:bg-slate-700 hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Kiri
                </button>
                <button
                  type="button"
                  onClick={() => steerLane(1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-white active:bg-slate-700 hover:bg-slate-700"
                >
                  Kanan
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Primary Spur & Sprint Controls */}
              <div className="flex flex-1 items-center justify-center gap-2 min-w-[230px]">
                <button
                  type="button"
                  onClick={triggerSpur}
                  className="inline-flex flex-1 max-w-[210px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white transition-colors active:scale-95 hover:bg-emerald-500"
                >
                  <Gauge className="h-4 w-4" />
                  PACU (Spasi)
                </button>

                <button
                  type="button"
                  onPointerDown={() => {
                    simRef.current.sprintHeld = true;
                    triggerWhipSprint();
                  }}
                  onPointerUp={() => {
                    simRef.current.sprintHeld = false;
                  }}
                  onPointerLeave={() => {
                    simRef.current.sprintHeld = false;
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2.5 text-xs font-extrabold text-slate-950 transition-colors active:scale-95 hover:bg-amber-400"
                >
                  <Zap className="h-4 w-4" />
                  SPRINT (Shift)
                </button>
              </div>

              {/* Stamina Bar + Camera Toggle */}
              <div className="flex items-center gap-3">
                <div className="w-28">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span>STAMINA</span>
                    <span>{hud.stamina}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-800">
                    <div
                      className={`h-full transition-all duration-150 ${
                        hud.stamina > 35 ? 'bg-amber-400' : 'bg-red-500'
                      }`}
                      style={{ width: `${hud.stamina}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-1 text-[11px]">
                  <Camera className="mx-1 h-3.5 w-3.5 text-slate-400" />
                  {(['chase', 'side', 'aerial'] as CameraPreset[]).map((cam) => (
                    <button
                      key={cam}
                      type="button"
                      onClick={() => setCameraPreset(cam)}
                      className={`rounded px-2 py-1 font-semibold transition-colors ${
                        cameraPreset === cam
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {cam === 'chase' ? 'Joki' : cam === 'side' ? 'Samping' : 'Udara'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Standings Bar Below Track */}
      {hud.standings.length > 0 && phase === 'racing' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {hud.standings.slice(0, 5).map((item, idx) => (
            <div
              key={item.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                item.isPlayer
                  ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-950'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate">
                  #{idx + 1} {item.name}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums">
                  {item.progressPct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full transition-all duration-150"
                  style={{
                    width: `${Math.max(4, item.progressPct)}%`,
                    backgroundColor: item.accentHex,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Hint Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Award className="h-4 w-4 text-emerald-700" />
          <strong>Kontrol Keyboard:</strong> <code>Spasi</code> Pacu Irama · <code>A / D</code> atau{' '}
          <code>← / →</code> Pindah Jalur · <code>Shift / W</code> Sprint Cambuk · <code>H</code>{' '}
          Tutup Kontrol
        </span>
        <span className="font-mono text-slate-500">
          Lintasan Rumput 1.200m · Mode {mode === 'live' ? 'Multiplayer Live' : 'Mandiri'}
        </span>
      </div>
    </div>
  );
};

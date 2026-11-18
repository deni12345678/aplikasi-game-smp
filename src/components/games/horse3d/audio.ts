import { getSoundMuted } from '../../../utils/sound';

let horseAudioCtx: AudioContext | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || getSoundMuted()) return null;
  if (!horseAudioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) horseAudioCtx = new AC();
  }
  if (horseAudioCtx && horseAudioCtx.state === 'suspended') {
    horseAudioCtx.resume().catch(() => {});
  }
  return horseAudioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.14);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = buffer;
  return buffer;
}

export type HoofSurface = 'turf' | 'boost' | 'mud';

export interface HoofbeatOptions {
  speedNorm?: number; // 0.1 .. 1.3
  beatIndex?: number; // 0..3 inside 4-beat gallop stride
  surface?: HoofSurface;
  volume?: number; // 0..1 attenuation (e.g., 1 for player, 0.25..0.55 for nearby rival)
  pan?: number; // -1 (left) .. 1 (right)
}

export const horseAudio = {
  hoofbeat(input: number | HoofbeatOptions = 0.7) {
    const ctx = getCtx();
    if (!ctx) return;

    const opts: HoofbeatOptions =
      typeof input === 'number' ? { speedNorm: input, volume: input } : input;

    const speedNorm = Math.max(0.1, Math.min(1.35, opts.speedNorm ?? 0.7));
    const beatIndex = (opts.beatIndex ?? 0) % 4;
    const surface: HoofSurface = opts.surface ?? 'turf';
    const vol = Math.max(0.05, Math.min(1.1, opts.volume ?? 0.85));
    const pan = Math.max(-1, Math.min(1, opts.pan ?? 0));

    const now = ctx.currentTime;

    // Accent pattern inside 4-beat thoroughbred gallop: beat 0 & 3 slightly heavier push-off
    const beatAccent = beatIndex === 0 ? 1.12 : beatIndex === 3 ? 1.05 : 0.84;
    const pitchJitter = 0.93 + Math.random() * 0.14;
    const beatPitchBias = [0.96, 1.06, 1.02, 0.91][beatIndex];
    const speedPitchScale = 0.82 + speedNorm * 0.36;

    // Faster speeds produce crisper, shorter turf strikes
    const hitDuration = Math.max(0.042, 0.088 - speedNorm * 0.028);
    const baseFreq =
      (surface === 'mud' ? 84 : surface === 'boost' ? 132 : 112) *
      speedPitchScale *
      beatPitchBias *
      pitchJitter;
    const endFreq = surface === 'mud' ? 32 : 42 + speedNorm * 10;

    // Output stage (with optional stereo panning for nearby rivals)
    let outputNode: AudioNode = ctx.destination;
    if (Math.abs(pan) > 0.04 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, now);
      panner.connect(ctx.destination);
      outputNode = panner;
    }

    // Layer 1: Low-end ground impact thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = surface === 'mud' ? 'sine' : 'triangle';
    thumpOsc.frequency.setValueAtTime(baseFreq, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(endFreq, now + hitDuration);
    const thumpPeak = 0.068 * vol * beatAccent * (0.65 + speedNorm * 0.35);
    thumpGain.gain.setValueAtTime(thumpPeak, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + hitDuration + 0.012);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(outputNode);
    thumpOsc.start(now);
    thumpOsc.stop(now + hitDuration + 0.018);

    // Layer 2: Bandpass-filtered turf / dirt crunch transient
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const turfCenterHz =
      (surface === 'mud' ? 340 : surface === 'boost' ? 1150 : 780) *
      (0.88 + speedNorm * 0.25) *
      pitchJitter;
    filter.frequency.setValueAtTime(turfCenterHz, now);
    filter.Q.setValueAtTime(surface === 'mud' ? 1.8 : 2.6, now);

    const noiseGain = ctx.createGain();
    const noisePeak =
      (surface === 'mud' ? 0.055 : 0.042) * vol * beatAccent * (0.55 + speedNorm * 0.45);
    noiseGain.gain.setValueAtTime(noisePeak, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + hitDuration * 0.9);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(outputNode);
    noiseSrc.start(now, Math.random() * 0.03, hitDuration + 0.01);
  },

  whipSprint() {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  },

  startBell() {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 880 : 1320, now + i * 0.06);
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.45);
    }
  },

  turfBoost() {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.06, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.15);
    });
  },

  mudSplash() {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  },

  fireworkBurst(pitchOffset = 0) {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low boom thump
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(140 + pitchOffset * 20, now);
    boom.frequency.exponentialRampToValueAtTime(34, now + 0.28);
    boomGain.gain.setValueAtTime(0.11, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    boom.connect(boomGain);
    boomGain.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.32);

    // High sparkle crackles
    for (let i = 0; i < 4; i++) {
      const t = now + 0.04 + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980 + Math.random() * 900, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.09);
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    }
  },
};

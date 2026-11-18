let audioCtx: AudioContext | null = null;
let isMuted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted) return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
}

export function getSoundMuted(): boolean {
  return isMuted;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(gainVal, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const soundFx = {
  click() {
    playTone(540, 0.06, 'triangle', 0.04);
  },
  correct() {
    playTone(523.25, 0.12, 'sine', 0.08, 0);
    playTone(659.25, 0.16, 'sine', 0.08, 0.08);
  },
  wrong() {
    playTone(220, 0.18, 'sawtooth', 0.06, 0);
    playTone(185, 0.22, 'sawtooth', 0.05, 0.1);
  },
  nitro() {
    playTone(440, 0.1, 'triangle', 0.07, 0);
    playTone(587.33, 0.12, 'triangle', 0.07, 0.06);
    playTone(880, 0.2, 'sine', 0.08, 0.12);
  },
  pop(chordIndex = 0) {
    const ctx = getCtx();
    if (!ctx) return;
    const delay = chordIndex * 0.06;
    const now = ctx.currentTime + delay;
    const pitchBoost = Math.pow(1.12, Math.min(chordIndex, 4));

    // Tactile rising bubble-pop fundamental
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 * pitchBoost, now);
    osc.frequency.exponentialRampToValueAtTime(920 * pitchBoost, now + 0.065);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);

    // Crisp sparkle overtone
    playTone(1318.5 * pitchBoost, 0.11, 'triangle', 0.045, delay + 0.025);
  },
  victory() {
    playTone(523.25, 0.12, 'sine', 0.08, 0);
    playTone(659.25, 0.12, 'sine', 0.08, 0.1);
    playTone(783.99, 0.15, 'sine', 0.08, 0.2);
    playTone(1046.5, 0.3, 'sine', 0.09, 0.32);
  },
};

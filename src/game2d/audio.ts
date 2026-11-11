import type { Sfx } from "./game";

type Note = { freq: number; to?: number; dur: number; type?: OscillatorType; delay?: number; gain?: number };

const SOUNDS: Record<Sfx, Note[]> = {
  jump: [{ freq: 330, to: 620, dur: 0.12, type: "square" }],
  commit: [
    { freq: 988, dur: 0.06, type: "square" },
    { freq: 1319, dur: 0.12, type: "square", delay: 0.06 },
  ],
  stomp: [{ freq: 220, to: 70, dur: 0.14, type: "triangle", gain: 0.5 }],
  hurt: [{ freq: 300, to: 90, dur: 0.28, type: "sawtooth" }],
  checkpoint: [
    { freq: 523, dur: 0.08, type: "triangle", gain: 0.45 },
    { freq: 784, dur: 0.14, type: "triangle", delay: 0.08, gain: 0.45 },
  ],
  open: [{ freq: 660, to: 880, dur: 0.1, type: "triangle", gain: 0.4 }],
  launch: [{ freq: 80, to: 520, dur: 1.6, type: "sawtooth", gain: 0.3 }],
  win: [
    { freq: 523, dur: 0.12, type: "square" },
    { freq: 659, dur: 0.12, type: "square", delay: 0.12 },
    { freq: 784, dur: 0.12, type: "square", delay: 0.24 },
    { freq: 1047, dur: 0.3, type: "square", delay: 0.36 },
  ],
};

const STORAGE_KEY = "portfolio-game2d-muted";

/**
 * Tiny synthesised sound effects: no audio files to download. The
 * AudioContext is created lazily on the first sound, which always follows a
 * user gesture, so autoplay policies are respected.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  muted: boolean;

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode); sound simply starts on.
    }
    this.muted = stored === "1";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // Not persisted, still applies to this session.
    }
  }

  play(name: Sfx) {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      const ctx = this.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      for (const note of SOUNDS[name]) {
        const start = ctx.currentTime + (note.delay ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.type ?? "square";
        osc.frequency.setValueAtTime(note.freq, start);
        if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, start + note.dur);
        const volume = 0.07 * (note.gain ? note.gain / 0.3 : 1);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + note.dur + 0.02);
      }
    } catch {
      // Audio is a nicety; never let it break the game.
    }
  }

  dispose() {
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

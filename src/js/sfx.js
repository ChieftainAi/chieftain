// Casino sound, synthesized in the browser. No audio files means no asset licences to track
// and nothing to download. Everything is built from oscillators and short envelopes.
let ac = null;
let muted = false;

try { muted = localStorage.getItem("he_muted") === "1"; } catch { /* ignore */ }

function ctx() {
  if (muted) return null;
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("he_muted", muted ? "1" : "0"); } catch { /* ignore */ }
  return muted;
}

/** One enveloped oscillator. */
function tone({ freq, dur = 0.12, type = "sine", gain = 0.12, sweep = 0, delay = 0 }) {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Filtered noise burst — the mechanical part of a slot machine. */
function noise({ dur = 0.05, gain = 0.09, freq = 1800, q = 1.2, delay = 0 }) {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  lever:  () => { noise({ dur: 0.13, freq: 420, gain: 0.13, q: 0.8 }); tone({ freq: 160, dur: 0.16, type: "sawtooth", gain: 0.07, sweep: -90 }); },
  // A reel landing: wooden click plus a pitched thunk that rises with each reel.
  reelStop: (i = 0) => { noise({ dur: 0.045, freq: 2400 - i * 120, gain: 0.1 }); tone({ freq: 220 + i * 38, dur: 0.07, type: "square", gain: 0.055, sweep: -60 }); },
  spinLoop: () => { noise({ dur: 0.22, freq: 900, gain: 0.03, q: 0.5 }); },
  tick:     () => noise({ dur: 0.02, freq: 3200, gain: 0.035 }),
  coin: (delay = 0) => { tone({ freq: 1180, dur: 0.07, type: "triangle", gain: 0.07, delay }); tone({ freq: 1760, dur: 0.09, type: "sine", gain: 0.05, delay: delay + 0.02 }); },
  // Ascending arpeggio, length scaled to how big the win was.
  win: (tier = 1) => {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    const take = Math.min(notes.length, 2 + tier * 2);
    for (let i = 0; i < take; i++) tone({ freq: notes[i], dur: 0.16, type: "triangle", gain: 0.085, delay: i * 0.065 });
    if (tier >= 2) for (let i = 0; i < 7; i++) sfx.coin(0.35 + i * 0.055);
  },
  lose: () => { tone({ freq: 190, dur: 0.3, type: "sawtooth", gain: 0.07, sweep: -110 }); noise({ dur: 0.16, freq: 300, gain: 0.05, q: 0.6 }); },
  unlock: () => { [392, 523, 659, 880].forEach((f, i) => tone({ freq: f, dur: 0.34, type: "sine", gain: 0.08, delay: i * 0.1 })); },
};

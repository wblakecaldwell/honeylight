// Honeylight: sound: the audio graph, tones, noise and sweeps.

// ---------- audio ----------
export const A = { ctx: null };
// The sound has its own random numbers. It must take none from the game's stream: a sound device can be missing, and its rate differs from machine to machine,
// so a draw from the game's stream here would give every machine a different game.
let sndSeed = 0x2f6e2b1; export const sndRnd = (a = 1, b) => { sndSeed = (sndSeed * 1664525 + 1013904223) >>> 0; const v = sndSeed / 4294967296; return b === undefined ? v * a : a + v * (b - a); };
export function initAudio() {
  if (A.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  try {
    const c = A.ctx = new C(); A.master = c.createGain(); A.master.gain.value = 0.9; A.master.connect(c.destination);
    const dl = c.createDelay(1); dl.delayTime.value = 0.31; const fb = c.createGain(); fb.gain.value = 0.34; const wet = c.createGain(); wet.gain.value = 0.35; dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(A.master); A.echo = dl;
    // hive hum
    A.humLP = c.createBiquadFilter(); A.humLP.type = 'lowpass'; A.humLP.frequency.value = 150; A.humG = c.createGain(); A.humG.gain.value = 0; A.pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    A.humLP.connect(A.humG); A.humG.connect(A.pan); A.pan.connect(A.master);
    const trem = c.createGain(); trem.gain.value = 1; trem.connect(A.humLP); const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 0.18; lfo.connect(lg); lg.connect(trem.gain); lfo.start();
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.13; const lg2 = c.createGain(); lg2.gain.value = 0.2; lfo2.connect(lg2); lg2.connect(trem.gain); lfo2.start();
    A.rich = [];
    [[55, 'sawtooth', 0.5, 0], [110.4, 'sawtooth', 0.3, 0], [164.6, 'triangle', 0.3, 0], [221, 'sawtooth', 0.12, 0], [277.2, 'sine', 0.22, 1], [330.3, 'triangle', 0.16, 1], [440, 'sine', 0.1, 1], [554.4, 'sine', 0.06, 1]].forEach(([f, type, g, rich]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = rich ? 0 : g; o.connect(gg); gg.connect(trem); o.start(); if (rich) A.rich.push({ g: gg, v: g });
    });
    // own wings
    A.buzz = c.createOscillator(); A.buzz.type = 'sawtooth'; A.buzz.frequency.value = 190; const b2 = c.createOscillator(); b2.type = 'square'; b2.frequency.value = 381; A.buzz2 = b2;
    const blp = c.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 900; A.buzzG = c.createGain(); A.buzzG.gain.value = 0; const b2g = c.createGain(); b2g.gain.value = 0.3;
    A.buzz.connect(blp); b2.connect(b2g); b2g.connect(blp); blp.connect(A.buzzG); A.buzzG.connect(A.master); A.buzz.start(); b2.start();
    // noise
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = sndRnd() * 2 - 1; A.noise = nb;
    const ws = c.createBufferSource(); ws.buffer = nb; ws.loop = true; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.5; A.windG = c.createGain(); A.windG.gain.value = 0; ws.connect(wf); wf.connect(A.windG); A.windG.connect(A.master); ws.start();
  } catch (e) { A.ctx = null; }
}
export function tone(f, vol = 0.12, dur = 1.6, type = 'sine', when = 0) {
  if (!A.ctx || !isFinite(f)) return; const c = A.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(A.master); g.connect(A.echo); o.start(t); o.stop(t + dur + 0.05);
  const o2 = c.createOscillator(), g2 = c.createGain(); o2.frequency.value = f * 2.76; g2.gain.setValueAtTime(vol * 0.25, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.35); o2.connect(g2); g2.connect(A.master); o2.start(t); o2.stop(t + dur);
}
export const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
export function noiseHit(freq, q, vol, dur, type = 'bandpass', sweepTo) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = A.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(A.master); s.start(t, sndRnd()); s.stop(t + dur + 0.05);
}
export function sweep(f0, f1, dur, vol, type = 'sine') { if (!A.ctx) return; const c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05); }
export const setG = (p, v, tc = 0.15) => { if (A.ctx) p.setTargetAtTime(v, A.ctx.currentTime, tc); };

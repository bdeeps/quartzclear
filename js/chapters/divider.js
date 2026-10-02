// Chapter 3: the divider. A chain of flip-flops, each halving the frequency of the one
// before, turns 32,768 swings a second into one pulse a second.
import { THREE, M, box, canvasTexture, clamp } from '../kit.js';
import { board, makeFork, zcyl, fit, TAU } from '../watch.js';

// Crystals real watches have used: the 1969 Seiko Astron's 8,192 Hz (2^13), today's standard
// 32,768 Hz (2^15), and 4,194,304 Hz (2^22) in some high-frequency quartz watches.
const XT = { 8192: 13, 32768: 15, 4194304: 22 };
const COLS = 5, DX = 1.5, DY = 1.15, MAXN = 22, TOP = 6.0;
const SLAB_W = 8.0, SLAB_H = 6.35;
const fmtHz = (f) => (f >= 1 ? Math.round(f).toLocaleString('en') : f.toFixed(2)) + ' Hz';
const cellPos = (i) => [(i % COLS - (COLS - 1) / 2) * DX, TOP - Math.floor(i / COLS) * DY];

export default {
  id: 'divider',
  short: 'Halving 15 times',
  title: 'Halving, fifteen times',
  subtitle: 'A chain of flip-flops turns 32,768 swings into one tick a second.',
  view: fit([0, 4.7, 0], [0.08, 0.04, 1], 8.6, 9.6),
  learn: `<p>The crystal swings 32,768 times a second. The hands need one push a second. The chip gets from one to the other with the simplest counting circuit there is: the <b>flip-flop</b>.</p>
    <p>A flip-flop has an output that is either on or off. Each time its input finishes a pulse, the output <b>flips</b>. So it takes two pulses in to make one pulse out: it <b>halves the frequency</b>. Feed that output into a second flip-flop and you get a quarter. A third gives an eighth.</p>
    <p>Chain <b>fifteen</b> of them and 32,768 Hz becomes 16,384, then 8,192, 4,096 … 4, 2 and finally exactly <b>1 Hz</b>. That works only because 32,768 is 2 × 2 × 2 … fifteen times. The row of flip-flops is also a counter: read their lights as a <b>binary number</b> and it counts the crystal’s swings from 0 to 32,767, then rolls over. Each rollover is one second.</p>
    <p>Every flip-flop is a handful of <b>CMOS</b> transistors that use power only at the instant they switch. That is why the whole chip can run on about a tenth of a millionth of an amp. The same idea, counting pulses in binary, runs every computer: see <a href="https://glassbox.how/calculatorclear/">CalculatorClear</a>. A digital watch counts the 1 Hz pulses onwards into minutes and hours: see <a href="https://glassbox.how/digitalwatchclear/">DigitalWatchClear</a>.</p>
    <p class="tip"><b>Try it:</b> slide the slow motion from “real time” all the way down. At real speed only the last few stages blink slowly enough to see. Then try a different crystal.</p>`,
  terms: [
    { t: 'Flip-flop', d: 'A tiny circuit with an output that flips between on and off each time its input pulses.' },
    { t: 'Frequency divider', d: 'A circuit whose output pulses less often than its input. One flip-flop divides by two.' },
    { t: 'Hertz (Hz)', d: 'Pulses or swings per second.' },
    { t: 'Binary', d: 'Counting with only two digits, 0 and 1. Each place is worth twice the one before.' },
    { t: 'CMOS', d: 'A way of building chips whose transistors draw almost no current except while switching.' },
  ],
  defaults: { xtal: 32768, slow: 2048, hold: false },
  controls: [
    { key: 'slow', type: 'log', label: 'Slow motion', min: 1, max: 131072, ends: ['real time', 'very slow'], fmt: (v) => (v < 1.5 ? 'real time' : Math.round(v).toLocaleString('en') + '× slower') },
    { key: 'xtal', type: 'seg', label: 'Crystal', options: [{ v: 8192, label: '8,192 Hz' }, { v: 32768, label: '32,768 Hz' }, { v: 4194304, label: '4,194,304 Hz' }], fmt: (v) => XT[v] + ' halvings' },
    { key: 'hold', type: 'toggle', label: 'Crown pulled: hold at zero', hint: 'Pulling the crown resets the divider and stops the pulses, so the watch restarts exactly on your signal.' },
    { key: 'reset', type: 'buttons', label: 'Counter', items: [{ label: 'Reset to zero', act: (s, inst) => inst.reset() }] },
  ],
  quiz: [
    { q: 'What does one flip-flop do to the frequency of the pulses passing through it?', options: ['Doubles it', 'Halves it', 'Leaves it the same', 'Divides it by ten'], answer: 1, why: 'Its output flips once per input pulse, so it takes two pulses in to make one full pulse out.' },
    { q: 'How many flip-flops in a chain turn 32,768 Hz into 1 Hz?', options: ['2', '10', '15', '32,768'], answer: 2, why: '32,768 is 2 to the power 15. Fifteen halvings: 16,384, 8,192 … 4, 2, 1.' },
    { q: 'The first quartz wristwatch, the 1969 Seiko Astron, used an 8,192 Hz crystal. How many halvings did it need?', options: ['8', '13', '15', '22'], answer: 1, why: '8,192 is 2 to the power 13, so thirteen halvings give 1 Hz.' },
  ],
  reel: [
    { ms: 5600, caption: 'Inside the chip, fifteen flip-flops each halve the beat: 32,768, 16,384, 8,192 …', set: { xtal: 32768, hold: false }, act: (s, inst) => inst.reset(), anim: { slow: [32768, 2048, true] }, view: fit([0, 4.7, 0], [0.08, 0.02, 1], 8.5, 9.2), spin: 0.08 },
    { ms: 5200, caption: '… down to 4, 2, and exactly one pulse a second for the motor.', set: { xtal: 32768, hold: false }, anim: { slow: [256, 1, true] }, view: fit([0, 4.7, 0], [0.08, 0.02, 1], 8.5, 9.2), spin: 0.08 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); stage.root.add(g);
    const cfg = { n: 15, f: 32768 };
    // The slab: a picture of the chip, with every stage's output frequency printed under it.
    const slabTex = canvasTexture(1200, Math.round(1200 * SLAB_H / SLAB_W), (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#0c1220'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(142,240,255,.25)'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12);
      const sx = w / 8.0, X = (x) => w / 2 + x * sx, Y = (y) => (TOP + 0.75 - y) * sx;
      c.textAlign = 'center';
      for (let i = 0; i <= cfg.n + 1; i++) {
        const [x, y] = cellPos(i);
        if (i <= cfg.n) {
          const [x2, y2] = cellPos(i + 1);
          c.strokeStyle = 'rgba(255,181,71,.7)'; c.lineWidth = 5; c.beginPath();
          if (y2 === y) { c.moveTo(X(x + 0.5), Y(y)); c.lineTo(X(x2 - 0.5), Y(y2)); }
          else { c.moveTo(X(x + 0.5), Y(y)); c.lineTo(X(x + 0.68), Y(y)); c.lineTo(X(x + 0.68), Y(y - DY / 2 - 0.08)); c.lineTo(X(x2 - 0.68), Y(y - DY / 2 - 0.08)); c.lineTo(X(x2 - 0.68), Y(y2)); c.lineTo(X(x2 - 0.5), Y(y2)); }
          c.stroke();
        }
        c.fillStyle = i === 0 || i >= cfg.n ? '#ff9b7a' : 'rgba(255,255,255,.88)'; c.font = 'bold 30px sans-serif';
        c.fillText(i > cfg.n ? 'to the motor' : fmtHz(cfg.f / 2 ** i), X(x), Y(y - (i > cfg.n ? 0.62 : 0.5)));
      }
    });
    const slab = board(SLAB_W, SLAB_H, slabTex.tex); slab.position.set(0, TOP + 0.75 - SLAB_H / 2, -0.14); g.add(slab);
    const cells = [];
    for (let i = 0; i < MAXN; i++) {
      const mat = M.plastic(0x0f1626, { roughness: 0.4, emissive: new THREE.Color(0x58d8f0), emissiveIntensity: 0 });
      const b = box(1.0, 0.56, 0.2, mat); const [x, y] = cellPos(i + 1); b.position.set(x, y + 0.02, 0); g.add(b);
      const num = stage.label(String(i + 1), [x - 0.34, y + 0.16, 0.12], g);
      Object.assign(num.element.style, { padding: '0 5px', fontSize: '10px', opacity: '0.8' });
      cells.push({ b, mat, num });
    }
    // Where the beat comes from, and where the one-a-second pulse goes.
    const fork = makeFork({ L: 0.42, w: 0.1, gap: 0.08, t: 0.07, base: 0.2 }); fork.group.position.set(cellPos(0)[0], TOP - 0.08, 0.1); g.add(fork.group);
    const lIn = stage.label('Crystal', [cellPos(0)[0], TOP + 0.6, 0.1], g, 'hot');
    const out = new THREE.Group(); g.add(out);
    const face = zcyl(0.4, 0.4, -0.04, 0.04, M.plastic(0x1d2a4a)); out.add(face);
    const hand = box(0.035, 0.36, 0.02, M.glow(0xff7a59)); hand.geometry.translate(0, 0.13, 0); hand.position.z = 0.06; out.add(hand);
    for (let k = 0; k < 12; k++) { const d = box(0.025, 0.07, 0.02, M.glow(0xdfe6f5)); const a = (k / 12) * TAU; d.position.set(Math.sin(a) * 0.33, Math.cos(a) * 0.33, 0.05); d.rotation.z = -a; out.add(d); }
    

    // Waveforms of the crystal and the first four stages over sixteen crystal swings.
    const wv = { x: 0 };
    const wave = canvasTexture(720, 420, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(7,8,12,.85)'; c.fillRect(0, 0, w, h);
      c.font = 'bold 24px sans-serif'; c.fillStyle = '#8ef0ff'; c.fillText('Each stage flips at half the rate of the one before', 20, 34);
      const names = ['crystal', '÷ 2', '÷ 4', '÷ 8', '÷ 16'], x0 = 110, cw = w - x0 - 20;
      names.forEach((nm, r) => {
        const yb = 100 + r * 70, hi = 40, per = 2 ** r;                 // period in crystal swings
        c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '22px sans-serif'; c.fillText(nm, 16, yb - 10);
        c.strokeStyle = r ? '#ffb547' : '#8ef0ff'; c.lineWidth = 4; c.beginPath();
        for (let k = 0; k <= 16 * 2; k++) {
          // The crystal's row is high for the first half of each swing; stage r is bit r-1 of the count.
          const tt = k / 2, level = r === 0 ? (k % 2 === 0 ? 1 : 0) : Math.floor(tt / (per / 2)) % 2;
          const x = x0 + (cw * tt) / 16, y = yb - level * hi;
          if (k === 0) c.moveTo(x, y); else { c.lineTo(x, c._y); c.lineTo(x, y); }
          c._y = y;
        }
        c.lineTo(x0 + cw, c._y); c.stroke();
      });
      const x = x0 + (cw * (wv.x % 16)) / 16;
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 50); c.lineTo(x, h - 16); c.stroke();
    });
    const waveB = board(3.5, 3.5 * 420 / 720, wave.tex); waveB.position.set(2.45, 8.0, 0); g.add(waveB);

    let tm = 0, lastXtal = 0, drawn = -1, ticks = 0, st = { N: 0, tm: 0 };
    const layout = (s) => {
      cfg.n = XT[s.xtal] || 15; cfg.f = s.xtal; slabTex.redraw();
      cells.forEach((cl, i) => { cl.b.visible = cl.num.visible = i < cfg.n; });
      const [x, y] = cellPos(cfg.n + 1); out.position.set(x, y + 0.03, 0.05);
      lIn.element.textContent = 'Crystal';
    };
    return {
      reset() { tm = 0; },
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.xtal !== lastXtal) { lastXtal = s.xtal; layout(s); tm = 0; }
        if (s.hold) tm = 0; else tm += dt / s.slow;
        const cyc = tm * cfg.f, N = Math.floor(cyc);
        for (let i = 0; i < cfg.n; i++) {
          const shown = cfg.f / 2 ** (i + 1) / s.slow;             // blinks a second on screen
          const on = Math.floor(N / 2 ** i) % 2 === 1;
          cells[i].mat.emissiveIntensity = s.hold ? 0 : shown > 12 ? 0.42 : on ? 1 : 0.02;
        }
        fork.bend(s.hold ? 0 : 0.03 * Math.sin(TAU * Math.min(cyc, (tm * s.slow) * 3)));
        ticks = Math.floor(tm);
        hand.rotation.z = -(ticks % 60) * (TAU / 60);
        wv.x = cyc; const q = Math.floor(cyc * 8);
        if (q !== drawn) { drawn = q; wave.redraw(); }
        st = { N, tm };
      },
      readout: (s) => {
        const n = XT[s.xtal] || 15, cnt = st.N % 2 ** n;
        const bin = cnt.toString(2).padStart(n, '0');
        return `<div class="big">${n} halvings: ${s.xtal.toLocaleString('en')} Hz → 1 Hz</div>
          <div class="row"><span>Count of swings this second</span><b>${cnt.toLocaleString('en')}</b></div>
          <div class="row"><span>In binary</span><b style="font-family:var(--mono,monospace);font-size:11px">${bin}</b></div>
          <div class="row"><span>Seconds ticked</span><b>${Math.floor(st.tm)}</b></div>
          ${s.hold ? '<div class="row"><span>Crown pulled</span><b>held at zero, no pulses</b></div>' : s.slow < 1.5 ? '<div class="row"><span>Real time</span><b>the early stages are a blur</b></div>' : ''}`;
      },
    };
  },
};

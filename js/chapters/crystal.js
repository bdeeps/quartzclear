// Chapter 2: the quartz crystal. Piezoelectricity both ways, and a tuning fork that rings
// 32,768 times a second (shown tens of thousands of times slower).
import { THREE, M, box, arrow, canvasTexture, approach, clamp } from '../kit.js';
import { makeFork, forkHz, board, fit, fitEither, stageAspect, F_XTAL, XTAL, TAU } from '../watch.js';

const MM = 1.25;                       // scene units per millimetre of tine
const ROOT_Y = 2.0;
const L0 = 2.6;                        // mm: the length that rings at 32,768 Hz
const SHOWN_HZ = 1.2;                  // swings a second on screen at 32,768 Hz
const hz = (len) => (Math.abs(len - L0) < 0.049 ? F_XTAL : forkHz(len));
const fmtHz = (f) => Math.round(f).toLocaleString('en') + ' Hz';

export default {
  id: 'crystal',
  short: 'The crystal',
  title: 'A crystal that rings',
  subtitle: 'Squeeze quartz and it makes a voltage. Give it a voltage and it bends.',
  view: fitEither(fit([-0.3, 4.3, 0], [0.14, 0.06, 1], 8.0, 8.8), fit([0, 4.7, 0], [0.14, 0.06, 1], 5.0, 9.8)),
  learn: `<p><b>Quartz</b> is silicon dioxide, the stuff of sand, grown as a clear crystal. It has a strange talent called <b>piezoelectricity</b>. Bend or squeeze it and electric charge appears on its faces: a voltage. Do the opposite, put a voltage across it, and the crystal bends a tiny bit. The two effects are the same thing run forwards and backwards.</p>
    <p>A watch crystal is a <b>tuning fork</b> cut from a thin plate of quartz, with two prongs only about 3 mm long, plated with gold electrodes and sealed in a little can with the air pumped out. Like any tuning fork, it has one note it loves to ring at. That note depends on its size: shorter prongs ring higher.</p>
    <p>The chip's <b>oscillator</b> makes it ring for ever. It listens to the tiny voltage the swinging fork makes, amplifies it and feeds it back as a push at just the right moment, like pushing a child on a swing. The fork sets the pace, not the chip.</p>
    <p>Why <b>32,768</b> swings a second? It is 2 multiplied by itself 15 times, so halving it 15 times gives exactly one. It is also just above what ears can hear, so the watch does not whine, and low enough that the chip needs very little power. At the factory a laser burns specks of gold off the tips until the note is right.</p>
    <p>Quartz rings very cleanly. Switch the oscillator off and a real fork would keep swinging about 22,000 more times before fading to a third. Engineers call that a high <b>Q</b>.</p>
    <p class="tip"><b>Try it:</b> pick “Let it ring” and change the fork’s length. Find the length that gives exactly 32,768 Hz, then switch the oscillator off.</p>`,
  terms: [
    { t: 'Piezoelectricity', d: 'Some crystals make a voltage when squeezed or bent, and bend when given a voltage.' },
    { t: 'Tuning fork', d: 'Two prongs on a base that swing towards and away from each other at one steady note.' },
    { t: 'Frequency', d: 'How many full swings happen each second, in hertz (Hz).' },
    { t: 'Oscillator', d: 'A circuit that keeps something swinging by feeding back a small push in step with it.' },
    { t: 'Q (quality factor)', d: 'How cleanly something rings. A watch crystal’s Q is about 70,000; a watch balance wheel’s is a few hundred.' },
    { t: 'Electrode', d: 'A metal coating that carries charge to and from the crystal.' },
  ],
  defaults: { mode: 'ring', push: 0.7, amp: true, len: L0 },
  controls: [
    { key: 'mode', type: 'seg', label: 'What to do', options: [{ v: 'push', label: 'Bend it' }, { v: 'volts', label: 'Give it volts' }, { v: 'ring', label: 'Let it ring' }] },
    { key: 'push', type: 'range', label: 'How much (bend or volts)', min: -1, max: 1, step: 0.01, ends: ['one way', 'the other way'], fmt: (v) => (Math.abs(v) < 0.03 ? 'none' : (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%'), hint: 'For “Bend it” and “Give it volts”.' },
    { key: 'amp', type: 'toggle', label: 'Oscillator circuit on', hint: 'For “Let it ring”. Off: the fork slowly rings down.' },
    { key: 'len', type: 'range', label: 'Length of the prongs', min: 1.5, max: 5, step: 0.1, fmt: (v) => v.toFixed(1) + ' mm' },
  ],
  quiz: [
    { q: 'What is piezoelectricity?', options: ['Quartz glowing when heated', 'A crystal making a voltage when bent, and bending when given a voltage', 'Electricity made by magnets', 'A kind of battery'], answer: 1, why: 'It works both ways. The watch uses both: a voltage bends the fork, and the bending fork makes a voltage the chip can read.' },
    { q: 'Why is a watch crystal made to ring at exactly 32,768 Hz?', options: ['It is the only note quartz can make', 'It is 2 to the power 15, so fifteen halvings give one pulse a second', 'It is the frequency of mains electricity', 'It matches the speed of the hands'], answer: 1, why: '32,768 = 2¹⁵. A chain of fifteen simple halving circuits turns it into exactly 1 Hz. It is also just too high to hear.' },
    { q: 'You make the prongs of the fork longer. What happens to its note?', options: ['It goes higher', 'It goes lower', 'It stays the same', 'It stops ringing'], answer: 1, why: 'Longer prongs swing more slowly, like a longer ruler twanged on a desk. Frequency falls with the square of the length.' },
  ],
  reel: [
    { ms: 5200, caption: 'Quartz is piezoelectric: bend it and it makes a voltage, give it a voltage and it bends.', set: { mode: 'volts', len: L0 }, anim: { push: [-1, 1] }, view: fitEither(fit([-0.3, 3.3, 0], [0.14, 0.06, 1], 7.8, 6.8), fit([0, 4.7, 0], [0.14, 0.06, 1], 5.0, 9.6)), spin: 0.1 },
    { ms: 5600, caption: 'Cut as a tiny tuning fork, it rings 32,768 times a second. This is 27,000 times slower.', set: { mode: 'ring', amp: true, len: L0 }, act: (s, inst) => inst.kick(), view: fitEither(fit([-0.3, 3.3, 0], [0.14, 0.06, 1], 7.8, 6.8), fit([0, 4.7, 0], [0.14, 0.06, 1], 5.0, 9.6)), spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const g = new THREE.Group(); root.add(g);
    const fork = makeFork({ L: L0 * MM }); fork.group.position.set(0, ROOT_Y, 0); g.add(fork.group);
    // The can: a sealed metal tube with a vacuum inside, drawn see-through. Two leads come out of the bottom.
    const canMat = M.clear(0xcfd8e6, 0.13, { metalness: 0.6, roughness: 0.2 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1, 40, 1, true), canMat); g.add(can);
    const capTop = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), canMat); capTop.rotation.x = -Math.PI / 2; g.add(capTop);
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 40), M.plastic(0x2a3040)); plug.position.y = 0.6; g.add(plug);
    const leadMat = [0, 1].map(() => M.metal(0xd5dae3, { emissive: new THREE.Color(0), emissiveIntensity: 1 }));
    [-0.3, 0.3].forEach((x, i) => { const l = box(0.07, 0.75, 0.07, leadMat[i]); l.position.set(x, 0.38, 0); g.add(l); });
    // Arrows that show a push on the tips (Bend it mode).
    const pushers = [-1, 1].map((side) => { const a = arrow(0xffb547, 0.9, 0.28, 0.05); g.add(a); return { a, side }; });
    const lFork = stage.label('Quartz tuning fork', [0, 0, 0], g, 'hot');
    const lGold = stage.label('Gold electrodes', [-1.35, ROOT_Y + 1.2, 0.3], g);
    const lCan = stage.label('Sealed can, no air inside', [-1.5, 1.0, 0.4], g);
    const lTrim = stage.label('Laser-trimmed tips', [0, 0, 0], g);
    const lWhy = stage.label('', [0, 0.1, 1.1], g, 'hot');

    // A scope: the voltage between the two electrodes over the last few seconds.
    const N = 220, hist = new Float32Array(N); let head = 0;
    const st = { title: '' };
    const scope = canvasTexture(640, 400, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(7,8,12,.85)'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 2;
      for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(40, 70 + (i * (h - 110)) / 4); c.lineTo(w - 24, 70 + (i * (h - 110)) / 4); c.stroke(); }
      const y0 = 70 + (h - 110) / 2, amp = (h - 130) / 2;
      c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '22px sans-serif'; c.fillText('+', 14, y0 - amp + 8); c.fillText('−', 14, y0 + amp + 8); c.fillText('0', 14, y0 + 8);
      c.font = 'bold 26px sans-serif'; c.fillStyle = '#8ef0ff'; c.fillText('Voltage across the crystal', 24, 40);
      c.strokeStyle = '#8ef0ff'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath();
      for (let i = 0; i < N; i++) { const v = hist[(head + i) % N], x = 40 + ((w - 64) * i) / (N - 1), y = y0 - v * amp; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '22px sans-serif'; c.fillText(st.title, 24, h - 14);
    });
    const scopeB = board(4.2, 2.62, scope.tex); scopeB.position.set(-2.3, 1.75, 0.6); scopeB.rotation.y = 0.18; root.add(scopeB);

    let phase = 0, A = 1, cur = 0, len = L0, acc = 0;
    const red = new THREE.Color(0xff5a3c), blue = new THREE.Color(0x3c8cff);
    return {
      kick() { A = 1; phase = 0; },
      update(dt, s) {
        dt = Math.max(0, dt);
        len = approach(len, s.len, 8, dt);
        const Ls = len * MM, f = hz(s.len);
        fork.setLength(Ls);
        const top = ROOT_Y + Ls, tall = stageAspect() < 0.8;
        g.position.x = tall ? 0 : 2.2;
        if (tall) { scopeB.position.set(0, top + 2.6, 0); scopeB.rotation.y = 0; } else { scopeB.position.set(-1.8, 1.75, 0.6); scopeB.rotation.y = 0.18; }
        can.scale.y = top + 0.5 - 0.6; can.position.y = 0.6 + can.scale.y / 2; capTop.position.y = top + 0.5;
        let target;
        if (s.mode === 'ring') {
          A = s.amp ? approach(A, 1, 1.2, dt) : A * Math.exp(-dt / 3.2);
          phase += TAU * clamp(SHOWN_HZ * (f / F_XTAL), 0.2, 4) * dt;
          target = A * Math.sin(phase);
          cur = target;
        } else { target = s.push; cur = approach(cur, target, 9, dt); }
        const tip = 0.2 * (Ls / (L0 * MM));
        fork.bend(cur * tip);
        // Charge on the electrodes: one prong's faces go positive while the other's go negative, and swap.
        fork.golds.forEach((m, i) => m.emissive.copy((cur > 0) === (i === 0) ? red : blue).multiplyScalar(Math.min(1, Math.abs(cur)) * 0.75));
        leadMat.forEach((m, i) => m.emissive.copy((cur > 0) === (i === 0) ? red : blue).multiplyScalar(Math.min(1, Math.abs(cur)) * 0.8));
        for (const p of pushers) {
          const on = s.mode === 'push' && Math.abs(s.push) > 0.03, out = s.push > 0;
                    const xTip = p.side * (0.38 + cur * tip);
          // Pushing the prongs apart (out) or together.
          p.a.position.set(xTip + p.side * (out ? 0.3 : 1.3 + 0.2), top - 0.25, 0);
          p.a.rotation.z = (out ? -p.side : p.side) * Math.PI / 2;
          p.a.set(0.35 + 0.65 * Math.abs(s.push)); p.a.visible = on;
        }
        lFork.position.set(-1.55, top - 1.5, 0.3); lTrim.position.set(-1.5, top - 0.1, 0.3);
        lWhy.visible = s.mode !== 'ring';
        lWhy.element.textContent = s.mode === 'push' ? 'You bend it: charge appears' : 'You apply a voltage: it bends';
        lWhy.position.set(0, top + 0.95, 0);
        lCan.visible = lGold.visible = true;
        st.title = s.mode === 'ring' ? `Shown ${Math.round(f / clamp(SHOWN_HZ * (f / F_XTAL), 0.2, 4)).toLocaleString('en')} times slower than real` : s.mode === 'push' ? 'The bend makes the voltage' : 'The voltage makes the bend';
        acc += dt;
        if (acc > 0.022) { acc = 0; hist[head] = clamp(cur, -1, 1); head = (head + 1) % N; scope.redraw(); }
      },
      readout: (s) => {
        const f = hz(s.len);
        if (s.mode !== 'ring') {
          const none = Math.abs(s.push) < 0.03;
          return `<div class="big">${s.mode === 'push' ? 'Bend in, voltage out' : 'Voltage in, bend out'}</div>
            <div class="row"><span>${s.mode === 'push' ? 'Bend' : 'Voltage'}</span><b>${none ? 'none' : s.push > 0 ? 'one way (+)' : 'the other way (−)'}</b></div>
            <div class="row"><span>${s.mode === 'push' ? 'Voltage it makes' : 'Bend it makes'}</span><b>${none ? 'none' : s.push > 0 ? 'positive' : 'negative'}, ${Math.round(Math.abs(s.push) * 100)}%</b></div>
            <div class="row"><span>Real size of the bend</span><b>far too small to see</b></div>`;
        }
        const exact = f === F_XTAL, p2 = Math.log2(f);
        return `<div class="big${exact ? '' : ' no'}">${fmtHz(f)}</div>
          <div class="row"><span>Prongs</span><b>${s.len.toFixed(1)} mm long, about 0.25 mm wide</b></div>
          <div class="row"><span>One swing takes</span><b>${(1e6 / f).toFixed(1)} millionths of a second</b></div>
          <div class="row"><span>Halvings to reach 1 Hz</span><b>${exact ? 'exactly 15' : p2.toFixed(2) + ': not a whole number'}</b></div>
          <div class="row"><span>Can you hear it?</span><b>${f < 20000 ? 'yes, a high whine' : 'no, too high for ears'}</b></div>
          ${s.amp ? '' : `<div class="row"><span>Ringing down</span><b>Q ≈ ${XTAL.Q.toLocaleString('en')}: about ${Math.round(XTAL.Q / Math.PI / 1000)},000 swings, ${(XTAL.Q / (Math.PI * f)).toFixed(1)} s (shown sped up)</b></div>`}`;
      },
    };
  },
};

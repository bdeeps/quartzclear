// Chapter 4: the Lavet stepping motor. One short pulse a second, alternating in direction,
// flips a two-pole magnet half a turn at a time. Notches in the stator decide which way.
import { THREE, M, arrow, canvasTexture, clamp } from '../kit.js';
import { makeLavet, lavetAdvance, gear, board, zcyl, fit, REST, TEETH, TAU } from '../watch.js';

const S = 5, CY = 4.0;
const WINDOW = 60;                      // ms of each step shown in slow motion
const SLOW_RATE = 16;                   // model milliseconds per screen second (about 60 times slower)

export default {
  id: 'stepper',
  short: 'The stepper motor',
  title: 'The motor that moves in ticks',
  subtitle: 'One pulse a second flips a tiny magnet exactly half a turn.',
  view: fit([0, 4.6, 0], [0.08, 0.04, 1], 9.6, 8.8),
  learn: `<p>A watch motor does not spin like a fan motor. It is a <b>stepper</b>: it sits still, jumps exactly half a turn, and sits still again. The design is called a <b>Lavet motor</b>, after the French engineer Marius Lavet, who patented it in 1936.</p>
    <p>It has three parts. A <b>coil</b> of very fine copper wire on an iron core. A flat iron <b>stator</b> that carries the coil’s magnetism round to a hole. And in the hole, the <b>rotor</b>: a tiny magnet with one north and one south pole. Current in a coil makes a magnet (see <a href="https://glassbox.how/magnetismclear/">MagnetismClear</a> and <a href="https://glassbox.how/currentclear/">CurrentClear</a>), so a pulse of current turns the stator into a magnet for a few thousandths of a second, and the rotor swings round to line up with it.</p>
    <p>Two tricks make it work. First, the <b>pulses alternate</b>. After half a turn the rotor’s poles have swapped sides, so the next pulse has to push the other way to keep it going. Second, the hole has two small <b>notches</b>. With no current, the magnet settles a little askew from the stator’s field, not in line with it. So each pulse always twists it the same way round, and when the pulse ends it drops into the next resting place, half a turn on. Without the notches it would not know which way to go.</p>
    <p>The coil is on for only about 5 thousandths of each second. That is the secret of the watch’s tiny appetite: the whole watch runs on about a millionth of a watt.</p>
    <p class="tip"><b>Try it:</b> shorten the pulse until the rotor falls back. Then switch off “alternate the pulses”, and then take away the notches.</p>`,
  terms: [
    { t: 'Lavet motor', d: 'The stepping motor in analog quartz watches and clocks: a coil, a notched stator and a two-pole magnet rotor.' },
    { t: 'Stator', d: 'The part that stays still. Here, a flat piece of soft iron that carries the coil’s field to the rotor.' },
    { t: 'Rotor', d: 'The part that turns. Here, a tiny permanent magnet with one north and one south pole.' },
    { t: 'Detent', d: 'A resting place something falls into. The notches give the rotor two, half a turn apart.' },
    { t: 'Pulse', d: 'A short burst of current. The motor gets one each second, a few thousandths of a second long.' },
  ],
  defaults: { slow: true, pulse: 5, alt: true, notch: true },
  controls: [
    { key: 'slow', type: 'toggle', label: 'Slow motion', hint: 'On: each step is shown about 60 times slower and the wait between steps is skipped.' },
    { key: 'pulse', type: 'range', label: 'Pulse length', min: 1, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) + ' ms' },
    { key: 'alt', type: 'toggle', label: 'Alternate the pulses', hint: 'Off: every pulse pushes the same way.' },
    { key: 'notch', type: 'toggle', label: 'Notches in the stator' },
  ],
  quiz: [
    { q: 'How far does the rotor turn on each pulse?', options: ['A full turn', 'Half a turn', 'One sixtieth of a turn', 'It spins freely'], answer: 1, why: 'The two-pole magnet has two resting places, half a turn apart. Each pulse moves it from one to the other.' },
    { q: 'Why must each pulse flow the opposite way to the one before?', options: ['To save the cell', 'After half a turn the rotor’s poles have swapped sides, so the push must swap too', 'To make the motor quieter', 'Because the crystal changes direction'], answer: 1, why: 'A pulse the same way as the last would just pull the rotor back to where it already is.' },
    { q: 'What are the notches in the stator for?', options: ['Decoration', 'They let air in', 'They make the rotor rest slightly askew, so every pulse turns it the same way', 'They hold the coil'], answer: 2, why: 'If the magnet rested exactly in line with the field, a pulse could not tell it which way to turn.' },
  ],
  reel: [
    { ms: 5600, caption: 'Once a second, a pulse in the coil flips a tiny magnet half a turn. In slow motion:', set: { slow: true, pulse: 5, alt: true, notch: true }, act: (s, inst) => inst.reset(), view: fit([0, 4.6, 0], [0.08, 0.02, 1], 9.6, 8.4), spin: 0.1 },
    { ms: 5200, caption: 'Each pulse flows the opposite way, and two notches make sure the magnet always turns forwards.', set: { slow: true, pulse: 5, alt: true, notch: true }, view: fit([0.9, 4.9, 0], [0.06, 0.04, 1], 6.8, 7.4), spin: 0.1 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.position.y = CY; stage.root.add(g);
    const m = makeLavet({ S, notches: true }); g.add(m.group);
    // The rotor's pinion sits on the same arbor, in front of the magnet.
    const pin = gear(TEETH.rotorPinion, 0.05, 0.3, M.metal(0xd5dae3, { roughness: 0.3 })); pin.position.z = 0.55; m.rotor.add(pin);
    m.rotor.add(zcyl(0.08, 0.08, -0.5, 0.9, M.metal(0xd5dae3), 12));
    const lN = stage.label('N', [0.36 * 1, 0, 0.5], m.rotor, 'hot'); const lS = stage.label('S', [-0.36, 0, 0.5], m.rotor);
    stage.label('Coil: fine copper wire on an iron core', [0, -0.54 * S - 1.0, 0.3], g);
    stage.label('Stator: soft iron', [-3.4, -1.5, 0.2], g);
    const lNotch = stage.label('Notches', [-1.7, 0.75, 0.2], g, 'hot');
    stage.label('Rotor: a two-pole magnet', [2.6, -0.6, 0.2], g);
    const fArrow = arrow(0x8ef0ff, 1.9, 0.4, 0.07); fArrow.position.z = 0.9; g.add(fArrow);
    const lField = stage.label('Field from the coil', [0, 2.3, 0], fArrow, 'hot');
    // A faint line through the resting places.
    const restLine = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.02), M.ghost(0xffffff, 0.35)); restLine.position.z = 0.2; g.add(restLine);

    const trace = [], info = { u: 0, pulse: 5 };
    const chart = canvasTexture(720, 380, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(7,8,12,.85)'; c.fillRect(0, 0, w, h);
      const x0 = 70, cw = w - x0 - 24, X = (ms) => x0 + (cw * ms) / WINDOW;
      c.font = 'bold 24px sans-serif'; c.fillStyle = '#ffb547'; c.fillText('Coil pulse', 20, 34);
      c.fillStyle = '#8ef0ff'; c.fillText('Rotor angle', 190, 34);
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '20px sans-serif'; c.fillText('first 60 thousandths of a second', 370, 34);
      // pulse
      const yp = 105;
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, yp); c.lineTo(x0 + cw, yp); c.stroke();
      c.fillStyle = info.u > 0 ? 'rgba(255,110,80,.85)' : 'rgba(80,140,255,.9)';
      if (info.u) c.fillRect(X(0), info.u > 0 ? yp - 42 : yp, X(info.pulse) - X(0), 42);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText('+', 30, yp - 22); c.fillText('−', 30, yp + 34);
      // angle: 0 to 180° of this step
      const yb = h - 40, yt = 185;
      c.strokeStyle = 'rgba(255,255,255,.2)'; for (const y of [yb, yt]) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + cw, y); c.stroke(); }
      c.fillText('180°', 14, yt + 7); c.fillText('0°', 30, yb + 7);
      for (let ms = 0; ms <= WINDOW; ms += 10) c.fillText(String(ms), X(ms) - 8, h - 10);
      c.strokeStyle = '#8ef0ff'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath();
      trace.forEach(([ms, deg], i) => { const y = yb - clamp(deg / 180, -0.25, 1.25) * (yb - yt); i ? c.lineTo(X(ms), y) : c.moveTo(X(ms), y); });
      c.stroke();
    });
    const chartB = board(4.2, 4.2 * 380 / 720, chart.tex); chartB.position.set(2.2, 2.85, 0); g.add(chartB);

    const st = { th: REST, w: 0 };
    let tms = 0, k = 0, u = 0, from = REST, rest = REST, notch = true, pulses = 0, steps = 0, fwd = 0, back = 0, settled = true, redrawAt = 0, lastResult = '';
    // Once the rotor has come to rest, see where it ended up.
    const tally = () => {
      if (pulses === 0 || settled) return;
      const d = Math.round((st.th - from) / Math.PI);
      if (d > 0) fwd++; else if (d < 0) back++;
      lastResult = d > 0 ? 'stepped forwards' : d < 0 ? 'stepped backwards' : 'fell back: no step';
      settled = true;
    };
    const fire = (s) => {
      tally();
      tms = 0; trace.length = 0; from = st.th; settled = false;
      u = s.alt ? (k % 2 === 0 ? -1 : 1) : -1; k++; pulses++;
      // With no notches the magnet rests dead in line with the field, where the pulse has no grip on it.
      // Whatever tiny tilt it happens to have decides the outcome: a repeatable nudge stands in for chance.
      if (!s.notch) st.th += 0.25 * [1, 1, -1, 1, -1, -1, 1, -1][pulses % 8];
      info.u = u;
    };
    const api = {
      reset() { st.th = rest; st.w = 0; k = 0; pulses = 0; fwd = 0; back = 0; settled = true; tms = 1e9; lastResult = ''; },
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.notch !== notch) { notch = s.notch; rest = notch ? REST : 0; m.setNotches(notch); st.th = Math.round((st.th - rest) / Math.PI) * Math.PI + rest; st.w = 0; }
        lNotch.visible = notch; restLine.rotation.z = rest;
        info.pulse = s.pulse;
        let ms = dt * (s.slow ? SLOW_RATE : 1000);
        const period = s.slow ? WINDOW : 1000;
        while (ms > 0) {
          if (tms >= period) fire(s);
          const on = tms < s.pulse;
          const seg = Math.min(ms, on ? s.pulse - tms : period - tms, 2);
          lavetAdvance(st, on ? u : 0, seg, rest);
          tms += seg; ms -= seg;
          if (tms >= 50) tally();
          if (tms <= WINDOW) trace.push([tms, ((st.th - from) * 180) / Math.PI]);
        }
        const on = tms < s.pulse && pulses > 0;
        m.rotor.rotation.z = st.th;
        m.copper.emissive.setHex(on ? (u > 0 ? 0xff5a3c : 0x3c8cff) : 0).multiplyScalar(0.8);
        fArrow.visible = lField.visible = on;
        fArrow.rotation.z = u > 0 ? -Math.PI / 2 : Math.PI / 2; fArrow.position.x = u > 0 ? -0.95 : 0.95;
        if (++redrawAt % 2 === 0) chart.redraw();
        steps = Math.round((st.th - rest) / Math.PI);
      },
      readout: (s) => {
        const on = tms < s.pulse && pulses > 0;
        return `<div class="big${lastResult && !/forwards/.test(lastResult) ? ' no' : ''}">${on ? 'Pulse on: ' + (u > 0 ? '+' : '−') : 'Coil off: rotor resting'}</div>
          <div class="row"><span>Pulse</span><b>${s.pulse.toFixed(1)} ms a second: on ${(s.pulse / 10).toFixed(2)}% of the time</b></div>
          <div class="row"><span>Pulses sent</span><b>${pulses}: ${fwd} forwards, ${back} backwards</b></div>
          <div class="row"><span>Last pulse</span><b>${lastResult || 'wait for it'}</b></div>`;
      },
    };
    api.reset();
    return api;
  },
};

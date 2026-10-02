// Chapter 1: take an analog quartz wristwatch apart.
import { THREE, M, exploder } from '../kit.js';
import { makeWatch, F_XTAL, fit } from '../watch.js';

const Y0 = 3.6;
const pad = (n) => String(n).padStart(2, '0');

export default {
  id: 'anatomy',
  short: 'Inside the watch',
  title: 'Inside a quartz watch',
  subtitle: 'A cell, a crystal, a chip, a tiny motor and a train of gears.',
  view: fit([0, 3.7, 0], [0.8, 0.36, 0.48], 9.4, 8.6),
  learn: `<p>Open the back of an ordinary wristwatch and you find surprisingly little. A <b>silver-oxide cell</b> the size of a lentil gives 1.55 volts. A small metal can holds a sliver of <b>quartz crystal</b> shaped like a tuning fork. A <b>chip</b> keeps the crystal ringing and counts its swings.</p>
    <p>Once a second the chip sends a short pulse of current through a <b>coil</b> of hair-fine copper wire. The coil magnetises a flat iron <b>stator</b>, and that flips a tiny magnet, the <b>rotor</b>, half a turn. A <b>gear train</b> slows the rotor down to turn the second, minute and hour <b>hands</b>.</p>
    <p>The <b>crown</b> on the side is for setting. Pull it out and the hands stop, so you can turn them to the right time.</p>
    <p>Each part gets its own chapter: <b>the crystal</b>, <b>the divider</b> in the chip, <b>the stepper motor</b>, <b>the gears</b>, and how accurate it all is. The gears here are drawn bigger than life so you can see their teeth.</p>
    <p class="tip"><b>Try it:</b> take the watch apart, then switch on the see-through view and watch the rotor flip once a second behind the dial.</p>`,
  terms: [
    { t: 'Quartz crystal', d: 'A tiny tuning fork cut from quartz. It swings 32,768 times a second and sets the pace of the watch.' },
    { t: 'Chip', d: 'An integrated circuit. Here it keeps the crystal ringing, counts its swings and fires the motor once a second.' },
    { t: 'Stepper motor', d: 'A motor that moves in fixed steps. A watch motor’s rotor turns exactly half a turn per pulse.' },
    { t: 'Gear train', d: 'A chain of toothed wheels that slows the rotor down to the speed of each hand.' },
    { t: 'Silver-oxide cell', d: 'A button cell that holds a steady 1.55 volts for nearly all its life.' },
    { t: 'Crown', d: 'The knob on the side of the case. Pulled out, it stops the watch and sets the hands.' },
  ],
  defaults: { explode: 0, xray: false, rate: 1 },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See-through dial and case' },
    { key: 'rate', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 60, label: '60× faster' }], fmt: (v) => (v === 1 ? 'one step a second' : 'a minute each second') },
  ],
  quiz: [
    { q: 'What sets the pace of a quartz watch?', options: ['The cell’s voltage', 'A quartz crystal swinging 32,768 times a second', 'The speed of the gear train', 'A spring that slowly unwinds'], answer: 1, why: 'The crystal is the timekeeper. The chip counts its swings, and everything else just follows.' },
    { q: 'What moves the hands?', options: ['A spring', 'A motor that spins all the time', 'A stepper motor that flips a tiny magnet half a turn each second, and gears', 'The crystal pushes them directly'], answer: 2, why: 'One short pulse a second flips the rotor half a turn. Gears turn that into the movement of each hand.' },
    { q: 'How many times does the motor step in one day?', options: ['1,440', '86,400', '32,768', 'About a million'], answer: 1, why: 'One step a second, and a day has 24 × 60 × 60 = 86,400 seconds.' },
  ],
  reel: [
    { ms: 5600, caption: 'A quartz watch is a cell, a crystal, a chip, a tiny motor and a few gears.', set: { xray: false, rate: 1 }, anim: { explode: [0, 1] }, view: fit([0, 3.6, 0], [0.8, 0.32, 0.5], 9.4, 7.4), spin: 0.5 },
  ],

  build({ stage }) {
    const w = makeWatch();
    w.group.position.y = Y0;
    stage.root.add(w.group);
    const P = w.parts;
    const setExplode = exploder([
      { obj: P.glass, off: [0, 0, 3.3] },
      { obj: P.hands, off: [0, 0, 2.7] },
      { obj: P.dial, off: [0, 0, 2.1] },
      { obj: P.motion, off: [0, 0, 1.45] },
      { obj: P.plate, off: [0, 0, 0.8] },
      { obj: P.train, off: [0, 0, 0.1] },
      { obj: P.rotorSet, off: [0, 0, -0.75] },
      { obj: P.motor, off: [0, -0.5, -1.45] },
      { obj: P.circuit, off: [0.3, 0.3, -2.3] },
      { obj: P.cell, off: [-0.4, 0.9, -2.3] },
      { obj: P.back, off: [0, 0, -3.2] },
      { obj: P.crown, off: [0.9, 0, 0] },
    ]);
    const L = (text, obj, pos, cls) => stage.label(text, pos, obj, cls);
    L('Crown', P.crown, [2.9, 0.6, 0.25]);
    const outer = [L('Hands', P.hands, [-0.9, 1.5, 0.5]), L('Glass', P.glass, [0, 2.45, 0.62])];
    const inner = [
      L('Dial', P.dial, [0, -2.35, 0.36]),
      L('Hour and minute gears', P.motion, [0.3, 0.95, 0.3]),
      L('Main plate', P.plate, [-1.5, -1.7, 0.18]),
      L('Gear train', P.train, [0.75, 0.25, -0.1], 'hot'),
      L('Rotor: a tiny magnet', P.rotorSet, [-0.05, -0.75, -0.44], 'hot'),
      L('Coil and stator', P.motor, [0.9, -0.75, -0.44]),
      L('Chip', P.circuit, [1.75, -0.45, -0.55]),
      L('Quartz crystal', P.circuit, [1.3, 1.45, -0.44], 'hot'),
      L('Silver-oxide cell, 1.55 V', P.cell, [0, 0.75, -0.42]),
      L('Case back', P.back, [0, -2.3, -0.77]),
    ];
    let t = 10 * 3600 + 9 * 60 + 36;                 // start at 10:09:36
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        t += dt * s.rate;
        setExplode(s.explode);
        const open = s.explode > 0.3;
        inner.forEach((l) => { l.visible = open; });
        outer.forEach((l) => { l.visible = open || !s.xray; });
        w.setXray(s.xray || s.explode > 0.04, s.xray);
        w.setTime(t, { tick: s.rate === 1 });
      },
      readout: () => {
        const T = Math.floor(t) % 43200, h = Math.floor(T / 3600) || 12, m = Math.floor(T / 60) % 60, sec = T % 60;
        return `<div class="big">${h}:${pad(m)}:${pad(sec)}</div>
          <div class="row"><span>Crystal</span><b>${F_XTAL.toLocaleString('en')} swings a second</b></div>
          <div class="row"><span>Motor</span><b>1 step a second, 86,400 a day</b></div>
          <div class="row"><span>Cell</span><b>1.55 V, lasts about 3 years</b></div>`;
      },
    };
  },
};

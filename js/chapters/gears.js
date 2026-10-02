// Chapter 5: gears to hands. The real tooth counts from rotor to seconds, minute and hour
// hands, and how the crown sets the time.
import { THREE, approach } from '../kit.js';
import { makeWatch, TEETH as T, RATIO, WATCH, fit, TAU } from '../watch.js';

const SC = 1.8, Y0 = 4.1;
const pad = (n) => String(n).padStart(2, '0');

export default {
  id: 'gears',
  short: 'Gears to hands',
  title: 'From half-turns to hands',
  subtitle: 'Thirty to one, sixty to one, twelve to one: tooth counts do the arithmetic.',
  view: fit([-0.2, 4.2, 0], [0.34, 0.14, 1], 9.4, 8.2),
  learn: `<p>The rotor flips half a turn a second, so it makes 30 full turns a minute. The seconds hand must make just one. <b>Gears</b> do the slowing down. When a small gear (a <b>pinion</b>) drives a big <b>wheel</b>, the wheel turns slower by the ratio of their tooth counts. It is the same rule as a bicycle’s chainrings: see <a href="https://glassbox.how/cycleclear/">CycleClear</a>.</p>
    <p>This train uses the tooth counts from a real Seiko patent. The rotor’s 10-tooth pinion drives a 40-tooth wheel: 4 to 1. Then 7 teeth drive 42: 6 to 1. Then 48 drive 60: 1.25 to 1. Multiply them: 4 × 6 × 1.25 = <b>30</b>. That wheel carries the <b>seconds hand</b> and ticks 6° at a time.</p>
    <p>Two more stages, 6 teeth driving 48 and 6 driving 45, give 8 × 7.5 = <b>60</b>. That is the <b>minute hand</b>. Under the dial, the <b>motion work</b> turns 12 teeth against 36 and 10 against 40: 3 × 4 = <b>12</b>, for the <b>hour hand</b>. The three hands sit on three tubes, one inside the other.</p>
    <p>To set the time you pull the <b>crown</b>. That does two things. It tells the chip to stop sending pulses, so the seconds hand freezes. And a lever slides a small gear into mesh so the crown can turn the minute and hour gears. The minute hand’s tube is only a tight push fit on its shaft, so it slips round while the rest of the train stays still.</p>
    <p class="tip"><b>Try it:</b> spread the layers to see which gear drives which. Then speed up time, pull the crown out and set the hands.</p>`,
  terms: [
    { t: 'Pinion', d: 'A small gear with few teeth. A pinion driving a big wheel slows things down.' },
    { t: 'Gear ratio', d: 'Teeth on the driven wheel divided by teeth on the driver. 40 ÷ 10 means 4 turns in for 1 turn out.' },
    { t: 'Gear train', d: 'Several gear pairs in a row. Their ratios multiply.' },
    { t: 'Motion work', d: 'The gears under the dial that make the hour hand turn 12 times slower than the minute hand.' },
    { t: 'Cannon pinion', d: 'The tube that carries the minute hand. It grips its shaft by friction, so it can slip when you set the time.' },
    { t: 'Hacking', d: 'Stopping the seconds hand when the crown is pulled, so a watch can be set to the exact second.' },
  ],
  defaults: { spread: 0, rate: 1, pulled: false, labels: true },
  controls: [
    { key: 'spread', type: 'range', label: 'Spread the layers', min: 0, max: 1, step: 0.01, ends: ['real spacing', 'pulled apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'rate', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 60, label: '60×' }, { v: 3600, label: '3,600×' }], fmt: (v) => (v === 1 ? 'one step a second' : v === 60 ? 'a minute each second' : 'an hour each second') },
    { key: 'pulled', type: 'toggle', label: 'Pull the crown out', hint: 'The pulses stop and the crown is geared to the hands.' },
    { key: 'turn', type: 'buttons', label: 'Turn the crown', items: [{ label: '↺ Back 10 min', act: (s, inst) => inst.turn(-10, s) }, { label: 'Forward 10 min ↻', act: (s, inst) => inst.turn(10, s) }] },
    { key: 'labels', type: 'toggle', label: 'Tooth counts' },
  ],
  quiz: [
    { q: 'A 10-tooth pinion drives a 40-tooth wheel. How fast does the wheel turn?', options: ['4 times faster', 'At the same speed', '4 times slower', '30 times slower'], answer: 2, why: 'Each turn of the pinion moves 10 teeth past, a quarter of the wheel. Ratio = 40 ÷ 10 = 4.' },
    { q: 'The rotor makes half a turn each second. How much must gears slow it for the seconds hand?', options: ['2 times', '30 times', '60 times', '3,600 times'], answer: 1, why: 'Half a turn a second is 30 turns a minute. The seconds hand makes one. Here 4 × 6 × 1.25 = 30.' },
    { q: 'What happens when you pull out the crown of a quartz watch?', options: ['The cell is disconnected', 'The crystal stops ringing', 'The chip stops the motor pulses and the crown is geared to the hands', 'The gears come apart'], answer: 2, why: 'The crystal keeps ringing, but the divider is held at zero, so no pulses reach the motor until you push the crown back.' },
  ],
  reel: [
    { ms: 5600, caption: 'Gears slow the rotor: 30 to 1 for the seconds hand, 60 more for minutes, 12 more for hours.', set: { rate: 60, pulled: false, labels: false }, anim: { spread: [0, 1] }, view: fit([-0.6, 4.1, 0], [0.6, 0.16, 1], 8.6, 7.6), spin: 0.35 },
  ],

  build({ stage }) {
    const w = makeWatch({ bare: true });
    w.group.position.set(-1.0, Y0, 0); w.group.scale.setScalar(SC);
    w.parts.handMat.opacity = 0.45; w.parts.handMat.depthWrite = false;
    stage.root.add(w.group);
    w.parts.dial.visible = true; w.parts.dialMat.opacity = 0.1; w.parts.dialMat.depthWrite = false;
    const defs = [
      ['Rotor pinion: 10 teeth', [WATCH.rotor[0] - 0.75, WATCH.rotor[1] + 0.3], -0.3, 'hot'],
      ['Sixth wheel 40, pinion 7', [WATCH.sixth[0] + 0.95, WATCH.sixth[1] - 0.3], -0.3],
      ['Fifth wheel 42, pinion 48', [WATCH.fifth[0] + 0.95, WATCH.fifth[1] + 0.05], -0.2],
      ['Fourth wheel 60, pinion 6: seconds hand', [-1.35, -0.3], -0.1, 'hot'],
      ['Third wheel 48, pinion 6', [WATCH.third[0] - 1.0, WATCH.third[1] + 0.35], 0],
      ['Centre wheel 45: minute hand', [-1.35, 0.12], 0.1, 'hot'],
      ['Minute wheel 36, pinion 10', [WATCH.minute[0] + 1.0, WATCH.minute[1] + 0.3], 0.245],
      ['Cannon pinion 12, hour wheel 40: hour hand', [1.55, 0.95], 0.29, 'hot'],
      ['Setting wheel', [WATCH.setting[0] + 0.75, WATCH.setting[1] + 0.3], 0.245],
      ['Coil and stator', [0.2, -1.95], -0.44],
    ];
    const labels = defs.map(([text, xy, z, cls]) => ({ l: stage.label(text, [xy[0], xy[1], z], w.group, cls || ''), z }));
    const lCrown = stage.label('Crown', [2.75, 0.5, 0.25], w.parts.crown);

    let t = 10 * 3600 + 8 * 60 + 20, slip = 0, slipTarget = 0, crownK = 0, st = { h: 10, m: 8, s: 20 };
    return {
      turn(min, s) { if (s.pulled) slipTarget += (min / 60) * TAU; },
      update(dt, s) {
        dt = Math.max(0, dt);
        if (!s.pulled) t += dt * s.rate;
        crownK = approach(crownK, s.pulled ? 1 : 0, 10, dt);
        slip = approach(slip, slipTarget, 3, dt);
        w.setCrown(crownK); w.turnCrown(slip * 6);
        w.setSpread(s.spread * 2.2);
        w.setTime(t, { tick: s.rate === 1, slip });
        labels.forEach(({ l, z }) => { l.visible = s.labels; l.position.z = z * (1 + s.spread * 2.2); });
        lCrown.element.textContent = s.pulled ? 'Crown: pulled out' : 'Crown';
        const a = w.angles, mins = ((-a.minute / TAU) * 60 % 60 + 60) % 60, hrs = ((-a.hour / TAU) * 12 % 12 + 12) % 12;
        st = { h: Math.floor(hrs + 1e-6) || 12, m: Math.floor(mins + 1e-6), s: Math.floor(t) % 60 };
      },
      readout: (s) => `<div class="big">${st.h}:${pad(st.m)}:${pad(st.s)}${s.pulled ? ' · stopped' : ''}</div>
          <div class="row"><span>Rotor → seconds</span><b>${T.sixthWheel}/${T.rotorPinion} × ${T.fifthWheel}/${T.sixthPinion} × ${T.fourthWheel}/${T.fifthPinion} = ${RATIO.rotorToSecond} : 1</b></div>
          <div class="row"><span>Seconds → minutes</span><b>${T.thirdWheel}/${T.fourthPinion} × ${T.centreWheel}/${T.thirdPinion} = ${RATIO.secondToMinute} : 1</b></div>
          <div class="row"><span>Minutes → hours</span><b>${T.minuteWheel}/${T.cannonPinion} × ${T.hourWheel}/${T.minutePinion} = ${RATIO.minuteToHour} : 1</b></div>
          <div class="row"><span>Steps per turn of the hour hand</span><b>${(2 * RATIO.rotorToSecond * RATIO.secondToMinute * RATIO.minuteToHour).toLocaleString('en')}</b></div>`,
    };
  },
};

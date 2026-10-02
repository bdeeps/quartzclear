// Chapter 6: how accurate. The crystal's temperature parabola, seconds a month against a
// mechanical watch's seconds a day, and how long the cell lasts.
import { THREE, M, box, canvasTexture, approach, clamp } from '../kit.js';
import { makeWatch, board, zcyl, fit, ppmAt, XTAL, SEC_PER_DAY_PER_PPM as SPD, TAU } from '../watch.js';

// Rates, in seconds a day (+ = gaining).
//  quartz: the crystal's parabola alone, -0.034 ppm/°C² about 25 °C (data sheets, see watch.js).
//          Makers rate ordinary quartz watches at about ±15 to ±20 s a month (Miyota 2035: ±20 s/month).
//  thermo: thermocompensated quartz, rated ±10 s a year (ETA Thermoline, Grand Seiko 9F) or ±5 (The Citizen).
//  mech:   a mechanical chronometer must average between -4 and +6 s a day (COSC, ISO 3159).
//          The example watch here gains 5 s a day.
const SPEC = { quartz: 15 / 30, thermo: 10 / 365, mech: 6 };
const rate = (kind, T) => (kind === 'quartz' ? ppmAt(T) * SPD : kind === 'thermo' ? 0 : 5);
// Cell: an SR626SW silver-oxide cell holds about 28 mAh (Maxell and Murata data); the Miyota 2035
// movement is rated for about 3 years on one (miyotamovement.com).
const CELL_MAH = 28, CELL_YEARS = 3, CELL_V = 1.55;
const MICROAMP = (CELL_MAH * 1000) / (CELL_YEARS * 365.25 * 24);
const fmtErr = (sec) => { const a = Math.abs(sec); return a < 0.05 ? '0 s' : (sec > 0 ? '+' : '−') + (a >= 120 ? (a / 60).toFixed(1) + ' min' : a.toFixed(a < 10 ? 1 : 0) + ' s'); };

export default {
  id: 'accuracy',
  short: 'How accurate',
  title: 'How well does it keep time?',
  subtitle: 'Seconds a month, where the best mechanical watch manages seconds a day.',
  view: fit([0.3, 4.5, 0], [0.06, 0.04, 1], 8.6, 9.0),
  learn: `<p>An ordinary quartz watch is rated to about <b>±15 seconds a month</b>. A very good mechanical watch, a certified <b>chronometer</b>, is allowed to gain 6 or lose 4 seconds <b>a day</b>. A watch from a street stall beats a mechanical watch a hundred times its price.</p>
    <p>Why? A mechanical watch counts the swings of a <b>balance wheel</b>, about 4 a second. Friction, gravity, knocks and a tired spring all nudge it. The crystal swings 8,000 times faster and rings far more cleanly (its <b>Q</b> is about 70,000, against a few hundred), so almost nothing can pull it off its note.</p>
    <p>Almost nothing. <b>Temperature</b> does. The fork is cut so that it runs truest near 25 °C. Warmer or colder, it slows down, along a curve called a <b>parabola</b>. Your wrist helps: it keeps the watch near that sweet spot. Leave the watch on a cold windowsill and it loses a second or so a day.</p>
    <p>Makers fix the rest in the chip. The crystal is made to run a touch fast, and the chip <b>skips a few counts</b> every minute or so to bring it back. <b>Thermocompensated</b> watches also measure the temperature and correct for it: they manage ±5 to ±10 seconds a <b>year</b>.</p>
    <p>The whole watch runs on about a millionth of an amp, so a lentil-sized cell lasts around three years. When it runs low, many watches make the seconds hand jump in bigger steps a few seconds apart as a warning. <b>Solar</b> watches charge a cell from light through the dial. <b>Kinetic</b> ones charge it with a swinging weight. <b>Radio-controlled</b> watches listen each night to a time signal from an atomic clock and correct themselves.</p>
    <p>For pendulums and escapements see <a href="https://glassbox.how/clockclear/">ClockClear</a>.</p>
    <p class="tip"><b>Try it:</b> set the temperature to 5 °C and run a month. Then compare the mechanical watch.</p>`,
  terms: [
    { t: 'ppm', d: 'Parts per million. 1 ppm fast is 1 second gained in a million seconds, about 11.6 days.' },
    { t: 'Turnover temperature', d: 'The temperature where the crystal runs fastest, about 25 °C. Either side of it, it slows.' },
    { t: 'Chronometer', d: 'A watch certified for accuracy. Mechanical ones must average between −4 and +6 seconds a day.' },
    { t: 'Thermocompensation', d: 'Measuring the temperature and correcting the count for it.' },
    { t: 'Balance wheel', d: 'The swinging wheel and hairspring that set the pace of a mechanical watch.' },
    { t: 'Inhibition', d: 'Trimming a quartz watch by letting the chip skip a few crystal counts at regular intervals.' },
  ],
  defaults: { kind: 'quartz', temp: 28, days: 30 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Watch', options: [{ v: 'quartz', label: 'Quartz' }, { v: 'thermo', label: 'Thermo quartz' }, { v: 'mech', label: 'Mechanical' }] },
    { key: 'temp', type: 'range', label: 'Temperature of the watch', min: -10, max: 50, step: 1, fmt: (v) => v + ' °C', hint: 'On a wrist a watch stays near 25 to 30 °C whatever the weather.' },
    { key: 'days', type: 'range', label: 'Days since you set it', min: 0, max: 365, step: 1, fmt: (v) => v + (v === 1 ? ' day' : ' days') },
  ],
  quiz: [
    { q: 'What is the usual accuracy of an ordinary quartz watch?', options: ['About 15 seconds a day', 'About 15 seconds a month', 'About 15 minutes a month', 'Perfect: it never drifts'], answer: 1, why: 'Makers rate standard quartz movements at roughly ±15 to ±20 seconds a month.' },
    { q: 'A quartz watch is left somewhere very cold, then somewhere very hot. What does it do?', options: ['Gains in the cold, loses in the heat', 'Loses in the cold, gains in the heat', 'Loses time in both', 'Nothing changes'], answer: 2, why: 'The tuning fork runs fastest near 25 °C and slower on either side: the curve is a parabola that opens downwards.' },
    { q: 'Why is a quartz crystal a steadier timekeeper than a balance wheel?', options: ['It is heavier', 'It swings thousands of times faster and loses far less energy per swing', 'It is made of metal', 'It is bigger'], answer: 1, why: '32,768 swings a second against about 4, and a Q of about 70,000 against a few hundred. Little can push it off its note.' },
  ],
  reel: [
    { ms: 5200, caption: 'A quartz watch drifts about 15 seconds a month. A fine mechanical watch can drift that much in three days.', set: { kind: 'quartz', temp: 28 }, anim: { days: [0, 30] }, view: fit([0.3, 4.5, 0], [0.06, 0.03, 1], 8.4, 8.8), spin: 0.08 },
    { ms: 5200, caption: 'Its one weakness is temperature: the crystal runs truest near 25 °C, kept there by your wrist.', set: { kind: 'quartz', days: 30 }, anim: { temp: [28, -10] }, view: fit([0.3, 4.5, 0], [0.06, 0.03, 1], 8.4, 8.8), spin: 0.08 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); stage.root.add(g);
    const w = makeWatch(); w.group.position.set(1.3, 6.75, 0); w.group.scale.setScalar(0.68); g.add(w.group);
    // A second, pale hand that shows the true time.
    const truth = new THREE.Group(); const th = box(0.03, 1.9, 0.012, M.glow(0x8ef0ff)); th.position.y = 0.95; truth.add(th); truth.position.z = 0.54; w.group.add(truth);
    const lTrue = stage.label('True time', [0, 2.05, 0], truth);
    lTrue.element.style.color = '#8ef0ff';
    // Thermometer.
    const thermo = new THREE.Group(); thermo.position.set(4.0, 5.2, 0); thermo.scale.setScalar(0.85); g.add(thermo);
    thermo.add(zcyl(0.01, 0.01, 0, 0, M.plastic(0)));
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 20), M.clear(0xdff1ff, 0.22)); tube.position.y = 1.7; thermo.add(tube);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), M.glow(0xff5a4a)); thermo.add(bulb);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 16), M.glow(0xff5a4a)); thermo.add(col);
    const lT = stage.label('', [0.2, 3.75, 0], thermo, 'hot');

    const cur = { kind: 'quartz', T: 28 };
    const chart = canvasTexture(900, 520, (c, W, H) => {
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(7,8,12,.88)'; c.fillRect(0, 0, W, H);
      const x0 = 90, y0 = 70, cw = W - x0 - 30, ch = H - y0 - 70, LO = -4.6, HI = 6.6;
      const X = (T) => x0 + (cw * (T + 10)) / 60, Y = (r) => y0 + (ch * (HI - r)) / (HI - LO);
      c.font = 'bold 26px sans-serif'; c.fillStyle = '#fff'; c.fillText('Seconds gained or lost each day', 24, 38);
      c.font = '20px sans-serif';
      for (let r = -4; r <= 6; r += 2) { c.strokeStyle = r === 0 ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, Y(r)); c.lineTo(x0 + cw, Y(r)); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText((r > 0 ? '+' : '') + r + ' s', 22, Y(r) + 7); }
      for (let T = -10; T <= 50; T += 10) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(T + ' °C', X(T) - 22, H - 36); }
      // Mechanical chronometer limits.
      c.fillStyle = cur.kind === 'mech' ? 'rgba(255,181,71,.3)' : 'rgba(255,181,71,.12)'; c.fillRect(x0, Y(6), cw, Y(-4 < LO ? LO : -4) - Y(6));
      c.fillStyle = '#ffb547'; c.fillText('Mechanical chronometer: −4 to +6 s a day allowed', x0 + 14, Y(6) + 28);
      // Quartz parabola.
      c.save(); c.beginPath(); c.rect(x0, y0, cw, ch); c.clip();
      c.strokeStyle = '#8ef0ff'; c.lineWidth = cur.kind === 'quartz' ? 7 : 3; c.beginPath();
      for (let T = -10; T <= 50; T += 1) { const y = Y(ppmAt(T) * SPD); T === -10 ? c.moveTo(X(T), y) : c.lineTo(X(T), y); } c.stroke();
      c.restore();
      c.fillStyle = '#8ef0ff'; c.fillText('Quartz crystal', X(33), Y(-1.3) + 6);
      // Thermocompensated: flat.
      c.strokeStyle = '#9dffb0'; c.lineWidth = cur.kind === 'thermo' ? 7 : 3; c.setLineDash([14, 8]); c.beginPath(); c.moveTo(x0, Y(0)); c.lineTo(x0 + cw, Y(0)); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#9dffb0'; c.fillText('Thermocompensated quartz', X(-8), Y(0) - 12);
      const r = rate(cur.kind, cur.T);
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(X(cur.T), y0); c.lineTo(X(cur.T), y0 + ch); c.stroke(); c.setLineDash([]);
      c.fillStyle = cur.kind === 'quartz' ? '#8ef0ff' : cur.kind === 'thermo' ? '#9dffb0' : '#ffb547';
      c.beginPath(); c.arc(X(cur.T), Y(clamp(r, LO, HI)), 13, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    });
    const chartB = board(7.2, 7.2 * 520 / 900, chart.tex); chartB.position.set(0, 2.3, 0.4); g.add(chartB);

    let t = 10 * 3600 + 9 * 60, T = 28, drawn = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        t += dt;
        T = approach(T, s.temp, 6, dt);
        const err = rate(s.kind, s.temp) * s.days;
        w.setTime(t + err, { tick: true });
        truth.rotation.z = -(Math.floor(t) % 60) * (TAU / 60);
        const k = (clamp(T, -10, 50) + 10) / 60, hgt = 0.3 + 2.9 * k;
        col.scale.y = hgt; col.position.y = hgt / 2;
        lT.element.textContent = Math.round(T) + ' °C';
        cur.kind = s.kind; cur.T = T;
        const key = s.kind + T.toFixed(1);
        if (key !== drawn) { drawn = key; chart.redraw(); }
      },
      readout: (s) => {
        const r = rate(s.kind, s.temp), err = r * s.days, ppm = s.kind === 'quartz' ? ppmAt(s.temp) : r / SPD;
        const head = s.kind === 'thermo' ? `Within ±${Math.max(0.1, SPEC.thermo * s.days).toFixed(1)} s` : fmtErr(err);
        const name = { quartz: 'Ordinary quartz', thermo: 'Thermocompensated quartz', mech: 'Mechanical (example: +5 s a day)' }[s.kind];
        return `<div class="big">${head} after ${s.days} day${s.days === 1 ? '' : 's'}</div>
          <div class="row"><span>Rate at ${s.temp} °C</span><b>${s.kind === 'thermo' ? 'under 0.03 s a day' : (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(2) + ' s a day (' + (ppm > 0 ? '+' : ppm < 0 ? '−' : '') + Math.abs(ppm).toFixed(1) + ' ppm)'}</b></div>
          <div class="row"><span>Maker’s rating</span><b>${s.kind === 'quartz' ? '±15 s a month' : s.kind === 'thermo' ? '±5 to ±10 s a year' : '−4 to +6 s a day'}</b></div>
          <div class="row"><span>Power</span><b>${s.kind === 'mech' ? 'a wound spring, about 2 days' : `${CELL_MAH} mAh cell ÷ ${CELL_YEARS} years ≈ ${MICROAMP.toFixed(1)} µA (${(MICROAMP * CELL_V).toFixed(1)} µW)`}</b></div>`;
      },
    };
  },
};

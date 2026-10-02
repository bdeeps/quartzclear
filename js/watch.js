// Watch models and numbers shared by QuartzClear's chapters: toothed gears that really
// mesh, the gear train of an analog quartz movement, the Lavet stepping motor, a generic
// three-hand wristwatch (no maker's design), and the quartz tuning fork.
import { THREE, M, box, torus, canvasTexture, clamp } from './kit.js';

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- numbers
// The crystal: 2^15 swings a second, so fifteen halvings give exactly 1 Hz.
export const F_XTAL = 32768;
// Typical 32.768 kHz tuning-fork crystal data (Geyer KX-327, Rakon RTF2012, Raltron R38, RXD WC38
// data sheets): frequency falls off as a parabola either side of a turnover temperature of
// 25 ± 5 °C, by -0.034 ± 0.006 ppm per °C²; Q about 70,000 to 90,000; drive level 1 µW at most.
export const XTAL = { K: -0.034, T0: 25, Q: 70000 };
export const ppmAt = (T) => XTAL.K * (T - XTAL.T0) ** 2;
export const SEC_PER_DAY_PER_PPM = 0.0864;

// A cantilever's first bending mode: f = (1.875² / 2π) · (w / L²) · √(E / 12ρ), with w the
// tine's width in the direction it bends and L its length (Euler-Bernoulli beam theory).
// Quartz: E ≈ 78 GPa along the tine, ρ = 2,650 kg/m³. A tine about 0.25 mm wide then needs to
// be 2.6 mm long to ring at 32,768 Hz, which is the size of real watch crystals.
const E_QUARTZ = 78e9, RHO_QUARTZ = 2650;
export const TINE_W = 0.2528e-3;                    // metres; chosen so 2.6 mm gives 32,768 Hz
export const forkHz = (lenMm) => (1.875 ** 2 / TAU) * (TINE_W / (lenMm * 1e-3) ** 2) * Math.sqrt(E_QUARTZ / (12 * RHO_QUARTZ));

// Tooth counts of a real quartz wristwatch train: US patent 4,365,899 (Suwa Seikosha, filed
// 1980), first embodiment. The rotor turns half a turn a second; 1/4 × 1/6 × 4/5 = 1/30 brings
// that down to one turn a minute at the fourth wheel, which carries the seconds hand.
// The motion work (cannon pinion to hour wheel) uses typical counts for a 12:1 reduction
// (horopedia.org, "Motion work": 12, 36, 10, 40).
export const TEETH = {
  rotorPinion: 10, sixthWheel: 40, sixthPinion: 7, fifthWheel: 42, fifthPinion: 48, fourthWheel: 60,
  fourthPinion: 6, thirdWheel: 48, thirdPinion: 6, centreWheel: 45,
  cannonPinion: 12, minuteWheel: 36, minutePinion: 10, hourWheel: 40, settingWheel: 16,
};
const T = TEETH;
export const RATIO = {
  rotorToSecond: (T.sixthWheel / T.rotorPinion) * (T.fifthWheel / T.sixthPinion) * (T.fourthWheel / T.fifthPinion),   // 30
  secondToMinute: (T.thirdWheel / T.fourthPinion) * (T.centreWheel / T.thirdPinion),                                  // 60
  minuteToHour: (T.minuteWheel / T.cannonPinion) * (T.hourWheel / T.minutePinion),                                    // 12
};

// ---------------------------------------------------------------- small helpers
export function zcyl(r0, r1, z0, z1, mat, seg = 40, open = false) {
  const g = new THREE.CylinderGeometry(r1, r0, Math.abs(z1 - z0), seg, 1, open);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.z = (z0 + z1) / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Lathe around the Z axis from [z, r] pairs.
export function latheZ(profile, mat, seg = 72) {
  const g = new THREE.LatheGeometry(profile.map(([z, r]) => new THREE.Vector2(Math.max(0, r), z)), seg);
  g.rotateX(Math.PI / 2); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// A flat picture you can stand in the scene (charts, dials).
export function board(w, h, tex, { opacity = 1 } = {}) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, side: THREE.DoubleSide, toneMapped: false }));
}

// A camera view that frames a w × h box of the scene whatever shape the stage is (wide page,
// phone, square or tall video). The stage backs the camera off on narrow screens by itself
// (stage.setView), so that factor is divided out here.
export const stageAspect = () => { const el = document.getElementById('stage'); return el && el.clientHeight ? el.clientWidth / el.clientHeight : 1.6; };
export function fit(target, dir, w, h, pad = 1.13) {
  const TAN = Math.tan((21 * Math.PI) / 180), n = Math.hypot(...dir);
  // On a phone the readout covers the top of the stage, so the box is fitted into the lower 58%.
  const calc = () => {
    const a = stageAspect(), phone = a < 1 && !document.body.classList.contains('gb-reel');
    const D = pad * Math.max((phone ? h / 0.58 : h) / (2 * TAN), w / (2 * TAN * a)), k = clamp(1.45 / Math.max(0.3, a), 1, 2.5);
    const tg = phone ? [target[0], target[1] + 0.21 * 2 * D * TAN, target[2]] : target;
    return { tg, pos: tg.map((t, i) => t + (dir[i] / n) * (D / k)) };
  };
  return { get target() { return calc().tg; }, get pos() { return calc().pos; } };
}

// Two framings: one for wide and square stages, one for tall ones (phones held upright, vertical video).
export function fitEither(wide, tall) {
  const pick = () => (stageAspect() < 0.8 ? tall : wide);
  return { get target() { return pick().target; }, get pos() { return pick().pos; } };
}

// ---------------------------------------------------------------- gears
// A spur gear in the XY plane (axis Z) with `z` teeth of module `m`: pitch radius m·z/2.
// At rotation 0 one tooth points along +X.
export function gearGeometry(z, m, width, holes = 0) {
  const r = (m * z) / 2, ra = r + m * 0.95, rf = r - m * 1.15, p = TAU / z, sh = new THREE.Shape();
  for (let i = 0; i < z; i++) {
    const a = i * p;
    const pts = [[rf, a - 0.3 * p], [ra, a - 0.12 * p], [ra, a + 0.12 * p], [rf, a + 0.3 * p]];
    pts.forEach(([rr, aa], k) => { const x = rr * Math.cos(aa), y = rr * Math.sin(aa); if (i === 0 && k === 0) sh.moveTo(x, y); else sh.lineTo(x, y); });
  }
  sh.closePath();
  for (let i = 0; i < holes; i++) {
    const a = ((i + 0.5) / holes) * TAU, h = new THREE.Path();
    h.absarc(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56, r * 0.2, 0, TAU, true); sh.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -width / 2);
  return g;
}
export function gear(z, m, width, mat, { holes = 0, mark = null } = {}) {
  const g = new THREE.Mesh(gearGeometry(z, m, width, holes), mat); g.castShadow = true;
  if (mark !== null) { const d = zcyl(m * z * 0.035 + 0.008, m * z * 0.035 + 0.008, -width / 2 - 0.004, width / 2 + 0.004, M.glow(mark), 12); d.castShadow = false; d.position.x = m * z * 0.39; g.add(d); }
  return g;
}
// The angle gear B must sit at so that its teeth fall into gear A's gaps. A is at angle thA with
// zA teeth; B (zB teeth) lies in direction `dir` from A. (Afterwards B turns at -zA/zB times A.)
export function meshAngle(thA, zA, zB, dir) {
  const pA = TAU / zA, pB = TAU / zB;
  const f = ((((dir - thA) % pA) + pA) % pA) / pA;      // how far past a tooth of A the pitch point is
  return dir + Math.PI + (f + 0.5) * pB;
}

// ---------------------------------------------------------------- the Lavet stepping motor
// One flat stator of soft iron with a hole for the rotor, joined to a coil on an iron core.
// The rotor is a tiny magnet with one north and one south pole. Two notches in the hole set
// where the magnet rests: its poles sit a quarter turn from the notches, where the gap is
// smallest. That rest line (REST) is tilted 45° from the line of the coil's field (along X).
export const REST = Math.PI / 4;
export function makeLavet({ S = 1, notches = true } = {}) {
  const g = new THREE.Group();
  const iron = M.metal(0x8b93a3, { roughness: 0.45, metalness: 0.7 });
  const RH = 0.17 * S, th = 0.05 * S;
  const holePath = (withNotches) => {
    const h = new THREE.Path(), N = 96;
    for (let i = 0; i <= N; i++) {
      const a = -(i / N) * TAU;                                   // clockwise, as a hole must be
      let r = RH;
      if (withNotches) for (const an of [REST + Math.PI / 2, REST - Math.PI / 2]) { const d = Math.atan2(Math.sin(a - an), Math.cos(a - an)); r += 0.035 * S * Math.exp(-(d * d) / 0.03); }
      const x = r * Math.cos(a), y = r * Math.sin(a); i ? h.lineTo(x, y) : h.moveTo(x, y);
    }
    return h;
  };
  const statorGeo = (withNotches) => {
    const sh = new THREE.Shape();
    const P = [[-0.9, -0.67], [-0.55, -0.67], [-0.55, -0.21], [0.55, -0.21], [0.55, -0.67], [0.9, -0.67], [0.9, 0.21], [-0.9, 0.21]];
    P.forEach(([x, y], i) => (i ? sh.lineTo(x * S, y * S) : sh.moveTo(x * S, y * S)));
    sh.closePath(); sh.holes.push(holePath(withNotches));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }); geo.translate(0, 0, -th / 2);
    return geo;
  };
  const stator = new THREE.Mesh(statorGeo(notches), iron); stator.castShadow = true; g.add(stator);
  // Coil: thousands of turns of hair-fine copper wire on an iron core that bridges the stator's two feet.
  const copper = M.metal(0xd08a4a, { roughness: 0.38, metalness: 0.75, emissive: new THREE.Color(0), emissiveIntensity: 1 });
  const coil = new THREE.Group(); coil.position.y = -0.54 * S; g.add(coil);
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.8 * S, 0.1 * S, th * 1.1), iron); core.castShadow = true; coil.add(core);
  const wind = new THREE.Mesh(new THREE.CylinderGeometry(0.125 * S, 0.125 * S, 0.98 * S, 40), copper); wind.rotation.z = Math.PI / 2; wind.castShadow = true; coil.add(wind);
  for (const x of [-0.5, 0.5]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 0.03 * S, 32), M.plastic(0x2a3040)); c.rotation.z = Math.PI / 2; c.position.x = x * S; coil.add(c); }
  // Rotor: a disc magnet, north half red, south half blue.
  const rotor = new THREE.Group(); g.add(rotor);
  const half = (col, start) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.125 * S, 0.125 * S, 0.11 * S, 40, 1, false, start, Math.PI), M.plastic(col, { roughness: 0.35 })); m.rotation.x = Math.PI / 2; m.castShadow = true; return m; };
  // After rotation.x, a cylinder's angle 0 points along +Z·…; build so the N half is centred on +X.
  rotor.add(half(0xff5a4a, 0), half(0x4f86ff, Math.PI));
  return {
    group: g, stator, coil, copper, rotor, S,
    setNotches(on) { stator.geometry.dispose(); stator.geometry = statorGeo(on); },
  };
}

// The rotor's motion during and after a drive pulse, as plain mechanics:
//   I·θ'' = -Kd·sin 2(θ - rest)  (the notches' detent, two rest places half a turn apart)
//           + Km·u·sin(0 - θ)    (the coil's field along ±X pulling the magnet into line; u = ±1 or 0)
//           - c·θ'               (eddy currents and friction)
// Time is in milliseconds. The constants are picked so a step takes about 5 ms of drive and
// settles in about 20 ms, like a real watch motor (drive pulses of a few ms: EM Microelectronic
// H1137 and EM1537 watch chips are programmable from about 1 to 14.6 ms).
export const LAVET = { Kd: 0.03, Km: 0.2, c: 0.25 };
export function lavetAdvance(st, u, ms, rest = REST) {
  const n = Math.max(1, Math.ceil(ms / 0.05)), h = ms / n;
  for (let i = 0; i < n; i++) {
    const a = -LAVET.Kd * Math.sin(2 * (st.th - rest)) - LAVET.Km * u * Math.sin(st.th) - LAVET.c * st.w;
    st.w += a * h; st.th += st.w * h;
  }
}

// ---------------------------------------------------------------- the watch
// A generic three-hand quartz wristwatch facing +Z, centred on the origin of its group.
// 1 unit ≈ 8 mm: a 38 mm case. The gears are drawn larger than life so their teeth can be seen;
// real ones are a few millimetres across. Layers from the back: cell, circuit and motor, the
// gear train, the main plate, the motion work, the dial and the hands.
export const WATCH = {
  R: 2.05, third: [-0.094, 0.532], fifth: [0.619, -0.434], sixth: [0.374, -0.858], rotor: [-0.049, -1.012],
  minute: [0.24, 0.416], setting: [0.69, 0.156],
};
const MOD = { A: 0.018, B: 0.02, C: 0.014, D: 0.02, E: 0.02 * 54 / 51, F: 0.02, G: 0.02 * 48 / 50 };
const dirOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

export function makeWatch({ bare = false } = {}) {
  const W = WATCH, watch = new THREE.Group();
  const brass = M.metal(0xd8b25a, { roughness: 0.35, metalness: 0.8 });
  const steel = M.metal(0xd5dae3, { roughness: 0.3 });
  const dark = M.plastic(0x23283a);
  const parts = {};
  const grp = (name, parent = watch) => { const g = new THREE.Group(); parent.add(g); parts[name] = g; return g; };

  // ---- the going train, behind the main plate
  const train = grp('train'), zs = [];
  const arbor = (name, xy, parent) => { const g = new THREE.Group(); g.position.set(xy[0], xy[1], 0); parent.add(g); parts[name] = g; return g; };
  const put = (parent, mesh, z) => { mesh.position.z = z; mesh.userData.z = z; parent.add(mesh); zs.push(mesh); return mesh; };
  const wd = 0.035, pw = 0.07;
  const rotorG = grp('rotorSet'); rotorG.position.set(W.rotor[0], W.rotor[1], 0);
  const rotorSpin = new THREE.Group(); rotorG.add(rotorSpin);
  const motor = makeLavet({ S: 1 });
  // The magnet turns in the stator's hole; its pinion reaches forward to the sixth wheel.
  put(rotorSpin, motor.rotor, -0.44);
  put(rotorSpin, gear(T.rotorPinion, MOD.A, pw, steel), -0.3);
  put(rotorSpin, zcyl(0.02, 0.02, -0.07, 0.07, steel, 10), -0.37);
  const sixth = arbor('sixth', W.sixth, train);
  put(sixth, gear(T.sixthWheel, MOD.A, wd, brass, { holes: 5, mark: 0xff7a59 }), -0.3);
  put(sixth, gear(T.sixthPinion, MOD.B, pw, steel), -0.2);
  put(sixth, zcyl(0.02, 0.02, -0.06, 0.06, steel, 10), -0.25);
  const fifth = arbor('fifth', W.fifth, train);
  put(fifth, gear(T.fifthWheel, MOD.B, wd, brass, { holes: 5, mark: 0xff7a59 }), -0.2);
  put(fifth, gear(T.fifthPinion, MOD.C, wd, M.metal(0xb7bfcc, { roughness: 0.4 }), { holes: 4 }), -0.1);
  put(fifth, zcyl(0.03, 0.03, -0.06, 0.06, steel, 10), -0.15);
  const fourth = arbor('fourth', [0, 0], train);
  put(fourth, gear(T.fourthWheel, MOD.C, wd, brass, { holes: 5, mark: 0xff7a59 }), -0.1);
  put(fourth, gear(T.fourthPinion, MOD.D, pw, steel), 0);
  const third = arbor('third', W.third, train);
  put(third, gear(T.thirdWheel, MOD.D, wd, brass, { holes: 5, mark: 0x8ef0ff }), 0);
  put(third, gear(T.thirdPinion, MOD.E, pw, steel), 0.1);
  put(third, zcyl(0.02, 0.02, -0.06, 0.06, steel, 10), 0.05);
  const centre = arbor('centre', [0, 0], train);
  put(centre, gear(T.centreWheel, MOD.E, wd, brass, { holes: 5, mark: 0x8ef0ff }), 0.1);

  // ---- motion work, in front of the main plate (under the dial)
  const motion = grp('motion');
  const cannon = arbor('cannon', [0, 0], motion);
  put(cannon, gear(T.cannonPinion, MOD.F, 0.05, steel), 0.245);
  const minuteW = arbor('minuteWheel', W.minute, motion);
  put(minuteW, gear(T.minuteWheel, MOD.F, 0.03, brass, { holes: 4, mark: 0xffd27a }), 0.245);
  put(minuteW, gear(T.minutePinion, MOD.G, 0.045, steel), 0.29);
  const hourW = arbor('hourWheel', [0, 0], motion);
  put(hourW, gear(T.hourWheel, MOD.G, 0.03, brass, { holes: 5, mark: 0xffd27a }), 0.29);
  const setW = arbor('settingWheel', W.setting, motion);
  put(setW, gear(T.settingWheel, MOD.F, 0.04, steel, { mark: 0xffd27a }), 0.245);

  // ---- main plate
  const plateMat = bare ? M.clear(0x9fb4d8, 0.1) : M.metal(0x8f97a6, { roughness: 0.5, metalness: 0.6, transparent: true, opacity: 1 });
  const plate = put(grp('plate'), zcyl(W.R, W.R, -0.02, 0.02, plateMat, 72), 0.18);
  parts.plateMat = plateMat;

  // ---- motor (stator and coil), circuit (chip and crystal) and the cell, at the back
  const motorG = grp('motor'); motorG.position.set(W.rotor[0], W.rotor[1], 0);
  motor.group.remove(motor.rotor);
  put(motorG, motor.group, -0.44);
  const circuit = grp('circuit');
  const pcb = new THREE.Shape(); pcb.absarc(0, 0, 1.95, -1.05, 1.15, false); pcb.absarc(0, 0, 1.0, 1.15, -1.05, true);
  const pcbM = new THREE.Mesh(new THREE.ExtrudeGeometry(pcb, { depth: 0.03, bevelEnabled: false, curveSegments: 40 }), M.plastic(0x1f6f4a, { roughness: 0.6 }));
  put(circuit, pcbM, -0.6);
  const chip = box(0.4, 0.4, 0.07, M.plastic(0x12141b, { roughness: 0.3 })); chip.position.set(1.42, -0.42, 0); put(circuit, chip, -0.53); parts.chip = chip;
  const can = new THREE.Group(); can.position.set(1.18, 0.98, 0); can.rotation.z = -0.9; put(circuit, can, -0.44);
  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.75, 28), M.metal(0xe3e7ee, { roughness: 0.22 })); canBody.rotation.z = Math.PI / 2; canBody.castShadow = true; can.add(canBody);
  parts.can = can;
  const cell = grp('cell'); cell.position.set(-0.9, 0.72, 0);
  // SR626SW-size silver-oxide button cell: 6.8 mm across, 2.6 mm thick, 1.55 V.
  put(cell, zcyl(0.42, 0.42, -0.165, 0.165, M.metal(0xd9dee6, { roughness: 0.25 }), 48), -0.42);
  put(cell, zcyl(0.36, 0.36, -0.01, 0.01, M.metal(0xaeb5c2, { roughness: 0.4 }), 48), -0.596);
  const strapSpring = box(0.5, 0.08, 0.02, steel); strapSpring.position.set(0.3, -0.36, 0); put(cell, strapSpring, -0.6);

  // ---- crown, stem and the sliding clutch that reaches the setting wheel
  const crownG = grp('crown');
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.05, 12), steel); stem.rotation.z = Math.PI / 2; stem.position.set(1.72, 0, 0);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 28), M.metal(0xc9ced8, { roughness: 0.35 })); crown.rotation.z = Math.PI / 2; crown.position.set(2.72, 0, 0); crown.castShadow = true;
  const crownSet = new THREE.Group(); crownSet.add(stem, crown); put(crownG, crownSet, 0.245);
  const clutch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12), brass); clutch.rotation.z = Math.PI / 2; clutch.castShadow = true;
  const clutchG = new THREE.Group(); clutchG.add(clutch); put(crownG, clutchG, 0.245);
  parts.clutch = clutchG; parts.crownSet = crownSet;

  // ---- dial, hands, glass, case
  const dialTex = canvasTexture(1024, 1024, (g, w) => {
    const c = w / 2;
    g.clearRect(0, 0, w, w);
    const gr = g.createRadialGradient(c, c, 40, c, c, c); gr.addColorStop(0, '#1b2740'); gr.addColorStop(1, '#0d1424');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.fill();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, big = i % 5 === 0, r1 = c - 28, r0 = r1 - (big ? 78 : 22);
      g.strokeStyle = big ? '#f2f5fb' : 'rgba(242,245,251,.55)'; g.lineWidth = big ? (i % 15 === 0 ? 22 : 14) : 4; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
    }
  });
  const dialMat = new THREE.MeshStandardMaterial({ map: dialTex.tex, roughness: 0.6, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const dial = new THREE.Mesh(new THREE.CircleGeometry(2.1, 72), dialMat); dial.receiveShadow = true;
  put(grp('dial'), dial, 0.36); parts.dialMat = dialMat;

  const hands = grp('hands');
  const hand = (len, wid, tail, mat, z) => {
    const g = new THREE.Group(), b = box(wid, len + tail, 0.018, mat); b.position.y = (len - tail) / 2; g.add(b);
    g.add(zcyl(wid * 0.9 + 0.03, wid * 0.9 + 0.03, -0.012, 0.012, mat, 20)); put(hands, g, z); return g;
  };
  const white = M.plastic(0xf2f5fb, { roughness: 0.35, transparent: true, opacity: 1 }); parts.handMat = white;
  const hHour = hand(1.05, 0.15, 0.18, white, 0.42), hMin = hand(1.6, 0.11, 0.2, white, 0.46), hSec = hand(1.78, 0.035, 0.42, M.glow(0xff7a59), 0.5);
  put(hands, zcyl(0.06, 0.06, -0.02, 0.02, steel, 20), 0.52);
  // The three hands ride on three nested arbors: seconds in the middle, then minutes, then hours.
  put(fourth, zcyl(0.014, 0.014, -0.3, 0.3, steel, 8), 0.2);
  put(cannon, zcyl(0.034, 0.034, -0.18, 0.18, steel, 12, true), 0.28);
  put(hourW, zcyl(0.055, 0.055, -0.07, 0.07, brass, 14, true), 0.36);

  const caseMat = M.metal(0xc3c9d4, { roughness: 0.3, transparent: true, opacity: 1 });
  const caseG = grp('case');
  caseG.add(latheZ([[-0.74, 2.22], [-0.74, 2.42], [-0.3, 2.52], [0.4, 2.5], [0.66, 2.3], [0.66, 2.14], [0.5, 2.14], [0.5, 2.18], [-0.74, 2.22]], caseMat, 96));
  for (const sy of [1, -1]) for (const sx of [1, -1]) { const lug = box(0.36, 0.95, 0.5, caseMat); lug.position.set(sx * 1.3, sy * 2.55, -0.12); caseG.add(lug); }
  const strapMat = M.matte(0x2b2f3d);
  for (const sy of [1, -1]) { const s = box(2.2, 0.9, 0.2, strapMat); s.position.set(0, sy * 3.0, -0.2); caseG.add(s); }
  const tubeC = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), caseMat); tubeC.rotation.z = Math.PI / 2; tubeC.position.set(2.5, 0, 0.245); caseG.add(tubeC);
  parts.caseMat = caseMat;
  const glassMat = M.clear(0xdff1ff, 0.12, { roughness: 0.05 });
  put(grp('glass'), zcyl(2.16, 2.16, -0.03, 0.03, glassMat, 72), 0.62);
  const backMat = M.metal(0xb4bac6, { roughness: 0.4, transparent: true, opacity: 1 });
  put(grp('back'), zcyl(2.22, 2.22, -0.03, 0.03, backMat, 72), -0.77);
  if (bare) { parts.case.visible = parts.glass.visible = parts.back.visible = false; dialMat.opacity = 0.0; parts.dial.visible = false; parts.circuit.visible = false; parts.cell.visible = false; }

  // ---- meshing: every wheel's rest angle is set so teeth sit in gaps
  const R0 = REST;                                   // the rotor magnet's north pole rests at 45°
  const a6 = meshAngle(R0, T.rotorPinion, T.sixthWheel, dirOf(W.rotor, W.sixth));
  const a5 = meshAngle(a6, T.sixthPinion, T.fifthWheel, dirOf(W.sixth, W.fifth));
  const a4 = meshAngle(a5, T.fifthPinion, T.fourthWheel, dirOf(W.fifth, [0, 0]));
  const a3 = meshAngle(a4, T.fourthPinion, T.thirdWheel, dirOf([0, 0], W.third));
  const aC = meshAngle(a3, T.thirdPinion, T.centreWheel, dirOf(W.third, [0, 0]));
  const aM = meshAngle(0, T.cannonPinion, T.minuteWheel, dirOf([0, 0], W.minute));
  const aH = meshAngle(aM, T.minutePinion, T.hourWheel, dirOf(W.minute, [0, 0]));
  const aS = meshAngle(aM, T.minuteWheel, T.settingWheel, dirOf(W.minute, W.setting));

  const ease = (k) => k * k * (3 - 2 * k);
  const api = {
    group: watch, parts, motor,
    // t: seconds since 12:00:00. tick: step once a second like the real thing (false = glide).
    // slip: extra angle (radians) the cannon pinion has been turned on its friction fit by the crown.
    setTime(t, { tick = true, slip = 0 } = {}) {
      const steps = Math.floor(t), fr = t - steps;
      const th = Math.PI * (tick ? steps + ease(Math.min(1, fr / 0.14)) : t);      // rotor: half a turn a second
      rotorSpin.rotation.z = R0 + th;
      sixth.rotation.z = a6 - th * (T.rotorPinion / T.sixthWheel);
      const t5 = th * (T.rotorPinion / T.sixthWheel) * (T.sixthPinion / T.fifthWheel); fifth.rotation.z = a5 + t5;
      const t4 = -t5 * (T.fifthPinion / T.fourthWheel); fourth.rotation.z = a4 + t4;
      const t3 = -t4 * (T.fourthPinion / T.thirdWheel); third.rotation.z = a3 + t3;
      const tC = -t3 * (T.thirdPinion / T.centreWheel); centre.rotation.z = aC + tC;
      const tK = tC - slip; cannon.rotation.z = tK;
      const tM = -tK * (T.cannonPinion / T.minuteWheel); minuteW.rotation.z = aM + tM;
      const tH = -tM * (T.minutePinion / T.hourWheel); hourW.rotation.z = aH + tH;
      setW.rotation.z = aS - tM * (T.minuteWheel / T.settingWheel);
      hSec.rotation.z = t4; hMin.rotation.z = tK; hHour.rotation.z = tH;
      api.angles = { rotor: th, second: t4, minute: tK, hour: tH };
    },
    // Crown pulled out (k = 1): the stem moves out and a lever slides the clutch in to the setting wheel.
    setCrown(k) { crownSet.position.x = 0.14 * k; clutchG.position.x = 1.02 - 0.2 * k; clutch.rotation.x = 0; },
    turnCrown(a) { crownSet.rotation.x = a; clutchG.rotation.x = a; },
    // Pull the layers apart along the axis (k = 0 real spacing).
    setSpread(k) { zs.forEach((m) => { m.position.z = m.userData.z * (1 + k); }); },
    // See-through dial, glass, plate and case.
    setXray(on, dialToo = on) {
      dialMat.opacity = dialToo ? 0.14 : 1; dialMat.depthWrite = !dialToo;
      caseMat.opacity = on ? 0.2 : 1; caseMat.depthWrite = !on;
      backMat.opacity = on ? 0.3 : 1; backMat.depthWrite = !on;
      if (!bare) { plateMat.opacity = dialToo ? 0.16 : on ? 0.4 : 1; plateMat.depthWrite = !on; }
    },
  };
  api.setCrown(0); api.setTime(0);
  return api;
}

// ---------------------------------------------------------------- the quartz tuning fork
// Two tines on a base, cut from one thin plate of quartz and plated with gold electrodes.
// The tines bend towards and away from each other (in X), like a tuning fork's prongs.
// Mode shape of a cantilever's first bending mode (βL = 1.8751), 0 at the root, 1 at the tip.
const BL = 1.8751, SIG = 0.7341;
export const modeShape = (u) => { const x = BL * clamp(u, 0, 1); return ((Math.cosh(x) - Math.cos(x)) - SIG * (Math.sinh(x) - Math.sin(x))) / 2; };

export function makeFork({ L = 3.2, w = 0.42, gap = 0.34, t = 0.22, base = 1.3 } = {}) {
  const g = new THREE.Group();
  const quartz = new THREE.MeshPhysicalMaterial({ color: 0xdfeeff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const baseM = box(2 * w + gap, base, t, quartz); baseM.position.y = -base / 2; g.add(baseM);
  const tines = [], golds = [];
  for (const side of [-1, 1]) {
    const geo = new THREE.BoxGeometry(w, 1, t, 2, 40, 1); geo.translate(0, 0.5, 0);
    const m = new THREE.Mesh(geo, quartz); m.castShadow = true; g.add(m);
    const mat = M.metal(0xe6c35c, { roughness: 0.3, metalness: 0.85, emissive: new THREE.Color(0), emissiveIntensity: 1 });
    const eg = new THREE.BoxGeometry(w * 0.5, 0.86, t + 0.02, 1, 40, 1); eg.translate(0, 0.45, 0);
    const e = new THREE.Mesh(eg, mat); g.add(e);
    // Gold weights near the tips: a laser burns a little off to tune the fork up to pitch.
    const wg = new THREE.BoxGeometry(w * 0.86, 0.1, t + 0.03, 1, 4, 1); wg.translate(0, 0.94, 0);
    const wt = new THREE.Mesh(wg, M.metal(0xf0d27a, { roughness: 0.3 })); g.add(wt);
    tines.push({ side, meshes: [m, e, wt], x0: side * (gap + w) / 2 }); golds.push(mat);
  }
  tines.forEach((tn) => tn.meshes.forEach((m) => { m.userData.rest = m.geometry.attributes.position.array.slice(); }));
  const api = {
    group: g, golds, L,
    setLength(len) { api.L = len; },
    // amp: tip movement in scene units; positive = tines apart.
    bend(amp) {
      for (const tn of tines) for (const m of tn.meshes) {
        const p = m.geometry.attributes.position, r = m.userData.rest;
        for (let i = 0; i < p.count; i++) {
          const u = r[i * 3 + 1];
          p.array[i * 3] = r[i * 3] + tn.x0 + tn.side * amp * modeShape(u);
          p.array[i * 3 + 1] = u * api.L;
        }
        p.needsUpdate = true; m.geometry.computeBoundingSphere();
      }
    },
  };
  api.bend(0);
  return api;
}

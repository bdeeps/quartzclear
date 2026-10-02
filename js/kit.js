// 3D building blocks shared by Glassbox boxes: materials, primitives that sit
// on an axis, lathed shapes, tubes along paths, arrows, and small maths helpers.
import * as THREE from 'three';

export { THREE };
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));

export const M = {
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xe6f6ff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.3, ior: 1.45, transparent: true, opacity: 1, clearcoat: 1, ...o }),
  clear: (color = 0xcfe8ff, opacity = 0.18, o = {}) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, metalness: 0, depthWrite: false, side: THREE.DoubleSide, ...o }),
  metal: (color = 0xb9bec8, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.28, ...o }),
  plastic: (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0, ...o }),
  matte: (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }),
  glow: (color, o = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...o }),
  ghost: (color, opacity = 0.2, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, ...o }),
};

function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }

// A cylinder whose axis runs along X (from x0 to x1), radius r0 at x0 and r1 at x1.
export function rod(x0, x1, r0, r1 = r0, mat, seg = 40, open = false) {
  const g = new THREE.CylinderGeometry(r1, r0, Math.abs(x1 - x0), seg, 1, open);
  g.rotateZ(-Math.PI / 2);
  const m = shadowed(new THREE.Mesh(g, mat));
  m.position.x = (x0 + x1) / 2;
  return m;
}

// A cylinder between two points in space.
export function beam(a, b, r, mat, seg = 16) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  const m = shadowed(new THREE.Mesh(g, mat));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

// Lathe around the X axis from [x, r] pairs. phi limits the sweep for cutaways.
export function latheX(profile, mat, { seg = 64, phiStart = 0, phiLength = Math.PI * 2 } = {}) {
  const g = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(Math.max(0, r), x)), seg, phiStart, phiLength);
  g.rotateZ(-Math.PI / 2);
  g.computeVertexNormals();
  return shadowed(new THREE.Mesh(g, mat));
}

export function sphere(r, mat, seg = 32) { return shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2), mat)); }
export function box(w, h, d, mat) { return shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); }
export function torus(R, r, mat, seg = 64) { return shadowed(new THREE.Mesh(new THREE.TorusGeometry(R, r, 12, seg), mat)); }
export function tube(points, r, mat, closed = false, seg = 200) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed);
  return shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 10, closed), mat));
}

// Coil spring along X.
export function spring(x0, x1, R, r, turns, mat) {
  const pts = [];
  const N = turns * 24;
  for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, R * Math.cos(a), R * Math.sin(a))); }
  return tube(pts, r, mat, false, N * 2);
}

export function arrow(color = 0xffb547, len = 1, head = 0.25, r = 0.04) {
  const g = new THREE.Group(), mat = M.glow(color);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), mat);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 3, head, 16), mat);
  g.add(shaft, tip);
  g.set = (L) => { L = Math.max(0.001, L); shaft.scale.y = Math.max(0.001, L - head); shaft.position.y = (L - head) / 2; tip.position.y = L - head / 2; g.visible = L > 0.02; };
  g.set(len);
  return g;
}

// A canvas you can draw on every frame and use as a texture.
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = (...a) => { draw(g, w, h, ...a); tex.needsUpdate = true; };
  redraw();
  return { tex, redraw, canvas: c };
}

// Many small copies of one mesh (links of a chain, particles, spokes).
export function swarm(count, geometry, mat) {
  const m = new THREE.InstancedMesh(geometry, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = true;
  const o = new THREE.Object3D();
  m.place = (i, pos, rot = null, scale = 1) => {
    o.position.set(...pos); o.rotation.set(0, 0, 0);
    if (rot) o.rotation.set(...rot);
    o.scale.setScalar(scale); o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  };
  m.done = () => { m.instanceMatrix.needsUpdate = true; };
  return m;
}

// Explode helper: remembers each part's home and moves it along an offset by k (0→1).
export function exploder(parts) {
  parts.forEach((p) => { p.obj.userData.home = p.obj.position.clone(); });
  return (k) => parts.forEach((p) => {
    p.obj.position.copy(p.obj.userData.home).add(new THREE.Vector3(...p.off).multiplyScalar(smooth(k)));
  });
}

// The 3D stage shared by Glassbox boxes: renderer, orbit camera, lights, labels, picking.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class Stage {
  constructor(host) {
    this.host = host;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(r.domElement);

    this.css = new CSS2DRenderer();
    this.css.domElement.className = 'labels';
    host.appendChild(this.css.domElement);

    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.8;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 3000);
    this.camera.position.set(6, 4, 8);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 140;
    this.controls.addEventListener('start', () => { this.tw = null; this.moved = true; this.onOrbit?.(); });

    this.lights = new THREE.Group();
    this.lights.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1c22, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(6, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 50 });
    key.shadow.bias = -0.0004;
    const rim = new THREE.DirectionalLight(0x8fb0ff, 0.9);
    rim.position.set(-8, 5, -6);
    this.lights.add(key, rim);
    this.scene.add(this.lights);

    this.floor = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
    sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true;
    const grid = new THREE.GridHelper(80, 80, 0x2c3344, 0x1a1f2b);
    grid.material.transparent = true; grid.material.opacity = 0.55; grid.position.y = 0.002;
    this.floor.add(sh, grid);
    this.scene.add(this.floor);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.lineMats = new Set();
    this.pickables = [];
    this.onPick = null;

    this._setupPicking();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  _setupPicking() {
    const el = this.renderer.domElement, ray = new THREE.Raycaster(), v = new THREE.Vector2();
    let down = null, lastHover = 0;
    const hit = (e) => {
      const b = el.getBoundingClientRect();
      v.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(v, this.camera);
      return ray.intersectObjects(this.pickables, true).find((h) => h.object.visible && h.object.material?.visible !== false);
    };
    el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => {
      if (!down || !this.pickables.length) return;
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const h = hit(e);
      if (h && this.onPick) this.onPick(h.object);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.pickables.length || e.buttons) return;
      const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
      el.style.cursor = hit(e) ? 'pointer' : '';
    });
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.css.setSize(w, h);
    const was = this.camera.aspect;
    this.camera.aspect = w / h;
    this.applyShift();
    // The first view is often set before the page has its final size. Re-frame it when the shape
    // changes, unless the viewer has already orbited.
    if (this.home && !this.moved && Math.abs(was - this.camera.aspect) > 0.02) this.setView(this.home.pos, this.home.target, 0.35);
    this.lineMats.forEach((m) => m.resolution.set(w, h));
  }

  lineMaterial(opts) {
    const m = new LineMaterial(opts);
    m.resolution.set(this.host.clientWidth, this.host.clientHeight);
    this.lineMats.add(m);
    return m;
  }

  // Shift the picture's centre (fractions of the view) so an overlay doesn't hide it.
  setShift(x = 0, y = 0) { this.shift = [x, y]; this.applyShift(); }
  applyShift() {
    const w = this.host.clientWidth, h = this.host.clientHeight, [x, y] = this.shift || [0, 0];
    if (x || y) this.camera.setViewOffset(w, h, -x * w, y * h, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setWorldMode(on) {
    this.floor.visible = !on;
    this.lights.visible = !on;
  }

  setView(pos, target, dur = 1) {
    this.home = { pos, target };
    this.moved = false;
    // Narrow (portrait-ish) stages see less horizontally, so back the camera off.
    const t1 = new THREE.Vector3(...target);
    const k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, this.camera.aspect)));
    const p1 = new THREE.Vector3(...pos).sub(t1).multiplyScalar(k).add(t1);
    this.tw = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1, t1, k: 0, dur };
  }
  resetView() { if (this.home) this.setView(this.home.pos, this.home.target, 0.9); }

  label(html, pos, parent = this.root, cls = '') {
    const d = document.createElement('div');
    d.className = 'lbl ' + cls;
    d.innerHTML = html;
    const o = new CSS2DObject(d);
    if (pos) o.position.set(...pos);
    parent.add(o);
    return o;
  }

  clear() {
    const kids = [...this.root.children];
    kids.forEach((k) => {
      this.root.remove(k);
      k.traverse((o) => {
        if (o.isCSS2DObject) o.element.remove();
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { if (m.map) m.map.dispose(); if (m.emissiveMap && m.emissiveMap !== m.map) m.emissiveMap.dispose(); m.dispose(); });
      });
    });
    this.lineMats.clear();
    this.pickables = [];
    this.onPick = null;
    this.controls.autoRotate = false;
    this.scene.background = null;
    this.scene.fog = null;
    this.renderer.domElement.style.cursor = '';
  }

  update(dt) {
    const tw = this.tw;
    if (tw) {
      tw.k = Math.min(1, tw.k + dt / tw.dur);
      const e = ease(tw.k);
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.t0, tw.t1, e);
      if (tw.k >= 1) this.tw = null;
    }
    this.controls.update(dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.scene, this.camera);
  }
}

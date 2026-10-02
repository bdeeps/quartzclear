// The Glassbox 3D box shell. A box is a list of chapters (js/chapters/*.js).
// Each chapter builds a 3D model, exposes controls, teaches with a short text,
// defines key terms and a quiz, and adds scenes to the video storyboard (reel).
import * as THREE from 'three';
import { Stage } from './stage.js';
import { BOX, CHAPTERS } from './chapters/index.js';
import { buildControl, toast, sfx, audio, esc } from './ui.js';

const $ = (s) => document.querySelector(s);
const KEY = `${BOX.slug}.v1`;
const store = { visited: {}, quiz: {}, muted: false };
try { Object.assign(store, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ } };
audio.muted = !!store.muted;

let stage;
try { stage = new Stage($('#stage')); } catch (e) { console.error(e); $('#noGL').hidden = false; throw e; }

let ch = null, inst = {}, s = {}, ctrls = [], time = 0, last = performance.now(), tick = 0, reel = null;

// ---------------------------------------------------------------- chapters
function openChapter(id) {
  const idx = Math.max(0, CHAPTERS.findIndex((c) => c.id === id));
  const c = CHAPTERS[idx];
  inst?.dispose?.();
  stage.clear();
  ch = c;
  s = { ...(c.defaults || {}) };
  c.onChange?.(s, null);
  inst = c.build({ stage, s, THREE, label: (html, pos, parent, cls) => stage.label(html, pos, parent, cls) }) || {};
  stage.onPick = inst.pick ? (o) => inst.pick(o) : null;
  stage.setView(c.view.pos, c.view.target, 1.1);
  $('#kicker').textContent = `Chapter ${idx + 1} of ${CHAPTERS.length}`;
  $('#title').textContent = c.title;
  document.title = `${c.title} · ${BOX.title}`;
  if (!reel) history.replaceState(null, '', '#' + c.id);
  store.visited[c.id] = true; save();
  renderNav(); renderPanel(idx);
}

function renderNav() {
  const passed = CHAPTERS.filter((c) => c.quiz?.length && store.quiz[c.id] === c.quiz.length).length;
  $('#menuProgress').textContent = `${passed}/${CHAPTERS.length} quizzes aced`;
  $('#chapters').innerHTML = CHAPTERS.map((c, i) => {
    const best = store.quiz[c.id], n = c.quiz?.length || 0;
    const status = best === undefined ? (store.visited[c.id] ? 'Opened · quiz not taken' : 'Not opened yet') : `Quiz ${best}/${n}${best === n ? ' ★' : ''}`;
    return `<button class="chap${c.id === ch?.id ? ' on' : ''}${store.visited[c.id] ? ' seen' : ''}${best === n && n ? ' done' : ''}" data-id="${c.id}" aria-current="${c.id === ch?.id}">
      <span class="n">${best === n && n ? '★' : i + 1}</span>
      <span class="t"><b>${esc(c.short || c.title)}</b><small class="sub">${esc(c.subtitle || '')}</small><small class="st">${status}</small></span>
    </button>`;
  }).join('');
  $('#chapters .on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
$('#chapters').addEventListener('click', (e) => { const b = e.target.closest('.chap'); if (b) openChapter(b.dataset.id); });

function onControl(key, value) { s[key] = value; ch.onChange?.(s, key); ctrls.forEach((c) => c.sync()); updateReadout(); }
function onAction(item) { item.act?.(s, inst); ch.onChange?.(s, 'action'); ctrls.forEach((c) => c.sync()); sfx('click'); }

function renderPanel(idx) {
  const c = ch, prev = CHAPTERS[idx - 1], next = CHAPTERS[idx + 1];
  const best = store.quiz[c.id];
  $('#panel').innerHTML = `
    <p class="kicker">Chapter ${idx + 1} of ${CHAPTERS.length}</p>
    <h1>${esc(c.title)}</h1>
    <p class="sub">${esc(c.subtitle)}</p>
    <section class="learn">${c.learn}</section>
    ${c.controls?.length ? '<section><h3>Play with it</h3><div class="controls"></div></section>' : ''}
    ${c.terms?.length ? `<section><h3>Words worth knowing</h3><dl class="terms">${c.terms.map((t) => `<div><dt>${esc(t.t)}</dt><dd>${esc(t.d)}</dd></div>`).join('')}</dl></section>` : ''}
    ${c.quiz?.length ? `<section class="quizbox"><button class="btn" id="btnQuiz">Take the ${c.quiz.length}-question quiz</button><small>${best === undefined ? '' : `Best: ${best}/${c.quiz.length}`}</small></section>` : ''}
    <nav class="chapnav">${prev ? `<button class="btn ghost" data-go="${prev.id}">← ${esc(prev.short || prev.title)}</button>` : '<span></span>'}${next ? `<button class="btn" data-go="${next.id}">${esc(next.short || next.title)} →</button>` : ''}</nav>`;
  const box = $('#panel .controls');
  ctrls = (c.controls || []).map((d) => buildControl(d, s, onControl, onAction));
  if (box) ctrls.forEach((k) => box.appendChild(k.el));
  $('#panel').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { openChapter(b.dataset.go); $('#panel').scrollTop = 0; }));
  $('#btnQuiz')?.addEventListener('click', openQuiz);
  $('#panel').scrollTop = 0;
  updateReadout();
}

function updateReadout() {
  const r = $('#readout');
  const html = inst.readout ? inst.readout(s) : '';
  r.hidden = !html;
  if (html && r.innerHTML !== html) r.innerHTML = html;
}

// ---------------------------------------------------------------- quiz
function openModal(html) { $('#modalCard').innerHTML = `<button class="x" aria-label="Close">×</button>` + html; $('#modal').hidden = false; $('#modalCard .x').addEventListener('click', closeModal); }
function closeModal() { $('#modal').hidden = true; $('#modalCard').innerHTML = ''; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
function openQuiz() {
  const qs = ch.quiz; let i = 0, score = 0;
  const step = () => {
    if (i >= qs.length) {
      store.quiz[ch.id] = Math.max(store.quiz[ch.id] || 0, score); save();
      if (score === qs.length) sfx('ding');
      openModal(`<div class="quiz"><p class="qn">Quiz complete</p><p class="qq">You scored ${score} / ${qs.length}</p><p class="muted">${score === qs.length ? 'Perfect. You really get it.' : 'Play with the model a bit more and try again.'}</p><div class="foot"><button class="btn" id="qDone">Done</button></div></div>`);
      $('#qDone').addEventListener('click', () => { closeModal(); renderPanel(CHAPTERS.indexOf(ch)); });
      return;
    }
    const q = qs[i];
    openModal(`<div class="quiz"><p class="qn">${esc(ch.title)} · question ${i + 1} of ${qs.length}</p><p class="qq">${esc(q.q)}</p>
      <div class="opts">${q.options.map((o, k) => `<button data-k="${k}">${esc(o)}</button>`).join('')}</div><p class="why" hidden></p>
      <div class="foot"><button class="btn" id="qNext" hidden>${i + 1 < qs.length ? 'Next →' : 'See score'}</button></div></div>`);
    $('#modalCard').querySelectorAll('.opts button').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.k, right = k === q.answer;
      if (right) score++;
      sfx(right ? 'right' : 'wrong');
      $('#modalCard').querySelectorAll('.opts button').forEach((x) => { x.disabled = true; if (+x.dataset.k === q.answer) x.classList.add('right'); });
      if (!right) b.classList.add('wrong');
      const why = $('#modalCard .why'); why.hidden = false; why.innerHTML = `<b>${right ? 'Correct.' : 'Not quite.'}</b> ${esc(q.why)}`;
      const nx = $('#qNext'); nx.hidden = false; nx.focus();
      nx.addEventListener('click', () => { i++; step(); });
    }));
  };
  step();
}

// ---------------------------------------------------------------- wiring
const soundBtn = $('#btnSound');
const renderSound = () => { soundBtn.classList.toggle('muted', audio.muted); soundBtn.setAttribute('aria-label', audio.muted ? 'Sound off' : 'Sound on'); };
soundBtn.addEventListener('click', () => { audio.muted = !audio.muted; store.muted = audio.muted; save(); renderSound(); });
renderSound();
$('#reset').addEventListener('click', () => stage.resetView());
stage.onOrbit = () => $('#hint').classList.add('gone');
window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== ch?.id && CHAPTERS.some((c) => c.id === id)) openChapter(id); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || !$('#modal').hidden) return;
  const i = CHAPTERS.indexOf(ch);
  if (e.key === ']' && CHAPTERS[i + 1]) openChapter(CHAPTERS[i + 1].id);
  if (e.key === '[' && CHAPTERS[i - 1]) openChapter(CHAPTERS[i - 1].id);
});

// ---------------------------------------------------------------- loop
function frameStep(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  time += dt;
  stage.update(dt);
  inst.update?.(dt, s, time);
  stage.render();
  if (!reel && now - tick > 200) { tick = now; updateReadout(); }
}
function loop(now) { requestAnimationFrame(loop); if (!reel) frameStep(now); }

// ---------------------------------------------------------------- Glassbox director
// The studio records the storyboard (every chapter's `reel` scenes) frame by frame.
const STORYBOARD = CHAPTERS.flatMap((c) => (c.reel || []).map((r) => ({ ...r, chapter: c.id })));
const ease = (k) => k * k * (3 - 2 * k);
const tween = (a, b, k, log) => (typeof a === 'boolean' || typeof a === 'string' ? (k > 0.3 ? b : a) : log ? a * Math.pow(b / a, k) : a + (b - a) * k);
window.glassbox = {
  director: {
    scenes: STORYBOARD.map(({ caption, ms }) => ({ caption, ms })),
    setup({ width, height }) {
      reel = { scene: -1 };
      closeModal();
      document.body.classList.add('gb-reel');
      const host = $('#stage');
      host.style.width = width + 'px'; host.style.height = height + 'px';
      stage.renderer.setPixelRatio(1);
      stage.resize();
    },
    frame(i, t, dtMs = 1000 / 30) {
      const sc = STORYBOARD[i];
      if (reel.scene !== i) {
        const first = reel.scene < 0;
        reel.scene = i;
        if (first || ch?.id !== sc.chapter) openChapter(sc.chapter);
        Object.assign(s, sc.set);
        ch.onChange?.(s, null);
        if (sc.act) sc.act(s, inst);
        if (sc.view) stage.setView(sc.view.pos, sc.view.target, 1.2);
        stage.controls.autoRotate = sc.spin !== 0;
        stage.controls.autoRotateSpeed = sc.spin ?? 0.5;
      }
      const k = ease(Math.min(1, Math.max(0, (t - 0.1) / 0.75)));
      for (const [key, [a, b, log]] of Object.entries(sc.anim || {})) { s[key] = tween(a, b, k, log); ch.onChange?.(s, key); }
      frameStep(last + dtMs);
      return { main: stage.renderer.domElement };
    },
  },
};
window[BOX.slug] = { stage, get settings() { return s; }, get chapter() { return ch; }, step(n = 1, ms = 16) { let t = last; for (let k = 0; k < n; k++) frameStep((t += ms)); } };

openChapter(location.hash.slice(1) || CHAPTERS[0].id);
requestAnimationFrame(loop);

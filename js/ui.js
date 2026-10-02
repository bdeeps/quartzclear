// Controls, toasts and small sounds for Glassbox 3D boxes.
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function setFill(input) {
  const p = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--p', p + '%');
}

// def: { key, type: 'range'|'log'|'toggle'|'seg'|'buttons', label, min, max, step, fmt, ends, hint, options, items }
export function buildControl(def, s, onChange, onAction) {
  const el = document.createElement('div');
  el.className = 'ctl ctl-' + def.type;
  const head = `<div class="ctl-head"><label>${def.label}</label><output></output></div>`;
  let sync = () => {};
  if (def.type === 'range' || def.type === 'log') {
    const log = def.type === 'log';
    const [min, max, step] = log ? [0, 1000, 1] : [def.min, def.max, def.step ?? 0.01];
    const toV = (x) => (log ? def.min * Math.pow(def.max / def.min, x / 1000) : +x);
    const fromV = (v) => (log ? Math.round((Math.log(v / def.min) / Math.log(def.max / def.min)) * 1000) : v);
    const ends = def.ends ? `<div class="ends"><span>${def.ends[0]}</span><span>${def.ends[1]}</span></div>` : '';
    el.innerHTML = head + `<input type="range" min="${min}" max="${max}" step="${step}" aria-label="${esc(def.label)}">` + ends + (def.hint ? `<p class="hint">${def.hint}</p>` : '');
    const input = el.querySelector('input'), out = el.querySelector('output');
    input.addEventListener('input', () => { setFill(input); onChange(def.key, toV(+input.value)); out.textContent = def.fmt ? def.fmt(s[def.key], s) : s[def.key]; });
    sync = () => { input.value = fromV(s[def.key]); setFill(input); out.textContent = def.fmt ? def.fmt(s[def.key], s) : s[def.key]; };
  } else if (def.type === 'toggle') {
    el.innerHTML = `<div class="ctl-head"><label>${def.label}</label><label class="switch"><input type="checkbox" aria-label="${esc(def.label)}"><span></span></label></div>` + (def.hint ? `<p class="hint">${def.hint}</p>` : '');
    const input = el.querySelector('input');
    input.addEventListener('change', () => onChange(def.key, input.checked));
    sync = () => { input.checked = !!s[def.key]; };
  } else if (def.type === 'seg') {
    el.innerHTML = head + `<div class="seg" role="group" aria-label="${esc(def.label)}">${def.options.map((o) => `<button type="button" data-v="${esc(o.v)}">${o.label}</button>`).join('')}</div>` + (def.hint ? `<p class="hint">${def.hint}</p>` : '');
    const num = typeof def.options[0].v === 'number';
    el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => onChange(def.key, num ? +b.dataset.v : b.dataset.v)));
    const out = el.querySelector('output');
    sync = () => {
      el.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(s[def.key])));
      out.textContent = def.fmt ? def.fmt(s[def.key], s) : '';
    };
  } else if (def.type === 'buttons') {
    el.innerHTML = `<div class="ctl-head"><label>${def.label}</label></div><div class="btnrow">${def.items.map((it, i) => `<button type="button" data-i="${i}">${it.label}</button>`).join('')}</div>`;
    el.querySelectorAll('.btnrow button').forEach((b) => b.addEventListener('click', () => onAction(def.items[+b.dataset.i])));
  }
  sync();
  return { el, sync, def };
}

export function toast(html) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = html;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3200);
}

let ac = null;
export const audio = { muted: false };
export function sfx(kind) {
  if (audio.muted) return;
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  if (ac.state === 'suspended') ac.resume();
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  const f = { click: 1500, right: 880, wrong: 196, ding: 1320 }[kind] || 900;
  o.type = kind === 'wrong' ? 'square' : 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(kind === 'click' ? 0.04 : 0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'click' ? 0.05 : 0.3));
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.35);
}

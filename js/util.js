// Общие мелочи конструктора. Скрипты обычные (не ES-модули), чтобы страница открывалась и с диска через file://.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function svgText(parent, x, y, text, attrs = {}) {
  const e = svgEl('text', { x, y, ...attrs }, parent);
  e.textContent = text;
  return e;
}

// ---------- Числа ----------
const fmtNum = (v, d = 2) => v.toLocaleString(LOC, { maximumFractionDigits: d });
const fmtM = (cm) => fmtNum(cm / 100);                 // 185 → «1,85»
const fmtM2 = (cm2) => fmtNum(cm2 / 1e4, 1);           // 40000 → «4»
// Деньги в валюте state.money.cur: 1 500 ₽, $1,500, €1,500 (по-русски 1 500 €)
function fmtMoney(v) {
  const n = Math.round(v).toLocaleString(LOC), c = state.money.cur;
  return c === 'USD' ? '$' + n : c === 'EUR' ? (EN ? '€' + n : n + ' €') : n + ' ₽';
}
function fmtRange([a, b]) {
  if (Math.round(a) === Math.round(b)) return fmtMoney(a);
  const c = state.money.cur, n = (v) => Math.round(v).toLocaleString(LOC);
  return c === 'USD' || (c === 'EUR' && EN) ? `${fmtMoney(a)}–${n(b)}` : `${n(a)}–${fmtMoney(b)}`;
}
function plural(n, [one, few, many]) {
  if (EN) { const e = PLURAL_EN[one] || [one, one]; return n === 1 ? e[0] : e[1]; }
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
}

// ---------- Прямоугольники {x, y, w, h}, сантиметры ----------
const rect = (x, y, w, h) => ({ x, y, w, h });
function inter(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  return x2 - x > 0.5 && y2 - y > 0.5 ? rect(x, y, x2 - x, y2 - y) : null;
}
const area = (r) => (r ? r.w * r.h : 0);
const inside = (a, b, tol = 0.5) =>
  a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const hasPoint = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function bbox(rects) {
  const x = Math.min(...rects.map((r) => r.x)), y = Math.min(...rects.map((r) => r.y));
  return rect(x, y, Math.max(...rects.map((r) => r.x + r.w)) - x, Math.max(...rects.map((r) => r.y + r.h)) - y);
}

// ---------- Файлы и сообщения ----------
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

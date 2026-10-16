// Модель проекта: зал, расставленные предметы, мелкий инвентарь, история правок и сохранение.
const SNAP = 10;
const snap = (v) => Math.round(v / SNAP) * SNAP;

const state = {
  name: 'Мой зал',
  room: { L: 1000, W: 800, H: 400 },
  items: [],        // { uid, id, x, y, rot, w, d, g }: x, y — левый верхний угол в плане; g — номер модуля (0 — сам по себе)
  kits: {},         // мелкий инвентарь: id → количество
  owned: new Set(), // позиции, которые уже куплены: в закупку не идут
  sel: null,
  view: { zones: true, dims: true, labels: true, marks: false },
};
let uidSeq = 1, grpSeq = 1;

function mkItem(id, x = 0, y = 0, rot = 0, w, d, g = 0) {
  const c = CAT[id];
  return { uid: uidSeq++, id, x, y, rot: ((rot % 360) + 360) % 360, w: w ?? c.w, d: d ?? c.d, g };
}
const isWallKind = (c) => c.kind === 'wall' || c.kind === 'door';
const byUid = (uid) => state.items.find((i) => i.uid === uid);

// ---------- Геометрия одного предмета ----------
function fp(it) { return it.rot % 180 ? { fw: it.d, fd: it.w } : { fw: it.w, fd: it.d }; }
function body(it) { const { fw, fd } = fp(it); return rect(it.x, it.y, fw, fd); }
// Поворот по часовой на k×90°: сторона мира i получает отступ локальной стороны (i − k)
function wmargins(it) {
  const m = CAT[it.id].m || [0, 0, 0, 0], k = it.rot / 90;
  return [0, 1, 2, 3].map((i) => m[(i - k + 4) % 4]);
}
function zone(it) {
  const b = body(it), [t, r, bo, l] = wmargins(it);
  return rect(b.x - l, b.y - t, b.w + l + r, b.h + t + bo);
}
const hasZone = (it) => (CAT[it.id].m || []).some((v) => v > 0);
// Номер стены, к которой прижат предмет: 0 верх, 1 право, 2 низ, 3 лево (у настенных совпадает с rot/90)
function touchesWall(it) {
  const b = body(it), { L, W } = state.room;
  return [b.y, L - b.x - b.w, W - b.y - b.h, b.x][it.rot / 90] < 1;
}

// ---------- Группа: модуль из нескольких предметов двигается целиком ----------
function members(it) { return it && it.g ? state.items.filter((i) => i.g === it.g) : it ? [it] : []; }
function listBox(list) { return bbox(list.map(body)); }
function wallSideOf(list) { const w = list.find((i) => isWallKind(CAT[i.id])); return w ? w.rot / 90 : -1; }

// Поворот группы на 90° по часовой вокруг её габарита (левый верхний угол сохраняется)
function rotateList(list, turns = 1) {
  for (let t = 0; t < ((turns % 4) + 4) % 4; t++) {
    const B = listBox(list);
    for (const it of list) {
      const b = body(it);
      const nx = B.x + (B.y + B.h - (b.y + b.h)), ny = B.y + (b.x - B.x);
      it.rot = (it.rot + 90) % 360;
      it.x = nx; it.y = ny;
    }
  }
}
function shiftList(list, dx, dy) { for (const it of list) { it.x += dx; it.y += dy; } }

// Поставить группу центром в точку (cx, cy). Если в ней есть настенные предметы — к ближайшей стене.
function placeList(list, cx, cy, side) {
  const { L, W } = state.room;
  const cur = wallSideOf(list);
  if (cur >= 0) {
    if (side == null) {
      const d = [cy, L - cx, W - cy, cx];
      side = d.indexOf(Math.min(...d));
    }
    rotateList(list, side - cur);
    const B = listBox(list);
    let nx = clamp(snap(cx - B.w / 2), 0, Math.max(0, L - B.w));
    let ny = clamp(snap(cy - B.h / 2), 0, Math.max(0, W - B.h));
    if (side === 0) ny = 0; else if (side === 2) ny = W - B.h;
    else if (side === 1) nx = L - B.w; else nx = 0;
    shiftList(list, nx - B.x, ny - B.y);
  } else {
    const B = listBox(list);
    const nx = clamp(snap(cx - B.w / 2), 0, Math.max(0, L - B.w));
    const ny = clamp(snap(cy - B.h / 2), 0, Math.max(0, W - B.h));
    shiftList(list, nx - B.x, ny - B.y);
  }
}
function rotateSel(dir = 1) {
  const list = members(byUid(state.sel));
  if (!list.length) return;
  beginChange();
  const B = listBox(list), cx = B.x + B.w / 2, cy = B.y + B.h / 2;
  const side = wallSideOf(list);
  if (side >= 0) placeList(list, cx, cy, (side + dir + 4) % 4);
  else { rotateList(list, dir); placeList(list, cx, cy); }
  render();
}

// ---------- Добавление ----------
// Ищем место, где группа никому не мешает: сначала строго, потом хотя бы без наложений.
function findSpot(list) {
  const { L, W } = state.room;
  const others = state.items.filter((i) => !list.includes(i));
  const side0 = wallSideOf(list);
  const candidates = [];
  const B0 = listBox(list);
  const step = Math.max(20, Math.round(Math.min(L, W) / 40 / 10) * 10);
  if (side0 >= 0) {
    for (let side = 0; side < 4; side++) {
      const along = side % 2 === 0 ? L : W;
      for (let p = 0; p <= along; p += step) {
        const c = side === 0 ? [p, 0] : side === 1 ? [L, p] : side === 2 ? [p, W] : [0, p];
        candidates.push({ cx: c[0], cy: c[1], side });
      }
    }
  } else {
    for (let y = B0.h / 2; y <= W - B0.h / 2 + 1; y += step)
      for (let x = B0.w / 2; x <= L - B0.w / 2 + 1; x += step) candidates.push({ cx: x, cy: y });
  }
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    placeList(list, c.cx, c.cy, c.side);
    const s = placementScore(list, others);
    if (s < bestScore) { bestScore = s; best = { ...c }; if (s === 0) break; }
  }
  if (best) placeList(list, best.cx, best.cy, best.side);
  return bestScore === 0;
}

function addItem(id, at) {
  const c = CAT[id];
  beginChange();
  if (c.kind === 'kit') {
    state.kits[id] = (state.kits[id] || 0) + 1;
    render();
    return;
  }
  const it = mkItem(id);
  // Покрытие по умолчанию не больше зала
  if (c.kind === 'floor') { it.w = Math.min(it.w, state.room.L); it.d = Math.min(it.d, state.room.W); }
  state.items.push(it);
  const ok = at ? (placeList([it], at.x, at.y), true) : findSpot([it]);
  state.sel = it.uid;
  if (!ok) toast('Свободного места не нашлось, поставил ближе всего к свободному: проверьте зоны.');
  render();
}

function addModule(mid, at) {
  const mod = MODULES.find((m) => m.id === mid);
  beginChange();
  const g = grpSeq++;
  const list = mod.items.map(([id, x, y, rot, w, d]) => Object.assign(mkItem(id, x, y, rot, w, d, mod.items.length > 1 ? g : 0), { m: mod.id }));
  state.items.push(...list);
  for (const [k, n] of Object.entries(mod.kits || {})) state.kits[k] = (state.kits[k] || 0) + n;
  const ok = at ? (placeList(list, at.x, at.y), true) : findSpot(list);
  state.sel = list.find((i) => CAT[i.id].kind !== 'floor')?.uid ?? list[0].uid;
  if (!ok) toast('Модулю не хватает места без пересечений — подвиньте соседей или увеличьте зал.');
  render();
}

function removeSel(whole = true) {
  const it = byUid(state.sel);
  if (!it) return;
  beginChange();
  const del = whole ? members(it) : [it];
  state.items = state.items.filter((i) => !del.includes(i));
  state.sel = null;
  render();
}
function duplicateSel() {
  const it = byUid(state.sel);
  if (!it) return;
  beginChange();
  const src = members(it), g = it.g ? grpSeq++ : 0;
  const copy = src.map((s) => ({ ...s, uid: uidSeq++, g }));
  state.items.push(...copy);
  findSpot(copy);
  state.sel = copy[src.indexOf(it)].uid;
  render();
}
function ungroupSel() {
  const it = byUid(state.sel);
  if (!it || !it.g) return;
  beginChange();
  members(it).forEach((i) => (i.g = 0));
  render();
}

// ---------- История ----------
const hist = { past: [], future: [] };
function serialize() {
  const { L, W, H } = state.room;
  return {
    v: 1, n: state.name, r: [L, W, H],
    i: state.items.map((it) => [it.id, it.x, it.y, it.rot, it.w, it.d, it.g, it.m || '']),
    k: state.kits, o: [...state.owned],
  };
}
function load(o) {
  if (!o || !Array.isArray(o.r) || !Array.isArray(o.i)) throw new Error('не похоже на проект LifeBoost');
  const [L, W, H] = o.r.map(Number);
  state.name = typeof o.n === 'string' ? o.n.slice(0, 80) : 'Мой зал';
  state.room = { L: clamp(L || 1000, 150, 5000), W: clamp(W || 800, 150, 5000), H: clamp(H || 300, 200, 1500) };
  state.items = o.i.filter((a) => CAT[a[0]] && CAT[a[0]].kind !== 'kit')
    .map(([id, x, y, rot, w, d, g, m]) => {
      const it = mkItem(id, +x || 0, +y || 0, (+rot || 0) - ((+rot || 0) % 90), +w || undefined, +d || undefined, +g || 0);
      if (m && MODULES.some((x) => x.id === m)) it.m = m;
      return it;
    });
  grpSeq = Math.max(1, ...state.items.map((i) => i.g + 1));
  state.kits = {};
  for (const [k, n] of Object.entries(o.k || {})) if (CAT[k]?.kind === 'kit' && n > 0) state.kits[k] = Math.min(999, Math.trunc(n));
  state.owned = new Set((o.o || []).filter((k) => CAT[k]));
  state.sel = null;
}
function beginChange() {
  hist.past.push(JSON.stringify(serialize()));
  if (hist.past.length > 200) hist.past.shift();
  hist.future = [];
}
function undo() {
  if (!hist.past.length) return;
  hist.future.push(JSON.stringify(serialize()));
  load(JSON.parse(hist.past.pop()));
  render();
}
function redo() {
  if (!hist.future.length) return;
  hist.past.push(JSON.stringify(serialize()));
  load(JSON.parse(hist.future.pop()));
  render();
}

// ---------- Сохранение и ссылки ----------
const STORE_KEY = 'lifeboost.project';
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(serialize())); } catch (e) { /* без сохранения */ }
}
function loadLocal() {
  try { const s = localStorage.getItem(STORE_KEY); if (s) { load(JSON.parse(s)); return true; } } catch (e) { /* испорчено — начнём с шаблона */ }
  return false;
}
function encodeShare() {
  const bytes = new TextEncoder().encode(JSON.stringify(serialize()));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeShare(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

// Шаблон зала: модули и отдельные предметы с координатами
function applyTemplate(tid) {
  const t = TEMPLATES.find((x) => x.id === tid);
  const [L, W, H] = t.room;
  state.name = t.name;
  state.room = { L, W, H };
  state.items = [];
  state.kits = {};
  state.owned = new Set();
  for (const p of t.place) {
    if (p.m) {
      const mod = MODULES.find((m) => m.id === p.m);
      const g = mod.items.length > 1 ? grpSeq++ : 0;
      const list = mod.items.map(([id, x, y, rot, w, d]) => Object.assign(mkItem(id, x, y, rot, w, d, g), { m: mod.id }));
      rotateList(list, p.turn || 0);
      const B = listBox(list);
      shiftList(list, p.x - B.x, p.y - B.y);
      state.items.push(...list);
      for (const [k, n] of Object.entries(mod.kits || {})) state.kits[k] = (state.kits[k] || 0) + n;
    } else {
      state.items.push(mkItem(p.i, p.x, p.y, p.rot || 0, p.w, p.d));
    }
  }
  for (const [k, n] of Object.entries(t.kits || {})) state.kits[k] = (state.kits[k] || 0) + n;
  state.sel = null;
}

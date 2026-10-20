// План зала в SVG: сетка, стены, покрытия, зоны безопасности, предметы, размеры. Перетаскивание и изменение размеров.
const WALL_T = 16;
const plan = { svg: null, drag: null, pad: 90, fs: 14 };
const WALL_NAMES = EN ? ['A', 'B', 'C', 'D'] : ['А', 'Б', 'В', 'Г'];

function buildPlan() {
  const svg = plan.svg = $('#plan');
  const defs = svgEl('defs', {}, svg);
  for (const k of Object.keys(DISC)) {
    const p = svgEl('pattern', { id: `h-${k}`, width: 18, height: 18, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 18, style: `stroke:${DISC[k].color};stroke-width:3;opacity:.3` }, p);
  }
  const pb = svgEl('pattern', { id: 'h-bad', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)' }, defs);
  svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 14, style: 'stroke:var(--bad);stroke-width:5;opacity:.55' }, pb);
  // Татами — плитки 1×1 м, резина — крошка, спортпол — полосы
  const pt = svgEl('pattern', { id: 'fl-tatami', width: 100, height: 100, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('rect', { width: 100, height: 100, style: 'fill:var(--fl-tatami);stroke:var(--fl-tatami-l);stroke-width:2' }, pt);
  const pr = svgEl('pattern', { id: 'fl-rubber', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('rect', { width: 40, height: 40, style: 'fill:var(--fl-rubber)' }, pr);
  [[8, 9], [27, 6], [18, 24], [34, 31], [6, 33]].forEach(([x, y]) => svgEl('circle', { cx: x, cy: y, r: 2.2, style: 'fill:var(--fl-rubber-d)' }, pr));
  const ph = svgEl('pattern', { id: 'fl-hard', width: 120, height: 20, patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('rect', { width: 120, height: 20, style: 'fill:var(--fl-hard);stroke:var(--fl-hard-l);stroke-width:1.5' }, ph);
  svgEl('g', { id: 'pl' }, svg);

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('dragover', (e) => e.preventDefault());
  svg.addEventListener('drop', (e) => {
    e.preventDefault();
    const v = e.dataTransfer.getData('text/plain'), p = svgPt(e);
    if (/^m:/.test(v)) addModule(v.slice(2), p); else if (/^i:/.test(v)) addItem(v.slice(2), p);
  });
}

function svgPt(e) {
  const pt = plan.svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform($('#pl').getScreenCTM().inverse());
}

// ---------- Рисование ----------
function renderPlan(svg = plan.svg, opts = {}) {
  const { L, W } = state.room, g = $('#pl', svg) || svg.querySelector('#pl');
  g.replaceChildren();
  const pad = plan.pad = Math.round(Math.max(L, W) * 0.07 + 40);
  const fs = plan.fs = (Math.max(L, W) + 2 * pad) / 62;
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${L + 2 * pad} ${W + 2 * pad}`);
  svg.style.setProperty('--fs', fs);
  const sel = opts.clean ? null : byUid(state.sel), selSet = new Set(members(sel).map((i) => i.uid));

  svgEl('rect', { x: -WALL_T, y: -WALL_T, width: L + 2 * WALL_T, height: W + 2 * WALL_T, class: 'p-wall' }, g);
  svgEl('rect', { x: 0, y: 0, width: L, height: W, class: 'p-floor' }, g);
  const grid = svgEl('g', { class: 'p-grid' }, g);
  for (let x = 50; x < L; x += 50) svgEl('line', { x1: x, y1: 0, x2: x, y2: W, class: x % 100 ? 'mi' : 'ma' }, grid);
  for (let y = 50; y < W; y += 50) svgEl('line', { x1: 0, y1: y, x2: L, y2: y, class: y % 100 ? 'mi' : 'ma' }, grid);

  const order = { floor: 0, mat: 1, equip: 2, obst: 2, wall: 3, door: 3, ceil: 4 };
  const items = [...state.items].sort((a, b) => order[CAT[a.id].kind] - order[CAT[b.id].kind]);
  const worst = checks.worst;

  // Покрытия
  for (const it of items.filter((i) => CAT[i.id].kind === 'floor')) {
    const c = CAT[it.id], b = body(it);
    svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, class: 'p-fl' + (selSet.has(it.uid) ? ' sel' : ''),
      style: `fill:url(#fl-${c.ft})`, 'data-uid': it.uid }, g);
    if (state.view.labels && !opts.noLabels)
      svgText(g, b.x + fs * 0.4, b.y + fs * 1.1, tr`${c.short} · ${fmtM2(b.w * b.h)} м²`, { class: 'p-fl-l' });
  }
  // Зоны безопасности
  if (state.view.zones) {
    for (const it of items) {
      const c = CAT[it.id];
      if (c.kind === 'floor' || !hasZone(it)) continue;
      const z = zone(it), rx = c.kind === 'ceil' ? Math.min(z.w, z.h) / 2 : 6;
      svgEl('rect', { x: z.x, y: z.y, width: z.w, height: z.h, rx, class: 'p-zone',
        style: `fill:url(#h-${c.disc});stroke:${DISC[c.disc].color}` }, g);
    }
  }
  // Предметы
  for (const it of items) {
    const c = CAT[it.id];
    if (c.kind === 'floor') continue;
    drawItem(g, it, c, selSet.has(it.uid), worst.get(it.uid));
  }
  // Где именно нарушение
  if (!opts.clean) for (const p of checks.list) if (p.hot)
    svgEl('rect', { x: p.hot.x, y: p.hot.y, width: p.hot.w, height: p.hot.h, class: 'p-hot' }, g);
  // Подписи и марки — поверх всего
  for (const it of items) {
    const c = CAT[it.id];
    if (c.kind === 'floor') continue;
    drawLabel(g, it, c, fs, opts);
  }
  // Ручка размера
  if (sel && CAT[sel.id].resize) {
    const b = body(sel), s = fs * 0.9;
    svgEl('rect', { x: b.x + b.w - s / 2, y: b.y + b.h - s / 2, width: s, height: s, class: 'p-handle', 'data-uid': sel.uid, 'data-handle': 1 }, g);
  }
  if (sel && state.view.dims) drawSelDims(g, listBox(members(sel)), fs);
  drawRoomDims(g, fs);
}

function drawItem(g, it, c, isSel, sev) {
  const b = body(it), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const cls = ['p-it', `k-${c.kind}`, isSel ? 'sel' : '', sev ? `s-${sev}` : ''].join(' ');
  const grp = svgEl('g', { transform: `translate(${cx} ${cy}) rotate(${it.rot})`, class: cls, 'data-uid': it.uid,
    style: `--c:${DISC[c.disc].color}` }, g);
  const w = it.w, d = it.d;
  if (c.kind === 'ceil') {
    svgEl('circle', { r: 34, class: 'p-hit' }, grp);
    svgEl('circle', { r: 15, class: 'p-body' }, grp);
    svgEl('path', { d: 'M-24 0H24M0 -24V24', class: 'p-sym' }, grp);
    return;
  }
  if (c.kind === 'door') {
    // проём в стене и створка, открытая внутрь
    svgEl('rect', { x: -w / 2, y: -d / 2 - WALL_T, width: w, height: WALL_T + d, class: 'p-door-gap' }, grp);
    svgEl('path', { d: `M${-w / 2} ${d / 2}V${d / 2 + w}M${-w / 2} ${d / 2 + w}A${w} ${w} 0 0 0 ${w / 2} ${d / 2}`, class: 'p-door' }, grp);
    svgEl('rect', { x: -w / 2, y: -d / 2, width: w, height: d + w, class: 'p-hit' }, grp);
    return;
  }
  const r = c.kind === 'mat' ? Math.min(8, d / 4) : 3;
  svgEl('rect', { x: -w / 2, y: -d / 2, width: w, height: d, rx: r, class: 'p-body' }, grp);
  // Условные знаки
  if (c.kind === 'wall' && !c.flat) svgEl('line', { x1: -w / 2, y1: -d / 2 + 3, x2: w / 2, y2: -d / 2 + 3, class: 'p-sym strong' }, grp);
  if (c.flat) svgEl('line', { x1: -w / 2, y1: 0, x2: w / 2, y2: 0, class: 'p-sym' }, grp);
  if (it.id === 'rig') for (let i = 0; i <= 4; i++) svgEl('rect', { x: -w / 2 + i * (w - 12) / 4, y: -d / 2, width: 12, height: d, class: 'p-sym fill' }, grp);
  if (it.id === 'olytramp') {
    svgEl('rect', { x: -214, y: -107, width: 428, height: 214, rx: 6, class: 'p-sym' }, grp);
    svgEl('path', { d: 'M-30 0H30M0 -30V30', class: 'p-sym' }, grp);
  }
  if (it.id === 'minitramp') svgEl('path', { d: `M${-w / 4} 0H${w / 2 + 60}m-18 -12l18 12l-18 12`, class: 'p-sym strong' }, grp);
  if (it.id === 'rack') svgEl('path', { d: `M0 ${-d / 4}V${d / 2 + 70}m-12 -18l12 18l12 -18`, class: 'p-sym strong' }, grp);
  if (it.id === 'rower') svgEl('line', { x1: -w / 2 + 20, y1: 0, x2: w / 2 - 50, y2: 0, class: 'p-sym strong' }, grp);
  if (it.id === 'airtrack') svgEl('rect', { x: -w / 2 + 12, y: -d / 2 + 12, width: w - 24, height: d - 24, rx: 10, class: 'p-sym' }, grp);
  if (it.id === 'crash' || it.id === 'aycrash') svgEl('path', { d: `M${-w / 2} ${-d / 2}L${w / 2} ${d / 2}M${w / 2} ${-d / 2}L${-w / 2} ${d / 2}`, class: 'p-sym' }, grp);
  if (it.id === 'yogamat') svgEl('line', { x1: -w / 2 + 12, y1: -d / 2 + 6, x2: -w / 2 + 12, y2: d / 2 - 6, class: 'p-sym' }, grp);
}

function drawLabel(g, it, c, fs, opts) {
  const b = body(it), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const mark = MARKS.get(it.id);
  if (state.view.marks && mark) {
    const r = fs * 0.75;
    const px = c.kind === 'ceil' ? cx + 26 : cx, py = c.kind === 'ceil' ? cy - 26 : cy;
    svgEl('circle', { cx: px, cy: py, r, class: 'p-mark' }, g);
    svgText(g, px, py + fs * 0.32, String(mark), { class: 'p-mark-t' });
    return;
  }
  if (!state.view.labels || opts.noLabels || c.kind === 'door') return;
  // Зеркало под станком или стенкой — подпись не нужна, её перекроет снаряд
  if (c.flat && state.items.some((o) => o !== it && isWallKind(CAT[o.id]) && !CAT[o.id].flat && inter(body(o), b))) return;
  const text = c.short || c.name;
  if (c.kind === 'ceil') { svgText(g, cx, cy - 42, text, { class: 'p-lbl' }); return; }
  const est = (f) => text.length * f * 0.56;
  let f = fs, vertical = false;
  if (est(f) > b.w - 6) {
    if (b.h > b.w && est(f) <= b.h - 6) vertical = true;
    else {
      f = Math.max(fs * 0.62, (b.w - 6) / (text.length * 0.56));
      if (est(f) > b.w - 6 && b.h > b.w) { vertical = true; f = Math.min(fs, Math.max(fs * 0.62, (b.h - 6) / (text.length * 0.56))); }
    }
  }
  const across = vertical ? b.w : b.h;
  if (across < f * 0.95 && !isWallKind(c)) f = Math.max(fs * 0.6, across * 0.9);
  // Узкие настенные — подпись рядом, со стороны комнаты
  let tx = cx, ty = cy;
  // Под точкой подвеса центр мата занят крестом — подпись ниже
  if (c.landing && b.h > f * 3) ty = b.y + b.h - f * 0.9;
  if (isWallKind(c) && across < f * 1.1) {
    const side = it.rot / 90, off = f * 0.9;
    vertical = side % 2 === 1;
    if (side === 0) ty = b.y + b.h + off;
    if (side === 2) ty = b.y - off;
    if (side === 1) tx = b.x - off;
    if (side === 3) tx = b.x + b.w + off;
  }
  const t = svgText(g, tx, ty + f * 0.35, text, { class: 'p-lbl', style: `font-size:${f}px` });
  if (vertical) t.setAttribute('transform', `rotate(-90 ${tx} ${ty})`);
}

// Размерная линия: от a до b, текст посередине
function dimLine(g, x1, y1, x2, y2, label, fs, cls = 'p-dim') {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  svgEl('line', { x1, y1, x2, y2, class: cls }, g);
  const t = fs * 0.35, horiz = Math.abs(y2 - y1) < 0.5;
  // засечки под 45°
  for (const [x, y] of [[x1, y1], [x2, y2]]) svgEl('line', { x1: x - t, y1: y + t, x2: x + t, y2: y - t, class: cls + ' tick' }, g);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const txt = svgText(g, horiz ? mx : mx - fs * 0.35, horiz ? my - fs * 0.35 : my, label, { class: cls + '-t' });
  if (!horiz) txt.setAttribute('transform', `rotate(-90 ${mx - fs * 0.35} ${my})`);
}
function drawSelDims(g, B, fs) {
  const { L, W } = state.room, cx = B.x + B.w / 2, cy = B.y + B.h / 2;
  if (B.x > 1) dimLine(g, 0, cy, B.x, cy, fmtM(B.x), fs, 'p-dim sel');
  if (L - B.x - B.w > 1) dimLine(g, B.x + B.w, cy, L, cy, fmtM(L - B.x - B.w), fs, 'p-dim sel');
  if (B.y > 1) dimLine(g, cx, 0, cx, B.y, fmtM(B.y), fs, 'p-dim sel');
  if (W - B.y - B.h > 1) dimLine(g, cx, B.y + B.h, cx, W, fmtM(W - B.y - B.h), fs, 'p-dim sel');
}
function drawRoomDims(g, fs) {
  const { L, W } = state.room, o = plan.pad * 0.55;
  dimLine(g, 0, -o, L, -o, tr`${fmtM(L)} м`, fs * 1.1);
  dimLine(g, -o, 0, -o, W, tr`${fmtM(W)} м`, fs * 1.1);
  // Буквы стен — те же, что на развёртках
  const k = WALL_T + fs * 0.6;
  svgText(g, 0, -k, tr`стена ${WALL_NAMES[0]}`, { class: 'p-wl', 'text-anchor': 'start' });
  svgText(g, L + k + fs * 1.6, W / 2, tr`стена ${WALL_NAMES[1]}`, { class: 'p-wl', transform: `rotate(90 ${L + k + fs * 1.6} ${W / 2})` });
  svgText(g, L / 2, W + k + fs * 1.9, tr`стена ${WALL_NAMES[2]}`, { class: 'p-wl' });
  svgText(g, -k, W / 2, tr`стена ${WALL_NAMES[3]}`, { class: 'p-wl', transform: `rotate(-90 ${-k} ${W / 2})` });
  // Метры по краю
  for (let x = 100; x < L; x += 100) svgText(g, x, W + WALL_T + fs * 1.05, String(x / 100), { class: 'p-ruler' });
  for (let y = 100; y < W; y += 100) svgText(g, L + WALL_T + fs * 0.4, y + fs * 0.35, String(y / 100), { class: 'p-ruler', 'text-anchor': 'start' });
}

// ---------- Мышь и палец ----------
function onDown(e) {
  if (e.button > 0) return;
  const t = e.target.closest('[data-uid]');
  const p = svgPt(e);
  if (!t) { if (state.sel != null) { state.sel = null; render(); } return; }
  const it = byUid(+t.dataset.uid);
  if (!it) return;
  // Клик по покрытию, когда сверху выделен модуль этого покрытия — оставляем выделение
  state.sel = it.uid;
  const resize = t.dataset.handle === '1';
  const list = resize ? [it] : members(it);
  plan.drag = { resize, list, it, p0: p, orig: list.map((i) => ({ x: i.x, y: i.y, rot: i.rot, w: i.w, d: i.d })),
    B0: listBox(list), moved: false, upp: plan.svg.viewBox.baseVal.width / plan.svg.clientWidth };
  plan.svg.setPointerCapture(e.pointerId);
  e.preventDefault();
  render();
}
function onMove(e) {
  const dr = plan.drag;
  if (!dr) return;
  const p = svgPt(e), dx = p.x - dr.p0.x, dy = p.y - dr.p0.y;
  if (!dr.moved) {
    if (Math.hypot(dx, dy) < 4 * dr.upp) return;
    beginChange();
    dr.moved = true;
  }
  dr.list.forEach((i, k) => Object.assign(i, dr.orig[k]));
  if (dr.resize) resizeItem(dr.it, dr.orig[0], dx, dy);
  else placeList(dr.list, dr.B0.x + dr.B0.w / 2 + dx, dr.B0.y + dr.B0.h / 2 + dy);
  render();
}
function onUp() { plan.drag = null; }

function resizeItem(it, o, dx, dy) {
  const c = CAT[it.id], { L, W } = state.room, vert = it.rot % 180 !== 0;
  let fw = vert ? o.d : o.w, fd = vert ? o.w : o.d;
  if (c.resize === 'w') {
    if (vert) fd = clamp(snap(fd + dy), 30, W - it.y); else fw = clamp(snap(fw + dx), 30, L - it.x);
  } else {
    fw = clamp(snap(fw + dx), 20, L - it.x);
    fd = clamp(snap(fd + dy), 20, W - it.y);
  }
  if (vert) { it.d = fw; it.w = fd; } else { it.w = fw; it.d = fd; }
}

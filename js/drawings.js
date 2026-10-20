// Чертежи кроме плана: разрез по высотам и развёртки четырёх стен. Плюс выгрузка в SVG.

// ---------- Разрез: какой потолок нужен каждому снаряду и акро-элементам ----------
// Человек 175 см, руки вверх 225 см. Высоты акро-элементов — до верхней точки рук флаера.
const ACRO_LEVELS = [
  { name: 'Стойка на ступнях базы (L-базинг)', top: 320, kind: 'L' },
  { name: 'Стойка на плечах, 2 яруса', top: 375, kind: 'stack' },
  { name: 'Выброс флаера', top: 460, kind: 'toss' },
];

function renderSection() {
  const svg = $('#section'), { H } = state.room;
  svg.replaceChildren();
  const ids = [...new Set(state.items.map((i) => i.id))].filter((id) => CAT[id].h).sort((a, b) => CAT[a].h[0] - CAT[b].h[0]);
  const cols = ids.length + ACRO_LEVELS.length;
  const Wv = 1000, Hv = 360, base = 300, left = 56;
  const maxH = Math.max(H, ...ids.map((id) => CAT[id].h[1]), 480) + 40;
  const k = (base - 24) / maxH, y = (cm) => base - cm * k;
  svg.setAttribute('viewBox', `0 0 ${Wv} ${Hv}`);
  // Шкала
  for (let m = 0; m <= maxH; m += 100) {
    svgEl('line', { x1: left, y1: y(m), x2: Wv - 8, y2: y(m), class: 's-grid' }, svg);
    svgText(svg, left - 8, y(m) + 4, tr`${m / 100} м`, { class: 's-ax' });
  }
  svgEl('line', { x1: left, y1: base, x2: Wv - 8, y2: base, class: 's-floor' }, svg);
  const colW = (Wv - left - 16) / Math.max(cols, 6);
  const status = (need) => (H >= need[1] ? 'ok' : H >= need[0] ? 'warn' : 'bad');

  ids.forEach((id, i) => {
    const c = CAT[id], x = left + 8 + colW * i + colW / 2, bw = Math.min(40, colW * 0.42);
    const st = status(c.h);
    if (c.hgt) svgEl('rect', { x: x - bw / 2, y: y(c.hgt), width: bw, height: c.hgt * k, class: 's-body', style: `--c:${DISC[c.disc].color}` }, svg);
    if (c.kind === 'ceil') svgEl('line', { x1: x, y1: y(H), x2: x, y2: base - 30 * k, class: 's-rope', style: `--c:${DISC[c.disc].color}` }, svg);
    svgEl('line', { x1: x, y1: base, x2: x, y2: y(c.h[1]), class: `s-need ${st}` }, svg);
    svgEl('line', { x1: x - bw / 2 - 6, y1: y(c.h[0]), x2: x + bw / 2 + 6, y2: y(c.h[0]), class: `s-min ${st}` }, svg);
    svgEl('line', { x1: x - bw / 2 - 6, y1: y(c.h[1]), x2: x + bw / 2 + 6, y2: y(c.h[1]), class: `s-rec ${st}` }, svg);
    svgText(svg, x, y(c.h[1]) - 6, `${fmtM(c.h[0])}–${fmtM(c.h[1])}`, { class: `s-val ${st}` });
    wrapLabel(svg, x, base + 16, c.short, colW - 4);
  });
  ACRO_LEVELS.forEach((lv, j) => {
    const x = left + 8 + colW * (ids.length + j) + colW / 2, st = H >= lv.top + 30 ? 'ok' : H >= lv.top ? 'warn' : 'bad';
    drawAcro(svg, x, base, k, lv.kind);
    svgEl('line', { x1: x - colW * 0.4, y1: y(lv.top), x2: x + colW * 0.4, y2: y(lv.top), class: `s-rec ${st}` }, svg);
    svgText(svg, x, y(lv.top) - 6, `≈${fmtM(lv.top)}`, { class: `s-val ${st}` });
    wrapLabel(svg, x, base + 16, lv.name, colW - 4, 's-lbl acro');
  });
  // Потолок
  svgEl('line', { x1: left, y1: y(H), x2: Wv - 8, y2: y(H), class: 's-ceil' }, svg);
  svgText(svg, Wv - 10, y(H) - 7, tr`потолок ${fmtM(H)} м`, { class: 's-ceil-t' });
  if (!ids.length) svgText(svg, left + 20, y(maxH * 0.6), tr`Добавьте снаряды: здесь будет видно, хватает ли потолка`, { class: 's-empty' });
}
function wrapLabel(svg, x, y0, text, maxW, cls = 's-lbl') {
  const words = String(text).split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length * 6.2 > maxW && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  lines.push(cur);
  lines.slice(0, 4).forEach((l, i) => svgText(svg, x, y0 + i * 13, l, { class: cls }));
}
// Человечки: палочки в масштабе разреза
function stick(svg, x, feet, k, h = 175, arms = 'up', rot = 0) {
  const g = svgEl('g', { class: 's-fig', transform: rot ? `rotate(${rot} ${x} ${feet})` : null }, svg);
  const Y = (cm) => feet - cm * k, hip = 92, sh = 145, head = 163;
  svgEl('path', { d: `M${x - 9 * k} ${Y(0)}L${x} ${Y(hip)}L${x + 9 * k} ${Y(0)}M${x} ${Y(hip)}V${Y(sh + 6)}` }, g);
  svgEl('path', { d: arms === 'up' ? `M${x - 12 * k} ${Y(h + 50)}L${x} ${Y(sh)}L${x + 12 * k} ${Y(h + 50)}` : `M${x - 30 * k} ${Y(sh - 50)}L${x} ${Y(sh)}L${x + 30 * k} ${Y(sh - 50)}` }, g);
  svgEl('circle', { cx: x, cy: Y(head), r: 11 * k }, g);
}
function drawAcro(svg, x, base, k, kind) {
  if (kind === 'L') {
    // база лёжа, ноги вверх ≈95 см; флаер стоит на стопах
    svgEl('path', { d: `M${x - 80 * k} ${base - 6}H${x}V${base - 95 * k}`, class: 's-fig-p' }, svg);
    svgEl('circle', { cx: x - 92 * k, cy: base - 10 * k, r: 11 * k, class: 's-fig-p' }, svg);
    stick(svg, x, base - 95 * k, k);
  } else if (kind === 'stack') {
    stick(svg, x, base, k, 175, 'down');
    stick(svg, x, base - 145 * k, k);
  } else {
    stick(svg, x - 22 * k, base, k, 175, 'up');
    stick(svg, x + 18 * k, base - 235 * k, k);
  }
}

// ---------- Развёртки стен: вид изнутри зала, слева направо ----------
function wallItems(side) {
  const { L, W } = state.room, len = side % 2 ? W : L;
  return state.items.filter((it) => isWallKind(CAT[it.id]) && it.rot / 90 === side && touchesWall(it)).map((it) => {
    const b = body(it), c = CAT[it.id];
    const s = side === 0 ? b.x : side === 1 ? b.y : side === 2 ? L - b.x - b.w : W - b.y - b.h;
    const along = side % 2 ? b.h : b.w;
    const [z, h] = c.elev || [0, c.hgt || 100];
    return { it, c, s, along, z, h, len };
  });
}
function renderWalls() {
  const host = $('#walls');
  host.replaceChildren();
  const { L, W, H } = state.room;
  for (let side = 0; side < 4; side++) {
    const len = side % 2 ? W : L, list = wallItems(side);
    const fig = document.createElement('figure');
    fig.className = 'wall-fig';
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<b>${tr`Стена ${WALL_NAMES[side]}`}</b> <span class="hint">${tr`${fmtM(len)} × ${fmtM(H)} м`} · ${list.length ? list.length + ' ' + plural(list.length, ['элемент', 'элемента', 'элементов']) : tr`пусто`}</span>`;
    fig.appendChild(cap);
    const svg = svgEl('svg', { class: 'wall-svg', role: 'img', 'aria-label': tr`Развёртка стены ${WALL_NAMES[side]}` }, fig);
    drawWall(svg, len, H, list);
    host.appendChild(fig);
  }
}
function drawWall(svg, len, H, list) {
  const fs = Math.max(len, H) / 34, padX = fs * 3.2, padT = fs * 1.4, padB = fs * 3.4;
  svg.setAttribute('viewBox', `${-padX} ${-padT} ${len + padX * 2} ${H + padT + padB}`);
  svg.style.setProperty('--fs', fs);
  const Y = (z) => H - z;
  svgEl('rect', { x: 0, y: 0, width: len, height: H, class: 'w-wall' }, svg);
  for (let z = 100; z < H; z += 100) {
    svgEl('line', { x1: 0, y1: Y(z), x2: len, y2: Y(z), class: 'w-grid' }, svg);
    svgText(svg, -fs * 0.4, Y(z) + fs * 0.35, `${z / 100}`, { class: 'w-ax' });
  }
  svgEl('line', { x1: -fs, y1: H, x2: len + fs, y2: H, class: 'w-floor' }, svg);
  const edges = new Set([0, len]);
  for (const e of list) {
    const covered = e.c.flat && list.some((o) => o !== e && !o.c.flat && o.s < e.s + e.along && o.s + o.along > e.s);
    const top = e.z + e.h, mark = MARKS.get(e.it.id);
    svgEl('rect', { x: e.s, y: Y(top), width: e.along, height: e.h, class: `w-it k-${e.c.kind}${e.c.flat ? ' flat' : ''}`, style: `--c:${DISC[e.c.disc].color}`, 'data-uid': e.it.uid }, svg);
    if (e.c.kind === 'door') svgEl('path', { d: `M${e.s} ${Y(top)}L${e.s + e.along} ${Y(top / 2)}L${e.s} ${Y(0)}`, class: 'w-door' }, svg);
    if (e.it.id === 'wallbars') for (let z = 15; z < e.h; z += 15) svgEl('line', { x1: e.s, y1: Y(z), x2: e.s + e.along, y2: Y(z), class: 'w-sym' }, svg);
    if (e.it.id === 'wallball') svgEl('circle', { cx: e.s + e.along / 2, cy: Y(305), r: 23, class: 'w-sym' }, svg);
    const label = (mark ? `${mark}. ` : '') + (e.c.short || e.c.name);
    const ty = e.h > fs * 2.6 ? Y(e.z + e.h / 2) : Y(top) - fs * 0.5;
    if (!covered) svgText(svg, e.s + e.along / 2, ty, label, { class: 'w-lbl' });
    // Отметки по высоте — справа от элемента
    svgText(svg, e.s + e.along + fs * 0.25, Y(top) + fs * 0.8, `+${fmtM(top)}`, { class: 'w-z' });
    if (e.z > 0) svgText(svg, e.s + e.along + fs * 0.25, Y(e.z), `+${fmtM(e.z)}`, { class: 'w-z' });
    edges.add(Math.round(e.s)); edges.add(Math.round(e.s + e.along));
  }
  // Цепочка размеров по низу
  const xs = [...edges].filter((x) => x >= 0 && x <= len).sort((a, b) => a - b);
  const yd = H + fs * 1.4;
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    if (b - a < 1) continue;
    svgEl('line', { x1: a, y1: yd, x2: b, y2: yd, class: 'p-dim' }, svg);
    const t = fs * 0.3;
    for (const x of [a, b]) svgEl('line', { x1: x - t, y1: yd + t, x2: x + t, y2: yd - t, class: 'p-dim tick' }, svg);
    if ((b - a) > fs * 1.6) svgText(svg, (a + b) / 2, yd - fs * 0.3, fmtM(b - a), { class: 'w-dim-t' });
  }
  svgEl('line', { x1: 0, y1: yd + fs * 1.3, x2: len, y2: yd + fs * 1.3, class: 'p-dim' }, svg);
  svgText(svg, len / 2, yd + fs * 1.0, tr`${fmtM(len)} м`, { class: 'w-dim-t strong' });
}

// ---------- Выгрузка SVG: стили со страницы переносим в атрибуты, чтобы файл открывался где угодно ----------
const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'fill-opacity',
  'font-family', 'font-size', 'font-weight', 'text-anchor', 'letter-spacing'];
function inlineSvg(src) {
  const clone = src.cloneNode(true);
  const a = [src, ...src.querySelectorAll('*')], b = [clone, ...clone.querySelectorAll('*')];
  a.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    b[i].setAttribute('style', style);
    b[i].removeAttribute('class');
  });
  clone.setAttribute('xmlns', NS);
  clone.style.background = getComputedStyle(document.body).backgroundColor;
  return new XMLSerializer().serializeToString(clone);
}
function exportPlanSvg() {
  renderPlan(plan.svg, { clean: true });
  const text = inlineSvg(plan.svg);
  renderPlan();
  download(`${fileBase()}-plan.svg`, text, 'image/svg+xml');
}
function exportWallsSvg() {
  // Четыре развёртки и разрез в один лист, друг под другом
  const parts = [...$$('#walls svg'), $('#section')];
  let y = 0, out = '';
  const width = 1000;
  for (const s of parts) {
    const vb = s.viewBox.baseVal, h = width * vb.height / vb.width;
    const inner = inlineSvg(s).replace(/^<svg/, `<svg x="0" y="${y}" width="${width}" height="${h}"`);
    out += inner;
    y += h + 30;
  }
  const doc = `<svg xmlns="${NS}" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}" style="background:${getComputedStyle(document.body).backgroundColor}">${out}</svg>`;
  download(`${fileBase()}-walls.svg`, doc, 'image/svg+xml');
}
const fileBase = () => 'lifeboost-' + (state.name || 'zal').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '');

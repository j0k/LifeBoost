// Панели вокруг плана: каталог, свойства выбранного, проверки, сводка и спецификация с закупкой.
let palGrp = 'cf', palQuery = '';
let MARKS = new Map(); // id каталога → номер позиции в спецификации (марка на чертежах)

// ---------- Стоимость ----------
function qtyOf(id, w, d) {
  const c = CAT[id];
  return c.unit === 'm2' ? (w * d) / 1e4 : c.unit === 'm' ? w / 100 : 1;
}
const unitName = (c) => (c.unit === 'm2' ? 'м²' : c.unit === 'm' ? 'м' : 'шт');
function moduleCost(mod) {
  let lo = 0, hi = 0;
  for (const [id, , , , w, d] of mod.items) { const q = qtyOf(id, w ?? CAT[id].w, d ?? CAT[id].d); lo += CAT[id].price[0] * q; hi += CAT[id].price[1] * q; }
  for (const [id, n] of Object.entries(mod.kits || {})) { lo += CAT[id].price[0] * n; hi += CAT[id].price[1] * n; }
  return [lo, hi];
}

// Спецификация: одна строка на позицию каталога
function bomRows() {
  const rows = new Map();
  const add = (id, q) => {
    const c = CAT[id];
    if (!c.price[1]) return; // двери, окна, колонны — не покупаем
    const r = rows.get(id) || { id, c, qty: 0, n: 0 };
    r.qty += q; r.n += 1;
    rows.set(id, r);
  };
  for (const it of state.items) add(it.id, qtyOf(it.id, it.w, it.d));
  for (const [id, n] of Object.entries(state.kits)) if (n > 0) add(id, n);
  const gi = (g) => GROUPS.findIndex((x) => x.id === g);
  return [...rows.values()].sort((a, b) => gi(a.c.grp) - gi(b.c.grp) || CATALOG.indexOf(a.c) - CATALOG.indexOf(b.c))
    .map((r, i) => ({ ...r, mark: i + 1, sum: [r.c.price[0] * r.qty, r.c.price[1] * r.qty] }));
}
function computeMarks() { MARKS = new Map(bomRows().map((r) => [r.id, r.mark])); }

// ---------- Каталог ----------
function iconSvg(rects, color) {
  const B = bbox(rects), s = 40 / Math.max(B.w, B.h, 1);
  const body = rects.map((r) => `<rect x="${(r.x - B.x) * s + (40 - B.w * s) / 2 + 2}" y="${(r.y - B.y) * s + (40 - B.h * s) / 2 + 2}" width="${Math.max(1.5, r.w * s)}" height="${Math.max(1.5, r.h * s)}" rx="1" class="${r.f ? 'f' : ''}"/>`).join('');
  return `<svg viewBox="0 0 44 44" style="--c:${color}" aria-hidden="true">${body}</svg>`;
}
function moduleRects(mod) {
  return mod.items.map(([id, x, y, rot, w, d]) => {
    w = w ?? CAT[id].w; d = d ?? CAT[id].d;
    const v = (rot || 0) % 180;
    return { ...rect(x, y, v ? d : w, v ? w : d), f: CAT[id].kind === 'floor' };
  });
}
function renderPalette() {
  $('#palTabs').innerHTML = GROUPS.map((g) =>
    `<button type="button" class="tab" role="tab" data-g="${g.id}" aria-selected="${g.id === palGrp && !palQuery}">${g.name}</button>`).join('');
  const q = palQuery.trim().toLowerCase();
  const mods = MODULES.filter((m) => (q ? (m.name + ' ' + (m.note || '')).toLowerCase().includes(q) : m.grp === palGrp));
  const its = CATALOG.filter((c) => (q ? c.name.toLowerCase().includes(q) : c.grp === palGrp));
  let html = '';
  if (mods.length) {
    html += `<div class="pal-sub">Модули <span class="hint">— готовые кубики</span></div>`;
    html += mods.map((m) => {
      const color = DISC[CAT[m.items.find(([id]) => CAT[id].kind !== 'floor')?.[0] || m.items[0][0]].disc].color;
      return `<button type="button" class="card mod" data-add="m:${m.id}" draggable="true" title="${esc(m.note || '')}">
        ${iconSvg(moduleRects(m), color)}
        <span class="ct"><b>${esc(m.name)}</b><span class="hint">${m.area} · ${m.items.length} ${plural(m.items.length, ['предмет', 'предмета', 'предметов'])}</span></span>
        <span class="sz s-${m.size}">${m.size}</span><span class="pr">${fmtRange(moduleCost(m))}</span></button>`;
    }).join('');
  }
  if (its.length) {
    html += `<div class="pal-sub">${palGrp === 'kit' && !q ? 'Без места на плане' : 'Отдельные предметы'}</div>`;
    html += its.map((c) => {
      const kit = c.kind === 'kit';
      const sub = kit ? `в закупке: ${state.kits[c.id] || 0} шт` : `${fmtM(c.w)} × ${fmtM(c.d)} м${c.resize ? ', тянется' : ''}`;
      const pr = c.price[1] ? `${fmtRange(c.price)}${c.unit ? '/' + unitName(c) : ''}` : '—';
      return `<button type="button" class="card" data-add="i:${c.id}" ${kit ? '' : 'draggable="true"'}>
        ${kit ? `<span class="kit-ico" style="--c:${DISC[c.disc].color}">+</span>` : iconSvg([{ ...rect(0, 0, c.w, c.d), f: c.kind === 'floor' }], DISC[c.disc].color)}
        <span class="ct"><b>${esc(c.name)}</b><span class="hint">${sub}</span></span><span class="pr">${pr}</span></button>`;
    }).join('');
  }
  if (!html) html = '<p class="hint">Ничего не нашлось.</p>';
  $('#palList').innerHTML = html;
}

// ---------- Свойства выбранного ----------
function renderInspector() {
  const el = $('#insp'), it = byUid(state.sel);
  if (!it) {
    el.innerHTML = `<div class="panel-head"><h2>Свойства</h2></div>
      <p class="hint">Нажмите на предмет на плане или добавьте модуль из каталога — кликом или перетаскиванием на план.</p>
      <dl class="keys"><dt>Тащить</dt><dd>двигать; модуль едет целиком, настенное липнет к стене</dd>
      <dt>R / Shift+R</dt><dd>повернуть (настенное — на соседнюю стену)</dd><dt>← ↑ → ↓</dt><dd>сдвиг на 10 см, с Shift — на 50</dd>
      <dt>Ctrl+D</dt><dd>копия</dd><dt>Delete</dt><dd>удалить</dd><dt>Ctrl+Z / Ctrl+Y</dt><dd>отменить / вернуть</dd></dl>
      <div class="legend">${Object.entries(DISC).map(([, d]) => `<span><i style="--c:${d.color}"></i>${d.name}</span>`).join('')}</div>`;
    return;
  }
  const c = CAT[it.id], list = members(it), b = body(it), mod = it.g && it.m ? MODULES.find((m) => m.id === it.m) : null;
  const issues = checks.list.filter((p) => p.ids.includes(it.uid));
  const q = qtyOf(it.id, it.w, it.d);
  const m = c.m || [0, 0, 0, 0];
  const capTxt = Object.entries(c.cap || {}).map(([k, n]) => `${DISC[k].name.toLowerCase()} — ${n}`).join(', ');
  const fld = (f, label, val, step = 0.1) => `<label class="field"><span>${label}</span><input type="number" data-f="${f}" value="${fmtNum(val / 100, 2).replace(',', '.')}" step="${step}" min="0"></label>`;
  el.innerHTML = `<div class="panel-head"><h2>Свойства</h2>${MARKS.get(it.id) ? `<span class="hint mono">поз. ${MARKS.get(it.id)}</span>` : ''}</div>
    <div class="insp-title"><i style="--c:${DISC[c.disc].color}"></i><div><b>${esc(c.name)}</b><div class="hint">${DISC[c.disc].name}${c.kind === 'ceil' ? ' · крепится к потолку' : isWallKind(c) ? ' · на стене ' + WALL_NAMES[it.rot / 90] : ''}</div></div></div>
    ${list.length > 1 ? `<div class="grpbox"><span>Модуль «${esc(mod ? mod.name : 'группа')}» · ${list.length} ${plural(list.length, ['предмет', 'предмета', 'предметов'])}, двигается целиком</span>
      <span class="row"><button class="btn sm" data-act="ungroup" type="button">Разгруппировать</button><button class="btn sm" data-act="delOne" type="button">Убрать только этот</button></span></div>` : ''}
    <div class="grid2">
      ${fld('x', 'От стены Г, м', b.x)}${fld('y', 'От стены А, м', b.y)}
      ${c.resize ? fld('fw', 'Ширина на плане, м', b.w) + (c.resize === 'w' ? '' : fld('fd', 'Глубина на плане, м', b.h)) : ''}
    </div>
    <div class="row">
      <button class="btn" data-act="rotL" type="button" title="Shift+R">⟲ 90°</button><button class="btn" data-act="rotR" type="button" title="R">⟳ 90°</button>
      <button class="btn" data-act="dup" type="button" title="Ctrl+D">Копия</button><button class="btn danger" data-act="del" type="button" title="Delete">Удалить${list.length > 1 ? ' модуль' : ''}</button>
    </div>
    <dl class="facts">
      <dt>Размер</dt><dd>${fmtM(c.kind === 'floor' ? it.w : c.w)} × ${fmtM(c.kind === 'floor' ? it.d : c.d)} м${c.hgt ? `, высота ${fmtM(c.hgt)} м` : ''}</dd>
      ${hasZone(it) ? `<dt>Зона безопасности</dt><dd>${m.every((v) => v === m[0]) ? `${fmtM(m[0])} м вокруг` : `${m.map(fmtM).join(' / ')} м<span class="hint"> (сзади·справа·спереди·слева)</span>`}</dd>` : ''}
      ${c.h ? `<dt>Потолок</dt><dd>от ${fmtM(c.h[0])} м, лучше ${fmtM(c.h[1])} м</dd>` : ''}
      ${c.elev ? `<dt>На стене</dt><dd>от +${fmtM(c.elev[0])} до +${fmtM(c.elev[0] + c.elev[1])} м</dd>` : ''}
      ${c.needFloor ? `<dt>Покрытие</dt><dd>${FLOORS[c.needFloor]}</dd>` : ''}
      ${capTxt ? `<dt>Занимаются</dt><dd>${capTxt}</dd>` : ''}
      ${c.price[1] ? `<dt>Цена</dt><dd>${fmtRange(c.price.map((p) => p * q))}${c.unit ? ` <span class="hint">(${fmtNum(q, 1)} ${unitName(c)} × ${fmtRange(c.price)})</span>` : ''}</dd>` : ''}
    </dl>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
    ${issues.length ? `<ul class="issues">${issues.map((p) => `<li class="${p.sev}">${esc(p.text)}</li>`).join('')}</ul>` : '<p class="ok-line">Здесь всё в порядке</p>'}`;
}
function onInspector(e) {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (!a) return;
  if (a === 'rotL') rotateSel(-1);
  if (a === 'rotR') rotateSel(1);
  if (a === 'dup') duplicateSel();
  if (a === 'del') removeSel(true);
  if (a === 'delOne') removeSel(false);
  if (a === 'ungroup') ungroupSel();
}
function onInspectorInput(e) {
  const f = e.target.dataset.f, it = byUid(state.sel);
  if (!f || !it) return;
  const v = Math.round(parseFloat(String(e.target.value).replace(',', '.')) * 100);
  if (!Number.isFinite(v)) return;
  beginChange();
  const list = members(it), b = body(it), side = wallSideOf(list);
  if (f === 'x' || f === 'y') {
    const B = listBox(list);
    const dx = f === 'x' ? v - b.x : 0, dy = f === 'y' ? v - b.y : 0;
    placeList(list, B.x + B.w / 2 + dx, B.y + B.h / 2 + dy, side >= 0 ? side : undefined);
  } else {
    const o = { x: it.x, y: it.y, w: it.w, d: it.d, rot: it.rot };
    resizeItem(it, o, f === 'fw' ? v - b.w : 0, f === 'fd' ? v - b.h : 0);
  }
  render();
}

// ---------- Проверки ----------
function renderChecks() {
  const n = { bad: 0, warn: 0, info: 0 };
  checks.list.forEach((p) => n[p.sev]++);
  const chip = $('#chipChecks');
  chip.className = 'chip ' + (n.bad ? 'bad' : n.warn ? 'warn' : '');
  chip.querySelector('.t').textContent = n.bad ? `${n.bad} ${plural(n.bad, ['ошибка', 'ошибки', 'ошибок'])}` : n.warn ? `${n.warn} ${plural(n.warn, ['замечание', 'замечания', 'замечаний'])}` : 'без ошибок';
  $('#checksSum').textContent = `${n.bad} ${plural(n.bad, ['ошибка', 'ошибки', 'ошибок'])} · ${n.warn} ${plural(n.warn, ['замечание', 'замечания', 'замечаний'])}`;
  $('#checks').innerHTML = checks.list.length
    ? checks.list.map((p, i) => `<li><button type="button" class="${p.sev}" data-i="${i}" ${p.ids.length ? '' : 'disabled'}>${esc(p.text)}</button></li>`).join('')
    : '<li class="ok-line">Нарушений нет: зоны не пересекаются, потолка хватает, всё на своих местах.</li>';
}

// ---------- Сводка ----------
function occupancy() {
  // Растр 10×10 см: сколько пола занято предметами и их зонами
  const { L, W } = state.room, cs = 10, nx = Math.ceil(L / cs), ny = Math.ceil(W / cs);
  const grid = new Uint8Array(nx * ny);
  for (const it of state.items) {
    const c = CAT[it.id];
    if (c.kind === 'floor' || c.kind === 'ceil') continue;
    const z = inter(zone(it), rect(0, 0, L, W));
    if (!z) continue;
    for (let j = Math.floor(z.y / cs); j < Math.ceil((z.y + z.h) / cs); j++)
      for (let i = Math.floor(z.x / cs); i < Math.ceil((z.x + z.w) / cs); i++) grid[j * nx + i] = 1;
  }
  let s = 0;
  for (const v of grid) s += v;
  return (s * cs * cs) / 1e4;
}
function renderStats() {
  const { L, W, H } = state.room, total = (L * W) / 1e4;
  const floors = {};
  for (const it of state.items) { const c = CAT[it.id]; if (c.kind === 'floor') floors[c.ft] = (floors[c.ft] || 0) + area(inter(body(it), rect(0, 0, L, W))) / 1e4; }
  const occ = Math.min(total, occupancy());
  const cap = capacity(), maxCap = Math.max(1, ...Object.values(cap));
  const rows = bomRows();
  const sum = rows.reduce((s, r) => [s[0] + r.sum[0], s[1] + r.sum[1]], [0, 0]);
  const buy = rows.filter((r) => !state.owned.has(r.id)).reduce((s, r) => [s[0] + r.sum[0], s[1] + r.sum[1]], [0, 0]);
  $('#stats').innerHTML = `
    <div class="totals">
      <div><span class="hint">Площадь</span><b>${fmtNum(total, 1)} м²</b><span class="hint">${fmtM(L)} × ${fmtM(W)} м, потолок ${fmtM(H)} м</span></div>
      <div><span class="hint">Занято снарядами и зонами</span><b>${Math.round((occ / total) * 100)}%</b><span class="hint">свободно ≈${fmtNum(total - occ, 1)} м²</span></div>
      <div><span class="hint">Бюджет на всё</span><b>${fmtRange(sum.map((v) => Math.round(v / 1000) * 1000))}</b><span class="hint">к покупке: ${fmtRange(buy.map((v) => Math.round(v / 1000) * 1000))}</span></div>
    </div>
    <div class="caps">${CAP_DISC.map((k) => `<div class="cap"><span>${DISC[k].name}</span><span class="bar"><i style="width:${(cap[k] / maxCap) * 100}%;--c:${DISC[k].color}"></i></span><b>${cap[k]}</b></div>`).join('')}</div>
    <p class="hint">Вместимость — сколько человек одновременно занимается на поставленных снарядах.
      Покрытия: ${Object.entries(floors).map(([k, v]) => `${FLOORS[k]} ${fmtNum(v, 1)} м²`).join(', ') || 'не заданы'}.</p>`;
}

// ---------- Спецификация и закупка ----------
function renderBom() {
  const rows = bomRows();
  const tot = (pred) => rows.filter(pred).reduce((s, r) => [s[0] + r.sum[0], s[1] + r.sum[1]], [0, 0]);
  let lastGrp = '';
  const body = rows.map((r) => {
    const head = r.c.grp !== lastGrp ? `<tr class="grp"><td colspan="6">${GROUPS.find((g) => g.id === r.c.grp).name}</td></tr>` : '';
    lastGrp = r.c.grp;
    const kit = r.c.kind === 'kit';
    const qty = kit
      ? `<span class="step"><button type="button" data-kit="${r.id}" data-d="-1" aria-label="Меньше">−</button><b>${r.qty}</b><button type="button" data-kit="${r.id}" data-d="1" aria-label="Больше">+</button></span>`
      : `${fmtNum(r.qty, 1)}`;
    return `${head}<tr class="${state.owned.has(r.id) ? 'owned' : ''}">
      <td class="mk">${r.mark}</td><td>${esc(r.c.name)}</td><td class="num">${qty} ${unitName(r.c)}</td>
      <td class="num">${fmtRange(r.c.price)}</td><td class="num">${fmtRange(r.sum)}</td>
      <td class="own"><label title="Уже есть — не покупать"><input type="checkbox" data-own="${r.id}" ${state.owned.has(r.id) ? 'checked' : ''}><span>есть</span></label></td></tr>`;
  }).join('');
  const all = tot(() => true), buy = tot((r) => !state.owned.has(r.id));
  $('#bom').innerHTML = rows.length ? `<table class="bom"><thead><tr><th>Поз.</th><th>Наименование</th><th class="num">Кол-во</th><th class="num">Цена за ед.</th><th class="num">Сумма</th><th></th></tr></thead>
    <tbody>${body}</tbody><tfoot><tr><td></td><td>Итого</td><td></td><td></td><td class="num">${fmtRange(all)}</td><td></td></tr>
    <tr class="buy"><td></td><td>К покупке</td><td></td><td></td><td class="num">${fmtRange(buy)}</td><td></td></tr></tfoot></table>`
    : '<p class="hint">Пока пусто: добавьте модули из каталога.</p>';
}
function onBom(e) {
  const k = e.target.closest('[data-kit]');
  if (k) {
    beginChange();
    const id = k.dataset.kit;
    state.kits[id] = Math.max(0, (state.kits[id] || 0) + Number(k.dataset.d));
    if (!state.kits[id]) delete state.kits[id];
    render();
  }
}
function onBomChange(e) {
  const id = e.target.dataset.own;
  if (!id) return;
  beginChange();
  if (e.target.checked) state.owned.add(id); else state.owned.delete(id);
  render();
}
function bomCsv() {
  const rows = bomRows();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [['Поз.', 'Наименование', 'Кол-во', 'Ед.', 'Цена от', 'Цена до', 'Сумма от', 'Сумма до', 'Уже есть'].map(q).join(';')];
  for (const r of rows) lines.push([r.mark, r.c.name, fmtNum(r.qty, 2), unitName(r.c), r.c.price[0], r.c.price[1], Math.round(r.sum[0]), Math.round(r.sum[1]), state.owned.has(r.id) ? 'да' : ''].map(q).join(';'));
  download(`${fileBase()}-zakupka.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
}

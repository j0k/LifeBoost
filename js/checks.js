// Проверки плана: наложения, зоны безопасности, стены, потолок, покрытие, двери, плотность людей.
// Все правила — чистые функции от state, без DOM: их можно гонять и в node.
const SEV_RANK = { bad: 3, warn: 2, info: 1 };
const nm = (it) => (EN ? `“${CAT[it.id].short || CAT[it.id].name}”` : `«${CAT[it.id].short || CAT[it.id].name}»`);

// Нарушения между двумя предметами; пишет в out: { sev, text, ids, hot }
function pairIssues(A, B, out) {
  const a = CAT[A.id], b = CAT[B.id];
  if (a.kind === 'floor' && b.kind === 'floor') {
    const r = inter(body(A), body(B));
    if (r) out.push({ sev: 'warn', text: tr`Покрытия ${nm(A)} и ${nm(B)} наложены: площадь посчитана дважды`, ids: [A.uid, B.uid], hot: r });
    return;
  }
  if (a.kind === 'floor' || b.kind === 'floor') return;
  if (a.kind === 'ceil' && b.kind === 'ceil') {
    const r = inter(zone(A), zone(B));
    if (r) out.push({ sev: 'bad', text: tr`Зоны раскачки ${nm(A)} и ${nm(B)} пересекаются`, ids: [A.uid, B.uid], hot: r });
    return;
  }
  if (a.kind === 'ceil' || b.kind === 'ceil') {
    const [C, O] = a.kind === 'ceil' ? [A, B] : [B, A];
    if (CAT[O.id].kind === 'mat') return;
    const r = inter(zone(C), body(O));
    if (r) out.push({ sev: 'bad', text: tr`${nm(O)} под ${nm(C)}: в зоне раскачки ничего твёрдого`, ids: [O.uid, C.uid], hot: r });
    return;
  }
  const r = inter(body(A), body(B));
  if (r) {
    if ((a.flat || b.flat) && isWallKind(a) && isWallKind(b)) return; // станок поверх зеркала — нормально
    out.push({ sev: 'bad', text: tr`${nm(A)} и ${nm(B)} стоят друг на друге`, ids: [A.uid, B.uid], hot: r });
    return;
  }
  zoneHit(A, B, out);
  zoneHit(B, A, out);
}
function zoneHit(Z, O, out) {
  const z = CAT[Z.id], o = CAT[O.id];
  if (!hasZone(Z)) return;
  const r = inter(zone(Z), body(O));
  if (!r) return;
  if (o.flat) {
    if (z.disc === 'cf') out.push({ sev: 'bad', text: tr`${nm(O)} в зоне ${nm(Z)}: может разбиться`, ids: [O.uid, Z.uid], hot: r });
    return;
  }
  if (o.kind === 'mat' && z.softOk) return;
  if (o.soft) return; // мягкая защита стены как раз для зон
  const text = z.kind === 'door' ? tr`${nm(O)} загораживает проход у двери` : tr`${nm(O)} в зоне безопасности ${nm(Z)}`;
  out.push({ sev: 'bad', text, ids: [O.uid, Z.uid], hot: r });
}

// Доля площади прямоугольника, закрытая покрытием нужного типа
function floorCover(r, ft) {
  let s = 0;
  for (const f of state.items) if (CAT[f.id].kind === 'floor' && CAT[f.id].ft === ft) s += area(inter(r, body(f)));
  return Math.min(1, s / Math.max(1, area(r)));
}

// Нарушения одного предмета
function itemIssues(it, out) {
  const c = CAT[it.id], { L, W, H } = state.room, room = rect(0, 0, L, W), b = body(it);
  if (!inside(b, room)) out.push({ sev: 'bad', text: tr`${nm(it)} выходит за стены зала`, ids: [it.uid] });
  if (isWallKind(c) && !touchesWall(it)) out.push({ sev: 'bad', text: tr`${nm(it)} должно висеть на стене`, ids: [it.uid] });
  if (c.h && c.kind !== 'floor') {
    if (H < c.h[0]) out.push({ sev: 'bad', text: tr`${nm(it)}: нужен потолок от ${fmtM(c.h[0])} м, в зале ${fmtM(H)} м`, ids: [it.uid], still: true });
    else if (H < c.h[1]) out.push({ sev: 'warn', text: tr`${nm(it)}: потолок ${fmtM(H)} м — терпимо, лучше от ${fmtM(c.h[1])} м`, ids: [it.uid], still: true });
  }
  if (hasZone(it) && c.kind !== 'floor') {
    const z = zone(it), wm = wmargins(it);
    const over = [-z.y, z.x + z.w - L, z.y + z.h - W, -z.x];
    // Стена, обшитая настенным матом на этом участке, — нормальное решение
    if (over.some((v, i) => v > 1 && wm[i] >= 50 && !padded(i, z)))
      out.push({ sev: 'warn', text: tr`${nm(it)}: зона безопасности упирается в стену`, ids: [it.uid], hot: outsidePart(z, room) });
  }
  if (c.needFloor && floorCover(b, c.needFloor) < 0.9)
    out.push({ sev: 'warn', text: tr`${nm(it)}: под ним нужно ${FLOORS[c.needFloor]}`, ids: [it.uid] });
  if (c.needMat) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const ok = state.items.some((m) => CAT[m.id].landing && hasPoint(body(m), cx, cy));
    if (!ok) out.push({ sev: 'bad', text: tr`${nm(it)}: под точкой нет страховочного мата`, ids: [it.uid], still: true });
  }
}
// Закрыт ли настенными матами участок стены side, на который выходит зона z (хотя бы на 80%)
function padded(side, z) {
  const { L, W } = state.room, horiz = side % 2 === 0;
  const a = Math.max(0, horiz ? z.x : z.y), b = Math.min(horiz ? L : W, horiz ? z.x + z.w : z.y + z.h);
  if (b <= a) return true;
  let s = 0;
  for (const p of state.items) {
    if (!CAT[p.id].soft || p.rot / 90 !== side || !touchesWall(p)) continue;
    const r = body(p), pa = horiz ? r.x : r.y, pb = horiz ? r.x + r.w : r.y + r.h;
    s += Math.max(0, Math.min(b, pb) - Math.max(a, pa));
  }
  return s >= 0.8 * (b - a);
}
// Кусок зоны за стеной — для подсветки
function outsidePart(z, room) {
  const parts = [];
  if (z.x < 0) parts.push(rect(z.x, z.y, -z.x, z.h));
  if (z.y < 0) parts.push(rect(z.x, z.y, z.w, -z.y));
  if (z.x + z.w > room.w) parts.push(rect(room.w, z.y, z.x + z.w - room.w, z.h));
  if (z.y + z.h > room.h) parts.push(rect(z.x, room.h, z.w, z.y + z.h - room.h));
  return parts[0] || null;
}

// Вместимость по направлениям
function capacity() {
  const cap = Object.fromEntries(CAP_DISC.map((k) => [k, 0]));
  for (const it of state.items) for (const [k, n] of Object.entries(CAT[it.id].cap || {})) cap[k] += n;
  return cap;
}

function runChecks() {
  const out = [], items = state.items, { L, W } = state.room;
  for (const it of items) itemIssues(it, out);
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) pairIssues(items[i], items[j], out);

  const real = items.filter((i) => CAT[i.id].kind !== 'floor');
  if (real.length && !items.some((i) => CAT[i.id].kind === 'door'))
    out.push({ sev: 'warn', text: tr`Нет двери: не проверить, свободен ли вход`, ids: [], still: true });
  const cap = capacity();
  const people = Math.max(...Object.values(cap));
  if (people > 0) {
    const per = (L * W) / 1e4 / people;
    if (per < 2) out.push({ sev: 'warn', text: tr`Тесно: ${fmtNum(per, 1)} м² на человека в самой большой группе, обычно от 2–4 м²`, ids: [] });
  }
  const anchors = items.filter((i) => CAT[i.id].kind === 'ceil');
  if (anchors.length)
    out.push({ sev: 'info', text: tr`Точек подвеса: ${anchors.length}. Каждой нужна закладная с паспортом от 10 кН и расчёт перекрытия`, ids: anchors.map((i) => i.uid) });

  out.sort((p, q) => SEV_RANK[q.sev] - SEV_RANK[p.sev]);
  const worst = new Map();
  for (const p of out) for (const id of p.ids) if ((SEV_RANK[worst.get(id)] || 0) < SEV_RANK[p.sev]) worst.set(id, p.sev);
  return { list: out, worst };
}

// Оценка места для автоматической расстановки: 0 — идеально
function placementScore(list, others) {
  const out = [];
  for (const it of list) itemIssues(it, out);
  for (const it of list) for (const o of others) pairIssues(it, o, out);
  let s = 0;
  for (const p of out) {
    if (p.still) continue; // от места не зависит
    s += p.sev === 'bad' ? 10 : p.sev === 'warn' ? 1 : 0;
  }
  return s;
}

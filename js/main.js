// Главная перерисовка, кнопки, клавиатура и запуск.
let checks = { list: [], worst: new Map() };

function render() {
  checks = runChecks();
  computeMarks();
  renderPlan();
  renderSection();
  renderWalls();
  renderInspector();
  renderChecks();
  renderStats();
  renderBom();
  build3d();
  renderRoomFields();
  $('#btnUndo').disabled = !hist.past.length;
  $('#btnRedo').disabled = !hist.future.length;
  saveLocal();
}
function renderRoomFields() {
  const { L, W, H } = state.room;
  for (const [id, v] of [['roomL', L], ['roomW', W], ['roomH', H]]) {
    const el = $('#' + id);
    if (document.activeElement !== el) el.value = (v / 100).toFixed(2).replace(/\.?0+$/, '');
  }
  if (document.activeElement !== $('#projName')) $('#projName').value = state.name;
  document.title = `${state.name} · LifeBoost`;
  $('#stampName').textContent = state.name;
  $('#stampSize').textContent = tr`${fmtM(L)} × ${fmtM(W)} × ${fmtM(H)} м`;
  $('#stampDate').textContent = new Date().toLocaleDateString(LOC);
}

// Зал поменял размер: все модули остаются внутри, настенные — на своих стенах
function setRoom(key, metres) {
  const v = Math.round(parseFloat(String(metres).replace(',', '.')) * 100);
  if (!Number.isFinite(v)) return render();
  const lim = key === 'H' ? [200, 1500] : [150, 5000];
  beginChange();
  state.room[key] = clamp(v, ...lim);
  const seen = new Set();
  for (const it of state.items) {
    const list = members(it);
    if (seen.has(list[0].uid)) continue;
    seen.add(list[0].uid);
    const B = listBox(list), side = wallSideOf(list);
    placeList(list, B.x + B.w / 2, B.y + B.h / 2, side >= 0 ? side : undefined);
  }
  render();
}

function moveSel(dx, dy) {
  const it = byUid(state.sel);
  if (!it) return;
  beginChange();
  const list = members(it), B = listBox(list), side = wallSideOf(list);
  placeList(list, B.x + B.w / 2 + dx, B.y + B.h / 2 + dy, side >= 0 ? side : undefined);
  render();
}

function onKey(e) {
  if (e.target.closest('input, select, textarea')) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (mod && (k === 'z' || k === 'я') && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (mod && (k === 'y' || k === 'н' || ((k === 'z' || k === 'Z') && e.shiftKey))) { e.preventDefault(); redo(); return; }
  if (state.sel == null) return;
  const step = e.shiftKey ? 50 : 10;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (moves[k]) { e.preventDefault(); moveSel(...moves[k]); }
  else if (k === 'r' || k === 'R' || k === 'к' || k === 'К') { e.preventDefault(); rotateSel(e.shiftKey ? -1 : 1); }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); removeSel(true); }
  else if (mod && (k === 'd' || k === 'в')) { e.preventDefault(); duplicateSel(); }
  else if (k === 'Escape') { state.sel = null; render(); }
}

// Английская версия делится адресом /en/: у него свои метатеги, и превью в соцсетях тоже на английском
function enUrl() {
  const base = location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '');
  return location.protocol === 'file:' ? base + 'index.html?lang=en' : base + 'en/';
}
function share() {
  let url = (EN ? enUrl() : location.href.split('#')[0]) + '#p=' + encodeShare();
  // Если смотрят в 3D — ссылка откроет 3D с тем же ракурсом
  const o = v3.orbit, cam = v3.on && o.t;
  if (cam) url += '&v=' + [o.th, o.ph, o.r, o.t.x, o.t.y, o.t.z].map((n) => +n.toFixed(3)).concat(Object.keys(ENVS).indexOf(v3.env)).join(',');
  const done = () => toast(cam ? tr`Ссылка на проект и ракурс 3D скопирована` : tr`Ссылка на проект скопирована`);
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => { history.replaceState(null, '', url); toast(tr`Ссылка в адресной строке — скопируйте её`); });
  else { history.replaceState(null, '', url); toast(tr`Ссылка в адресной строке — скопируйте её`); }
}

// ---------- Запуск ----------
translateData();
translateDom();
$('#hint3d').textContent = HINT3D;
if (EN) Object.assign($('#langLink'), { href: location.pathname, hreflang: 'ru', lang: 'ru', title: 'Русский', textContent: 'RU' });
else $('#langLink').href = enUrl();
buildPlan();
$('#tplSel').innerHTML = `<option value="">${tr`Шаблон зала…`}</option>` + TEMPLATES.map((t) =>
  `<option value="${t.id}">${t.name} · ${tr`${fmtM(t.room[0])}×${fmtM(t.room[1])} м`}</option>`).join('');
$('#tplSel').onchange = (e) => {
  if (!e.target.value) return;
  beginChange();
  const env = TEMPLATES.find((t) => t.id === e.target.value).env;
  applyTemplate(e.target.value);
  e.target.value = '';
  render();
  if (env) setEnv(env, true);
  toast(tr`Шаблон загружен. Ctrl+Z вернёт прежний план`);
};
$('#roomL').onchange = (e) => setRoom('L', e.target.value);
$('#roomW').onchange = (e) => setRoom('W', e.target.value);
$('#roomH').onchange = (e) => setRoom('H', e.target.value);
$('#projName').onchange = (e) => { beginChange(); state.name = e.target.value.trim().slice(0, 80) || tr`Мой зал`; render(); };
for (const k of Object.keys(state.view)) {
  const b = $(`[data-view="${k}"]`);
  b.setAttribute('aria-pressed', String(state.view[k]));
  b.onclick = () => { state.view[k] = !state.view[k]; b.setAttribute('aria-pressed', String(state.view[k])); renderPlan(); build3d(); };
}
$$('[data-mode]').forEach((b) => { b.onclick = () => setView3d(b.dataset.mode === '3d'); });
$('#btnUndo').onclick = undo;
$('#btnRedo').onclick = redo;
$('#btnShare').onclick = share;
$('#btnPrint').onclick = () => window.print();
$('#btnSvg').onclick = exportPlanSvg;
$('#btnWallsSvg').onclick = exportWallsSvg;
$('#btnCsv').onclick = bomCsv;
$('#btnJson').onclick = () => download(`${fileBase()}.json`, JSON.stringify(serialize(), null, 1), 'application/json');
$('#btnOpen').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try { const o = JSON.parse(await f.text()); beginChange(); load(o); render(); toast(tr`Открыт проект «${state.name}»`); }
  catch (err) { toast(tr`Не получилось открыть: ${err.message}`); }
};
$('#palTabs').onclick = (e) => { const g = e.target.closest('[data-g]'); if (g) { palGrp = g.dataset.g; palQuery = ''; $('#palSearch').value = ''; renderPalette(); } };
$('#palSearch').oninput = (e) => { palQuery = e.target.value; renderPalette(); };
$('#palList').onclick = (e) => {
  const c = e.target.closest('[data-add]');
  if (!c) return;
  const [t, id] = c.dataset.add.split(':');
  if (t === 'm') addModule(id); else addItem(id);
  if (CAT[id]?.kind === 'kit') renderPalette();
};
$('#palList').addEventListener('dragstart', (e) => {
  const c = e.target.closest('[data-add]');
  if (c) e.dataTransfer.setData('text/plain', c.dataset.add);
});
$('#insp').addEventListener('click', onInspector);
$('#insp').addEventListener('change', onInspectorInput);
$('#checks').onclick = (e) => {
  const b = e.target.closest('[data-i]');
  const p = b && checks.list[+b.dataset.i];
  if (p && p.ids.length) { state.sel = p.ids[0]; render(); $('#plan').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
};
$('#walls').onclick = (e) => { const r = e.target.closest('[data-uid]'); if (r) { state.sel = +r.dataset.uid; render(); } };
$('#bom').addEventListener('click', onBom);
$('#bom').addEventListener('change', onBomChange);
$('#money').addEventListener('change', onMoney);
document.addEventListener('keydown', onKey);

(function init() {
  const m = location.hash.match(/#p=([\w-]+)/), v = location.hash.match(/[#&]v=([-\d.,]+)/);
  const cam = v && v[1].split(',').map(Number);
  if (cam && (cam.length === 6 || cam.length === 7) && cam.every(Number.isFinite)) v3.pendingCam = cam;
  if (m) {
    try { load(decodeShare(m[1])); history.replaceState(null, '', location.pathname + location.search); return; }
    catch (e) { v3.pendingCam = null; toast(tr`Ссылка на проект повреждена, открыт последний план`); }
  }
  if (!loadLocal()) applyTemplate('multi');
})();
renderPalette();
render();
if (v3.pendingCam) setView3d(true);

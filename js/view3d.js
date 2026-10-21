// 3D-вид: тот же проект в объёме, можно вращать. Three.js грузится с CDN только при первом открытии.
// Оси: x плана → x, y плана → z, высота → y. Единицы — метры.
const THREE_SRC = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.147.0/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
];
// Зеркало-отражатель из примеров three.js (обычный скрипт, вешает THREE.Reflector)
const REFLECTOR_SRC = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/objects/Reflector.js';
const HINT3D = tr`тяните — вращать · правая кнопка или Shift — сдвиг · колесо — масштаб · клик — выбрать · из каталога можно перетащить`;
const HINT3D_EDIT = tr`тяните предмет или человека — двигать по полу · R — повернуть · Delete — удалить · пустое место — вращать`;
const ORBIT0 = { th: -0.55, ph: 1.0 };
const v3 = {
  on: false, loading: null, renderer: null, scene: null, cam: null, root: null, walls: [], pick: [],
  env: (() => { try { const e = localStorage.getItem('lifeboost.env'); return e in ENVS ? e : 'none'; } catch (e) { return 'none'; } })(), envGroup: null,
  // Отражения в зеркалах: по умолчанию включены, на сенсорных экранах выключены (каждое зеркало рисует сцену заново)
  refl: (() => { try { const v = localStorage.getItem('lifeboost.refl'); if (v != null) return v === '1'; } catch (e) { /* нет */ } return !matchMedia('(pointer: coarse)').matches; })(),
  mats: new Map(), pendingCam: null, edit: false, personAt: null, person: null, drag: null, orbit: { th: ORBIT0.th, ph: ORBIT0.ph, r: 10, t: null }, sig: '', frame: 0,
};

function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (v3.loading) return v3.loading;
  const tryLoad = (i) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = THREE_SRC[i];
    s.onload = res;
    s.onerror = () => { s.remove(); i + 1 < THREE_SRC.length ? tryLoad(i + 1).then(res, rej) : rej(new Error(tr`нет связи с CDN`)); };
    document.head.appendChild(s);
  });
  // Без отражателя всё работает, просто зеркала будут матовыми
  const refl = () => new Promise((res) => {
    const s = document.createElement('script');
    s.src = REFLECTOR_SRC;
    s.onload = res;
    s.onerror = () => { s.remove(); res(); };
    document.head.appendChild(s);
  });
  return (v3.loading = tryLoad(0).then(refl).catch((e) => { v3.loading = null; throw e; }));
}

function setView3d(on) {
  v3.on = on;
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.mode === '3d') === on)));
  $('.plan-wrap').classList.toggle('is3d', on);
  $('#view3d').hidden = !on;
  $('#planHint').hidden = on;
  $('#hint3d').hidden = !on;
  if (!on) return;
  loadThree().then(() => { if (!v3.renderer) init3d(); build3d(); }, (e) => {
    toast(tr`3D не загрузился: ${e.message}`);
    setView3d(false);
  });
}

function init3d() {
  const box = $('#view3d');
  v3.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  v3.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  box.prepend(v3.renderer.domElement);
  v3.scene = new THREE.Scene();
  v3.cam = new THREE.PerspectiveCamera(42, 1, 0.05, 300);
  v3.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a918f, 0.85));
  v3.sun = new THREE.DirectionalLight(0xffffff, 0.5);
  v3.scene.add(v3.sun, v3.sun.target);
  new ResizeObserver(fit3d).observe(box);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => v3.on && build3d());
  bindOrbit(v3.renderer.domElement);
  const envSel = $('#env3d');
  // Сцены — готовые залы со своим окружением: загружают план целиком (Ctrl+Z вернёт прежний)
  envSel.innerHTML = `<optgroup label="${tr`Окружение`}">` + Object.entries(ENVS).map(([k, e]) => `<option value="${k}">${e.name}</option>`).join('') + '</optgroup>' +
    `<optgroup label="${tr`Сцены`}">` + TEMPLATES.filter((t) => t.env).map((t) => `<option value="tpl:${t.id}">${t.name}</option>`).join('') + '</optgroup>';
  envSel.value = v3.env;
  envSel.onchange = () => {
    const v = envSel.value;
    if (v.startsWith('tpl:')) return loadScene(v.slice(4));
    setEnv(v, true);
    // Своё окружение на чужом зале: подскажем, где оригинал
    const scene = TEMPLATES.find((t) => t.env === v);
    if (scene && !TEMPLATES.some((t) => t.env === v && t.name === state.name)) toast(tr`Это ваш зал в окружении «${ENVS[v].name}». Оригинал — в списке, раздел «Сцены»`);
  };
  box.querySelector('[data-cam="refl"]').setAttribute('aria-pressed', String(v3.refl));
  box.querySelector('.v3-tools').onclick = (e) => {
    const b = e.target.closest('[data-cam]');
    if (!b) return;
    const o = v3.orbit, k = b.dataset.cam;
    if (k === 'png') return snapshot3d();
    if (k === 'share') return share();
    if (k === 'refl') {
      v3.refl = !v3.refl;
      b.setAttribute('aria-pressed', String(v3.refl));
      try { localStorage.setItem('lifeboost.refl', v3.refl ? '1' : '0'); } catch (e) { /* без сохранения */ }
      return build3d();
    }
    if (k === 'edit') { v3.edit = !v3.edit; b.setAttribute('aria-pressed', String(v3.edit)); $('#hint3d').textContent = v3.edit ? HINT3D_EDIT : HINT3D; return; }
    if (k === 'top') { o.th = 0; o.ph = 0.02; }
    if (k === 'front') { o.th = 0; o.ph = 1.35; }
    if (k === 'home') { o.th = ORBIT0.th; o.ph = ORBIT0.ph; }
    if (k === 'inside') return lookInside();
    resetTarget();
    draw3d();
  };
}
function fit3d() {
  const c = v3.renderer.domElement, box = $('#view3d');
  const w = box.clientWidth, h = box.clientHeight;
  if (!w || !h) return;
  v3.renderer.setSize(w, h, false);
  c.style.width = '100%'; c.style.height = '100%';
  v3.cam.aspect = w / h;
  v3.cam.updateProjectionMatrix();
  draw3d();
}
function resetTarget() {
  const { L, W, H } = state.room;
  v3.orbit.t = new THREE.Vector3(L / 200, Math.min(H / 100, 4) * 0.25, W / 200);
  v3.orbit.r = Math.max(L, W) / 100 * 1.45 + H / 100 * 1.3;
  if (v3.orbit.ph > 1.52) v3.orbit.ph = ORBIT0.ph;
}
// Сцена: шаблон со своим окружением, сразу в 3D и с общим видом
function loadScene(id, quiet) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return;
  if (!quiet) beginChange();
  applyTemplate(id);
  if (t.env) { v3.env = t.env; v3.showcase = true; }
  render();
  if (v3.on) build3d(); else setView3d(true);
  if (!quiet) toast(tr`Загружена сцена «${t.name}». Ctrl+Z вернёт прежний план`);
}
// Окружение: выбор сохраняется у зрителя; при смене камера отъезжает, чтобы было видно, где зал
function setEnv(k, showcase) {
  v3.env = k in ENVS ? k : 'none';
  try { localStorage.setItem('lifeboost.env', v3.env); } catch (e) { /* без сохранения */ }
  if ($('#env3d')) $('#env3d').value = v3.env;
  if (showcase && v3.orbit.t) {
    resetTarget();
    const o = v3.orbit;
    o.th = ORBIT0.th;
    if (v3.env === 'tower') { o.r *= 4.5; o.ph = 1.2; } else if (v3.env === 'raft') { o.th = 2.3; o.r *= 1.25; o.ph = 1.18; } else if (v3.env !== 'none') { o.r *= 1.8; o.ph = 1.12; } else o.ph = ORBIT0.ph;
  }
  build3d();
}
// Взгляд изнутри: камера на высоте глаз; дальше тянуть — оглядываться, правой кнопкой — ходить
function lookInside() {
  const { L, W } = state.room, o = v3.orbit;
  if (ENVS[v3.env].open) {
    // На плоту: с носа открытой палубы на корму, где спальный отсек и верхняя палуба
    const x = Math.max(L / 100 - 1, L / 200), z = Math.max(W / 100 - 0.8, W / 200);
    o.t = new THREE.Vector3(x, 1.6, z);
    o.r = 0.05; o.th = Math.atan2(x, z - W / 200); o.ph = Math.PI / 2 + 0.1;
    return draw3d();
  }
  // Из угла стен В и Г по диагонали на угол А–Б: там панорамные окна
  o.t = new THREE.Vector3(Math.min(1.2, L / 200), 1.6, Math.max(W / 100 - 1.2, W / 200));
  o.r = 0.05; o.th = -Math.atan2(L / 100, W / 100); o.ph = Math.PI / 2 + 0.08;
  draw3d();
}
const PH_LIM = () => (v3.orbit.r < 1.2 ? [0.25, 2.85] : [0.02, 1.52]);
const R_MAX = () => ENVS[v3.env].rMax;

// ---------- Материалы: цвета берём из тех же токенов, что и у плана ----------
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!v3.mats.has(key)) {
    const M = o.basic ? THREE.MeshBasicMaterial : o.shiny ? THREE.MeshPhongMaterial : THREE.MeshLambertMaterial;
    const m = new M({ color: new THREE.Color(color), transparent: o.op != null, opacity: o.op ?? 1, side: o.both ? THREE.DoubleSide : THREE.FrontSide });
    if (o.op != null && o.op < 0.5) m.depthWrite = false;
    if (o.shiny) m.shininess = 90;
    v3.mats.set(key, m);
  }
  return v3.mats.get(key);
}
const discColor = (c) => cssVar(DISC[c.disc].color.slice(4, -1));
const METAL = '#3E4648', WOOD = '#B98A55', ROPE = '#C8A96E';

// Коробка по габаритам: ширина × высота × глубина, y0 — низ
function box3(parent, w, h, d, x, y0, z, m) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.005), Math.max(h, 0.005), Math.max(d, 0.005)), m);
  o.position.set(x, y0 + h / 2, z);
  parent.add(o);
  return o;
}
function cyl(parent, r, len, axis, x, y, z, m) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), m);
  if (axis === 'x') o.rotation.z = Math.PI / 2;
  if (axis === 'z') o.rotation.x = Math.PI / 2;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

// ---------- Сцена ----------
function build3d() {
  if (!v3.renderer || !v3.on) return;
  const { L, W, H } = state.room, l = L / 100, w = W / 100, h = H / 100;
  const sig = `${L}x${W}x${H}`;
  if (v3.pendingCam) {
    // Ракурс из ссылки
    const [th, ph, r, x, y, z] = v3.pendingCam;
    if (v3.pendingCam[6] != null) v3.env = Object.keys(ENVS)[v3.pendingCam[6]] || 'none';
    const rr = clamp(r, 0.05, R_MAX());
    Object.assign(v3.orbit, { th, ph: clamp(ph, ...(rr < 1.2 ? [0.25, 2.85] : [0.02, 1.52])), r: rr, t: new THREE.Vector3(x, y, z) });
    if ($('#env3d')) $('#env3d').value = v3.env;
    v3.pendingCam = null;
    v3.sig = sig;
  } else if (sig !== v3.sig || !v3.orbit.t) { v3.sig = sig; resetTarget(); }
  if (v3.showcase) { v3.showcase = false; return setEnv(v3.env, true); }
  if (v3.root) {
    v3.scene.remove(v3.root);
    v3.root.traverse((o) => { if (o.isReflector) o.dispose(); o.geometry?.dispose(); o.material?.map?.dispose(); if (o.isSprite) o.material.dispose(); });
  }
  for (const m of v3.mats.values()) m.dispose();
  v3.mats.clear();
  // Окружение строится один раз на зал и вид; перетаскивание предметов его не трогает
  const E = ENVS[v3.env], envSig = `${v3.env}:${sig}`;
  if (v3.envGroup && v3.envGroup.userData.sig !== envSig) { v3.scene.remove(v3.envGroup); disposeEnv(v3.envGroup); v3.envGroup = null; }
  if (v3.env !== 'none' && !v3.envGroup) {
    v3.envGroup = buildEnv(v3.env, l, w, h);
    v3.envGroup.userData.sig = envSig;
    v3.scene.add(v3.envGroup);
  }
  v3.scene.background = new THREE.Color(E.sky ? E.sky[1] : cssVar('--plan-bg'));
  v3.scene.fog = E.fog ? new THREE.Fog(E.fog[0], E.fog[1], E.fog[2]) : null;
  v3.cam.far = E.sky ? 12000 : 300;
  v3.cam.updateProjectionMatrix();
  const root = v3.root = new THREE.Group();
  v3.scene.add(root);
  v3.pick = [];

  // Пол, сетка 1 м, стены и контур потолка
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(l, w), mat(cssVar('--surface-2')));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(l / 2, -0.002, w / 2);
  root.add(floor);
  const pts = [];
  for (let x = 1; x < l; x++) pts.push(x, 0.001, 0, x, 0.001, w);
  for (let z = 1; z < w; z++) pts.push(0, 0.001, z, l, 0.001, z);
  root.add(lines(pts, cssVar('--line')));
  const T = WALL_T / 100, glaze = E.glaze || [];
  v3.walls = [
    wall3d(root, l + 2 * T, h, l / 2, -T / 2, 0, E.open ? 'rail' : glaze.includes(0)),
    wall3d(root, w + 2 * T, h, l + T / 2, w / 2, Math.PI / 2, E.open ? 'rail' : glaze.includes(1)),
    wall3d(root, l + 2 * T, h, l / 2, w + T / 2, 0, E.open ? 'rail' : glaze.includes(2)),
    wall3d(root, w + 2 * T, h, -T / 2, w / 2, Math.PI / 2, E.open ? 'rail' : glaze.includes(3)),
  ];
  // Вода зеркалом: отражает небо, облака, берега и плот
  if (E.water != null && v3.refl && THREE.Reflector) {
    const sz = v3.renderer.getDrawingBufferSize(new THREE.Vector2());
    const wm = mirrorMesh(900, 900, Math.round(clamp(sz.x / 2, 256, 1024)), Math.round(clamp(sz.y / 2, 256, 1024)));
    wm.material.uniforms.color.value = new THREE.Color(0x8a979c);
    wm.rotation.x = -Math.PI / 2;
    wm.position.set(l / 2, E.water + 0.02, w / 2);
    root.add(wm);
    // Тёмная речная вода: зеркало приглушено полупрозрачным слоем (снизу его не видно)
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x1c2a30, transparent: true, opacity: 0.5, depthWrite: false }));
    dark.rotation.x = -Math.PI / 2;
    dark.position.set(l / 2, E.water + 0.03, w / 2);
    v3.mats.set('water', dark.material);
    root.add(dark);
  }
  if (!E.open) root.add(lines([0, h, 0, l, h, 0, l, h, 0, l, h, w, l, h, w, 0, h, w, 0, h, w, 0, h, 0], cssVar('--muted')));
  [[l / 2, -0.5], [l + 0.5, w / 2], [l / 2, w + 0.5], [-0.5, w / 2]].forEach(([x, z], i) => {
    const s = letter(WALL_NAMES[i]);
    s.position.set(x, 0.3, z);
    s.userData.letter = true;
    root.add(s);
  });

  // Предметы
  const sel = new Set(members(byUid(state.sel)).map((i) => i.uid));
  for (const it of state.items) {
    const c = CAT[it.id];
    const b = body(it), g = new THREE.Group();
    g.position.set((b.x + b.w / 2) / 100, 0, (b.y + b.h / 2) / 100);
    g.rotation.y = -it.rot * Math.PI / 180;
    g.userData.uid = it.uid;
    // Плоское на стене (зеркало, окно, дверь) прячется вместе со своей стеной, чтобы не загораживать зал
    if (c.flat || c.kind === 'door') g.userData.side = it.rot / 90;
    buildItem(g, it, c, h);
    root.add(g);
    g.traverse((o) => { if (o.isMesh) { o.userData.uid = it.uid; v3.pick.push(o); } });
    const sev = checks.worst.get(it.uid);
    if (sel.has(it.uid) || sev === 'bad') {
      const bb = new THREE.Box3().setFromObject(g).expandByScalar(0.03);
      root.add(new THREE.Box3Helper(bb, new THREE.Color(cssVar(sel.has(it.uid) ? '--accent' : '--bad'))));
    }
    if (state.view.zones && hasZone(it)) {
      const z = zone(it), col = discColor(c), y = c.kind === 'floor' ? 0.02 : 0.025;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(z.w / 100, z.h / 100), mat(col, { basic: true, op: 0.13, both: true }));
      pl.rotation.x = -Math.PI / 2;
      pl.position.set((z.x + z.w / 2) / 100, y, (z.y + z.h / 2) / 100);
      root.add(pl);
      const x0 = z.x / 100, z0 = z.y / 100, x1 = x0 + z.w / 100, z1 = z0 + z.h / 100;
      root.add(lines([x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0], col, 0.6));
    }
  }
  buildPerson(root);
  v3.sun.position.set(l * 0.3, h * 3 + 4, -w * 0.4);
  v3.sun.target.position.set(l / 2, 0, w / 2);
  draw3d();
}
// Зеркало. Стандартный THREE.Reflector отсекает зазеркалье наклонной ближней плоскостью камеры,
// а она искажает дальнюю: издалека и сверху в отражении пропадали пол и всё ниже какой-то высоты.
// Здесь камера отражения обычная, а зазеркалье срезается плоскостью отсечения рендера.
function mirrorMesh(w, h, tw, th) {
  const sh = THREE.Reflector.ReflectorShader, rt = new THREE.WebGLRenderTarget(tw, th, { samples: 4 });
  const material = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(sh.uniforms), vertexShader: sh.vertexShader, fragmentShader: sh.fragmentShader });
  material.uniforms.tDiffuse.value = rt.texture;
  material.uniforms.color.value = new THREE.Color(0xdfe6e8);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.isReflector = true;
  mesh.dispose = () => { rt.dispose(); material.dispose(); };
  const vc = new THREE.PerspectiveCamera(), plane = new THREE.Plane(), n = new THREE.Vector3(), mp = new THREE.Vector3(), cp = new THREE.Vector3();
  const rot = new THREE.Matrix4(), look = new THREE.Vector3(), view = new THREE.Vector3(), target = new THREE.Vector3();
  const tm = material.uniforms.textureMatrix.value = new THREE.Matrix4();
  // Отражение рисуется до основного кадра (см. draw3d): вложенный рендер посреди кадра сбивал бы ему отсечение
  mesh.userData.update = (renderer, scene, camera) => {
    mp.setFromMatrixPosition(mesh.matrixWorld);
    cp.setFromMatrixPosition(camera.matrixWorld);
    rot.extractRotation(mesh.matrixWorld);
    n.set(0, 0, 1).applyMatrix4(rot);
    view.subVectors(mp, cp);
    if (view.dot(n) > 0) return; // смотрим на зеркало сзади
    view.reflect(n).negate().add(mp);
    rot.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rot).add(cp);
    target.subVectors(mp, look).reflect(n).negate().add(mp);
    vc.position.copy(view);
    vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(n);
    vc.lookAt(target);
    vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse).multiply(mesh.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(n, mp);
    plane.constant += 0.003;
    // В отражении зал целиком: стены и то, что на них, видны, даже если основная камера их прячет
    const shown = v3.walls.filter((m) => !m.visible).concat(v3.root.children.filter((o) => o.userData.side != null && !o.visible));
    for (const o of shown) o.visible = true;
    mesh.visible = false;
    const cur = renderer.getRenderTarget(), clip = renderer.clippingPlanes, sh2 = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.clippingPlanes = [plane];
    renderer.setRenderTarget(rt);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(cur);
    renderer.clippingPlanes = clip;
    renderer.shadowMap.autoUpdate = sh2;
    mesh.visible = true;
    for (const o of shown) o.visible = false;
  };
  return mesh;
}
// Стена: сплошная или панорамное остекление (подоконник, стекло с импостами, перемычка)
function wall3d(root, len, h, x, z, rot, glass) {
  const g = new THREE.Group(), T = WALL_T / 100, wm = mat(cssVar('--line'));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  root.add(g);
  if (glass === 'rail') {
    // Под открытым небом: низкий бортик из красных труб, как у рамы плота
    const pm = mat('#b9502f', { shiny: true }), k = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= k; i++) cyl(g, 0.025, 0.45, 'y', -len / 2 + i * len / k, 0.225, 0, pm);
    cyl(g, 0.025, len, 'x', 0, 0.45, 0, pm);
    return g;
  }
  if (!glass) { box3(g, len, h, T, 0, 0, 0, wm); return g; }
  const sill = 0.35, lintel = Math.min(0.4, h * 0.12), gh = h - sill - lintel;
  box3(g, len, sill, T, 0, 0, 0, wm);
  box3(g, len, lintel, T, 0, h - lintel, 0, wm);
  box3(g, len - 0.02, gh, 0.02, 0, sill, 0, mat('#a8d0e6', { op: 0.18, shiny: true }));
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) box3(g, 0.06, gh, T * 0.8, -len / 2 + 0.03 + i * (len - 0.06) / n, sill, 0, mat('#5d6669'));
  return g;
}
function lines(pts, color, op) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: op != null, opacity: op ?? 1 });
  v3.mats.set('line' + v3.mats.size, m);
  return new THREE.LineSegments(geo, m);
}
function letter(t, size = 0.45, px = 44) {
  const cv = document.createElement('canvas'), x = cv.getContext('2d'), font = `600 ${px}px "Segoe UI", system-ui, sans-serif`;
  x.font = font;
  cv.width = Math.max(64, Math.ceil(x.measureText(t).width + 16));
  cv.height = 64;
  x.font = font;
  x.fillStyle = cssVar('--muted');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(t, cv.width / 2, 35);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
  s.scale.set(size * cv.width / 64, size, 1);
  return s;
}

// ---------- Человек 175 см для масштаба: одна рука поднята, кончики пальцев на 2,25 м ----------
function personSpot() {
  const { L, W } = state.room;
  const solid = state.items.filter((i) => !['floor', 'ceil'].includes(CAT[i.id].kind)).map(body);
  const zones = state.items.filter(hasZone).map(zone);
  let best = [L / 2, W / 2], bd = Infinity;
  for (let y = 40; y <= W - 40; y += 20) for (let x = 40; x <= L - 40; x += 20) {
    const r = rect(x - 30, y - 20, 60, 40);
    if (solid.some((b) => inter(b, r))) continue;
    // Лучше в проходе, вне зон безопасности, поближе к середине зала
    const d = Math.hypot(x - L / 2, y - W / 2) + (zones.some((z) => inter(z, r)) ? 1e5 : 0);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}
function buildPerson(root) {
  const g = new THREE.Group(), m = mat(cssVar('--muted'));
  const cap = (r, len, x, y, z = 0) => {
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  for (const x of [-0.09, 0.09]) cap(0.065, 0.74, x, 0.016 + 0.065 + 0.37);
  cap(0.14, 0.36, 0, 1.2).scale.z = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), m);
  head.position.set(0, 1.645, 0);
  g.add(head);
  cap(0.045, 0.56, 0.19, 1.15);
  cap(0.045, 0.68, -0.19, 1.48 + 0.385);
  const { L, W } = state.room;
  const [x, y] = v3.personAt ? [clamp(v3.personAt[0], 25, L - 25), clamp(v3.personAt[1], 25, W - 25)] : personSpot();
  g.position.set(x / 100, 0, y / 100);
  g.rotation.y = v3.orbit.th;
  const t = letter(tr`1,75 м`, 0.22, 36);
  t.position.set(0.42, 1.75, 0);
  g.add(t);
  g.traverse((o) => { if (o.isMesh) { o.userData.person = true; v3.pick.push(o); } });
  v3.person = g;
  root.add(g);
}

// Один предмет в локальных осях: x вдоль ширины, z вдоль глубины, «верх» плана (стена) — z = −d/2
function buildItem(g, it, c, H) {
  const w = it.w / 100, d = it.d / 100, hg = (c.hgt || 0) / 100, col = discColor(c);
  const m = mat(col), metal = mat(METAL), back = -d / 2;
  const base = c.kind === 'floor' ? 0 : 0.016;
  const [e0, eh] = (c.elev || [0, hg * 100]).map((v) => v / 100);
  switch (c.kind) {
    case 'floor': {
      const k = { tatami: '--fl-tatami-l', rubber: '--fl-rubber-d', hard: '--fl-hard-l' }[c.ft];
      box3(g, w, 0.015, d, 0, 0, 0, mat(cssVar(k)));
      return;
    }
    case 'mat':
      box3(g, w, Math.max(hg, 0.012), d, 0, base, 0, m);
      if (it.id === 'airfloor') for (let x = -w / 2 + 0.25; x < w / 2 - 0.1; x += 0.25) box3(g, 0.012, 0.004, d - 0.1, x, base + hg, 0, mat(cssVar('--surface'), { op: 0.5 }));
      if (it.id === 'airtrack') box3(g, w - 0.24, 0.004, d - 0.24, 0, base + hg, 0, mat(cssVar('--surface'), { op: 0.35 }));
      return;
    case 'ceil': {
      box3(g, 0.2, 0.03, 0.2, 0, H - 0.03, 0, metal);
      if (it.id === 'rope') cyl(g, 0.02, H - 0.45, 'y', 0, 0.45 + (H - 0.45) / 2, 0, mat(ROPE));
      if (it.id === 'silks') for (const x of [-0.06, 0.06]) box3(g, 0.07, H - 0.12, 0.008, x, 0.1, 0, mat(col, { both: true, op: 0.85 }));
      if (it.id === 'hoop') {
        const cy = 1.4 + 0.45;
        for (const x of [-0.1, 0.1]) cyl(g, 0.008, H - cy - 0.45, 'y', x, cy + 0.45 + (H - cy - 0.45) / 2, 0, mat(ROPE));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.018, 10, 48), metal);
        ring.position.set(0, cy, 0);
        g.add(ring);
      }
      return;
    }
    case 'obst':
      box3(g, w, H, d, 0, 0, 0, mat(cssVar('--line')));
      return;
    case 'door':
      box3(g, w, eh, 0.04, 0, e0, back + 0.02, mat('#8A6A4C'));
      cyl(g, 0.015, 0.12, 'x', w / 2 - 0.12, 1.0, back + 0.07, metal);
      return;
  }
  if (c.kind === 'wall') return buildWall(g, it, c, w, d, e0, eh, m, metal, back);
  buildEquip(g, it, c, w, d, hg, base, m, metal);
}

function buildWall(g, it, c, w, d, e0, eh, m, metal, back) {
  switch (it.id) {
    case 'mirror': {
      if (!(v3.refl && THREE.Reflector)) { box3(g, w, eh, 0.02, 0, e0, back + 0.01, mat('#BFD8E2', { shiny: true })); return; }
      // Настоящее отражение: плоскость смотрит в зал (+z в осях предмета), вокруг тонкая рамка
      const fr = mat('#9aa6a8'), t = 0.025;
      box3(g, w, t, 0.03, 0, e0, back + 0.015, fr);
      box3(g, w, t, 0.03, 0, e0 + eh - t, back + 0.015, fr);
      for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) box3(g, t, eh, 0.03, x, e0, back + 0.015, fr);
      const tw = Math.round(clamp(w * 320, 256, 2048)), th = Math.round(clamp(eh * 320, 256, 1024));
      const r = mirrorMesh(w - 2 * t, eh - 2 * t, tw, th);
      r.position.set(0, e0 + eh / 2, back + 0.012);
      g.add(r);
      return;
    }
    case 'window': box3(g, w, eh, 0.03, 0, e0, back + 0.015, mat('#9CCBF2', { op: 0.5, shiny: true })); return;
    case 'wallbars': {
      const z = back + 0.08, n = Math.round(eh / 0.22);
      for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) box3(g, 0.05, eh, 0.06, x, e0, z, mat(WOOD));
      for (let i = 1; i <= n; i++) cyl(g, 0.018, w - 0.06, 'x', 0, e0 + i * eh / (n + 0.4), z, mat(WOOD));
      return;
    }
    case 'barre':
      for (const y of [0.8, 1.1]) cyl(g, 0.02, w, 'x', 0, y, back + 0.3, mat(WOOD));
      for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) box3(g, 0.04, 0.5, 0.3, x, 0.7, back + 0.15, metal);
      return;
    case 'homebar': case 'wallrig': {
      const y = e0 + eh * 0.6, zf = back + d - 0.05;
      cyl(g, 0.016, w, 'x', 0, y, zf, metal);
      const xs = it.id === 'wallrig' ? [-w / 2 + 0.05, 0, w / 2 - 0.05] : [-w / 2 + 0.05, w / 2 - 0.05];
      for (const x of xs) box3(g, 0.05, 0.05, d, x, y - 0.025, 0, m);
      if (it.id === 'wallrig') for (const x of [-0.6, 0.6]) {
        cyl(g, 0.01, y - 1.75, 'y', x, 1.75 + (y - 1.75) / 2, zf, mat(ROPE));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 8, 28), mat(WOOD));
        ring.position.set(x, 1.64, zf);
        g.add(ring);
      }
      return;
    }
    case 'wallball': {
      box3(g, w, eh, 0.03, 0, e0, back + 0.015, m);
      box3(g, w * 0.6, eh * 0.4, 0.035, 0, e0 + eh * 0.3, back + 0.018, mat(cssVar('--surface')));
      return;
    }
    case 'yogawall':
      box3(g, w, eh, 0.03, 0, e0, back + 0.015, mat(WOOD));
      for (let i = 0; i < 4; i++) cyl(g, 0.012, 1.0, 'y', -w / 2 + 0.25 + i * (w - 0.5) / 3, 1.6, back + 0.06, m);
      return;
    case 'bench':
      box3(g, w, 0.45, d, 0, 0.016, 0, mat(WOOD));
      box3(g, w, eh - 0.45, 0.03, 0, 0.45, back + 0.015, mat(cssVar('--c-base')));
      return;
    default:
      box3(g, w, eh, d, 0, e0, 0, it.id === 'storage' ? mat(cssVar('--c-base')) : m);
  }
}

function buildEquip(g, it, c, w, d, hg, base, m, metal) {
  switch (it.id) {
    case 'rig': {
      const n = 4, zs = [-d / 2 + 0.04, d / 2 - 0.04];
      for (let i = 0; i <= n; i++) {
        const x = -w / 2 + 0.04 + i * (w - 0.08) / n;
        for (const z of zs) box3(g, 0.08, hg, 0.08, x, base, z, m);
        cyl(g, 0.016, d, 'z', x, hg - 0.06, 0, metal);
      }
      for (const z of zs) box3(g, w, 0.08, 0.08, 0, hg - 0.08, z, m);
      return;
    }
    case 'rack': {
      for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) for (const z of [-d / 2 + 0.05, d / 2 - 0.25]) box3(g, 0.07, hg, 0.07, x, base, z, m);
      for (const z of [-d / 2 + 0.05, d / 2 - 0.25]) box3(g, w - 0.43, 0.07, 0.07, 0, hg - 0.07, z, m);
      cyl(g, 0.014, 2.2, 'x', 0, 1.4, d / 2 - 0.25, metal);
      for (const x of [-0.9, 0.9]) cyl(g, 0.225, 0.08, 'x', x, 1.4, d / 2 - 0.25, mat('#2A2F31'));
      return;
    }
    case 'minitramp': {
      const bed = box3(g, w, 0.08, d, 0, 0.3, 0, m);
      bed.rotation.z = 0.3;
      box3(g, 0.06, 0.32, d, -w / 2 + 0.1, base, 0, metal);
      return;
    }
    case 'olytramp': {
      // Рама с синими накладками, тёмная сетка на 1,155 м, по две пары ног
      const top = 1.155, pad = 0.38, m2 = mat('#2f5fa8');
      box3(g, w - 2 * pad, 0.01, d - 2 * pad, 0, top - 0.06, 0, mat('#2a2d30'));
      for (const z of [-d / 2 + pad / 2, d / 2 - pad / 2]) box3(g, w, 0.08, pad, 0, top - 0.08, z, m2);
      for (const x of [-w / 2 + pad / 2, w / 2 - pad / 2]) box3(g, pad, 0.08, d - 2 * pad, x, top - 0.08, 0, m2);
      for (const x of [-w / 2 + 0.5, -w / 6, w / 6, w / 2 - 0.5]) for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) box3(g, 0.06, top - 0.1, 0.06, x, base, z, metal);
      for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) box3(g, w - 0.9, 0.05, 0.05, 0, 0.25, z, metal);
      return;
    }
    case 'mookjong': {
      // Ствол на двух рейках между стойками рамы; руки и нога смотрят вперёд (+z)
      const wood = mat('#8a5a2b'), dark = mat('#5e3d1e');
      box3(g, w, 0.06, d, 0, base, 0, dark);
      for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) box3(g, 0.08, hg - 0.06, 0.08, x, base + 0.06, 0, dark);
      for (const y of [0.55, 1.5]) box3(g, w - 0.1, 0.05, 0.08, 0, y, 0, dark);
      cyl(g, 0.115, 1.45, 'y', 0, 0.3 + 0.725, 0, wood);
      const arm = (x, y, yaw, len, pitch = 0) => {
        const o = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, len, 10), wood);
        o.geometry.translate(0, len / 2, 0);
        o.rotation.set(Math.PI / 2 - pitch, yaw, 0, 'YXZ');
        o.position.set(x, y, 0.08);
        g.add(o);
      };
      arm(-0.06, 1.33, -0.35, 0.55); arm(0.06, 1.33, 0.35, 0.55); arm(0, 1.1, 0, 0.5);
      arm(0, 0.65, 0, 0.55, -0.6);
      return;
    }
    case 'canes':
      for (const x of [-0.18, 0.18]) {
        cyl(g, 0.02, hg, 'y', x, base + hg / 2, 0, metal);
        box3(g, 0.12, 0.05, 0.1, x, base + hg, 0, m);
      }
      return;
    case 'rower':
      box3(g, w * 0.75, 0.12, 0.14, -w * 0.1, 0.25, 0, metal);
      box3(g, w * 0.25, 0.5, d * 0.8, w / 2 - w * 0.13, base, 0, m);
      return;
    case 'plyo':
      box3(g, w, hg, d, 0, base, 0, mat(WOOD));
      return;
    case 'platform':
      box3(g, w, hg, d, 0, base, 0, mat('#2A2F31'));
      box3(g, w * 0.5, 0.004, d, 0, base + hg, 0, mat(WOOD));
      return;
    case 'kbrack': case 'dbrack':
      box3(g, w, hg, d, 0, base, 0, metal);
      for (let i = 0; i < 5; i++) box3(g, w / 7, 0.14, d * 0.7, -w / 2 + w / 7 * (i + 0.8), base + hg, 0, m);
      return;
    default:
      box3(g, w, hg || 0.3, d, 0, base, 0, m);
  }
}

// ---------- Камера: вращение, сдвиг, масштаб, выбор кликом ----------
function draw3d() {
  if (!v3.renderer || v3.frame) return;
  v3.frame = requestAnimationFrame(() => {
    v3.frame = 0;
    const o = v3.orbit, { L, W } = state.room;
    if (!o.t) return;
    const s = Math.sin(o.ph);
    v3.cam.position.set(o.t.x + o.r * s * Math.sin(o.th), o.t.y + o.r * Math.cos(o.ph), o.t.z + o.r * s * Math.cos(o.th));
    v3.cam.lookAt(o.t);
    // Стена между камерой и залом прячется
    const p = v3.cam.position, l = L / 100, w = W / 100;
    const hide = [p.z < 0, p.x > l, p.z > w, p.x < 0];
    v3.walls.forEach((m, i) => { m.visible = !hide[i] || o.ph < 0.15; });
    // Изнутри видно ближе, снаружи — до горизонта
    const nearC = o.r < 1.2 ? 0.05 : 0.3;
    if (v3.cam.near !== nearC) { v3.cam.near = nearC; v3.cam.updateProjectionMatrix(); }
    for (const g of v3.root.children) {
      if (g.userData.side != null) g.visible = v3.walls[g.userData.side].visible;
      if (g.userData.letter) g.visible = o.r >= 1.2;
    }
    renderMirrors();
    v3.renderer.render(v3.scene, v3.cam);
  });
}
// Видимые зеркала обновляют своё отражение перед кадром
function renderMirrors() {
  const list = [];
  v3.root.traverseVisible((o) => { if (o.isReflector && o.userData.update) list.push(o); });
  if (!list.length) return;
  v3.scene.updateMatrixWorld();
  v3.cam.updateMatrixWorld();
  for (const m of list) m.userData.update(v3.renderer, v3.scene, v3.cam);
}
function bindOrbit(cv) {
  const ptrs = new Map();
  let start = null, pinch = 0, moved = false;
  const tip = $('#tip3d');
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // Перетаскивание из каталога: кольцо показывает, куда встанет, по отпусканию — как на плане
  const floorAt = (e) => {
    const p = planePoint(e, new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const { L, W } = state.room;
    return p && p.x > -50 && p.y > -50 && p.x < L + 50 && p.y < W + 50 ? p : null;
  };
  cv.addEventListener('dragover', (e) => {
    e.preventDefault();
    const p = floorAt(e);
    if (!v3.dropMark) {
      v3.dropMark = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar('--accent')), transparent: true, opacity: 0.85, depthTest: false }));
      v3.dropMark.rotation.x = -Math.PI / 2;
      v3.dropMark.renderOrder = 10;
      v3.scene.add(v3.dropMark);
    }
    v3.dropMark.visible = !!p;
    if (p) v3.dropMark.position.set(p.x / 100, 0.03, p.y / 100);
    draw3d();
  });
  const hideMark = () => { if (v3.dropMark) { v3.dropMark.visible = false; draw3d(); } };
  cv.addEventListener('dragleave', hideMark);
  cv.addEventListener('drop', (e) => {
    e.preventDefault();
    hideMark();
    const v = e.dataTransfer.getData('text/plain'), p = floorAt(e) || undefined;
    if (/^m:/.test(v)) addModule(v.slice(2), p); else if (/^i:/.test(v)) addItem(v.slice(2), p);
  });
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = { x: e.clientX, y: e.clientY };
    moved = false;
    pinch = 0;
    tip.hidden = true;
    v3.drag = null;
    if (v3.edit && e.button === 0 && !e.shiftKey && ptrs.size === 1) startDrag(e);
  });
  cv.addEventListener('pointermove', (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) return hover(e);
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    prev.x = e.clientX; prev.y = e.clientY;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) moved = true;
    if (v3.drag && ptrs.size === 1) { if (moved) dragTo(e); return; }
    v3.drag = null;
    const o = v3.orbit;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) o.r = clamp(o.r * pinch / dist, 0.05, R_MAX());
      pinch = dist;
    } else if (e.buttons & 2 || e.buttons & 4 || e.shiftKey) {
      const k = o.r / cv.clientHeight * 0.9;
      const right = new THREE.Vector3().setFromMatrixColumn(v3.cam.matrix, 0);
      const fwd = new THREE.Vector3(-Math.sin(o.th), 0, -Math.cos(o.th));
      o.t.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k);
    } else {
      o.th -= dx * 0.008;
      o.ph = clamp(o.ph - dy * 0.008, ...PH_LIM());
    }
    draw3d();
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    const dr = v3.drag;
    v3.drag = null;
    if (!moved && e.type === 'pointerup' && e.button === 0) {
      const hit = pickHit(e), uid = hit && !hit.object.userData.person ? hit.object.userData.uid : null;
      if (dr?.list) return; // выделение уже сделано в startDrag
      state.sel = uid;
      render();
    }
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', () => { tip.hidden = true; });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const o = v3.orbit;
    o.r = clamp(o.r * Math.exp(e.deltaY * 0.001), 0.05, R_MAX());
    o.ph = clamp(o.ph, ...PH_LIM());
    draw3d();
  }, { passive: false });

  function hover(e) {
    const hit = pickHit(e), person = hit?.object.userData.person;
    const it = hit && !person && byUid(hit.object.userData.uid);
    cv.style.cursor = !hit ? 'grab' : v3.edit ? 'move' : 'pointer';
    if (!it && !person) { tip.hidden = true; return; }
    const r = cv.getBoundingClientRect();
    tip.textContent = person ? tr`Человек 1,75 м, рука вверх — 2,25 м` : CAT[it.id].name;
    tip.style.left = `${e.clientX - r.left + 14}px`;
    tip.style.top = `${e.clientY - r.top + 14}px`;
    tip.hidden = false;
  }
}

// ---------- Редактирование: предмет или человек едет по горизонтальной плоскости на высоте точки захвата ----------
function rayAt(e) {
  const r = v3.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, v3.cam);
  return ray;
}
function planePoint(e, plane) {
  const p = rayAt(e).ray.intersectPlane(plane, new THREE.Vector3());
  return p && { x: p.x * 100, y: p.z * 100 };
}
function startDrag(e) {
  const hit = pickHit(e);
  if (!hit) return;
  // Слишком пологий взгляд: плоскость почти параллельна лучу, двигать неудобно — поднимаем её не выше 1 м
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Math.min(hit.point.y, 1));
  const p0 = planePoint(e, plane);
  if (!p0) return;
  if (hit.object.userData.person) {
    const g = v3.person;
    v3.drag = { person: true, plane, p0, x0: g.position.x * 100, y0: g.position.z * 100 };
    return;
  }
  const it = byUid(hit.object.userData.uid);
  if (!it) return;
  const list = members(it);
  state.sel = it.uid;
  v3.drag = { list, plane, p0, orig: list.map((i) => ({ x: i.x, y: i.y, rot: i.rot })), B0: listBox(list), began: false };
  render();
}
function dragTo(e) {
  const dr = v3.drag, p = planePoint(e, dr.plane);
  if (!p) return;
  const dx = p.x - dr.p0.x, dy = p.y - dr.p0.y, { L, W } = state.room;
  if (dr.person) {
    v3.personAt = [clamp(snap(dr.x0 + dx), 25, L - 25), clamp(snap(dr.y0 + dy), 25, W - 25)];
    v3.person.position.set(v3.personAt[0] / 100, 0, v3.personAt[1] / 100);
    draw3d();
    return;
  }
  if (!dr.began) { beginChange(); dr.began = true; }
  dr.list.forEach((i, k) => Object.assign(i, dr.orig[k]));
  placeList(dr.list, dr.B0.x + dr.B0.w / 2 + dx, dr.B0.y + dr.B0.h / 2 + dy);
  render();
}
function pickHit(e) {
  // Покрытия выбираются, только если под курсором больше ничего нет
  const hits = rayAt(e).intersectObjects(v3.pick.filter((m) => m.visible && m.parent.visible), false);
  return hits.find((h) => h.object.userData.person || CAT[byUid(h.object.userData.uid)?.id]?.kind !== 'floor') || hits[0];
}
function snapshot3d() {
  renderMirrors();
  v3.renderer.render(v3.scene, v3.cam);
  v3.renderer.domElement.toBlob((b) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `${fileBase()}-3d.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });
}

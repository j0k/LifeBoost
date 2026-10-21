// Окружение для 3D: зал в квартире на 5 этаже, на 50 этаже небоскрёба или в загородном доме у реки.
// Всё строится из простых фигур прямо здесь. Окружение собирается один раз и живёт отдельно от зала,
// поэтому перетаскивание предметов его не пересобирает.
const ENVS = {
  none:  { name: tr`Без окружения`, rMax: 80 },
  flat:  { name: tr`Квартира, 5 этаж`, rMax: 260, sky: ['#5b8fd0', '#cfe0ee'], fog: ['#d3dde6', 140, 900], glaze: [0, 1] },
  tower: { name: tr`Небоскрёб, 50 этаж`, rMax: 1400, sky: ['#3f78c4', '#d9e4ec'], fog: ['#cdd8e2', 450, 3600], glaze: [0, 1, 2, 3] },
  river: { name: tr`Загород у реки`, rMax: 320, sky: ['#6aa4dc', '#e4eef2'], fog: ['#dfe9ee', 220, 1600], glaze: [0, 1] },
  // Без стен: вместо них перила из труб, зал прямо на палубе
  raft:  { name: tr`Плот на Луге`, rMax: 260, sky: ['#5d9ad8', '#e6eef0'], fog: ['#dde7e4', 160, 1300], open: true },
};

// Детерминированный случайный генератор: окружение каждый раз одинаковое
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Сборка окружения: возвращает группу, которую view3d добавляет в сцену
function buildEnv(kind, l, w, h) {
  const g = new THREE.Group(), E = ENVS[kind];
  g.userData.kind = kind;
  const M = (color, o = {}) => {
    const m = new (o.phong ? THREE.MeshPhongMaterial : THREE.MeshLambertMaterial)({ color: new THREE.Color(color), ...(o.map ? { map: o.map } : {}) });
    if (o.op != null) { m.transparent = true; m.opacity = o.op; m.depthWrite = false; }
    if (o.phong) m.shininess = o.shine || 60;
    return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const plane = (pw, pd, m, x, y, z) => { const o = add(new THREE.PlaneGeometry(pw, pd), m, x, y, z); o.rotation.x = -Math.PI / 2; return o; };
  const disc = (r, m, x, y, z) => { const o = add(new THREE.CircleGeometry(r, 64), m, x, y, z); o.rotation.x = -Math.PI / 2; return o; };

  // Небо: сфера с градиентом от зенита к горизонту
  const skyGeo = new THREE.SphereGeometry(5000, 32, 16), top = new THREE.Color(E.sky[0]), hor = new THREE.Color(E.sky[1]);
  const pos = skyGeo.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) { const k = Math.max(0, pos.getY(i) / 5000); const c = hor.clone().lerp(top, Math.pow(k, 0.6)); col.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const sky = add(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), l / 2, 0, w / 2);
  sky.renderOrder = -1;

  // Фасад: плитка «этаж 3 м × два окна 3,2 м», у каждого дома свой повтор
  const tiles = {};
  const facade = (style) => {
    if (!tiles[style]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const x = cv.getContext('2d');
      const S = { panel: ['#dcd6ca', '#5f7487'], brick: ['#b9826a', '#3f4d58'], stone: ['#d3c8b0', '#46525d'], glass: ['#7c9ab0', '#a9c6da'], dark: ['#59636b', '#8fb0c6'] }[style];
      x.fillStyle = S[0]; x.fillRect(0, 0, 64, 64);
      x.fillStyle = S[1];
      if (style === 'glass' || style === 'dark') { x.fillRect(3, 4, 58, 52); x.fillStyle = S[0]; x.fillRect(31, 0, 2, 64); }
      else { x.fillRect(9, 16, 16, 30); x.fillRect(39, 16, 16, 30); }
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      tiles[style] = t;
    }
    return tiles[style];
  };
  // Дом: x0, z0 — угол, bw × bd в плане, от y0 высотой bh
  const house = (x0, z0, bw, bd, y0, bh, style, roof = '#7b8085') => {
    const tex = (a, b) => { const t = facade(style).clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(a / 3.2)), Math.max(1, Math.round(b / 3))); return M('#ffffff', { map: t }); };
    const sx = tex(bd, bh), sz = tex(bw, bh), r = M(roof);
    const o = add(new THREE.BoxGeometry(bw, bh, bd), [sx, sx, r, r, sz, sz], x0 + bw / 2, y0 + bh / 2, z0 + bd / 2);
    return o;
  };
  const tree = (x, y, z, s, R, leaf = '#5f8f45') => {
    add(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.2 * s, 6), M('#6b5440'), x, y + 1.1 * s, z);
    const f = add(new THREE.SphereGeometry(1.5 * s, 8, 6), M(leaf), x, y + 3 * s, z);
    f.scale.set(1, 1.2 + R() * 0.4, 1);
  };
  const T = WALL_T / 100;

  if (kind === 'flat') {
    // 5 этаж: под залом 4 этажа по 3 м, земля на −12,3 м
    const G = -12.3;
    house(-T, -T, l + 2 * T, w + 2 * T, G, -0.02 - G, 'panel');
    disc(1600, M('#86996b'), l / 2, G, w / 2);
    plane(l + 60, w + 50, M('#8d9093'), l / 2, G + 0.02, w / 2);            // двор, асфальт
    plane(l + 40, w + 30, M('#7d9a5c'), l / 2, G + 0.04, w / 2 + 2);         // газон
    plane(14, 900, M('#5c6064'), l + 34, G + 0.05, w / 2);                   // дорога
    plane(900, 12, M('#5c6064'), l / 2, G + 0.05, -46);
    // Соседние панельки и дальние дома
    house(-30, -40, 70, 12, G, 27, 'panel');
    house(l + 48, -30, 13, 80, G, 48, 'panel');
    house(-45, -10, 12, 50, G, 15, 'brick', '#6d5a50');
    house(-20, w + 40, 60, 12, G, 27, 'panel');
    const R = rng(7);
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2, d = 140 + R() * 500, bw = 14 + R() * 50, bh = 15 + R() * 50;
      house(l / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, bw, 12 + R() * 6, G, bh, R() < 0.7 ? 'panel' : 'brick');
    }
    // Деревья во дворе, мимо домов и дороги
    for (let i = 0; i < 60; i++) {
      const x = -25 + R() * (l + 50), z = -32 + R() * (w + 64);
      if (x > -3 && x < l + 3 && z > -3 && z < w + 3) continue;
      if (Math.abs(x - (l + 34)) < 9 || Math.abs(z + 46) < 8) continue;
      if (z > w * 0.5 && x < l * 0.5) continue;   // со стороны обзорной камеры деревья не нужны
      tree(x, G, z, 1 + R() * 0.9, R, R() < 0.5 ? '#6c9a4c' : '#87a85a');
    }
  }

  if (kind === 'tower') {
    // 50 этаж ≈ 200 м над улицей. Башня с уступами, как у небоскрёбов ар-деко
    const G = -200, steps = [[0, -40, 0], [-40, -110, 7], [-110, -175, 14], [-175, G, 24]];
    for (const [y1, y0, m] of steps) house(-T - m, -T - m, l + 2 * T + 2 * m, w + 2 * T + 2 * m, y0, y1 - y0 - 0.02, 'stone', '#b8ae99');
    disc(6000, M('#6b7175'), l / 2, G, w / 2);
    // Манхэттен по сетке: кварталы 80 × 30 м, улицы 20 и 15 м
    const R = rng(50), boxes = [];
    for (let gx = -16; gx <= 16; gx++) for (let gz = -30; gz <= 30; gz++) {
      const x = l / 2 + gx * 100, z = w / 2 + gz * 45, d = Math.hypot(x - l / 2, z - w / 2);
      if (d < 120 || d > 1500) continue;
      if (x > l / 2 + 650) continue;                               // дальше — река
      if (x > l / 2 - 300 && x < l / 2 - 120 && z > w / 2 - 900 && z < w / 2 - 350) continue; // парк
      const n = 1 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        // В основном 30–180 м, изредка выше нас (ниже 200 м виден город сверху)
        let hgt = R() < 0.04 ? 230 + R() * 190 : 20 + Math.pow(R(), 2.2) * 170;
        if (d < 450) hgt = Math.min(hgt, 185);                       // рядом никто не загораживает вид
        const bw = 80 / n - 4;
        boxes.push([x - 40 + i * (80 / n) + 2, z - 15, bw, 30, hgt, R()]);
      }
    }
    // Ближние — с окнами, дальние — одним инстансом
    const near = boxes.filter((b) => Math.hypot(b[0] - l / 2, b[1] - w / 2) < 330);
    const far = boxes.filter((b) => Math.hypot(b[0] - l / 2, b[1] - w / 2) >= 330);
    for (const [x, z, bw, bd, hgt, k] of near) house(x, z, bw, bd, G, hgt, k < 0.35 ? 'glass' : k < 0.6 ? 'dark' : k < 0.85 ? 'stone' : 'brick');
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5), M('#ffffff'), far.length);
    const m4 = new THREE.Matrix4(), cols = ['#9aa3aa', '#b9b0a0', '#7f8d99', '#a7998a', '#c3c7c9', '#6f7f8d'].map((c) => new THREE.Color(c));
    far.forEach(([x, z, bw, bd, hgt, k], i) => {
      inst.setMatrixAt(i, m4.makeScale(bw, hgt, bd).setPosition(x, G, z));
      inst.setColorAt(i, cols[Math.floor(k * cols.length)]);
    });
    g.add(inst);
    plane(1400, 9000, M('#4e7593', { phong: true, shine: 90 }), l / 2 + 1350, G + 0.3, w / 2);   // Гудзон
    plane(180, 550, M('#5f8a4f'), l / 2 - 210, G + 0.2, w / 2 - 625);                            // парк
  }

  if (kind === 'river') {
    // Дом на фундаменте 0,45 м, терраса к реке, бонсай-сад, речка, лес и холмы
    const G = -0.45;
    add(new THREE.BoxGeometry(l + 2 * T + 0.4, -G, w + 2 * T + 0.4), M('#9b958a'), l / 2, G / 2, w / 2);
    disc(3000, M('#86ab5e'), l / 2, G, w / 2);
    const deck = add(new THREE.BoxGeometry(5, 0.12, w + 2 * T), M('#a87c55'), l + T + 2.5, -0.12, w / 2);
    for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.02, 0.005, w + 2 * T), M('#8b6444'), l + T + 0.3 + i * 0.55, -0.055, w / 2);
    deck.userData.deck = true;
    // Речка: лента вдоль дома за террасой
    const rx = (z) => l + 24 + 7 * Math.sin(z / 28) + 3 * Math.sin(z / 9);
    const rv = [], ri = [], N = 160;
    for (let i = 0; i <= N; i++) {
      const z = -600 + (1200 * i) / N, x = rx(z), half = 7 + 2 * Math.sin(z / 40);
      rv.push(x - half, G + 0.06, z, x + half, G + 0.06, z);
      if (i < N) { const a = i * 2; ri.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
    rg.setIndex(ri);
    rg.computeVertexNormals();
    add(rg, M('#5a95b9', { phong: true, shine: 120 }));
    const R = rng(11), stone = M('#8e8f8a');
    // Камни по берегам
    for (let i = 0; i < 70; i++) {
      const z = w / 2 - 60 + R() * 120, side = R() < 0.5 ? -1 : 1, x = rx(z) + side * (7.5 + R() * 2), s = 0.3 + R() * 0.9;
      const o = add(new THREE.DodecahedronGeometry(s, 0), stone, x, G + s * 0.3, z);
      o.scale.y = 0.55; o.rotation.set(R() * 3, R() * 3, R() * 3);
    }
    // Сухой сад перед стеной А: гравий с граблями и три камня
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    const cx = cv.getContext('2d'); cx.fillStyle = '#e4e0d6'; cx.fillRect(0, 0, 64, 64);
    cx.strokeStyle = '#cbc5b8'; cx.lineWidth = 2;
    for (let y = 4; y < 64; y += 8) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(64, y); cx.stroke(); }
    const gt = new THREE.CanvasTexture(cv); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set((l + 4) / 1.2, 3);
    plane(l + 4, 7, M('#ffffff', { map: gt }), l / 2, G + 0.03, -T - 4);
    [[l * 0.3, -4.5, 0.9], [l * 0.36, -3.4, 0.5], [l * 0.7, -4.2, 0.7]].forEach(([x, z, s]) => {
      const o = add(new THREE.DodecahedronGeometry(s, 1), M('#7d7a73'), x, G + s * 0.4, z); o.scale.set(1.3, 0.75, 1);
    });
    // Бонсай-деревья (ниваки): изогнутый ствол и плоские подушки хвои
    const bonsai = (x, z, s) => {
      const pts = [new THREE.Vector3(0, 0, 0)];
      let px = 0, pz = 0;
      for (let i = 1; i <= 4; i++) { px += (R() - 0.5) * 0.9 * s; pz += (R() - 0.5) * 0.9 * s; pts.push(new THREE.Vector3(px, i * 0.75 * s, pz)); }
      const trunk = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.16 * s, 7), M('#5b4636'), x, G, z);
      trunk.userData.k = 1;
      const pads = 3 + Math.floor(R() * 3);
      for (let i = 0; i < pads; i++) {
        const p = pts[1 + Math.floor(R() * 4)], r = (0.9 + R() * 0.9) * s;
        const f = add(new THREE.SphereGeometry(r, 12, 8), M(R() < 0.5 ? '#3f6f3c' : '#4c7d43'), x + p.x + (R() - 0.5) * 1.6 * s, G + p.y + 0.25 * s, z + p.z + (R() - 0.5) * 1.6 * s);
        f.scale.y = 0.38;
      }
    };
    [[l + 10, -6, 1.3], [l + 9, w + 5, 1.1], [-6, w * 0.3, 1.4], [-7, w + 4, 1.0], [l * 0.15, -9, 1.2], [l * 0.85, -8.5, 1.5], [l + 15, w * 0.5, 0.9]].forEach(([x, z, s]) => bonsai(x, z, s));
    // Дорожка из плоских камней от террасы к реке
    for (let i = 0; i < 6; i++) {
      const o = add(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 9), M('#a29d93'), l + T + 6 + i * 1.6, G + 0.05, w / 2 + Math.sin(i) * 0.6);
      o.scale.z = 0.7;
    }
    // Лес: конусы-ели кругом, дальше холмы
    const fir = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), M('#3d6338'), 900);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < 1400 && n < 900; i++) {
      const a = R() * Math.PI * 2, d = 70 + R() * 700, x = l / 2 + Math.cos(a) * d, z = w / 2 + Math.sin(a) * d;
      if (Math.abs(x - rx(z)) < 16) continue;
      const s = 6 + R() * 10;
      fir.setMatrixAt(n++, m4.makeScale(s * 0.35, s, s * 0.35).setPosition(x, G, z));
    }
    fir.count = n;
    g.add(fir);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + R(), d = 1000 + R() * 600, r = 200 + R() * 300;
      const hill = add(new THREE.SphereGeometry(r, 24, 12), M(i % 2 ? '#6f9a63' : '#7fa37a'), l / 2 + Math.cos(a) * d, G - r * 0.75, w / 2 + Math.sin(a) * d);
      hill.scale.y = 0.55;
    }
    tree(-14, G, w * 0.7, 2.4, R); tree(l * 0.5, G, w + 14, 2.8, R); tree(-18, G, -12, 2.2, R);
  }
  if (kind === 'raft') {
    // Плот как в походе по Луге. Корма (у стены Г): спальный отсек под плёнкой, на его крыше
    // решётчатая верхняя палуба с барабанами и столом. Дальше открытая палуба — это и есть зал.
    // Под всем рама из труб на синих бочках, по бортам наклонные решётки и чёрные камеры.
    const WL = -0.45, R = rng(38), m4 = new THREE.Matrix4();
    const pipe = M('#9aa0a3', { phong: true, shine: 40 }), white = M('#e9ebe8', { phong: true, shine: 30 }), wood = M('#b08a5e'), plank = M('#9c7650');
    const CL = Math.min(4, Math.max(2.2, l * 0.45)), CH = 1.3;      // длина и высота отсека
    const bow = 2.2, stern = 1.2, side = 0.95;
    const x0 = -stern, x1 = l + bow, z0 = -side, z1 = w + side;
    const tube = (r, bx, by, bz, cx, cy, cz, m = pipe) => {
      const a = new THREE.Vector3(bx, by, bz), b = new THREE.Vector3(cx, cy, cz), len = a.distanceTo(b);
      const o = add(new THREE.CylinderGeometry(r, r, len, 8), m, (bx + cx) / 2, (by + cy) / 2, (bz + cz) / 2);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
      return o;
    };
    // Решётка: рамка из уголка и частые прутья, одним инстансом на панель
    const grate = (cx, cy, cz, gl, gw, rotY = 0, tilt = 0, m = white) => {
      const p = new THREE.Group();
      p.position.set(cx, cy, cz); p.rotation.set(0, rotY, 0); g.add(p);
      const q = new THREE.Group(); q.rotation.x = tilt; p.add(q);
      const bar = (bw, bd, x, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.03, bd), m); o.position.set(x, 0, z); q.add(o); };
      bar(gl, 0.04, 0, -gw / 2); bar(gl, 0.04, 0, gw / 2); bar(0.04, gw, -gl / 2, 0); bar(0.04, gw, gl / 2, 0);
      const k = Math.floor(gl / 0.09), rods = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.025, gw), m, k);
      for (let i = 0; i < k; i++) rods.setMatrixAt(i, m4.makeTranslation(-gl / 2 + (i + 0.5) * gl / k, 0, 0));
      q.add(rods);
      return p;
    };
    // Настил под залом и рейки на выносах
    add(new THREE.BoxGeometry(l + 0.2, 0.05, w + 0.2), wood, l / 2, -0.03, w / 2);
    for (let x = x0 + 0.06; x < -0.1; x += 0.16) add(new THREE.BoxGeometry(0.11, 0.04, w + 0.2), plank, x, -0.03, w / 2);
    // Нос: решётки и наклонный трап к воде
    grate(l + 0.75, -0.02, w / 2, 1.3, w + 0.2);
    grate(l + 1.75, -0.2, w / 2, 0.9, w + 0.2, 0, 0, white).rotation.z = -0.35;
    // Борта: наклонные решётки от палубы к поплавкам
    for (const [z, s] of [[-0.42, 1], [w + 0.42, -1]]) {
      const n = Math.max(1, Math.round((x1 - x0 - 0.4) / 2.4)), seg = (x1 - x0 - 0.4) / n;
      for (let i = 0; i < n; i++) grate(x0 + 0.2 + seg * (i + 0.5), -0.17, z, seg - 0.06, 0.9, 0, s * 0.42);
    }
    // Рама под настилом
    for (const z of [-0.05, w / 2, w + 0.05]) tube(0.045, x0, -0.1, z, x1 - 0.3, -0.1, z);
    for (let x = x0 + 0.05; x <= x1 - 0.3; x += 1.5) tube(0.04, x, -0.1, z0 + 0.2, x, -0.1, z1 - 0.2);
    // Поплавки: синие бочки рядами, по бортам чёрные камеры
    const bar = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 16).rotateZ(Math.PI / 2), M('#2f62b0', { phong: true, shine: 50 }), 800);
    let n = 0;
    for (let x = x0 + 0.55; x < x1 - 0.5 && n < 800; x += 0.95) for (let z = -0.1; z < w + 0.2 && n < 800; z += 0.66) bar.setMatrixAt(n++, m4.makeTranslation(x, WL + 0.03, z));
    bar.count = n;
    g.add(bar);
    const tyre = M('#222426');
    for (const z of [z0 - 0.15, z1 + 0.15]) for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.15) {
      const o = add(new THREE.TorusGeometry(0.34, 0.14, 10, 22), tyre, x, WL + 0.02, z);
      o.rotation.x = -Math.PI / 2; o.scale.z = 0.8;
    }

    // ---------- Отсек: стойки, плёнка, вход со стороны носа ----------
    const posts = [];
    for (const z of [0, w]) for (let x = 0; x <= CL + 0.01; x += CL / Math.max(1, Math.round(CL / 1.2))) posts.push([x, z]);
    for (const [x, z] of posts) tube(0.035, x, 0, z, x, CH, z);
    tube(0.035, 0, CH, w / 2, CL, CH, w / 2);
    for (const z of [0, w]) tube(0.03, 0, CH, z, CL, CH, z);
    for (const x of [0, CL]) tube(0.03, x, CH, 0, x, CH, w);
    // Плёнка мятыми полосами: свисает с крыши, внизу подоткнута
    const film = M('#eef1ee', { op: 0.42 }); film.side = THREE.DoubleSide;
    const sheet = (len, cx, cz, rotY) => {
      const k = Math.max(2, Math.round(len / 0.7));
      for (let i = 0; i < k; i++) {
        const o = add(new THREE.PlaneGeometry(len / k + 0.03, CH - 0.04, 1, 3), film, 0, 0, 0);
        const pa = o.geometry.attributes.position;
        for (let j = 0; j < pa.count; j++) pa.setZ(j, (R() - 0.5) * 0.05 + (pa.getY(j) < 0 ? 0.04 : 0));
        o.geometry.computeVertexNormals();
        const t = -len / 2 + (i + 0.5) * len / k;
        o.position.set(cx + Math.cos(rotY) * t, CH / 2, cz - Math.sin(rotY) * t);
        o.rotation.y = rotY;
      }
    };
    sheet(CL, CL / 2, -0.04, 0); sheet(CL, CL / 2, w + 0.04, 0); sheet(w, -0.04, w / 2, Math.PI / 2);
    // Вход: плёнка по краям проёма подвязана
    sheet(w * 0.25, CL + 0.04, w * 0.125, Math.PI / 2); sheet(w * 0.25, CL + 0.04, w * 0.875, Math.PI / 2);
    // Рюкзаки на корме за плёнкой
    const bag = ['#5d6b3c', '#c4542e', '#3f5470', '#6b5b3e', '#d0a23a', '#2f6f6a'];
    for (let i = 0; i < 6; i++) {
      const z = 0.35 + i * (w - 0.7) / 5;
      const o = add(new THREE.BoxGeometry(0.32, 0.5, 0.26), M(bag[i]), -0.4, 0.25, z + (Math.abs(z - w / 2) < 0.4 ? 0.5 : 0));
      o.rotation.y = (R() - 0.5) * 0.6; o.rotation.z = (R() - 0.5) * 0.3;
    }

    // ---------- Верхняя палуба: решётки, лесенка, стол, барабаны ----------
    const tl = CL + 0.1;
    for (let i = 0; i < 3; i++) grate(-0.05 + tl / 6 + i * tl / 3, CH + 0.02, w / 2, tl / 3 - 0.03, w + 0.1);
    // Ограждение верхней палубы с трёх сторон, с носа открыто к лесенке
    for (const z of [-0.05, w + 0.05]) { tube(0.025, -0.05, CH + 0.9, z, CL, CH + 0.9, z); for (let x = -0.05; x <= CL + 0.01; x += CL / 3) tube(0.025, x, CH, z, x, CH + 0.9, z); }
    tube(0.025, -0.05, CH + 0.9, -0.05, -0.05, CH + 0.9, w + 0.05);
    // Лесенка с открытой палубы наверх
    const lz = w * 0.82;
    for (const dz of [-0.22, 0.22]) tube(0.025, CL + 0.55, 0, lz + dz, CL + 0.05, CH + 0.05, lz + dz);
    for (let i = 1; i < 5; i++) { const t = i / 5; tube(0.018, CL + 0.55 - 0.5 * t, CH * t, lz - 0.22, CL + 0.55 - 0.5 * t, CH * t, lz + 0.22); }
    const U = CH + 0.03;                                                   // уровень верхней палубы
    // Стол со скатертью, котелки, красное ведро
    const tx = CL * 0.62, tz = w * 0.3;
    add(new THREE.BoxGeometry(1.2, 0.03, 0.7), M('#f4f2ec'), tx, U + 0.72, tz);
    add(new THREE.BoxGeometry(1.22, 0.18, 0.72), M('#f4f2ec', { op: 0.85 }), tx, U + 0.62, tz);
    for (const [dx, dz] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) tube(0.015, tx + dx, U, tz + dz, tx + dx, U + 0.71, tz + dz);
    for (const [dx, dz, r] of [[-0.3, 0, 0.13], [0.1, 0.12, 0.1], [0.35, -0.1, 0.09]]) add(new THREE.CylinderGeometry(r, r * 0.9, r * 1.1, 14), M('#a9adb0', { phong: true, shine: 80 }), tx + dx, U + 0.74 + r * 0.55, tz + dz);
    add(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 14), M('#c8262f', { phong: true }), CL * 0.25, U + 0.15, w * 0.15);
    // Барабанная установка
    const dx = CL * 0.42, dz = w * 0.68, chrome = M('#d8d8d0', { phong: true, shine: 90 }), shell = M('#b3263a', { phong: true, shine: 70 }), head = M('#f2efe6');
    const drum = (r, d, x, y, z) => {
      add(new THREE.CylinderGeometry(r, r, d, 22), shell, x, U + y, z);
      add(new THREE.CircleGeometry(r * 0.96, 22), head, x, U + y + d / 2 + 0.002, z).rotation.x = -Math.PI / 2;
      tube(0.01, x, U, z, x, U + y - d / 2, z, chrome);
    };
    const kick = add(new THREE.CylinderGeometry(0.27, 0.27, 0.42, 22), shell, dx + 0.35, U + 0.28, dz);
    kick.rotation.z = Math.PI / 2;
    add(new THREE.CircleGeometry(0.26, 22), head, dx + 0.565, U + 0.28, dz).rotation.y = Math.PI / 2;
    drum(0.18, 0.15, dx - 0.05, 0.6, dz - 0.38); drum(0.15, 0.14, dx + 0.32, 0.72, dz - 0.2); drum(0.15, 0.14, dx + 0.32, 0.72, dz + 0.2); drum(0.2, 0.3, dx - 0.05, 0.45, dz + 0.45);
    for (const [cx, cz, cy] of [[dx + 0.15, dz - 0.72, 1.05], [dx + 0.5, dz + 0.6, 1.15], [dx - 0.2, dz - 0.72, 0.85]]) {
      tube(0.012, cx, U, cz, cx, U + cy, cz, chrome);
      add(new THREE.CylinderGeometry(0.22, 0.02, 0.02, 22), M('#c9a645', { phong: true, shine: 100 }), cx, U + cy, cz);
    }
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 14), M('#3a3a3a'), dx - 0.5, U + 0.5, dz);
    tube(0.02, dx - 0.5, U, dz, dx - 0.5, U + 0.47, dz, chrome);

    // ---------- Корма и нос: греби, флаг, канистры, круг ----------
    const sweep = (x, dir) => {
      tube(0.05, x, 0, w / 2, x, 1.1, w / 2, wood);
      tube(0.045, x - dir * 2.2, 1.45, w / 2 + 0.4, x + dir * 4.2, WL - 0.15, w / 2 - 0.3, wood);
      const b = add(new THREE.BoxGeometry(1.2, 0.04, 0.5), plank, x + dir * 4.5, WL - 0.1, w / 2 - 0.32);
      b.rotation.z = dir * 0.3;
    };
    sweep(x0 + 0.3, -1); sweep(x1 - 0.5, 1);
    tube(0.025, -0.05, CH, -0.05, -0.05, CH + 3, -0.05);
    const flag = add(new THREE.PlaneGeometry(0.9, 0.55, 6, 1), M('#d64532'), 0.4, CH + 2.7, -0.05);
    flag.material.side = THREE.DoubleSide;
    const fp = flag.geometry.attributes.position;
    for (let j = 0; j < fp.count; j++) fp.setZ(j, Math.sin((fp.getX(j) + 0.45) * 6) * 0.06);
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.22, 0.35, 0.16), M('#f3f3ee'), l + 0.4 + (i % 2) * 0.26, 0.18, 0.25 + Math.floor(i / 2) * 0.2);
    const ring = add(new THREE.TorusGeometry(0.42, 0.13, 10, 24), tyre, l + 0.8, 0.12, w - 0.6);
    ring.rotation.x = -Math.PI / 2;
    // Дрон над плотом, как в видео
    const dr = new THREE.Group(); dr.position.set(l * 0.6, 9, w / 2 + 1.5); g.add(dr);
    const dm = M('#2b2d30');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.15), dm); dr.add(body);
    for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), dm); arm.position.set(ax * 0.1, 0, az * 0.08); arm.rotation.y = ax * az * 0.6; dr.add(arm);
      const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.005, 16), M('#c8ccd0', { op: 0.5 })); pr.position.set(ax * 0.19, 0.03, az * 0.15); dr.add(pr);
    }

    // ---------- Луга: тёмная вода, берега с камышом, ивами и лесом ----------
    add(new THREE.CircleGeometry(4000, 64), M('#4e6466', { phong: true, shine: 110 }), l / 2, WL, w / 2).rotation.x = -Math.PI / 2;
    // Рябь и след за плотом
    for (let i = 0; i < 40; i++) {
      const o = add(new THREE.PlaneGeometry(0.6 + R() * 2.4, 0.05), M('#8fa5a6', { op: 0.5 }), x0 - 1 - R() * 12, WL + 0.01, w / 2 + (R() - 0.5) * (w + 2 + i * 0.2));
      o.rotation.x = -Math.PI / 2;
    }
    const bank = (x) => 30 + 9 * Math.sin(x / 47) + 4 * Math.sin(x / 13);
    const shore = (sgn) => {
      const v = [], ix = [], N = 140;
      for (let i = 0; i <= N; i++) {
        const x = l / 2 - 900 + (1800 * i) / N, e = w / 2 + sgn * bank(x);
        v.push(x, WL - 0.3, e, x, WL + 0.6, e + sgn * 4, x, WL + 1.4, e + sgn * 900);
        if (i < N) { const a = i * 3; ix.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      geo.setIndex(ix);
      geo.computeVertexNormals();
      const m = M('#74994f'); m.side = THREE.DoubleSide;
      g.add(new THREE.Mesh(geo, m));
    };
    shore(1); shore(-1);
    const reed = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0), M('#9aae5a'), 1400);
    n = 0;
    for (let i = 0; i < 1400; i++) {
      const sgn = R() < 0.5 ? -1 : 1, x = l / 2 - 300 + R() * 600, z = w / 2 + sgn * (bank(x) - 1 + R() * 6);
      reed.setMatrixAt(n++, m4.makeScale(0.4 + R() * 0.8, 1.2 + R() * 1.4, 0.4 + R() * 0.8).setPosition(x, WL, z));
    }
    reed.count = n;
    g.add(reed);
    const fir = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), M('#3a5f36'), 1400);
    const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M('#5e8c42'), 1600);
    const birch = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 6).translate(0, 0.5, 0), M('#e8e6df'), 400);
    let nf = 0, nl = 0, nb = 0;
    const lc = ['#5e8c42', '#6f9a4a', '#4f7d3c', '#7ea456'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 3200; i++) {
      const sgn = R() < 0.5 ? -1 : 1, x = l / 2 - 700 + R() * 1400, d = bank(x) + 7 + Math.pow(R(), 1.6) * 280, z = w / 2 + sgn * d;
      if (sgn > 0 && x > l / 2 - 110 && x < l / 2 + 30 && d < 75) continue;      // поляна напротив обзорной камеры
      const s = 7 + R() * 11, y = WL + 0.6 + Math.min(0.8, (d - bank(x)) * 0.004);
      if (R() < 0.4 && nf < 1400) fir.setMatrixAt(nf++, m4.makeScale(s * 0.3, s * 1.35, s * 0.3).setPosition(x, y, z));
      else if (nl < 1600) {
        leaf.setMatrixAt(nl, m4.makeScale(s * 0.38, s * 0.48, s * 0.38).setPosition(x, y + s * 0.55, z));
        leaf.setColorAt(nl++, lc[Math.floor(R() * lc.length)]);
        if (R() < 0.3 && nb < 400) birch.setMatrixAt(nb++, m4.makeScale(1, s * 0.5, 1).setPosition(x, y, z));
      }
    }
    fir.count = nf; leaf.count = nl; birch.count = nb;
    g.add(fir, leaf, birch);
    // Ивы у воды, песчаный пляж и опора ЛЭП
    for (const [x, sg] of [[l / 2 - 40, -1], [l / 2 + 25, -1], [l / 2 + 70, 1], [l / 2 - 150, 1], [l / 2 - 8, -1]]) tree(x, WL + 0.6, w / 2 + sg * (bank(x) + 3), 2.3, R, '#7d9a4e');
    const bx = l / 2 + 45;
    plane(26, 9, M('#d9c79a'), bx, WL + 0.62, w / 2 - bank(bx) - 5);
    const px = l / 2 - 60, pz = w / 2 + bank(px) + 40, steel = M('#7b8085');
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tube(0.12, px + a * 2.5, WL + 0.8, pz + b * 2.5, px + a * 0.5, WL + 30, pz + b * 0.5, steel);
    for (const y of [12, 20]) tube(0.08, px - 2, WL + y, pz, px + 2, WL + y, pz, steel);
    tube(0.15, px - 7, WL + 26, pz, px + 7, WL + 26, pz, steel);
  }
  return g;
}

function disposeEnv(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
  });
}

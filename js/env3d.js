// Окружение для 3D: зал в квартире на 5 этаже, на 50 этаже небоскрёба или в загородном доме у реки.
// Всё строится из простых фигур прямо здесь. Окружение собирается один раз и живёт отдельно от зала,
// поэтому перетаскивание предметов его не пересобирает.
const ENVS = {
  none:  { name: tr`Без окружения`, rMax: 80 },
  flat:  { name: tr`Квартира, 5 этаж`, rMax: 260, sky: ['#5b8fd0', '#cfe0ee'], fog: ['#d3dde6', 140, 900], glaze: [0, 1] },
  tower: { name: tr`Небоскрёб, 50 этаж`, rMax: 1400, sky: ['#3f78c4', '#d9e4ec'], fog: ['#cdd8e2', 450, 3600], glaze: [0, 1, 2, 3] },
  river: { name: tr`Загород у реки`, rMax: 320, sky: ['#6aa4dc', '#e4eef2'], fog: ['#dfe9ee', 220, 1600], glaze: [0, 1] },
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
  return g;
}

function disposeEnv(g) {
  g.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
  });
}

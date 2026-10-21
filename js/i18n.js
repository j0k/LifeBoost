// Язык интерфейса: по умолчанию русский, ?lang=en — английский.
// tr`строка ${x}` — по-русски как есть, по-английски из словаря I18N_EN (ключ: подстановки как {0}, {1}…).
const LANG = (() => { try { return new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ru'; } catch (e) { return 'ru'; } })();
const EN = LANG === 'en';
const LOC = EN ? 'en-US' : 'ru-RU';
const I18N_MISSING = new Set();

function tr(strs, ...vals) {
  let key = strs[0];
  for (let i = 0; i < vals.length; i++) key += `{${i}}` + strs[i + 1];
  let t = key;
  if (EN) { if (key in I18N_EN) t = I18N_EN[key]; else I18N_MISSING.add(key); }
  return t.replace(/\{(\d+)\}/g, (_, i) => vals[i]);
}
const trs = (s) => (EN && s in I18N_EN ? I18N_EN[s] : s);

const PLURAL_EN = {
  'предмет': ['item', 'items'], 'элемент': ['item', 'items'],
  'ошибка': ['error', 'errors'], 'замечание': ['warning', 'warnings'],
};

const I18N_EN = {
  // ---------- Проверки ----------
  'Покрытия {0} и {1} наложены: площадь посчитана дважды': 'Floor covers {0} and {1} overlap: area is counted twice',
  'Зоны раскачки {0} и {1} пересекаются': 'Swing zones of {0} and {1} overlap',
  '{0} под {1}: в зоне раскачки ничего твёрдого': '{0} under {1}: nothing hard is allowed in the swing zone',
  '{0} и {1} стоят друг на друге': '{0} and {1} are on top of each other',
  '{0} в зоне {1}: может разбиться': '{0} in the {1} zone: it may get broken',
  '{0} загораживает проход у двери': '{0} blocks the doorway',
  '{0} в зоне безопасности {1}': '{0} is in the safety zone of {1}',
  '{0} выходит за стены зала': '{0} sticks out of the room',
  '{0} должно висеть на стене': '{0} must be mounted on a wall',
  '{0}: нужен потолок от {1} м, в зале {2} м': '{0}: needs a ceiling of at least {1} m, the room has {2} m',
  '{0}: потолок {1} м — терпимо, лучше от {2} м': '{0}: {1} m ceiling is tolerable, {2} m or more is better',
  '{0}: зона безопасности упирается в стену': '{0}: safety zone runs into a wall',
  '{0}: под ним нужно {1}': '{0}: needs {1} underneath',
  '{0}: под точкой нет страховочного мата': '{0}: no crash mat under the rigging point',
  'Нет двери: не проверить, свободен ли вход': 'No door: can’t check that the entrance is clear',
  'Тесно: {0} м² на человека в самой большой группе, обычно от 2–4 м²': 'Crowded: {0} m² per person in the largest group, usually 2–4 m² or more',
  'Точек подвеса: {0}. Каждой нужна закладная с паспортом от 10 кН и расчёт перекрытия': 'Rigging points: {0}. Each needs a certified anchor rated 10 kN or more and a structural check of the ceiling',

  // ---------- Чертежи ----------
  '{0} м': '{0} m',
  'потолок {0} м': 'ceiling {0} m',
  'Добавьте снаряды: здесь будет видно, хватает ли потолка': 'Add equipment to see whether the ceiling is high enough',
  'Стена {0}': 'Wall {0}',
  'стена {0}': 'wall {0}',
  '{0} × {1} м': '{0} × {1} m',
  '{0} × {1} × {2} м': '{0} × {1} × {2} m',
  '{0}×{1} м': '{0}×{1} m',
  'пусто': 'empty',
  'Развёртка стены {0}': 'Elevation of wall {0}',
  '{0} · {1} м²': '{0} · {1} m²',

  // ---------- Главная ----------
  'Ссылка на проект и ракурс 3D скопирована': 'Link to the project and 3D view copied',
  'Ссылка на проект скопирована': 'Link to the project copied',
  'Ссылка в адресной строке — скопируйте её': 'The link is in the address bar — copy it',
  'Шаблон зала…': 'Room template…',
  'Шаблон загружен. Ctrl+Z вернёт прежний план': 'Template loaded. Ctrl+Z brings back the previous plan',
  'Мой зал': 'My gym',
  'Открыт проект «{0}»': 'Opened project “{0}”',
  'Не получилось открыть: {0}': 'Couldn’t open: {0}',
  'Ссылка на проект повреждена, открыт последний план': 'The project link is broken, opened the last plan',
  'Свободного места не нашлось, поставил ближе всего к свободному: проверьте зоны.': 'No free spot found, placed it as close to free space as possible: check the zones.',
  'Модулю не хватает места без пересечений — подвиньте соседей или увеличьте зал.': 'Not enough room for the module without overlaps — move its neighbours or enlarge the room.',
  'не похоже на проект LifeBoost': 'this doesn’t look like a LifeBoost project',

  // ---------- Панели ----------
  'м²': 'm²', 'м': 'm', 'шт': 'pcs',
  'Модули': 'Modules',
  '— готовые кубики': '— ready-made blocks',
  '{0} м²': '{0} m²',
  '{0} {1} м²': '{0} {1} m²',
  'Без места на плане': 'Not placed on the plan',
  'Отдельные предметы': 'Single items',
  'в закупке: {0} шт': 'in the list: {0} pcs',
  ', тянется': ', resizable',
  'Ничего не нашлось.': 'Nothing found.',
  'Свойства': 'Properties',
  'Нажмите на предмет на плане или добавьте модуль из каталога — кликом или перетаскиванием на план.': 'Click an item on the plan or add a module from the catalog — click it or drag it onto the plan.',
  'Тащить': 'Drag',
  'двигать; модуль едет целиком, настенное липнет к стене': 'move; a module moves as a whole, wall items snap to walls',
  'повернуть (настенное — на соседнюю стену)': 'rotate (wall items move to the next wall)',
  'сдвиг на 10 см, с Shift — на 50': 'nudge by 10 cm, with Shift by 50',
  'копия': 'duplicate', 'удалить': 'delete', 'отменить / вернуть': 'undo / redo',
  'поз. {0}': 'item {0}',
  ' · крепится к потолку': ' · ceiling-mounted',
  ' · на стене {0}': ' · on wall {0}',
  'Модуль «{0}» · {1} {2}, двигается целиком': 'Module “{0}” · {1} {2}, moves as a whole',
  'группа': 'group',
  'Разгруппировать': 'Ungroup',
  'Убрать только этот': 'Remove just this one',
  'От стены {0}, м': 'From wall {0}, m',
  'Ширина на плане, м': 'Width on plan, m',
  'Глубина на плане, м': 'Depth on plan, m',
  'Копия': 'Duplicate', 'Удалить модуль': 'Delete module', 'Удалить': 'Delete',
  'Размер': 'Size',
  ', высота {0} м': ', height {0} m',
  'Зона безопасности': 'Safety zone',
  '{0} м вокруг': '{0} m all round',
  '(сзади·справа·спереди·слева)': '(back·right·front·left)',
  'Потолок': 'Ceiling',
  'от {0} м, лучше {1} м': 'from {0} m, better {1} m',
  'На стене': 'On the wall',
  'от +{0} до +{1} м': 'from +{0} to +{1} m',
  'Покрытие': 'Flooring',
  'Занимаются': 'People',
  'Цена': 'Price',
  'Здесь всё в порядке': 'All good here',
  'без ошибок': 'no errors',
  'Нарушений нет: зоны не пересекаются, потолка хватает, всё на своих местах.': 'No issues: zones don’t overlap, the ceiling is high enough, everything is in place.',
  'Площадь': 'Area',
  '{0} × {1} м, потолок {2} м': '{0} × {1} m, ceiling {2} m',
  'Занято снарядами и зонами': 'Taken by equipment and zones',
  'свободно ≈{0} м²': 'free ≈{0} m²',
  'Бюджет на всё': 'Total budget',
  'к покупке: {0}': 'to buy: {0}',
  'Вместимость — сколько человек одновременно занимается на поставленных снарядах.': 'Capacity — how many people can train at once on the placed equipment.',
  'Покрытия: {0}.': 'Flooring: {0}.',
  'не заданы': 'none',
  'Меньше': 'Fewer', 'Больше': 'More',
  'Уже есть — не покупать': 'Already owned — don’t buy',
  'есть': 'owned',
  'Поз.': 'No.', 'Наименование': 'Item', 'Кол-во': 'Qty', 'Цена за ед.': 'Unit price', 'Сумма': 'Total',
  'Итого': 'Total', 'К покупке': 'To buy',
  'Пока пусто: добавьте модули из каталога.': 'Empty so far: add modules from the catalog.',
  'Ед.': 'Unit', 'Цена от': 'Price from', 'Цена до': 'Price to', 'Сумма от': 'Total from', 'Сумма до': 'Total to',
  'Уже есть': 'Owned', 'да': 'yes',
  'Цены ориентировочные, рынок США, 2026 год: «эконом» — «проф». Без доставки, монтажа и налога с продаж.': 'Prices are rough estimates for the US market, 2026: “budget” — “pro”. Delivery, installation and sales tax not included.',
  'Цены ориентировочные, Россия, 2026 год: «эконом» — «проф». Без доставки и монтажа.': 'Prices are rough estimates for the Russian market, 2026: “budget” — “pro”. Delivery and installation not included.',
  'Пересчитано по курсу, который задан выше.': 'Converted at the exchange rate set above.',
  'Отметьте «есть» то, что уже куплено, — оно уйдёт из суммы к покупке.': 'Tick “owned” for what you already have — it drops out of the amount to buy.',
  'Цены': 'Prices', 'Россия, ₽': 'Russia, ₽', 'США, $': 'USA, $',
  'Показывать в': 'Show in', '₽ рублях': '₽ rubles', '$ долларах': '$ dollars', '€ евро': '€ euros',
  'Курс доллара': 'Dollar rate', 'Курс евро': 'Euro rate', 'Курс франка': 'Franc rate', 'CHF франках': 'CHF francs',

  // ---------- 3D ----------
  'тяните — вращать · правая кнопка или Shift — сдвиг · колесо — масштаб · клик — выбрать · из каталога можно перетащить': 'drag — rotate · right button or Shift — pan · wheel — zoom · click — select · drag items in from the catalog',
  'тяните предмет или человека — двигать по полу · R — повернуть · Delete — удалить · пустое место — вращать': 'drag an item or the person — move along the floor · R — rotate · Delete — delete · empty space — rotate view',
  'нет связи с CDN': 'can’t reach the CDN',
  '3D не загрузился: {0}': '3D failed to load: {0}',
  '1,75 м': '1.75 m',
  'Человек 1,75 м, рука вверх — 2,25 м': 'Person 1.75 m, arm raised — 2.25 m',

  // ---------- Страница (index.html) ----------
  'LifeBoost · конструктор зала': 'LifeBoost · gym planner',
  'конструктор зала': 'gym planner',
  'Соберите зал из кубиков: уголок с турником на 5 м², место для растяжки, площадки акройоги, air track, рига. План сам проверяет зоны безопасности и высоту потолка, а на выходе получаются чертежи и список закупки.':
    'Build a gym from blocks: a 5 m² pull-up corner, a stretching spot, acroyoga pads, an air track, a rig. The plan checks safety zones and ceiling height for you, and you get drawings and a shopping list.',
  'Соберите зал для акробатики, акройоги, йоги, растяжки и кроссфита из готовых модулей: план с зонами безопасности, развёртки стен, разрез по высотам и список закупки.':
    'Plan a gym for acrobatics, acroyoga, yoga, stretching and CrossFit from ready-made modules: a plan with safety zones, wall elevations, a height section and a shopping list.',
  'Отменить': 'Undo', 'Вернуть': 'Redo', 'Шаблон зала': 'Room template',
  'Ссылка': 'Link', 'Открыть…': 'Open…', 'Сохранить': 'Save',
  'Проект': 'Project', 'Помещение': 'Room', 'Дата': 'Date', 'Система': 'System',
  'Длина, м': 'Length, m', '(стена А)': '(wall A)', 'Ширина, м': 'Width, m', 'Потолок, м': 'Ceiling, m',
  'Что показывать на плане': 'What to show on the plan',
  'Зоны': 'Zones', 'Размеры': 'Dimensions', 'Подписи': 'Labels', 'Марки': 'Item no.',
  'Каталог': 'Catalog', 'клик или перетащить на план или в 3D': 'click or drag onto the plan or 3D view',
  'Поиск: турник, мат, коврик…': 'Search: pull-up bar, mat, yoga mat…', 'Поиск по каталогу': 'Search the catalog',
  'План': 'Plan', 'Вид': 'View', 'План зала': 'Room plan',
  'сетка 0,5 м · штриховка — зоны безопасности · красное — нарушения': 'grid 0.5 m · hatching — safety zones · red — issues',
  'Двигать': 'Move', 'Двигать предметы и человека мышью': 'Move items and the person with the mouse',
  'Отражения': 'Reflections', 'Настоящие отражения в зеркалах (на слабых устройствах может тормозить)': 'Real reflections in mirrors (may be slow on weak devices)',
  'Обзор': 'Overview', 'Изнутри': 'Inside', 'Встать в зале и оглядеться': 'Stand in the room and look around',
  'Окружение': 'Surroundings', 'Где стоит зал': 'Where the gym is',
  'Без окружения': 'No surroundings', 'Квартира, 5 этаж': 'Apartment, 5th floor', 'Небоскрёб, 50 этаж': 'Skyscraper, 50th floor', 'Загород у реки': 'Countryside by a river', 'Плот на Луге': 'Raft on the Luga river', 'Окружение': 'Surroundings', 'Сцены': 'Scenes',
  'Это ваш зал в окружении «{0}». Оригинал — в списке, раздел «Сцены»': 'This is your own room in the “{0}” setting. The original is in the list under “Scenes”',
  'Загружена сцена «{0}». Ctrl+Z вернёт прежний план': 'Scene “{0}” loaded. Ctrl+Z brings back your previous plan', 'Сверху': 'Top', 'С пола': 'Eye level',
  'Ссылка на проект с этим ракурсом': 'Link to the project with this view',
  'Проверки': 'Checks', 'Сводка': 'Summary', 'вместимость и бюджет': 'capacity and budget',
  'Разрез: хватит ли потолка': 'Section: is the ceiling high enough',
  'столбик — сам снаряд, риски — минимум и рекомендуемая высота': 'bar — the equipment itself, ticks — minimum and recommended height',
  'Требования к высоте потолка': 'Ceiling height requirements',
  'Развёртки стен': 'Wall elevations',
  'вид изнутри зала; отметки — высота от пола до низа и верха крепления': 'seen from inside the room; marks — height from the floor to the bottom and top of the mounting',
  'Развёртки и разрез, SVG': 'Elevations and section, SVG',
  'Спецификация и закупка': 'Bill of materials and shopping list',
  'Закупка, CSV': 'Shopping list, CSV', 'План, SVG': 'Plan, SVG', 'Печать / PDF всех листов': 'Print / PDF of all sheets',
  'Цены ориентировочные, Россия, 2026 год: «эконом» — «проф». Без доставки и монтажа. Отметьте «есть» то, что уже куплено, — оно уйдёт из суммы к покупке.':
    'Prices are rough estimates for Russia, 2026, in rubles: “budget” — “pro”. Delivery and installation not included. Tick “owned” for what you already have — it drops out of the amount to buy.',
};

// Перевод статичной разметки: текстовые узлы и подписи-атрибуты
function translateDom(root = document) {
  if (!EN) return;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const w = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const k = norm(n.nodeValue);
    if (!k || !(k in I18N_EN)) continue;
    const lead = /^\s/.test(n.nodeValue) ? ' ' : '', tail = /\s$/.test(n.nodeValue) ? ' ' : '';
    n.nodeValue = lead + I18N_EN[k] + tail;
  }
  for (const a of ['placeholder', 'title', 'aria-label']) {
    for (const el of (root.body || root).querySelectorAll(`[${a}]`)) {
      const k = norm(el.getAttribute(a));
      if (k in I18N_EN) el.setAttribute(a, I18N_EN[k]);
    }
  }
  const md = document.querySelector('meta[name="description"]');
  if (md && md.content in I18N_EN) md.content = I18N_EN[md.content];
  document.documentElement.lang = 'en';
}

// Перевод данных: каталог, модули, шаблоны. Вызывается, когда все данные уже объявлены.
function translateData() {
  if (!EN) return;
  const D = { acro: 'Acrobatics', ay: 'Acroyoga', yoga: 'Yoga', str: 'Stretching', cf: 'CrossFit', ma: 'Martial arts', base: 'Room' };
  for (const k in D) DISC[k].name = D[k];
  const G = { floor: 'Flooring', acro: 'Acrobatics', ay: 'Acroyoga', yoga: 'Yoga', str: 'Stretching', cf: 'CrossFit & strength', ma: 'Martial arts', room: 'Room', kit: 'Small gear' };
  for (const g of GROUPS) g.name = G[g.id] || g.name;
  Object.assign(FLOORS, { tatami: 'tatami', rubber: 'rubber flooring', hard: 'sports flooring' });
  ['L-basing: flyer standing on the base’s feet', 'Standing on shoulders, 2 levels', 'Flyer toss'].forEach((n, i) => { ACRO_LEVELS[i].name = n; });

  // id: [name, short, note]
  const C = {
    tatami: ['Tatami 4 cm', 'Tatami', 'EVA puzzle mats are cheaper; 100×100 PE tatami is firmer and doesn’t slide apart. For acrobatics and acroyoga — at least 4 cm.'],
    rubber: ['Rubber flooring 20 mm', 'Rubber', 'A must for CrossFit: barbells, kettlebells and jumps. Under a lifting platform use 30–40 mm.'],
    hardfloor: ['Sports vinyl flooring', 'Sports floor', 'Warm and washable, fine for yoga and stretching. Not needed if the room already has parquet.'],
    airfloor: ['Inflatable air floor 4×3 m', 'Air floor', 'A soft, springy floor for jumps, rolls and acroyoga; at night you sleep on it. It floats. Needs an electric pump.'],
    airtrack: ['Air track 6×2 m', 'Air track', 'Round-offs and flips along the long axis; leave run-out at both ends. Needs an electric pump.'],
    gymmat: ['Gymnastics mat 2×1×0.1 m', 'Mat 2×1'],
    crash: ['Crash mat 2×2×0.3 m', 'Crash mat', 'Goes under a rigging point, a climbing rope and the landing zone of a trampoline.'],
    canes: ['Handstand canes', 'Canes'],
    olytramp: ['Olympic trampoline 5.05×2.91 m (bed 4.28×2.14)', 'Olympic tramp', 'FIG standard: 5.05 × 2.91 m frame, 1.155 m high. Needs 8 m above the bed, 10 m is better. End decks or 2 m mats at both ends, mats along the sides. One jumper at a time, with a spotter.'],
    wallpad: ['Wall pad 2 m (soft wall protection)', 'Wall pad', '5 cm foam in a PVC cover, fixed to the wall. Used by trampolines, air tracks, behind rings and silks: if a safety zone runs into a wall, the pad protects it.'],
    mookjong: ['Wing Chun wooden dummy (mook jong) on a frame', 'Mook jong', 'Ø 23 cm trunk, three arms and a leg. The frame absorbs strikes: free-standing or wall-mounted. Keep 1.2 m clear in front (along the arrow) for footwork.'],
    minitramp: ['Mini trampoline', 'Trampoline', 'Jump to the right (along the arrow): 3 m landing zone, put a crash mat there.'],
    silks: ['Rigging point: aerial silks', 'Silks', 'Anchor or beam rated 10 kN or more (≈1 t), swivel, figure-eight. The ceiling must be checked by an engineer.'],
    hoop: ['Rigging point: aerial hoop', 'Hoop', 'Anchor rated 10 kN or more, swivel, adjustable sling.'],
    aypad: ['Acroyoga pad 2×2 m (4 cm tatami)', 'Acroyoga', 'A trio: base, flyer, spotter. Standing on shoulders needs a ceiling of 4 m or more.'],
    aycrash: ['Spotting mat 2×1×0.2 m', 'Mat 0.2'],
    yogamat: ['Yoga mat 183×61', 'Yoga mat', 'About 40 cm between mats side to side and 25 cm end to end: ≈2 m² per person.'],
    yogawall: ['Yoga wall (straps on anchors) 2 m', 'Yoga wall', 'Anchors at 30 and 210 cm, load-bearing or reinforced wall.'],
    wallbars: ['Wall bars 0.9 × 2.4 m', 'Wall bars'],
    barre: ['Ballet barre 2 m, 2 levels', 'Barre'],
    splits: ['Splits trainer', 'Splits'],
    homebar: ['Wall-mounted pull-up bar', 'Pull-up bar', 'Bar at 2.1–2.3 m with at least 30 cm to the ceiling above it. Fix into concrete or brick.'],
    wallrig: ['Wall rig: pull-up bar + rings, 2 stations', 'Wall rig'],
    rig: ['Functional rig, 4 stations', 'Rig', 'Kipping and muscle-ups: ≈1.5 m clear in front and behind, at least 60 cm above the bar. Anchored to the floor.'],
    rack: ['Power rack + barbell with bumper plates', 'Rack', 'Walk-out with the bar at the bottom (along the arrow), needs 1.5 m.'],
    platform: ['Weightlifting platform 2×2 m', 'Platform', 'Snatch and clean & jerk: the bar is dropped from overhead, keep 0.8 m clear around.'],
    rower: ['Rowing machine', 'Rower'],
    bike: ['Air bike', 'Air bike'],
    kbrack: ['Kettlebell rack 8–32 kg', 'Kettlebells'],
    dbrack: ['Dumbbell rack 2.5–25 kg', 'Dumbbells'],
    plyo: ['Plyo boxes (set of 3)', 'Plyo'],
    wallball: ['Wall ball target 3.05 m', 'Wall ball', 'Target at 3.05 m (2.74 m for women). No mirrors or unguarded lights nearby.'],
    rope: ['Climbing rope 4.5 m', 'Rope', 'Anchor rated 10 kN or more, crash mat under the rope.'],
    door: ['Door 0.9 m', 'Door'],
    door2: ['Double door 1.5 m', 'Door'],
    window: ['Window', 'Window'],
    mirror: ['Mirrors h 2 m, shatterproof', 'Mirrors', 'With safety film. Don’t hang them in CrossFit and wall ball zones.'],
    storage: ['Equipment shelving 1.5 m', 'Shelving'],
    bench: ['Bench with coat rack 1.2 m', 'Bench'],
    column: ['Column / obstacle', 'Column'],
    bands: ['Resistance bands, set of 5'],
    blocks: ['Yoga blocks, pair'],
    strap: ['Yoga strap'],
    bolster: ['Bolster'],
    roller: ['Foam roller'],
    jumprope: ['Speed jump rope'],
    kb16: ['Kettlebell 16 kg'],
    dbadj: ['Adjustable dumbbells 2×20 kg'],
    medball: ['Wall ball 6–9 kg'],
    chalk: ['Chalk and hand grips'],
    timer: ['Gym timer'],
    lunge: ['Spotting belt (lunge)'],
    aidkit: ['First aid kit'],
  };
  for (const c of CATALOG) {
    const t = C[c.id];
    if (!t) continue;
    c.name = t[0];
    if (t[1]) c.short = t[1];
    if (t[2]) c.note = t[2];
  }

  // id: [name, note]
  const M = {
    'cf-mini': ['Pull-up bar on the wall', 'Pull-ups, hangs, leg raises. 2×2 m of rubber underfoot.'],
    'cf-home': ['Pull-up bar and free weights', 'Home strength: pull-ups, a kettlebell, adjustable dumbbells.'],
    'cf-station': ['Station: bar, rings, kettlebells', 'Two wall-mounted stations and a kettlebell rack.'],
    'cf-wod': ['WOD zone: plyo, wall ball, kettlebells', 'A target on the wall, box jumps, kettlebells.'],
    'cf-cardio': ['Cardio: 2 rowers and an air bike', 'The machines can stand on a regular floor.'],
    'cf-lift': ['Power rack and platform', 'Squat, press and pull in the rack; snatch and clean & jerk on the platform.'],
    'cf-rig': ['4-station rig', 'Free-standing rig on 6×5.2 m of rubber.'],
    'str-mini': ['Stretching spot', 'A mat, bands and a roller: splits, bridges, foam rolling.'],
    'str-wall': ['Wall bars and a mat', 'Stretching with support, hangs, forward folds.'],
    'str-barre': ['Barre and mirrors', 'Two 2 m barres against 4.2 m of mirrors.'],
    'str-group': ['Stretching for 6', 'Mirrors, two barres, wall bars and 6 mats.'],
    'yoga-mini': ['Practice mat', 'A mat, blocks, a strap and a bolster for one.'],
    'yoga-wall': ['Yoga wall and 3 mats', 'Iyengar-style practice with straps.'],
    'yoga-6': ['Group of 6 mats', '2 rows of 3, ≈2 m² per person.'],
    'yoga-12': ['Group of 12 mats', '4 rows of 3.'],
    'acro-mini': ['Handstands', 'Canes on tatami, a metre clear all round.'],
    'acro-tramp': ['Trampoline with landing', 'A mini trampoline and a crash mat in the landing zone.'],
    'acro-hoop': ['Aerial hoop over a mat'],
    'acro-aerial': ['Silks over a mat', 'A rigging point, 4×4 m swing zone.'],
    'acro-olympic': ['Olympic trampoline', 'FIG trampoline on tatami, crash mats at both ends. Ceiling 8 m or more.'],
    'acro-track': ['Air track on tatami', '6 m track, 1.2 m run-out at each end.'],
    'ay-pair': ['Pad for a trio', 'Base, flyer, spotter; a mat next to it for dismounts.'],
    'ay-group': ['Group: 4 trios', 'Four 2×2 m pads 0.5 m apart.'],
    'ma-wingchun': ['Wing Chun corner', 'A wooden dummy on 3 × 3 m of tatami with room for footwork.'],
    'room-entry': ['Entrance with changing area', 'A door, a bench with coat rack and shelving along one wall.'],
  };
  for (const m of MODULES) {
    const t = M[m.id];
    if (!t) continue;
    m.name = t[0];
    if (t[1]) m.note = t[1];
  }
  const T = {
    mini: 'Mini: pull-up bar and stretching', home: 'Home corner', studio: 'Yoga and stretching studio',
    box: 'CrossFit box', acro: 'Acrobatics and acroyoga', multi: 'LifeBoost: multi-purpose gym', raft: 'Raft on the Luga river', 'raft-oly': 'Raft with an Olympic trampoline', empty: 'Empty room',
  };
  for (const t of TEMPLATES) t.name = T[t.id] || t.name;
}

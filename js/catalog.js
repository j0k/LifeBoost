// Каталог: всё, что можно поставить в зал. Размеры в сантиметрах, цены в рублях (диапазон «эконом – проф», 2026).
// w × d — размер в плане без поворота; m — зона безопасности [сверху, справа, снизу, слева] в тех же осях.
// У настенных (kind: wall/door) «верх» — сторона, прижатая к стене; elev — [высота низа, высота] на развёртке стены.
// h — потолок [минимум, рекомендуется]; cap — сколько человек занимается одновременно, по направлениям.

const DISC = {
  acro: { name: 'Акробатика', color: 'var(--c-acro)' },
  ay:   { name: 'Акройога',   color: 'var(--c-ay)' },
  yoga: { name: 'Йога',       color: 'var(--c-yoga)' },
  str:  { name: 'Растяжка',   color: 'var(--c-str)' },
  cf:   { name: 'Кроссфит',   color: 'var(--c-cf)' },
  ma:   { name: 'Единоборства', color: 'var(--c-ma)' },
  base: { name: 'Помещение',  color: 'var(--c-base)' },
};
const CAP_DISC = ['acro', 'ay', 'yoga', 'str', 'cf', 'ma'];

const FLOORS = {
  tatami: 'татами',
  rubber: 'резиновое покрытие',
  hard: 'спортивное покрытие',
};

const GROUPS = [
  { id: 'floor', name: 'Покрытия' },
  { id: 'acro', name: 'Акробатика' },
  { id: 'ay', name: 'Акройога' },
  { id: 'yoga', name: 'Йога' },
  { id: 'str', name: 'Растяжка' },
  { id: 'cf', name: 'Кроссфит и сила' },
  { id: 'ma', name: 'Единоборства' },
  { id: 'room', name: 'Помещение' },
  { id: 'kit', name: 'Мелкий инвентарь' },
];

const CATALOG = [
  // ---------- Покрытия ----------
  { id: 'tatami', grp: 'floor', disc: 'base', kind: 'floor', ft: 'tatami', name: 'Татами 4 см', short: 'Татами',
    w: 400, d: 400, resize: true, unit: 'm2', price: [1800, 4500],
    note: 'EVA «ласточкин хвост» дешевле, татами ППЕ 100×100 плотнее и не разъезжается. Для акробатики и акройоги не тоньше 4 см.' },
  { id: 'rubber', grp: 'floor', disc: 'base', kind: 'floor', ft: 'rubber', name: 'Резиновое покрытие 20 мм', short: 'Резина',
    w: 400, d: 300, resize: true, unit: 'm2', price: [2200, 5500],
    note: 'Под кроссфит обязательно: штанга, гири и прыжки. Под помост берут 30–40 мм.' },
  { id: 'hardfloor', grp: 'floor', disc: 'base', kind: 'floor', ft: 'hard', name: 'Спортивный линолеум', short: 'Спорт. пол',
    w: 500, d: 400, resize: true, unit: 'm2', price: [1400, 3800],
    note: 'Тёплый и моется, подходит для йоги и растяжки. Если в зале уже паркет, не нужен.' },

  // ---------- Акробатика ----------
  { id: 'airtrack', grp: 'acro', disc: 'acro', kind: 'mat', name: 'Акро-дорожка (air track) 6×2 м', short: 'Air track',
    w: 600, d: 200, hgt: 20, m: [60, 120, 60, 120], softOk: true, landing: true, h: [350, 450], cap: { acro: 4 }, price: [45000, 130000],
    note: 'Рондаты и перевороты по длинной оси, на торцах нужен запас. В комплект нужен электронасос.' },
  { id: 'gymmat', grp: 'acro', disc: 'acro', kind: 'mat', name: 'Мат гимнастический 2×1×0,1 м', short: 'Мат 2×1',
    w: 200, d: 100, hgt: 10, m: [30, 30, 30, 30], softOk: true, h: [250, 300], cap: { acro: 1, str: 1 }, price: [6000, 14000] },
  { id: 'crash', grp: 'acro', disc: 'acro', kind: 'mat', name: 'Страховочный мат 2×2×0,3 м', short: 'Страх. мат',
    w: 200, d: 200, hgt: 30, landing: true, price: [30000, 70000],
    note: 'Кладётся под точку подвеса, канат и в зону приземления с трамплина.' },
  { id: 'canes', grp: 'acro', disc: 'acro', kind: 'equip', name: 'Стойки для стоек на руках (канны)', short: 'Канны',
    w: 60, d: 60, hgt: 90, m: [100, 100, 100, 100], softOk: true, needFloor: 'tatami', h: [260, 300], cap: { acro: 1 }, price: [6000, 20000] },
  { id: 'minitramp', grp: 'acro', disc: 'acro', kind: 'equip', name: 'Мини-трамплин', short: 'Трамплин',
    w: 110, d: 110, hgt: 60, m: [80, 300, 80, 80], softOk: true, h: [400, 450], cap: { acro: 2 }, price: [25000, 70000],
    note: 'Прыжок вправо (по стрелке): зона приземления 3 м, положите туда страховочный мат.' },
  { id: 'olytramp', grp: 'acro', disc: 'acro', kind: 'equip', name: 'Олимпийский батут 5,05×2,91 м (сетка 4,28×2,14)', short: 'Олимп. батут',
    w: 505, d: 291, hgt: 116, m: [150, 200, 150, 200], softOk: true, h: [800, 1000], cap: { acro: 1 }, price: [1500000, 3500000],
    note: 'Стандарт FIG: рама 5,05 × 2,91 м, высота 1,155 м. Над сеткой нужно 8 м, лучше 10. На торцах страховочные столы или маты 2 м, по бокам маты. Прыгает один человек, рядом страхующий.' },
  { id: 'wallpad', grp: 'acro', disc: 'acro', kind: 'wall', soft: true, name: 'Мат настенный 2 м (мягкая защита стены)', short: 'Мат на стене',
    w: 200, d: 5, hgt: 200, elev: [0, 200], resize: 'w', unit: 'm', price: [6000, 14000],
    note: 'Поролон 5 см в тенте ПВХ, крепится на стену. Ставят у батутов, air track, за кольцами и полотнами: если зона безопасности упирается в стену, мат её защищает.' },
  { id: 'silks', grp: 'acro', disc: 'acro', kind: 'ceil', name: 'Точка подвеса: полотна', short: 'Полотна',
    w: 30, d: 30, m: [185, 185, 185, 185], needMat: true, h: [450, 600], cap: { acro: 1 }, price: [25000, 60000],
    note: 'Закладная или балка с паспортом нагрузки от 10 кН (≈1 т), вертлюг, «восьмёрка». Перекрытие проверяет инженер.' },
  { id: 'hoop', grp: 'acro', disc: 'acro', kind: 'ceil', name: 'Точка подвеса: воздушное кольцо', short: 'Кольцо',
    w: 30, d: 30, m: [135, 135, 135, 135], needMat: true, h: [400, 500], cap: { acro: 1 }, price: [20000, 50000],
    note: 'Закладная от 10 кН, вертлюг, стропа регулируемой длины.' },

  // ---------- Акройога ----------
  { id: 'aypad', grp: 'ay', disc: 'ay', kind: 'mat', name: 'Площадка акройоги 2×2 м (татами 4 см)', short: 'Акройога',
    w: 200, d: 200, hgt: 4, m: [50, 50, 50, 50], softOk: true, h: [320, 400], cap: { ay: 3 }, price: [7000, 18000],
    note: 'Тройка: база, флаер, страхующий. Для стоек на плечах нужен потолок от 4 м.' },
  { id: 'aycrash', grp: 'ay', disc: 'ay', kind: 'mat', name: 'Мат для страховки 2×1×0,2 м', short: 'Мат 0,2',
    w: 200, d: 100, hgt: 20, softOk: true, landing: true, price: [12000, 26000] },

  // ---------- Йога ----------
  { id: 'yogamat', grp: 'yoga', disc: 'yoga', kind: 'mat', name: 'Коврик для йоги 183×61', short: 'Коврик',
    w: 183, d: 61, hgt: 1, m: [40, 25, 40, 25], h: [240, 260], cap: { yoga: 1, str: 1 }, price: [1500, 7000],
    note: 'Между ковриками по ширине ~40 см, по длине ~25 см: ≈2 м² на человека.' },
  { id: 'yogawall', grp: 'yoga', disc: 'yoga', kind: 'wall', name: 'Йога-стена (ремни на анкерах) 2 м', short: 'Йога-стена',
    w: 200, d: 15, hgt: 220, elev: [0, 220], m: [0, 30, 180, 30], softOk: true, h: [260, 280], cap: { yoga: 3 }, price: [15000, 40000],
    note: 'Анкеры на 30 и 210 см, стена несущая или усиленная.' },

  // ---------- Растяжка ----------
  { id: 'wallbars', grp: 'str', disc: 'str', kind: 'wall', name: 'Шведская стенка 0,9 × 2,4 м', short: 'Шв. стенка',
    w: 90, d: 15, hgt: 240, elev: [0, 240], m: [0, 20, 120, 20], softOk: true, h: [260, 270], cap: { str: 1 }, price: [9000, 28000] },
  { id: 'barre', grp: 'str', disc: 'str', kind: 'wall', name: 'Хореографический станок 2 м, 2 уровня', short: 'Станок',
    w: 200, d: 40, hgt: 110, elev: [75, 35], m: [0, 20, 80, 20], softOk: true, cap: { str: 3 }, price: [5000, 14000] },
  { id: 'splits', grp: 'str', disc: 'str', kind: 'equip', name: 'Тренажёр для шпагата', short: 'Шпагат',
    w: 90, d: 60, hgt: 60, m: [40, 60, 40, 60], cap: { str: 1 }, price: [8000, 25000] },

  // ---------- Кроссфит и сила ----------
  { id: 'homebar', grp: 'cf', disc: 'cf', kind: 'wall', name: 'Турник настенный', short: 'Турник',
    w: 120, d: 60, hgt: 230, elev: [210, 30], m: [0, 30, 100, 30], h: [240, 260], cap: { cf: 1 }, price: [3000, 12000],
    note: 'Перекладина на 2,1–2,3 м, над ней хотя бы 30 см до потолка. Крепёж в бетон или кирпич.' },
  { id: 'wallrig', grp: 'cf', disc: 'cf', kind: 'wall', name: 'Настенный турник + кольца, 2 станции', short: 'Настен. рама',
    w: 240, d: 120, hgt: 260, elev: [220, 40], m: [0, 40, 150, 40], needFloor: 'rubber', h: [320, 350], cap: { cf: 2 }, price: [40000, 100000] },
  { id: 'rig', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Функциональная рама (рига), 4 станции', short: 'Рига',
    w: 400, d: 160, hgt: 270, m: [150, 60, 150, 60], needFloor: 'rubber', h: [330, 360], cap: { cf: 6 }, price: [150000, 400000],
    note: 'Киппинг и выходы силой: спереди и сзади ≈1,5 м, над перекладиной не меньше 60 см. Анкеры в пол.' },
  { id: 'rack', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Силовая стойка + штанга с бамперами', short: 'Стойка',
    w: 150, d: 130, hgt: 230, m: [60, 100, 150, 100], needFloor: 'rubber', h: [290, 320], cap: { cf: 2 }, price: [70000, 200000],
    note: 'Снизу (по стрелке) выход со штангой, нужно 1,5 м.' },
  { id: 'platform', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Помост для тяжёлой атлетики 2×2 м', short: 'Помост',
    w: 200, d: 200, hgt: 5, m: [80, 80, 80, 80], h: [300, 340], cap: { cf: 1 }, price: [25000, 70000],
    note: 'Рывок и толчок: штангу бросают с прямых рук, вокруг 0,8 м свободно.' },
  { id: 'rower', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Гребной тренажёр', short: 'Гребля',
    w: 245, d: 60, hgt: 50, m: [40, 60, 40, 100], cap: { cf: 1 }, price: [55000, 160000] },
  { id: 'bike', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Эйр-байк', short: 'Эйр-байк',
    w: 130, d: 65, hgt: 130, m: [50, 50, 50, 50], cap: { cf: 1 }, price: [45000, 120000] },
  { id: 'kbrack', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Стойка с гирями 8–32 кг', short: 'Гири',
    w: 120, d: 45, hgt: 80, m: [30, 30, 60, 30], needFloor: 'rubber', price: [35000, 90000] },
  { id: 'dbrack', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Стойка с гантелями 2,5–25 кг', short: 'Гантели',
    w: 140, d: 60, hgt: 90, m: [30, 30, 60, 30], needFloor: 'rubber', price: [40000, 120000] },
  { id: 'plyo', grp: 'cf', disc: 'cf', kind: 'equip', name: 'Плиобоксы (3 шт)', short: 'Плио',
    w: 76, d: 61, hgt: 76, m: [100, 100, 100, 100], needFloor: 'rubber', h: [290, 310], cap: { cf: 1 }, price: [10000, 30000] },
  { id: 'wallball', grp: 'cf', disc: 'cf', kind: 'wall', name: 'Мишень для бросков мяча 3,05 м', short: 'Wall ball',
    w: 60, d: 10, hgt: 320, elev: [280, 50], m: [0, 60, 250, 60], h: [330, 360], cap: { cf: 2 }, price: [12000, 35000],
    note: 'Мишень на 3,05 м (у женщин 2,74 м). Рядом не должно быть зеркал и ламп без сетки.' },
  { id: 'rope', grp: 'cf', disc: 'cf', kind: 'ceil', name: 'Канат для лазания 4,5 м', short: 'Канат',
    w: 30, d: 30, m: [85, 85, 85, 85], needMat: true, h: [480, 520], cap: { cf: 1 }, price: [15000, 35000],
    note: 'Закладная от 10 кН, под канатом страховочный мат.' },

  // ---------- Единоборства ----------
  { id: 'mookjong', grp: 'ma', disc: 'ma', kind: 'equip', name: 'Деревянный манекен винь-чунь (мук-ян-чонг) на раме', short: 'Мук-ян-чонг',
    w: 130, d: 70, hgt: 175, m: [20, 60, 120, 60], cap: { ma: 1 }, price: [35000, 120000],
    note: 'Ствол Ø 23 см, три руки и нога. Рама гасит удары: ставят на пол или крепят к стене. Спереди (по стрелке) нужно 1,2 м для работы ног.' },

  // ---------- Помещение ----------
  { id: 'door', grp: 'room', disc: 'base', kind: 'door', name: 'Дверь 0,9 м', short: 'Дверь',
    w: 90, d: 10, elev: [0, 210], m: [0, 0, 110, 0], price: [0, 0] },
  { id: 'door2', grp: 'room', disc: 'base', kind: 'door', name: 'Двустворчатая дверь 1,5 м', short: 'Дверь',
    w: 150, d: 10, elev: [0, 210], m: [0, 0, 130, 0], price: [0, 0] },
  { id: 'window', grp: 'room', disc: 'base', kind: 'wall', flat: true, name: 'Окно', short: 'Окно',
    w: 150, d: 6, elev: [90, 150], resize: 'w', price: [0, 0] },
  { id: 'mirror', grp: 'room', disc: 'base', kind: 'wall', flat: true, name: 'Зеркала h 2 м, ударопрочные', short: 'Зеркала',
    w: 300, d: 4, elev: [20, 200], resize: 'w', unit: 'm', price: [7000, 14000],
    note: 'С защитной плёнкой. Не вешайте в зоне кроссфита и бросков мяча.' },
  { id: 'storage', grp: 'room', disc: 'base', kind: 'wall', name: 'Стеллаж для инвентаря 1,5 м', short: 'Стеллаж',
    w: 150, d: 45, hgt: 180, elev: [0, 180], m: [0, 0, 70, 0], price: [8000, 25000] },
  { id: 'bench', grp: 'room', disc: 'base', kind: 'wall', name: 'Скамья с вешалкой 1,2 м', short: 'Скамья',
    w: 120, d: 40, hgt: 170, elev: [0, 170], m: [0, 0, 60, 0], price: [6000, 20000] },
  { id: 'column', grp: 'room', disc: 'base', kind: 'obst', name: 'Колонна / препятствие', short: 'Колонна',
    w: 40, d: 40, resize: true, price: [0, 0] },

  // ---------- Мелкий инвентарь: на плане не рисуется, только в закупке ----------
  { id: 'bands', grp: 'kit', disc: 'str', kind: 'kit', name: 'Резиновые петли, набор 5 шт', price: [1500, 5000] },
  { id: 'blocks', grp: 'kit', disc: 'yoga', kind: 'kit', name: 'Кирпичи для йоги, пара', price: [600, 2000] },
  { id: 'strap', grp: 'kit', disc: 'yoga', kind: 'kit', name: 'Ремень для йоги', price: [300, 1000] },
  { id: 'bolster', grp: 'kit', disc: 'yoga', kind: 'kit', name: 'Болстер', price: [1500, 4500] },
  { id: 'roller', grp: 'kit', disc: 'str', kind: 'kit', name: 'МФР-ролик', price: [800, 3500] },
  { id: 'jumprope', grp: 'kit', disc: 'cf', kind: 'kit', name: 'Скакалка скоростная', price: [600, 3000] },
  { id: 'kb16', grp: 'kit', disc: 'cf', kind: 'kit', name: 'Гиря 16 кг', price: [3000, 7000] },
  { id: 'dbadj', grp: 'kit', disc: 'cf', kind: 'kit', name: 'Гантели разборные 2×20 кг', price: [5000, 15000] },
  { id: 'medball', grp: 'kit', disc: 'cf', kind: 'kit', name: 'Мяч для wall ball 6–9 кг', price: [3000, 8000] },
  { id: 'chalk', grp: 'kit', disc: 'cf', kind: 'kit', name: 'Магнезия и накладки на ладони', price: [1500, 4000] },
  { id: 'timer', grp: 'kit', disc: 'cf', kind: 'kit', name: 'Табло-таймер', price: [6000, 20000] },
  { id: 'lunge', grp: 'kit', disc: 'acro', kind: 'kit', name: 'Страховочный пояс (лонжа)', price: [8000, 25000] },
  { id: 'aidkit', grp: 'kit', disc: 'base', kind: 'kit', name: 'Аптечка', price: [1500, 4000] },
];
const CAT = Object.fromEntries(CATALOG.map((c) => [c.id, c]));

// Цены рынка США, доллары, 2026 (вилка «budget – pro»). Тоже ориентир: сверяйте с поставщиками.
const PRICE_US = {
  tatami: [30, 60], olytramp: [12000, 28000], wallpad: [150, 350], mookjong: [500, 1600], rubber: [35, 75], hardfloor: [25, 60],
  airtrack: [700, 2000], gymmat: [120, 300], crash: [500, 1200], canes: [100, 400], minitramp: [400, 1200],
  silks: [400, 1000], hoop: [300, 800],
  aypad: [150, 350], aycrash: [200, 450],
  yogamat: [25, 130], yogawall: [300, 900],
  wallbars: [200, 600], barre: [100, 350], splits: [150, 450],
  homebar: [60, 250], wallrig: [700, 2000], rig: [2500, 8000], rack: [1200, 4000], platform: [400, 1500],
  rower: [700, 1300], bike: [800, 1500], kbrack: [700, 1800], dbrack: [800, 2500], plyo: [150, 450],
  wallball: [150, 500], rope: [150, 400],
  mirror: [150, 300], storage: [150, 500], bench: [150, 450],
  bands: [25, 80], blocks: [15, 40], strap: [8, 20], bolster: [35, 90], roller: [15, 60], jumprope: [15, 50],
  kb16: [50, 110], dbadj: [150, 400], medball: [60, 140], chalk: [25, 60], timer: [100, 350], lunge: [150, 400], aidkit: [25, 60],
};
for (const c of CATALOG) c.usd = PRICE_US[c.id] || [0, 0];

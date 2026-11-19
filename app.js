'use strict';
/* ==========================================================
   Pixel Habits – alles lokal im Browser (localStorage)
   ========================================================== */

const LS_KEY = 'pixelhabits.v1';
const COLORS = ['#4caf6d', '#3f8fd8', '#e8913a', '#d75f93', '#8a6bd8', '#2fa79c', '#d6ad2b', '#7c8798'];
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtNum = n => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 });

/* ---------- Pixel-Icons ---------- */
function pix(rows, cls = 'px') {
  const h = rows.length, w = rows[0].length;
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }));
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${r}</svg>`;
}
const ICON = {
  check: pix(['.......', '......#', '.....##', '#...##.', '##.##..', '.###...', '..#....']),
  miss: pix(['#...#', '.#.#.', '..#..', '.#.#.', '#...#']),
  left: pix(['..#', '.##', '###', '.##', '..#']),
  right: pix(['#..', '##.', '###', '##.', '#..']),
  up: pix(['..#..', '.###.', '#####', '..#..', '..#..']),
  down: pix(['..#..', '..#..', '#####', '.###.', '..#..']),
  edit: pix(['....##', '...#.#', '..#.#.', '.#.#..', '##.#..', '###...']),
  heart: pix(['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....']),
};

/* ---------- Datum ---------- */
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const todayKey = () => key(new Date());
const thisMonday = () => key(mondayOf(new Date()));
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 864e5 + 1) / 7);
}
const fmtDay = d => `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
const fmtDate = k => { const d = parse(k); return `${DAYS[(d.getDay() + 6) % 7]}, ${fmtDay(d)} ${d.getFullYear()}`; };
function fmtRange(mon) {
  const sun = addDays(mon, 6);
  return mon.getMonth() === sun.getMonth()
    ? `${mon.getDate()}.–${sun.getDate()}. ${MONTHS[sun.getMonth()]} ${sun.getFullYear()}`
    : `${fmtDay(mon)} – ${fmtDay(sun)} ${sun.getFullYear()}`;
}

/* ---------- Speicher ---------- */
function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  const okKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
  return {
    v: 1,
    habits: (Array.isArray(d.habits) ? d.habits : []).filter(h => h && h.id).map(h => ({
      id: String(h.id), name: String(h.name || 'Habit'),
      target: Math.min(7, Math.max(1, parseInt(h.target, 10) || 7)),
      color: h.color || COLORS[0], created: okKey(h.created) ? h.created : todayKey(),
    })),
    done: d.done && typeof d.done === 'object' ? d.done : {},
    counters: (Array.isArray(d.counters) ? d.counters : []).filter(c => c && c.id).map(c => ({
      id: String(c.id), name: String(c.name || 'Zähler'), color: c.color || COLORS[1],
      view: ['today', 'week', 'total'].includes(c.view) ? c.view : 'today',
      created: okKey(c.created) ? c.created : todayKey(),
    })),
    counts: d.counts && typeof d.counts === 'object' ? d.counts : {},
    ui: d.ui && typeof d.ui === 'object' ? d.ui : {},
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* leer starten */ }
  return normalize({});
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
  catch (e) { toast('Speichern fehlgeschlagen!'); }
}

let S = load();
const ui = {
  page: ['tracker', 'counter', 'stats'].includes(S.ui.page) ? S.ui.page : 'tracker',
  sel: S.ui.sel || 'overview',
  week: thisMonday(),
  range: { habit: 1, counter: 1 },
  centerStrip: true, stripScroll: null, slide: null, swipedAt: 0,
};
function persistUi() { S.ui = { page: ui.page, sel: ui.sel }; save(); }

/* ---------- Habit-Logik ---------- */
const isDone = (h, k) => !!(S.done[h.id] && S.done[h.id][k]);
const freqLabel = t => t >= 7 ? 'täglich' : `${t}× / Woche`;
function toggleDone(h, k) {
  const m = S.done[h.id] || (S.done[h.id] = {});
  if (m[k]) delete m[k];
  else { m[k] = 1; if (k < h.created) h.created = k; } // Nachtragen vor Anlage erlaubt
  save();
}

/** Bewertet eine Woche: ok | fail | open | future | none */
function weekEval(h, mon) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => key(addDays(mon, i)));
  const active = days.filter(k => k >= h.created);
  if (!active.length) return { state: 'none', done: 0, target: 0, missing: 0 };
  const target = Math.min(h.target, active.length); // angebrochene erste Woche anteilig
  const done = days.filter(k => isDone(h, k)).length;
  let state;
  if (done >= target) state = 'ok';
  else if (days[6] < today) state = 'fail';
  else if (days[0] > today) state = 'future';
  else {
    const left = days.filter(k => k >= today && k >= h.created && !isDone(h, k)).length;
    state = done + left < target ? 'fail' : 'open'; // nicht mehr schaffbar = verfehlt
  }
  return { state, done, target, missing: Math.max(0, target - done) };
}

function habitStats(h) {
  const ws = [];
  const end = parse(thisMonday());
  for (let m = mondayOf(parse(h.created)); m <= end; m = addDays(m, 7)) ws.push(weekEval(h, m));
  const closed = ws.filter(e => e.state === 'ok' || e.state === 'fail');
  const ok = closed.filter(e => e.state === 'ok').length;
  let cur = 0;
  for (let i = ws.length - 1; i >= 0; i--) {
    if (i === ws.length - 1 && ws[i].state === 'open') continue;
    if (ws[i].state === 'ok') cur++; else break;
  }
  let best = 0, run = 0;
  for (const e of ws) { if (e.state === 'ok') best = Math.max(best, ++run); else if (e.state === 'fail') run = 0; }
  const keys = Object.keys(S.done[h.id] || {});
  const wd = [0, 0, 0, 0, 0, 0, 0];
  keys.forEach(k => wd[(parse(k).getDay() + 6) % 7]++);
  return { rate: closed.length ? ok / closed.length : null, ok, closedN: closed.length, cur, best, total: keys.length, wd };
}

/* ---------- Zähler-Logik ---------- */
const cnt = (c, k) => (S.counts[c.id] && S.counts[c.id][k]) || 0;
function bump(c, d) {
  const m = S.counts[c.id] || (S.counts[c.id] = {});
  const k = todayKey();
  const v = (m[k] || 0) + d;
  if (v <= 0) delete m[k]; else m[k] = v;
  save();
}
function counterTotals(c) {
  const m = S.counts[c.id] || {};
  const today = todayKey(), mon = thisMonday();
  let total = 0, week = 0, max = 0, maxDay = null;
  for (const [k, v] of Object.entries(m)) {
    total += v;
    if (k >= mon && k <= today) week += v;
    if (v > max) { max = v; maxDay = k; }
  }
  return { total, week, today: m[today] || 0, max, maxDay };
}

/* ==========================================================
   Rendering
   ========================================================== */
function render() {
  const strip = $('#strip');
  if (strip) ui.stripScroll = strip.scrollLeft;
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.page === ui.page));
  const app = $('#app');
  app.innerHTML = ui.page === 'tracker' ? renderTracker() : ui.page === 'counter' ? renderCounters() : renderStats();
  afterRender();
}

function afterRender() {
  const strip = $('#strip');
  if (strip) {
    const sel = $('.wchip.sel', strip);
    if ((ui.centerStrip || ui.stripScroll == null) && sel) strip.scrollLeft = sel.offsetLeft - strip.clientWidth / 2 + sel.offsetWidth / 2;
    else strip.scrollLeft = ui.stripScroll;
    ui.centerStrip = false;
  }
  if (ui.slide) { const g = $('#hgrid'); if (g) g.classList.add(ui.slide); ui.slide = null; }
  $$('.hscroll').forEach(x => { x.scrollLeft = x.scrollWidth; });
}

/* ---------- Seite 1: Tracker ---------- */
function renderTracker() {
  if (!S.habits.length) {
    return `<section class="panel empty"><div class="art">${ICON.heart}</div>
      <h2>Noch keine Habits</h2>
      <p>Leg dein erstes Habit an – täglich oder z. B. 3× pro Woche.</p>
      <div class="row center"><button class="btn primary" data-act="add-habit">+ Erstes Habit</button>
      <button class="btn" data-act="demo">Beispieldaten laden</button></div></section>`;
  }
  const mon = parse(ui.week), today = todayKey(), isCur = ui.week === thisMonday();
  const keys = Array.from({ length: 7 }, (_, i) => key(addDays(mon, i)));
  const evs = S.habits.map(h => weekEval(h, mon));
  const rel = evs.filter(e => e.state !== 'none');
  const okN = rel.filter(e => e.state === 'ok').length;
  const failN = rel.filter(e => e.state === 'fail').length;
  const pct = rel.length ? Math.round(okN / rel.length * 100) : 0;

  let grid = `<div class="hc corner"><b>${okN}/${rel.length}</b><span>erfüllt</span></div>`;
  grid += keys.map((k, i) => `<div class="hc dayh ${k === today ? 'is-today' : ''}"><span>${DAYS[i]}</span><b>${parse(k).getDate()}</b></div>`).join('');

  S.habits.forEach((h, hi) => {
    const e = evs[hi], st = e.state;
    const badge = st === 'none' ? '–'
      : st === 'ok' ? `${ICON.check} ${e.done}/${e.target}`
      : st === 'fail' ? `${e.done}/${e.target} <em>−${e.missing}</em>`
      : `${e.done}/${e.target}`;
    grid += `<button class="hc hname st-${st}" data-act="edit-habit" data-id="${h.id}" style="--c:${h.color}" title="${esc(h.name)} bearbeiten">
        <span class="nm">${esc(h.name)}</span>
        <span class="meta"><span class="freq">${freqLabel(h.target)}</span><span class="badge b-${st}">${badge}</span></span></button>`;
    grid += keys.map(k => {
      const done = isDone(h, k), fut = k > today;
      let cls = '';
      if (done) cls = 'done';
      else if (fut) cls = 'future';
      else if (k < h.created) cls = 'pre';
      else if (h.target >= 7 && k < today) cls = 'missed';          // tägliches Habit verpasst
      else if (st === 'fail' && k < today) cls = 'missed-soft';      // Wochenziel verfehlt
      const icon = done ? ICON.check : cls === 'missed' ? ICON.miss : '';
      return `<button class="hc cell ${cls} ${k === today ? 'is-today' : ''}" data-act="toggle" data-id="${h.id}" data-day="${k}"
        style="--c:${h.color}" ${fut ? 'disabled' : ''} aria-pressed="${done}" aria-label="${esc(h.name)}, ${fmtDate(k)}">${icon}</button>`;
    }).join('');
  });

  return `
  <section class="weekbar">
    <button class="btn sq" data-act="prev" aria-label="Vorherige Woche">${ICON.left}</button>
    <div class="weekinfo">
      <div class="kw">KW ${isoWeek(mon)}${isCur ? ' <span class="now">AKTUELL</span>' : ''}</div>
      <div class="range">${fmtRange(mon)}</div>
    </div>
    <button class="btn sq" data-act="next" aria-label="Nächste Woche">${ICON.right}</button>
  </section>
  <div class="strip" id="strip">${renderStrip()}</div>
  <section class="panel">
    <div class="weeksum">
      <div class="meter"><i style="width:${pct}%"></i></div>
      <span>${okN} von ${rel.length} erfüllt${failN ? ` · <b class="miss-t">${failN} verfehlt</b>` : ''}</span>
      ${isCur ? '' : '<button class="btn small" data-act="today">Zur aktuellen Woche</button>'}
    </div>
    <div class="hgrid" id="hgrid">${grid}</div>
    <button class="btn add" data-act="add-habit">+ Habit hinzufügen</button>
  </section>
  <div class="legend">
    <span><i class="cell done" style="--c:var(--accent)">${ICON.check}</i>erledigt</span>
    <span><i class="cell missed">${ICON.miss}</i>verpasst (täglich)</span>
    <span><i class="cell missed-soft"></i>Wochenziel verfehlt</span>
    <span><i class="cell is-today"></i>heute</span>
  </div>
  <p class="hint">Wischen oder ← → wechselt die Woche · Habit-Namen antippen zum Bearbeiten · vergangene Tage lassen sich nachtragen.</p>`;
}

function renderStrip() {
  const cm = parse(thisMonday());
  let start = addDays(cm, -7 * 25);
  const earliest = S.habits.reduce((a, h) => (h.created < a ? h.created : a), key(start));
  start = mondayOf(parse(earliest));
  if (daysBetween(key(start), key(cm)) > 7 * 156) start = addDays(cm, -7 * 156);
  const end = addDays(cm, 7 * 4);
  let out = '', prevMonth = -1;
  for (let m = start; m <= end; m = addDays(m, 7)) {
    const k = key(m);
    const evs = S.habits.map(h => weekEval(h, m)).filter(e => e.state !== 'none' && e.state !== 'future');
    const ok = evs.filter(e => e.state === 'ok').length;
    const fail = evs.some(e => e.state === 'fail');
    const p = evs.length ? ok / evs.length * 100 : 0;
    const mo = addDays(m, 3).getMonth();
    const label = mo !== prevMonth ? MONTHS[mo] : '';
    prevMonth = mo;
    const cls = [k === ui.week && 'sel', k === key(cm) && 'cur', m > cm && 'fut', evs.length && ok === evs.length && 'all', fail && 'hasfail'].filter(Boolean).join(' ');
    out += `<button class="wchip ${cls}" data-act="goto" data-week="${k}" title="KW ${isoWeek(m)} · ${fmtRange(m)}"><em>${label}</em><span>${isoWeek(m)}</span><i><b style="height:${p}%"></b></i></button>`;
  }
  return out;
}

/* ---------- Seite 2: Zähler ---------- */
function renderCounters() {
  const cards = S.counters.map(c => {
    const t = counterTotals(c);
    const v = c.view === 'total' ? t.total : c.view === 'week' ? t.week : t.today;
    const lbl = c.view === 'total' ? 'gesamt' : c.view === 'week' ? 'diese Woche' : 'heute';
    const sub = [c.view !== 'today' && `heute ${t.today}`, c.view !== 'week' && `Woche ${t.week}`, c.view !== 'total' && `gesamt ${t.total}`].filter(Boolean).join(' · ');
    return `<div class="ccard" data-cid="${c.id}" style="--c:${c.color}">
      <button class="cbump" data-act="bump" data-id="${c.id}" aria-label="${esc(c.name)} plus eins">
        <span class="cname">${esc(c.name)}</span><span class="cnum">${fmtNum(v)}</span><span class="clbl">${lbl}</span>
      </button>
      <div class="cfoot"><span class="csub">${sub}</span>
        <span class="cbtns"><button class="btn tiny" data-act="unbump" data-id="${c.id}" aria-label="minus eins">−1</button>
        <button class="btn tiny" data-act="edit-counter" data-id="${c.id}" aria-label="${esc(c.name)} bearbeiten">${ICON.edit}</button></span>
      </div></div>`;
  }).join('');
  const intro = S.counters.length ? '' : `<section class="panel empty"><div class="art">${ICON.heart}</div><h2>Noch keine Zähler</h2>
    <p>Zähler sind für alles, was du einfach nur hochzählen willst – Gläser Wasser, Kaffee, Klimmzug-Sätze …</p></section>`;
  return `${intro}<section class="cgrid">${cards}<button class="addcard" data-act="add-counter"><span>+</span>Zähler hinzufügen</button></section>`;
}

/* ---------- Seite 3: Statistik ---------- */
const tile = (v, l, s) => `<div class="tile"><div class="tv">${v}</div><div class="tl">${l}</div>${s ? `<div class="ts">${s}</div>` : ''}</div>`;
const rangeSeg = (kind, labels) => `<div class="seg">${labels.map((l, i) => `<button type="button" data-act="range" data-kind="${kind}" data-v="${i}" class="${ui.range[kind] === i ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const chip = (sel, name, color) => `<button class="chip ${ui.sel === sel ? 'on' : ''}" data-act="sel" data-sel="${sel}" style="--c:${color}"><i></i>${esc(name)}</button>`;

function renderStats() {
  const chips = [`<button class="chip ${ui.sel === 'overview' ? 'on' : ''}" data-act="sel" data-sel="overview">Übersicht</button>`];
  if (S.habits.length) chips.push('<span class="grp">Habits</span>', ...S.habits.map(h => chip('h:' + h.id, h.name, h.color)));
  if (S.counters.length) chips.push('<span class="grp">Zähler</span>', ...S.counters.map(c => chip('c:' + c.id, c.name, c.color)));
  let body = null;
  if (ui.sel.startsWith('h:')) { const h = S.habits.find(x => x.id === ui.sel.slice(2)); if (h) body = statsHabit(h); }
  else if (ui.sel.startsWith('c:')) { const c = S.counters.find(x => x.id === ui.sel.slice(2)); if (c) body = statsCounter(c); }
  if (!body) { ui.sel = 'overview'; body = statsOverview(); chips[0] = chips[0].replace('class="chip "', 'class="chip on"'); }
  return `<section class="selrow">${chips.join('')}</section>${body}`;
}

function niceMax(m) {
  if (m <= 5) return Math.max(1, Math.ceil(m));
  const p = 10 ** Math.floor(Math.log10(m)), f = m / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** Einfaches Balkendiagramm. items: [{label, value, target?, cls?, tip}] */
function barChart({ items, max, color, unit = '' }) {
  const m = max ?? niceMax(Math.max(1, ...items.map(i => Math.max(i.value, i.target || 0))));
  const ticks = Number.isInteger(m / 2) ? [0, m / 2, m] : [0, m];
  const n = items.length;
  const every = n <= 8 ? 1 : n <= 14 ? 2 : Math.ceil(n / 7);
  const cols = items.map(it => {
    const h = it.value / m * 100;
    const gapCls = it.cls === 'fail' ? 'g-fail' : it.cls === 'open' ? 'g-open' : '';
    const gap = gapCls && it.target > it.value ? (it.target - it.value) / m * 100 : 0;
    return `<div class="col" data-tip="${esc(it.tip)}"><div class="stack">${gap ? `<div class="gap ${gapCls}" style="height:${gap}%"></div>` : ''}<div class="bar ${it.cls || ''}" style="height:${h}%"></div></div></div>`;
  }).join('');
  return `<div class="chart" style="--c:${color}">
    <div class="yax">${ticks.map(t => `<span style="bottom:${t / m * 100}%">${fmtNum(t)}${unit}</span>`).join('')}</div>
    <div class="plot">${ticks.slice(1).map(t => `<i class="gl" style="bottom:${t / m * 100}%"></i>`).join('')}<div class="cols">${cols}</div></div>
    <div class="xax">${items.map((it, i) => `<span>${(n - 1 - i) % every === 0 ? esc(it.label) : ''}</span>`).join('')}</div>
  </div>`;
}

/** Kalender-Heatmap der letzten nWeeks Wochen. cellOf(k) -> {lvl 0-4, cls, tip} */
function heatmap({ nWeeks, color, cellOf }) {
  const cm = parse(thisMonday()), today = todayKey();
  const start = addDays(cm, -7 * (nWeeks - 1));
  let months = '', cells = '', prev = -1;
  for (let w = 0; w < nWeeks; w++) {
    const m = addDays(start, 7 * w), mo = m.getMonth();
    months += `<span>${mo !== prev ? MONTHS[mo] : ''}</span>`;
    prev = mo;
    for (let d = 0; d < 7; d++) {
      const k = key(addDays(m, d));
      if (k > today) { cells += '<i class="hx fut"></i>'; continue; }
      const c = cellOf(k);
      cells += `<i class="hx l${c.lvl} ${c.cls || ''}" data-tip="${esc(c.tip)}"></i>`;
    }
  }
  return `<div class="heat" style="--c:${color}">
    <div class="hdays"><span></span><span>Mo</span><span></span><span>Mi</span><span></span><span>Fr</span><span></span><span>So</span></div>
    <div class="hscroll"><div class="hmonths">${months}</div><div class="hcells">${cells}</div></div></div>`;
}

function statsOverview() {
  if (!S.habits.length && !S.counters.length) {
    return `<section class="panel empty"><div class="art">${ICON.heart}</div><h2>Noch nichts auszuwerten</h2>
      <p>Leg Habits oder Zähler an – hier erscheinen dann deine Statistiken.</p></section>`;
  }
  const cm = parse(thisMonday());
  let html = '';
  if (S.habits.length) {
    const items = [];
    let sumOk = 0, sumClosed = 0;
    for (let i = 11; i >= 0; i--) {
      const m = addDays(cm, -7 * i);
      const evs = S.habits.map(h => weekEval(h, m)).filter(e => e.state !== 'none');
      const ok = evs.filter(e => e.state === 'ok').length;
      sumOk += ok;
      sumClosed += evs.filter(e => e.state === 'ok' || e.state === 'fail').length;
      const pct = evs.length ? Math.round(ok / evs.length * 100) : 0;
      items.push({ label: 'KW' + isoWeek(m), value: pct, cls: i === 0 ? 'cur' : '', tip: `KW ${isoWeek(m)}: ${ok} von ${evs.length} Habits erfüllt (${pct} %)${i === 0 ? ' · läuft noch' : ''}` });
    }
    const nowEv = S.habits.map(h => weekEval(h, cm)).filter(e => e.state !== 'none');
    const stats = S.habits.map(h => ({ h, st: habitStats(h) }));
    const bestStreak = stats.reduce((a, b) => (b.st.cur > a.st.cur ? b : a), stats[0]);
    const cTotalToday = S.counters.reduce((s, c) => s + cnt(c, todayKey()), 0);
    html += `<div class="tiles">
      ${tile(`${nowEv.filter(e => e.state === 'ok').length}/${nowEv.length}`, 'Diese Woche', 'Habits erfüllt')}
      ${tile(sumClosed ? Math.round(sumOk / sumClosed * 100) + ' %' : '–', 'Quote 12 Wochen', 'aller Habit-Wochen')}
      ${tile(bestStreak.st.cur, 'Beste Serie', bestStreak.st.cur ? esc(bestStreak.h.name) : 'Wochen am Stück')}
      ${S.counters.length ? tile(fmtNum(cTotalToday), 'Zähler heute', 'Klicks gesamt') : ''}
    </div>
    <section class="panel"><div class="card-h"><h3>Anteil erfüllter Habits pro Woche</h3><span class="ts">letzte 12 Wochen</span></div>
      ${barChart({ items, max: 100, color: 'var(--accent)', unit: ' %' })}</section>
    <section class="panel"><div class="card-h"><h3>Habits</h3><span class="ts">Zeile antippen für Details</span></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Habit</th><th>Ziel</th><th class="num">Quote</th><th class="num">Serie</th><th>Letzte 8 Wochen</th></tr></thead><tbody>
      ${stats.map(({ h, st }) => {
        const mini = Array.from({ length: 8 }, (_, i) => `<i class="${weekEval(h, addDays(cm, -7 * (7 - i))).state}"></i>`).join('');
        return `<tr data-act="sel" data-sel="h:${h.id}"><td><span class="namecell" style="--c:${h.color}"><i></i>${esc(h.name)}</span></td>
          <td>${freqLabel(h.target)}</td><td class="num">${st.rate == null ? '–' : Math.round(st.rate * 100) + ' %'}</td><td class="num">${st.cur}</td><td><span class="mini">${mini}</span></td></tr>`;
      }).join('')}</tbody></table></div></section>`;
  }
  if (S.counters.length) {
    html += `<section class="panel"><div class="card-h"><h3>Zähler</h3></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Zähler</th><th class="num">Heute</th><th class="num">Woche</th><th class="num">Gesamt</th></tr></thead><tbody>
      ${S.counters.map(c => { const t = counterTotals(c); return `<tr data-act="sel" data-sel="c:${c.id}"><td><span class="namecell" style="--c:${c.color}"><i></i>${esc(c.name)}</span></td>
        <td class="num">${fmtNum(t.today)}</td><td class="num">${fmtNum(t.week)}</td><td class="num">${fmtNum(t.total)}</td></tr>`; }).join('')}
      </tbody></table></div></section>`;
  }
  return html;
}

function statsHabit(h) {
  const st = habitStats(h), cm = parse(thisMonday()), today = todayKey();
  const n = [8, 12, 26][ui.range.habit];
  const txt = { ok: 'erfüllt', fail: 'verfehlt', open: 'läuft noch', none: 'noch nicht angelegt', future: '' };
  const items = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = addDays(cm, -7 * i), ev = weekEval(h, m), kw = isoWeek(m);
    items.push({
      label: 'KW' + kw, value: ev.done, target: ev.target, cls: ev.state,
      tip: ev.state === 'none' ? `KW ${kw} · ${txt.none}` : `KW ${kw} · ${ev.done}/${ev.target} · ${txt[ev.state]}${ev.state === 'fail' ? ` (−${ev.missing})` : ''}`,
    });
  }
  const wdItems = st.wd.map((v, i) => ({ label: DAYS[i], value: v, tip: `${DAYS[i]}: ${v}× erledigt` }));
  const heat = heatmap({
    nWeeks: 26, color: h.color, cellOf: k => {
      const d = isDone(h, k), miss = !d && h.target >= 7 && k < today && k >= h.created;
      return { lvl: d ? 4 : 0, cls: miss ? 'miss' : k < h.created ? 'pre' : '', tip: `${fmtDate(k)} · ${d ? 'erledigt' : miss ? 'verpasst' : '–'}` };
    },
  });
  return `<div class="tiles">
      ${tile(st.rate == null ? '–' : Math.round(st.rate * 100) + ' %', 'Erfüllungsquote', `${st.ok} von ${st.closedN} Wochen`)}
      ${tile(st.cur, 'Aktuelle Serie', st.cur === 1 ? 'Woche erfüllt' : 'Wochen in Folge erfüllt')}
      ${tile(st.best, 'Rekord-Serie', 'Wochen am Stück')}
      ${tile(st.total, 'Gesamt erledigt', 'Ziel: ' + freqLabel(h.target))}
    </div>
    <section class="panel"><div class="card-h"><h3>Wochen-Verlauf</h3>${rangeSeg('habit', ['8 Wo.', '12 Wo.', '26 Wo.'])}</div>
      ${barChart({ items, max: 7, color: h.color })}
      <div class="clegend"><span><i class="lb" style="background:${h.color}"></i>erledigt</span><span><i class="lb g-fail"></i>fehlt zum Ziel</span><span><i class="lb g-open"></i>noch offen</span></div>
    </section>
    <div class="two">
      <section class="panel"><div class="card-h"><h3>Kalender</h3><span class="ts">letzte 26 Wochen</span></div>${heat}</section>
      <section class="panel"><div class="card-h"><h3>Nach Wochentag</h3><span class="ts">wie oft erledigt</span></div>${barChart({ items: wdItems, color: h.color })}</section>
    </div>`;
}

function statsCounter(c) {
  const t = counterTotals(c), today = todayKey(), m = S.counts[c.id] || {};
  const span = Math.max(1, daysBetween(c.created, today) + 1);
  const r = ui.range.counter, items = [];
  if (r < 2) {
    const n = r === 0 ? 14 : 30;
    for (let i = n - 1; i >= 0; i--) {
      const d = addDays(parse(today), -i), k = key(d), v = m[k] || 0;
      items.push({ label: `${d.getDate()}.${d.getMonth() + 1}.`, value: v, cls: i === 0 ? 'cur' : '', tip: `${fmtDate(k)}: ${fmtNum(v)}` });
    }
  } else {
    const cm = parse(thisMonday());
    for (let i = 11; i >= 0; i--) {
      const mo = addDays(cm, -7 * i);
      let s = 0;
      for (let j = 0; j < 7; j++) s += m[key(addDays(mo, j))] || 0;
      items.push({ label: 'KW' + isoWeek(mo), value: s, cls: i === 0 ? 'cur' : '', tip: `KW ${isoWeek(mo)}: ${fmtNum(s)}` });
    }
  }
  const wsum = [0, 0, 0, 0, 0, 0, 0], wcnt = [0, 0, 0, 0, 0, 0, 0];
  for (let d = parse(c.created); key(d) <= today; d = addDays(d, 1)) { const i = (d.getDay() + 6) % 7; wcnt[i]++; wsum[i] += m[key(d)] || 0; }
  const wd = wsum.map((s, i) => { const avg = wcnt[i] ? Math.round(s / wcnt[i] * 10) / 10 : 0; return { label: DAYS[i], value: avg, tip: `${DAYS[i]}: Ø ${fmtNum(avg)} (${wcnt[i]} Tage)` }; });
  const max = Math.max(1, ...Object.values(m));
  const heat = heatmap({
    nWeeks: 26, color: c.color, cellOf: k => {
      const v = m[k] || 0;
      return { lvl: v ? Math.min(4, Math.ceil(v / max * 4)) : 0, cls: k < c.created ? 'pre' : '', tip: `${fmtDate(k)}: ${fmtNum(v)}` };
    },
  });
  return `<div class="tiles">
      ${tile(fmtNum(t.today), 'Heute')}
      ${tile(fmtNum(t.week), 'Diese Woche')}
      ${tile(fmtNum(t.total), 'Gesamt', 'seit ' + fmtDay(parse(c.created)))}
      ${tile(fmtNum(Math.round(t.total / span * 10) / 10), 'Ø pro Tag', `über ${span} Tage`)}
      ${tile(fmtNum(t.max), 'Rekord-Tag', t.maxDay ? fmtDate(t.maxDay) : '–')}
    </div>
    <section class="panel"><div class="card-h"><h3>Verlauf</h3>${rangeSeg('counter', ['14 Tage', '30 Tage', '12 Wo.'])}</div>
      ${barChart({ items, color: c.color })}</section>
    <div class="two">
      <section class="panel"><div class="card-h"><h3>Kalender</h3><span class="ts">letzte 26 Wochen</span></div>${heat}</section>
      <section class="panel"><div class="card-h"><h3>Nach Wochentag</h3><span class="ts">Durchschnitt pro Tag</span></div>${barChart({ items: wd, color: c.color })}</section>
    </div>`;
}

/* ==========================================================
   Modals
   ========================================================== */
const modal = $('#modal');
function openModal(html, onClick, onSubmit) {
  modal.innerHTML = `<form class="mbody" method="dialog" novalidate>${html}</form>`;
  const f = $('form', modal);
  f.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    if (b.dataset.m === 'cancel') { closeModal(); return; }
    onClick && onClick(b.dataset.m, b, f);
  });
  f.addEventListener('submit', e => { e.preventDefault(); if (onSubmit && onSubmit(f) !== false) closeModal(); });
  if (!modal.open) modal.showModal();
  const inp = $('input[type=text]', f);
  if (inp && matchMedia('(pointer:fine)').matches) setTimeout(() => inp.focus(), 30);
}
function closeModal() { if (modal.open) modal.close(); }
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function askConfirm(msg, okLabel, cb) {
  openModal(`<h2>Sicher?</h2><p>${msg}</p>
    <div class="mfoot"><button type="button" class="btn" data-m="cancel">Abbrechen</button><button type="button" class="btn danger" data-m="ok">${okLabel}</button></div>`,
    m => { if (m === 'ok') { closeModal(); cb(); } });
}

const swatches = sel => `<div class="swatches">${COLORS.map(c => `<button type="button" data-m="col" data-v="${c}" class="sw ${c === sel ? 'on' : ''}" style="--c:${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>`;
function selectIn(f, m, b) { $$(`[data-m="${m}"]`, f).forEach(x => x.classList.toggle('on', x === b)); }
function move(arr, item, dir) {
  const i = arr.indexOf(item), j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
const editRow = `<div class="mrow"><button type="button" class="btn small" data-m="up">${ICON.up} Hoch</button>
  <button type="button" class="btn small" data-m="down">${ICON.down} Runter</button>
  <button type="button" class="btn small danger" data-m="del">Löschen</button></div>`;
const footer = `<div class="mfoot"><button type="button" class="btn" data-m="cancel">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div>`;

function habitModal(h) {
  const isNew = !h;
  const d = h ? { ...h } : { name: '', target: 7, color: COLORS[S.habits.length % COLORS.length] };
  openModal(`<h2>${isNew ? 'Neues Habit' : 'Habit bearbeiten'}</h2>
    <label class="fl"><span>Name</span><input type="text" name="hname" maxlength="40" placeholder="z. B. Sport, Lesen, Meditation" value="${esc(d.name)}" autocomplete="off"></label>
    <div class="fl"><span>Wie oft pro Woche?</span><div class="seg">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" data-m="t" data-v="${n}" class="${n === d.target ? 'on' : ''}">${n === 7 ? 'Täglich' : n + '×'}</button>`).join('')}</div></div>
    <div class="fl"><span>Farbe</span>${swatches(d.color)}</div>
    ${isNew ? '' : editRow + '<p class="hint">Änderst du die Häufigkeit, werden auch vergangene Wochen mit dem neuen Ziel ausgewertet.</p>'}
    ${footer}`,
    (m, b, f) => {
      if (m === 't') { selectIn(f, m, b); d.target = +b.dataset.v; }
      else if (m === 'col') { selectIn(f, m, b); d.color = b.dataset.v; }
      else if (m === 'up' || m === 'down') { move(S.habits, h, m === 'up' ? -1 : 1); save(); render(); }
      else if (m === 'del') askConfirm(`„${esc(h.name)}“ mit allen Einträgen löschen?`, 'Löschen', () => {
        S.habits = S.habits.filter(x => x !== h); delete S.done[h.id];
        save(); render(); toast('Habit gelöscht');
      });
    },
    f => {
      const name = f.elements.hname.value.trim();
      if (!name) { f.elements.hname.focus(); toast('Bitte einen Namen eingeben'); return false; }
      if (isNew) S.habits.push({ id: uid(), name, target: d.target, color: d.color, created: todayKey() });
      else Object.assign(h, { name, target: d.target, color: d.color });
      save(); render();
    });
}

function counterModal(c) {
  const isNew = !c;
  const d = c ? { ...c } : { name: '', color: COLORS[(S.counters.length + 1) % COLORS.length], view: 'today' };
  openModal(`<h2>${isNew ? 'Neuer Zähler' : 'Zähler bearbeiten'}</h2>
    <label class="fl"><span>Name</span><input type="text" name="cname" maxlength="40" placeholder="z. B. Gläser Wasser" value="${esc(d.name)}" autocomplete="off"></label>
    <div class="fl"><span>Große Zahl zeigt</span><div class="seg">${[['today', 'Heute'], ['week', 'Diese Woche'], ['total', 'Gesamt']].map(([v, l]) => `<button type="button" data-m="view" data-v="${v}" class="${d.view === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="fl"><span>Farbe</span>${swatches(d.color)}</div>
    ${isNew ? '' : editRow}
    ${footer}`,
    (m, b, f) => {
      if (m === 'view') { selectIn(f, m, b); d.view = b.dataset.v; }
      else if (m === 'col') { selectIn(f, m, b); d.color = b.dataset.v; }
      else if (m === 'up' || m === 'down') { move(S.counters, c, m === 'up' ? -1 : 1); save(); render(); }
      else if (m === 'del') askConfirm(`Zähler „${esc(c.name)}“ mit allen Werten löschen?`, 'Löschen', () => {
        S.counters = S.counters.filter(x => x !== c); delete S.counts[c.id];
        save(); render(); toast('Zähler gelöscht');
      });
    },
    f => {
      const name = f.elements.cname.value.trim();
      if (!name) { f.elements.cname.focus(); toast('Bitte einen Namen eingeben'); return false; }
      if (isNew) S.counters.push({ id: uid(), name, color: d.color, view: d.view, created: todayKey() });
      else Object.assign(c, { name, color: d.color, view: d.view });
      save(); render();
    });
}

function settingsModal() {
  openModal(`<h2>Daten &amp; Backup</h2>
    <p class="hint">Alles wird nur lokal in diesem Browser gespeichert. Browserdaten löschen = Habits weg – also ab und zu ein Backup ziehen. Über Export/Import kannst du die Daten auch auf ein anderes Gerät mitnehmen.</p>
    <div class="mcol">
      <button type="button" class="btn" data-m="export">${ICON.down} Backup exportieren (.json)</button>
      <button type="button" class="btn" data-m="import">${ICON.up} Backup importieren</button>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <button type="button" class="btn danger" data-m="reset">Alle Daten löschen</button>
    </div>
    <p class="hint">${S.habits.length} Habits · ${S.counters.length} Zähler</p>
    <div class="mfoot"><button type="button" class="btn primary" data-m="cancel">Fertig</button></div>`,
    (m, b, f) => {
      if (m === 'export') exportData();
      else if (m === 'import') { const inp = $('#importFile', f); inp.onchange = () => importFile(inp.files[0]); inp.click(); }
      else if (m === 'reset') askConfirm('Wirklich alle Habits, Zähler und Einträge löschen? Das lässt sich nicht rückgängig machen.', 'Alles löschen', () => {
        S = normalize({}); save(); ui.sel = 'overview'; render(); toast('Alles gelöscht');
      });
    });
}
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pixelhabits-backup-${todayKey()}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup erstellt');
}
function importFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let d;
    try { d = JSON.parse(r.result); if (!d || !Array.isArray(d.habits)) throw new Error(); }
    catch (e) { toast('Keine gültige Backup-Datei'); return; }
    askConfirm(`Backup mit ${d.habits.length} Habits und ${(d.counters || []).length} Zählern laden? Die aktuellen Daten werden ersetzt.`, 'Ersetzen', () => {
      S = normalize(d); save(); ui.week = thisMonday(); ui.centerStrip = true; render(); toast('Backup geladen');
    });
  };
  r.readAsText(file);
}

/* ---------- Beispieldaten ---------- */
function loadDemo() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const start = key(addDays(parse(thisMonday()), -7 * 9)), today = todayKey();
  [['Sport', 4, 0, .58], ['Lesen', 7, 1, .82], ['Meditation', 5, 4, .7], ['Kein Handy ab 22 Uhr', 3, 2, .5]].forEach(([name, target, ci, p]) => {
    const h = { id: uid(), name, target, color: COLORS[ci], created: start };
    S.habits.push(h);
    const m = S.done[h.id] = {};
    for (let d = parse(start); key(d) < today; d = addDays(d, 1)) if (rnd() < p) m[key(d)] = 1;
  });
  [['Gläser Wasser', 5, 'today', 6], ['Kaffee', 2, 'today', 3], ['Klimmzug-Sätze', 3, 'week', 5]].forEach(([name, ci, view, mx]) => {
    const c = { id: uid(), name, color: COLORS[ci], view, created: start };
    S.counters.push(c);
    const m = S.counts[c.id] = {};
    for (let d = parse(start); key(d) < today; d = addDays(d, 1)) { const v = Math.floor(rnd() * (mx + 1)); if (v) m[key(d)] = v; }
  });
  save(); ui.centerStrip = true; render(); toast('Beispieldaten geladen');
}

/* ---------- Toast & Tooltip ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 1900);
}
function popAt(id, txt) {
  const card = $(`.ccard[data-cid="${id}"]`);
  if (!card) return;
  card.classList.add('pop');
  const f = document.createElement('span');
  f.className = 'floater'; f.textContent = txt;
  card.appendChild(f);
  setTimeout(() => f.remove(), 750);
}
const tip = $('#tip');
function placeTip(x, y) {
  const r = tip.getBoundingClientRect();
  let tx = x + 12, ty = y - r.height - 10;
  if (tx + r.width > innerWidth - 8) tx = x - r.width - 12;
  if (ty < 8) ty = y + 18;
  tip.style.transform = `translate(${Math.max(4, tx)}px, ${ty}px)`;
}
document.addEventListener('pointerover', e => {
  const t = e.target.closest('[data-tip]');
  if (!t || !t.dataset.tip) { tip.hidden = true; return; }
  tip.textContent = t.dataset.tip; tip.hidden = false; placeTip(e.clientX, e.clientY);
});
document.addEventListener('pointermove', e => { if (!tip.hidden) placeTip(e.clientX, e.clientY); });
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

/* ==========================================================
   Events
   ========================================================== */
function shiftWeek(dir) {
  ui.week = key(addDays(parse(ui.week), 7 * dir));
  ui.centerStrip = true;
  ui.slide = dir > 0 ? 'slide-l' : 'slide-r';
  render();
}

$('#app').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || Date.now() - ui.swipedAt < 400) return;
  const id = b.dataset.id;
  const habit = () => S.habits.find(x => x.id === id);
  const counter = () => S.counters.find(x => x.id === id);
  switch (b.dataset.act) {
    case 'prev': shiftWeek(-1); break;
    case 'next': shiftWeek(1); break;
    case 'today': ui.week = thisMonday(); ui.centerStrip = true; render(); break;
    case 'goto': ui.week = b.dataset.week; render(); break;
    case 'toggle': {
      const h = habit(); if (!h) break;
      toggleDone(h, b.dataset.day); render();
      const cell = $(`.cell[data-id="${id}"][data-day="${b.dataset.day}"]`);
      if (cell) cell.classList.add('pop');
      break;
    }
    case 'add-habit': habitModal(); break;
    case 'edit-habit': habitModal(habit()); break;
    case 'demo': loadDemo(); break;
    case 'add-counter': counterModal(); break;
    case 'edit-counter': counterModal(counter()); break;
    case 'bump': {
      const c = counter(); if (!c) break;
      bump(c, 1); render(); popAt(id, '+1');
      if (navigator.vibrate) navigator.vibrate(8);
      break;
    }
    case 'unbump': {
      const c = counter(); if (!c) break;
      if (cnt(c, todayKey()) <= 0) { toast('Heute noch nichts gezählt'); break; }
      bump(c, -1); render(); popAt(id, '−1');
      break;
    }
    case 'sel': ui.sel = b.dataset.sel; persistUi(); render(); scrollTo({ top: 0 }); break;
    case 'range': ui.range[b.dataset.kind] = +b.dataset.v; render(); break;
  }
});

$$('.tab').forEach(t => t.addEventListener('click', () => {
  ui.page = t.dataset.page; ui.centerStrip = true;
  persistUi(); render(); scrollTo({ top: 0 });
}));
$('#settingsBtn').addEventListener('click', settingsModal);

document.addEventListener('keydown', e => {
  if (modal.open || ui.page !== 'tracker' || e.target.closest('input')) return;
  if (e.key === 'ArrowLeft') shiftWeek(-1);
  if (e.key === 'ArrowRight') shiftWeek(1);
});

// Wischen auf dem Raster wechselt die Woche
let sx = null, sy = null;
$('#app').addEventListener('touchstart', e => {
  if (ui.page !== 'tracker' || !e.target.closest('#hgrid')) { sx = null; return; }
  sx = e.touches[0].clientX; sy = e.touches[0].clientY;
}, { passive: true });
$('#app').addEventListener('touchend', e => {
  if (sx == null) return;
  const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { ui.swipedAt = Date.now(); shiftWeek(dx < 0 ? 1 : -1); }
});

// Tageswechsel bei offener App
let lastDay = todayKey();
function checkDay() {
  if (todayKey() === lastDay) return;
  const wasCurrent = ui.week === key(mondayOf(parse(lastDay)));
  lastDay = todayKey();
  if (wasCurrent) { ui.week = thisMonday(); ui.centerStrip = true; }
  render();
}
setInterval(checkDay, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });

// Browser bitten, die Daten nicht automatisch zu löschen
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

$('#brand').innerHTML = `${ICON.heart}<span>PIXEL<b>HABITS</b></span>`;
render();

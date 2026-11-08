// Stato dell'applicazione e persistenza su localStorage

import { SEED_EXERCISES, demoState } from './seed.js';
import { uid, addDays, mondayOf, diffDays, num } from './utils.js';

const KEY = 'ciclo_v1';

// Tipi di blocco: sono ETICHETTE del coach, l'app non ne ricava calcoli (FONTI.md §6)
export const BLOCK_TYPES = [
  { id: 'accumulo', name: 'Accumulo', color: '#3b82f6' },
  { id: 'trasformazione', name: 'Trasformazione', color: '#f97316' },
  { id: 'realizzazione', name: 'Realizzazione', color: '#ef4444' },
  { id: 'tapering', name: 'Tapering', color: '#a855f7' },
  { id: 'gara', name: 'Gara', color: '#facc15' },
  { id: 'scarico', name: 'Scarico', color: '#22c55e' },
  { id: 'generale', name: 'Preparazione generale', color: '#06b6d4' },
  { id: 'transizione', name: 'Transizione', color: '#64748b' }
];
export const blockType = id => BLOCK_TYPES.find(t => t.id === id) || BLOCK_TYPES[BLOCK_TYPES.length - 1];

const VERSION = 2;

// v2: hip thrust, RDL, military press e trazioni zavorrate diventano alzate monitorate.
// Collega gli esercizi della libreria già salvata (se il coach non li ha già collegati)
// e aggiunge le nuove varianti predefinite.
const V2_LINKS = { 'cx-hip-thrust': 'hipthrust', 'cx-stacco-rumeno': 'rdl', 'cx-military': 'military', 'cx-trazioni': 'trazioni' };
const V2_NEW = ['cx-hip-thrust-pausa', 'cx-military-seduto', 'cx-chin-up'];

function migrate(d) {
  if ((d.version || 1) < VERSION) migrated = true;
  if ((d.version || 1) < 2 && Array.isArray(d.exercises)) {
    for (const e of d.exercises) {
      if (V2_LINKS[e.id] && e.kind === 'forza' && !e.lift) e.lift = V2_LINKS[e.id];
    }
    for (const id of V2_NEW) {
      if (!d.exercises.some(e => e.id === id)) d.exercises.push({ ...SEED_EXERCISES.find(e => e.id === id) });
    }
  }
  d.version = VERSION;
  return d;
}

function fresh() {
  return { version: VERSION, exercises: SEED_EXERCISES.map(e => ({ ...e })), athletes: [], sessions: [], settings: {} };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.athletes) && Array.isArray(d.sessions)) return { ...fresh(), ...migrate(d) };
    }
  } catch (err) {
    console.error('Errore caricamento dati', err);
  }
  // Primo avvio: dati di esempio, rimovibili da "Dati"
  return { ...fresh(), ...demoState(), settings: { demo: true } };
}

let migrated = false;
export const state = load();
if (migrated) save();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Errore salvataggio dati', err);
  }
}

export function replaceData(d) {
  migrate(d);
  state.version = VERSION;
  state.exercises = Array.isArray(d.exercises) ? d.exercises : fresh().exercises;
  state.athletes = d.athletes;
  state.sessions = d.sessions;
  state.settings = d.settings || {};
  save();
}

export function removeDemo() {
  const ids = new Set(state.athletes.filter(a => a.demo).map(a => a.id));
  state.athletes = state.athletes.filter(a => !a.demo);
  state.sessions = state.sessions.filter(s => !ids.has(s.athleteId));
  state.settings.demo = false;
  save();
}

/* ===== Atleti ===== */

export const athleteById = id => state.athletes.find(a => a.id === id) || null;

export function addAthlete(data) {
  const a = { id: uid(), blocks: [], metric: 'fond-nbl', ...data };
  state.athletes.push(a);
  save();
  return a;
}

export function deleteAthlete(id) {
  state.athletes = state.athletes.filter(a => a.id !== id);
  state.sessions = state.sessions.filter(s => s.athleteId !== id);
  save();
}

/* ===== Blocchi: contigui, la data d'inizio di ognuno deriva da planStart + blocchi precedenti ===== */

export function blocksWithDates(a) {
  let start = a.planStart;
  return (a.blocks || []).map(b => {
    const r = { ...b, start, end: addDays(start, b.weeks * 7 - 1) };
    start = addDays(start, b.weeks * 7);
    return r;
  });
}

export const blockAt = (a, date) => blocksWithDates(a).find(b => date >= b.start && date <= b.end) || null;

// Settimana n (da 1) dentro il blocco che contiene il lunedì dato
export const weekInBlock = (b, monday) => diffDays(b.start, monday) / 7 + 1;

// Lunedì di tutte le settimane da mostrare: il piano più eventuali sedute fuori dai blocchi
export function planWeeks(a) {
  const bl = blocksWithDates(a);
  let first = a.planStart;
  let last = bl.length ? mondayOf(bl[bl.length - 1].end) : a.planStart;
  for (const s of state.sessions) {
    if (s.athleteId !== a.id) continue;
    const m = mondayOf(s.date);
    if (m < first) first = m;
    if (m > last) last = m;
  }
  const out = [];
  for (let m = first; m <= last; m = addDays(m, 7)) out.push(m);
  return out;
}

export function addBlock(a, type) {
  a.blocks.push({ id: uid(), type, name: blockType(type).name, weeks: ['scarico', 'gara', 'tapering'].includes(type) ? 1 : 3 });
  save();
}

export function moveBlock(a, id, dir) {
  const i = a.blocks.findIndex(b => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= a.blocks.length) return;
  [a.blocks[i], a.blocks[j]] = [a.blocks[j], a.blocks[i]];
  save();
}

export function removeBlock(a, id) {
  a.blocks = a.blocks.filter(b => b.id !== id);
  save();
}

/* ===== Sedute ===== */

export const sessionById = id => state.sessions.find(s => s.id === id) || null;

export const sessionsOn = (aid, date) => state.sessions.filter(s => s.athleteId === aid && s.date === date);

export function sessionsOfWeek(aid, monday) {
  const end = addDays(monday, 6);
  return state.sessions
    .filter(s => s.athleteId === aid && s.date >= monday && s.date <= end)
    .sort((x, y) => x.date.localeCompare(y.date));
}

export function addSession(aid, date, name) {
  const s = { id: uid(), athleteId: aid, date, name: name || 'Seduta', items: [] };
  state.sessions.push(s);
  save();
  return s;
}

export function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  save();
}

export const newItem = exerciseId =>
  ({ id: uid(), exerciseId, sets: '', reps: '', pct: '', kg: '', rpe: '', note: '', done: null });

// Copia il pianificato, mai l'eseguito. pctDelta sposta l'intensità in punti %1RM
const cloneItems = (items, pctDelta = 0) => items.map(it => {
  const n = { ...it, id: uid(), done: null };
  if (pctDelta && num(it.pct) > 0) n.pct = String(Math.max(0, num(it.pct) + pctDelta));
  return n;
});

export function duplicateSession(s, date) {
  const c = { id: uid(), athleteId: s.athleteId, date, name: s.name, items: cloneItems(s.items) };
  state.sessions.push(c);
  save();
  return c;
}

export function copyWeek(aid, fromMonday, toMonday, pctDelta = 0) {
  const shift = diffDays(fromMonday, toMonday);
  const src = sessionsOfWeek(aid, fromMonday);
  for (const s of src)
    state.sessions.push({ id: uid(), athleteId: aid, date: addDays(s.date, shift), name: s.name, items: cloneItems(s.items, pctDelta) });
  save();
  return src.length;
}

/* ===== Esercizi ===== */

export const exById = id => state.exercises.find(e => e.id === id) || { id, name: 'Esercizio rimosso', kind: 'acc' };

export const exerciseUsed = id => state.sessions.some(s => s.items.some(it => it.exerciseId === id));

export function saveExercise(e) {
  const i = state.exercises.findIndex(x => x.id === e.id);
  if (i >= 0) state.exercises[i] = e;
  else state.exercises.push({ ...e, id: e.id || uid(), custom: true });
  save();
}

export function deleteExercise(id) {
  state.exercises = state.exercises.filter(e => e.id !== id);
  save();
}

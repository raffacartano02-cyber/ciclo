// Salvataggio locale dei progressi (solo su questo dispositivo)

const KEY = 'anatomia-v1';
const DAY = 86400000;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return { srs: {}, stats: {}, exams: [], ...s };
  } catch (e) { /* storage non disponibile */ }
  return { srs: {}, stats: {}, exams: [] };
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
}

export function resetAll() {
  state.srs = {}; state.stats = {}; state.exams = [];
  save();
}

// ===== Statistiche domande =====
export function recordAnswer(q, correct) {
  const s = state.stats[q.id] || { t: q.t, ok: 0, ko: 0, last: null };
  s.t = q.t;
  if (correct) s.ok++; else s.ko++;
  s.last = correct ? 1 : 0;
  s.at = Date.now();
  state.stats[q.id] = s;
  save();
}

export function topicStats(topicId) {
  let ok = 0, ko = 0, seen = 0;
  for (const s of Object.values(state.stats)) {
    if (s.t !== topicId) continue;
    ok += s.ok; ko += s.ko; seen++;
  }
  return { ok, ko, seen, pct: ok + ko ? Math.round(ok / (ok + ko) * 100) : null };
}

export function globalStats() {
  let ok = 0, ko = 0, seen = 0, wrong = 0;
  for (const s of Object.values(state.stats)) {
    ok += s.ok; ko += s.ko; seen++;
    if (s.last === 0) wrong++;
  }
  return { ok, ko, seen, wrong, pct: ok + ko ? Math.round(ok / (ok + ko) * 100) : null };
}

export const wrongIds = () => new Set(Object.entries(state.stats).filter(([, s]) => s.last === 0).map(([id]) => id));

// ===== Ripetizione dilazionata (sistema di Leitner) =====
// Scatola 0 = da rivedere subito; ogni risposta "La sapevo" sposta la carta nella
// scatola successiva, con intervallo che raddoppia.
const INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // giorni

export function cardState(id) { return state.srs[id] || null; }

export function isDue(id, now = Date.now()) {
  const c = state.srs[id];
  return !c || c.d <= now;
}

export function gradeCard(id, grade) {
  const now = Date.now();
  const c = state.srs[id] || { b: 0, d: now };
  if (grade === 'again') { c.b = 0; c.d = now + 60000; }
  else if (grade === 'hard') { c.b = Math.max(1, c.b); c.d = now + Math.max(1, INTERVALS[c.b] / 2) * DAY; }
  else { c.b = Math.min(INTERVALS.length - 1, c.b + 1); c.d = now + INTERVALS[c.b] * DAY; }
  state.srs[id] = c;
  save();
  return c;
}

export function recordExam(r) {
  state.exams.unshift(r);
  state.exams = state.exams.slice(0, 50);
  save();
}

// Metriche settimanali, pianificate ed eseguite. Ogni formula è documentata in FONTI.md

import { exById, sessionsOfWeek } from './store.js';
import { num, round25 } from './utils.js';

export const LIFTS = [
  { id: 'squat', name: 'Squat' },
  { id: 'panca', name: 'Panca' },
  { id: 'stacco', name: 'Stacco' }
];

export const KINDS = {
  forza: { name: 'Forza', short: 'FOR' },
  plio: { name: 'Pliometria', short: 'PLI' },
  potenza: { name: 'Potenza', short: 'POT' },
  acc: { name: 'Accessori', short: 'ACC' }
};

// Classi pliometriche: CONVENZIONE (FONTI.md §4)
export const PLYO = [
  { id: 'bassa', name: 'Bassa', color: '#7dd3fc' },
  { id: 'media', name: 'Media', color: '#38bdf8' },
  { id: 'alta', name: 'Alta', color: '#0284c7' },
  { id: 'shock', name: 'Shock', color: '#f43f5e' }
];

// kg pianificati: quelli scritti, altrimenti % × massimale arrotondato a 2,5 (FONTI.md §2)
export function plannedKg(item, ex, athlete) {
  const kg = num(item.kg);
  if (kg > 0) return kg;
  const pct = num(item.pct);
  const max = ex.lift ? num(athlete.maxes?.[ex.lift]) : 0;
  return pct > 0 && max > 0 ? round25(pct / 100 * max) : 0;
}

function lineValues(item, ex, athlete, which) {
  if (which === 'done') {
    const d = item.done;
    return d ? { sets: num(d.sets), reps: num(d.reps), kg: num(d.kg), rpe: num(d.rpe) } : null;
  }
  return { sets: num(item.sets), reps: num(item.reps), kg: plannedKg(item, ex, athlete), rpe: num(item.rpe) };
}

// 1RM stimato: Epley sulle ripetizioni a cedimento ricostruite come rip + RIR, RIR = 10 − RPE.
// Calcolato solo se RPE 6-10 e rip + RIR ≤ 10 (CONVENZIONE). FONTI.md §3
export function e1rm(kg, reps, rpe) {
  if (!(kg > 0 && reps > 0 && rpe >= 6 && rpe <= 10)) return 0;
  const toFailure = reps + (10 - rpe);
  return toFailure > 10 ? 0 : kg * (1 + toFailure / 30);
}

function emptyWeek() {
  const lifts = {};
  for (const l of LIFTS) lifts[l.id] = { nbl: 0, ton: 0, sets: 0, days: new Set(), e1rm: 0 };
  return {
    lifts,
    altro: { nbl: 0, ton: 0, sets: 0 },
    plio: { bassa: 0, media: 0, alta: 0, shock: 0 },
    potenza: { reps: 0, sets: 0, ton: 0 },
    acc: { sets: 0 },
    sessions: 0
  };
}

// Totali di una lista di sedute; which = 'plan' | 'done'
export function totals(athlete, sessions, which) {
  const m = emptyWeek();
  for (const s of sessions) {
    let any = false;
    for (const it of s.items) {
      const ex = exById(it.exerciseId);
      const v = lineValues(it, ex, athlete, which);
      if (!v || !v.sets) continue;
      any = true;
      const reps = v.sets * v.reps;
      const ton = reps * v.kg;
      if (ex.kind === 'forza' && ex.lift && m.lifts[ex.lift]) {
        const L = m.lifts[ex.lift];
        L.nbl += reps; L.ton += ton; L.sets += v.sets; L.days.add(s.date);
        L.e1rm = Math.max(L.e1rm, e1rm(v.kg, v.reps, v.rpe));
      } else if (ex.kind === 'forza') {
        m.altro.nbl += reps; m.altro.ton += ton; m.altro.sets += v.sets;
      } else if (ex.kind === 'plio') {
        m.plio[ex.plyo || 'bassa'] += reps;
      } else if (ex.kind === 'potenza') {
        m.potenza.reps += reps; m.potenza.sets += v.sets; m.potenza.ton += ton;
      } else {
        m.acc.sets += v.sets;
      }
    }
    if (any) m.sessions++;
  }
  m.fond = { nbl: 0, ton: 0 };
  for (const l of LIFTS) {
    const L = m.lifts[l.id];
    const max = num(athlete.maxes?.[l.id]);
    // Intensità media = (tonnellaggio / NBL) / massimale (FONTI.md §2)
    L.pct = L.nbl && max ? (L.ton / L.nbl) / max * 100 : 0;
    L.freq = L.days.size;
    L.e1rm = L.e1rm ? round25(L.e1rm) : 0;
    m.fond.nbl += L.nbl;
    m.fond.ton += L.ton;
  }
  m.plioTot = PLYO.reduce((t, p) => t + m.plio[p.id], 0);
  return m;
}

export const weekMetrics = (athlete, monday, which) =>
  totals(athlete, sessionsOfWeek(athlete.id, monday), which);

/* ===== Catalogo delle metriche per il grafico della stagione ===== */

export const METRICS = [
  { id: 'fond-nbl', group: 'Fondamentali', label: 'Sollevamenti totali (NBL)', unit: 'rip', get: m => m.fond.nbl },
  { id: 'fond-ton', group: 'Fondamentali', label: 'Tonnellaggio totale', unit: 'kg', get: m => m.fond.ton },
  ...LIFTS.flatMap(l => [
    { id: `${l.id}-nbl`, group: l.name, label: `${l.name} · sollevamenti (NBL)`, unit: 'rip', get: m => m.lifts[l.id].nbl },
    { id: `${l.id}-pct`, group: l.name, label: `${l.name} · intensità media`, unit: '%1RM', dec: 1, get: m => m.lifts[l.id].pct },
    { id: `${l.id}-ton`, group: l.name, label: `${l.name} · tonnellaggio`, unit: 'kg', get: m => m.lifts[l.id].ton },
    { id: `${l.id}-freq`, group: l.name, label: `${l.name} · frequenza`, unit: 'sedute', get: m => m.lifts[l.id].freq },
    { id: `${l.id}-e1rm`, group: l.name, label: `${l.name} · 1RM stimato (eseguito)`, unit: 'kg', doneOnly: true, get: m => m.lifts[l.id].e1rm }
  ]),
  { id: 'plio', group: 'Pliometria', label: 'Contatti per classe', unit: 'contatti', stacked: true, get: m => PLYO.map(p => m.plio[p.id]), total: m => m.plioTot },
  ...PLYO.map(p => ({ id: `plio-${p.id}`, group: 'Pliometria', label: `Contatti intensità ${p.name.toLowerCase()}`, unit: 'contatti', get: m => m.plio[p.id] })),
  { id: 'pot-reps', group: 'Potenza', label: 'Ripetizioni di potenza', unit: 'rip', get: m => m.potenza.reps },
  { id: 'pot-ton', group: 'Potenza', label: 'Tonnellaggio di potenza', unit: 'kg', get: m => m.potenza.ton },
  { id: 'altro-nbl', group: 'Altri esercizi', label: 'Altri esercizi di forza · ripetizioni', unit: 'rip', get: m => m.altro.nbl },
  { id: 'acc-sets', group: 'Altri esercizi', label: 'Accessori · serie', unit: 'serie', get: m => m.acc.sets }
];

export const metricById = id => METRICS.find(m => m.id === id) || METRICS[0];

// Valore scalare di una metrica (per le metriche a pila: il totale)
export const scalar = (metric, m) => metric.stacked ? metric.total(m) : metric.get(m);

// Alzate monitorate (massimale, %1RM, totali, 1RM stimato) e carico sollevato.
// Modulo senza dipendenze dallo stato: lo usano sia le metriche sia i dati di esempio.

import { num, round25 } from './utils.js';

// group: fond = fondamentali di gara · compl = complementari principali
// bw: a corpo libero con zavorra. Il massimale inserito è la ZAVORRA al massimale e il carico
// sollevato è peso corporeo + zavorra (FONTI.md §2-bis)
export const LIFTS = [
  { id: 'squat', name: 'Squat', group: 'fond' },
  { id: 'panca', name: 'Panca', group: 'fond' },
  { id: 'stacco', name: 'Stacco', group: 'fond' },
  { id: 'hipthrust', name: 'Hip thrust', group: 'compl' },
  { id: 'rdl', name: 'Stacco rumeno (RDL)', group: 'compl' },
  { id: 'military', name: 'Military press', group: 'compl' },
  { id: 'trazioni', name: 'Trazioni zavorrate', group: 'compl', bw: true }
];

export const LIFT_GROUPS = [
  { id: 'fond', name: 'Fondamentali' },
  { id: 'compl', name: 'Complementari' }
];

export const liftById = id => LIFTS.find(l => l.id === id) || null;
export const liftsOf = group => LIFTS.filter(l => l.group === group);

const bodyweight = athlete => num(athlete?.bodyweight);

// Carico effettivamente sollevato: per le trazioni aggiunge il peso corporeo, se noto
export function systemLoad(kg, liftId, athlete) {
  const l = liftById(liftId);
  return l?.bw ? kg + bodyweight(athlete) : kg;
}

// Massimale espresso come carico sollevato. Trazioni senza peso corporeo: 0 (non calcolabile)
export function systemMax(liftId, athlete) {
  const l = liftById(liftId);
  const max = num(athlete?.maxes?.[liftId]);
  if (!l) return 0;
  if (!l.bw) return max;
  const bw = bodyweight(athlete);
  return bw > 0 ? bw + max : 0;
}

// kg pianificati (per le trazioni: la zavorra). Quelli scritti, altrimenti
// % × massimale arrotondato a 2,5 (FONTI.md §2). Zavorra mai negativa.
export function plannedKg(item, ex, athlete) {
  const kg = num(item.kg);
  if (kg > 0) return kg;
  const pct = num(item.pct);
  if (!(pct > 0 && ex.lift)) return 0;
  const sys = systemMax(ex.lift, athlete);
  if (!(sys > 0)) return 0;
  // Arrotonda ciò che si carica davvero: per le trazioni la zavorra, non il carico totale
  return Math.max(0, round25(pct / 100 * sys - systemLoad(0, ex.lift, athlete)));
}

// Massimale da mostrare: "+30" per le trazioni (zavorra)
export const fmtMax = (l, v) => (l.bw ? `+${v}` : `${v}`);

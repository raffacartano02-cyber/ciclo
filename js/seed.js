// Libreria esercizi predefinita + dati di esempio per il primo avvio

import { uid, addDays, mondayOf, todayYmd } from './utils.js';
import { plannedKg } from './lifts.js';

// kind: forza | plio | potenza | acc
// lift: alzata di gara a cui l'esercizio è riferito (per %1RM e per i totali dei fondamentali)
// plyo: classe di intensità pliometrica, CONVENZIONE del coach (vedi FONTI.md §4)
const f = (id, name, lift = null) => ({ id, name, kind: 'forza', lift });
const p = (id, name, plyo) => ({ id, name, kind: 'plio', plyo });
const w = (id, name) => ({ id, name, kind: 'potenza' });
const a = (id, name) => ({ id, name, kind: 'acc' });

export const SEED_EXERCISES = [
  // Fondamentali e varianti collegate all'alzata di gara
  f('cx-squat', 'Squat', 'squat'),
  f('cx-squat-pausa', 'Squat con pausa', 'squat'),
  f('cx-pin-squat', 'Pin squat', 'squat'),
  f('cx-panca', 'Panca piana', 'panca'),
  f('cx-panca-pausa', 'Panca con pausa lunga', 'panca'),
  f('cx-panca-stretta', 'Panca presa stretta', 'panca'),
  f('cx-larsen', 'Larsen press', 'panca'),
  f('cx-stacco', 'Stacco da terra', 'stacco'),
  f('cx-stacco-sumo', 'Stacco sumo', 'stacco'),
  f('cx-stacco-pausa', 'Stacco con pausa', 'stacco'),
  f('cx-stacco-deficit', 'Stacco in deficit', 'stacco'),
  // Complementari principali e varianti collegate
  f('cx-hip-thrust', 'Hip thrust', 'hipthrust'),
  f('cx-hip-thrust-pausa', 'Hip thrust con pausa', 'hipthrust'),
  f('cx-stacco-rumeno', 'Stacco rumeno', 'rdl'),
  f('cx-military', 'Military press', 'military'),
  f('cx-military-seduto', 'Military press seduto', 'military'),
  f('cx-trazioni', 'Trazioni zavorrate', 'trazioni'),
  f('cx-chin-up', 'Chin-up zavorrati (presa supina)', 'trazioni'),
  // Altri esercizi di forza
  f('cx-front-squat', 'Front squat'),
  f('cx-rematore', 'Rematore bilanciere'),
  f('cx-bulgarian', 'Bulgarian split squat'),
  // Pliometria
  p('cx-pogo', 'Pogo jump', 'bassa'),
  p('cx-skip', 'Skip', 'bassa'),
  p('cx-corda', 'Saltelli alla corda', 'bassa'),
  p('cx-line-hops', 'Line hops', 'bassa'),
  p('cx-squat-jump', 'Squat jump', 'media'),
  p('cx-cmj', 'Countermovement jump', 'media'),
  p('cx-salto-lungo', 'Salto in lungo da fermo', 'media'),
  p('cx-box-jump', 'Box jump', 'media'),
  p('cx-bounding', 'Bounding', 'alta'),
  p('cx-hurdle-hops', 'Hurdle hops consecutivi', 'alta'),
  p('cx-hop-mono', 'Balzi monopodalici', 'alta'),
  p('cx-drop-jump', 'Drop jump', 'shock'),
  p('cx-depth-jump', 'Depth jump', 'shock'),
  // Potenza
  w('cx-power-clean', 'Power clean'),
  w('cx-hang-clean', 'Hang power clean'),
  w('cx-push-press', 'Push press'),
  w('cx-jump-squat', 'Jump squat con carico'),
  w('cx-trap-jump', 'Trap bar jump'),
  w('cx-palla-medica', 'Lancio palla medica'),
  // Accessori
  a('cx-nordic', 'Nordic hamstring'),
  a('cx-copenhagen', 'Copenhagen plank'),
  a('cx-leg-curl', 'Leg curl'),
  a('cx-calf', 'Calf raise'),
  a('cx-face-pull', 'Face pull'),
  a('cx-rematore-man', 'Rematore manubrio'),
  a('cx-pallof', 'Pallof press'),
  a('cx-dip', 'Dip')
];

/* ===== Dati di esempio ===== */

// Pseudo-casuale deterministico: l'esempio è uguale a ogni installazione
function rng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function item(exerciseId, sets, reps, opt = {}) {
  return {
    id: uid(), exerciseId, sets: String(sets), reps: String(reps),
    pct: opt.pct ? String(opt.pct) : '', kg: opt.kg ? String(opt.kg) : '',
    rpe: opt.rpe ? String(opt.rpe) : '', note: '', done: null
  };
}

// Segna come eseguite le sedute passate, con piccole differenze dal piano
function fillDone(sessions, athlete, today, rand) {
  for (const s of sessions) {
    if (s.date >= today) continue;
    if (rand() < 0.08) continue; // qualche seduta saltata, per vedere lo scarto
    for (const it of s.items) {
      const ex = SEED_EXERCISES.find(e => e.id === it.exerciseId);
      const kg = plannedKg(it, ex, athlete);
      const r = rand();
      const rpe = it.rpe ? Math.min(10, Math.max(6, Number(it.rpe) + (r < 0.25 ? -0.5 : r > 0.8 ? 0.5 : 0))) : '';
      const sets = Number(it.sets) - (rand() < 0.07 ? 1 : 0);
      it.done = { sets: String(Math.max(1, sets)), reps: it.reps, kg: kg ? String(kg) : '', rpe: rpe === '' ? '' : String(rpe) };
    }
  }
}

function powerlifter(mon, today) {
  const ath = {
    id: uid(), demo: true, name: 'Marco R. (esempio)', sport: 'Powerlifting · -83 kg',
    maxes: { squat: '200', panca: '130', stacco: '230', hipthrust: '220', rdl: '180', military: '75', trazioni: '45' },
    bodyweight: '83',
    planStart: addDays(mon, -28), compName: 'Campionato regionale', compDate: addDays(mon, 47),
    metric: 'fond-nbl',
    blocks: [
      { id: uid(), type: 'accumulo', name: 'Accumulo', weeks: 3 },
      { id: uid(), type: 'scarico', name: 'Scarico', weeks: 1 },
      { id: uid(), type: 'trasformazione', name: 'Trasformazione', weeks: 3 },
      { id: uid(), type: 'realizzazione', name: 'Realizzazione', weeks: 2 },
      { id: uid(), type: 'tapering', name: 'Tapering', weeks: 1 },
      { id: uid(), type: 'gara', name: 'Gara', weeks: 1 }
    ]
  };
  const P = {
    accumulo: i => ({ sets: 5, reps: 5, pct: 70 + 2.5 * i, rpe: 7 + 0.5 * i }),
    scarico: () => ({ sets: 3, reps: 5, pct: 65, rpe: 6 }),
    trasformazione: i => ({ sets: 5, reps: 3, pct: 80 + 2.5 * i, rpe: 7.5 + 0.5 * i }),
    realizzazione: i => ({ sets: 4, reps: 2, pct: 87.5 + 2.5 * i, rpe: 8.5 + 0.5 * i }),
    tapering: () => ({ sets: 3, reps: 1, pct: 85, rpe: 7 }),
    gara: () => ({ sets: 1, reps: 1, pct: 90, rpe: 7 })
  };
  const sessions = [];
  let week = ath.planStart;
  for (const b of ath.blocks) {
    for (let i = 0; i < b.weeks; i++, week = addDays(week, 7)) {
      const m = P[b.type](i);
      const v = d => ({ pct: m.pct - d, rpe: m.rpe });
      if (b.type === 'gara') {
        sessions.push({ id: uid(), athleteId: ath.id, date: week, name: 'Aperture', items: [
          item('cx-squat', 1, 1, m), item('cx-panca', 1, 1, m), item('cx-stacco', 1, 1, m)] });
        continue;
      }
      sessions.push({ id: uid(), athleteId: ath.id, date: week, name: 'Squat + Panca', items: [
        item('cx-squat', m.sets, m.reps, m),
        item('cx-panca', m.sets, m.reps, m),
        item('cx-trazioni', 4, 5, { pct: Math.min(85, m.pct + 2.5), rpe: 8 })] });
      sessions.push({ id: uid(), athleteId: ath.id, date: addDays(week, 2), name: 'Stacco + varianti', items: [
        item('cx-stacco', m.sets - 1, m.reps, m),
        item('cx-panca-stretta', m.sets - 1, m.reps + 2, v(12.5)),
        item('cx-squat-pausa', 3, m.reps, v(15))] });
      if (b.type === 'tapering') continue;
      sessions.push({ id: uid(), athleteId: ath.id, date: addDays(week, 4), name: 'Panca + Stacco', items: [
        item('cx-panca', m.sets, m.reps, { pct: m.pct - 5, rpe: m.rpe - 0.5 }),
        item('cx-stacco-pausa', 3, m.reps, v(15)),
        item('cx-military', 4, 6, { pct: 72.5, rpe: 7.5 }),
        item('cx-face-pull', 3, 15, { rpe: 8 })] });
    }
  }
  return { ath, sessions };
}

function footballer(mon, today) {
  const ath = {
    id: uid(), demo: true, name: 'Luca B. (esempio)', sport: 'Calcio · difensore centrale',
    maxes: { squat: '140', panca: '90', stacco: '160', hipthrust: '180', rdl: '130', military: '60', trazioni: '25' },
    bodyweight: '82',
    planStart: addDays(mon, -21), compName: '', compDate: '',
    metric: 'plio',
    blocks: [
      { id: uid(), type: 'generale', name: 'Preparazione generale', weeks: 3 },
      { id: uid(), type: 'trasformazione', name: 'Forza → potenza', weeks: 3 },
      { id: uid(), type: 'scarico', name: 'Scarico', weeks: 1 },
      { id: uid(), type: 'realizzazione', name: 'Mantenimento in stagione', weeks: 3 }
    ]
  };
  const sessions = [];
  let week = ath.planStart, g = 0;
  for (const b of ath.blocks) {
    for (let i = 0; i < b.weeks; i++, g++, week = addDays(week, 7)) {
      const k = b.type === 'scarico' ? 0.5 : 1;
      const s = n => Math.max(1, Math.round(n * k));
      const tue = [
        item('cx-pogo', s(3), 15 + 5 * Math.min(g, 3)),
        item('cx-cmj', s(4), 5),
        item('cx-power-clean', s(5), 3, { kg: 50 + 2.5 * Math.min(g, 6), rpe: 7.5 }),
        item('cx-squat', s(4), 5, { pct: 70 + 2.5 * (g % 3), rpe: 7.5 })
      ];
      if (g >= 3 && b.type !== 'scarico') tue.splice(2, 0, item('cx-drop-jump', 3, g >= 6 ? 6 : 4));
      sessions.push({ id: uid(), athleteId: ath.id, date: addDays(week, 1), name: 'Reattività + forza', items: tue });
      sessions.push({ id: uid(), athleteId: ath.id, date: addDays(week, 3), name: 'Elasticità + catena posteriore', items: [
        item('cx-skip', s(3), 20),
        item('cx-bounding', s(4), Math.min(5 + g, 10)),
        item('cx-jump-squat', s(4), 5, { kg: 20, rpe: 7 }),
        item('cx-stacco-rumeno', s(3), 8, { pct: 60 + 2.5 * Math.min(g, 4), rpe: 7.5 }),
        item('cx-hip-thrust', s(3), 8, { pct: 70 + 2.5 * (g % 3), rpe: 7.5 }),
        item('cx-nordic', s(3), 4 + Math.floor(g / 2))] });
    }
  }
  return { ath, sessions };
}

export function demoState() {
  const today = todayYmd();
  const mon = mondayOf(today);
  const rand = rng(42);
  const pl = powerlifter(mon, today);
  const fb = footballer(mon, today);
  fillDone(pl.sessions, pl.ath, today, rand);
  fillDone(fb.sessions, fb.ath, today, rand);
  return { athletes: [pl.ath, fb.ath], sessions: [...pl.sessions, ...fb.sessions] };
}

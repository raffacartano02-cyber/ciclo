// Generazione automatica di domande a risposta multipla e delle flashcard
// a partire dai dati. Ogni domanda: { id, t, q, a, w: [3 errate], x }

import { MUSCOLI } from './data/muscoli.js';
import { ARTICOLAZIONI } from './data/articolazioni.js';
import { NERVI, CRANICI } from './data/nervi.js';
import { TEORIA } from './data/teoria.js';
import { state } from './store.js';

export const shuffle = arr => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const hash = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

// Sceglie fino a n valori distinti dalla risposta, prendendo prima dai gruppi preferiti
function pickDistractors(answer, groups, n = 3, ok = () => true) {
  const out = [];
  const seen = new Set([answer.toLowerCase()]);
  for (const g of groups) {
    for (const v of shuffle(g)) {
      if (out.length >= n) return out;
      if (!v || seen.has(v.toLowerCase()) || !ok(v, out)) continue;
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.length >= n ? out : null;
}

// Famiglie di nervi: due valori sono "compatibili come distrattori" solo se
// non condividono una famiglia (es. sciatico/tibiale/peroneo sono la stessa).
const NERVE_FAMILIES = [
  ['ascellare'], ['soprascapolare'], ['sottoscapolar'], ['pettoral'], ['toracico lungo'],
  ['accessorio'], ['toracodorsale'], ['dorsale della scapola'], ['muscolocutaneo'],
  ['radiale'], ['mediano'], ['ulnare'], ['frenico'],
  ['intercostal', 'toracoaddominal', 'sottocostale', 'ileoipogastrico', 'ileoinguinale', 'rami anteriori', 't12-l4'],
  ['rami posteriori'], ['mandibolare', 'trigemino'],
  ['femorale', 'l1-l3'], ['gluteo inferiore'], ['gluteo superiore'], ['piriforme'],
  ['otturatorio'], ['sciatico', 'tibiale', 'peroneo'],
];
const families = v => {
  const s = v.toLowerCase();
  return new Set(NERVE_FAMILIES.map((f, i) => f.some(k => s.includes(k)) ? i : -1).filter(i => i >= 0));
};
const disjointNerves = (a, b) => {
  const fa = families(a), fb = families(b);
  for (const x of fa) if (fb.has(x)) return false;
  return true;
};

// Classificazione sintetica per le domande sul tipo di articolazione
const CLS = {
  'spalla': 'Enartrosi', 'anca': 'Enartrosi',
  'acromionclavicolare': 'Artrodia', 'interapofisarie': 'Artrodia',
  'sternoclavicolare': 'A sella', 'trapeziometacarpale': 'A sella',
  'radioulnare-prossimale': 'Trocoide (ginglimo laterale)', 'atlantoassiale': 'Trocoide (ginglimo laterale)',
  'polso': 'Condiloartrosi (ellissoidale)', 'atlantooccipitale': 'Condiloartrosi (ellissoidale)',
  'caviglia': 'Ginglimo angolare (troclea)',
  'tibiofibulare-distale': 'Sindesmosi (sinartrosi)',
  'intervertebrale': 'Sinfisi (anfiartrosi)', 'sinfisi-pubica': 'Sinfisi (anfiartrosi)',
  'suture': 'Sutura (sinartrosi)', 'gonfosi': 'Gonfosi (sinartrosi)',
};

function muscleQuestions() {
  const qs = [];
  const by = (pred, f) => MUSCOLI.filter(pred).map(f);
  for (const m of MUSCOLI) {
    const sameG = o => o.id !== m.id && o.g === m.g;
    const sameT = o => o.id !== m.id && o.t === m.t;
    const diffG = o => o.id !== m.id && o.t === m.t && o.g !== m.g;
    const any = o => o.id !== m.id;
    const expl = `${m.nome}: origine — ${m.origine}; inserzione — ${m.inserzione}; innervazione — ${m.nervo} (${m.radici}).${m.nota ? ' ' + m.nota : ''}`;
    const add = (key, q, a, w) => { if (w) qs.push({ id: `m:${m.id}:${key}`, t: m.t, q, a, w, x: expl }); };

    add('nervo', `Quale nervo innerva il muscolo ${m.nome.toLowerCase()}?`, m.nervo,
      pickDistractors(m.nervo, [by(sameT, o => o.nervo), by(any, o => o.nervo)], 3,
        (v, chosen) => disjointNerves(v, m.nervo) && chosen.every(c => disjointNerves(v, c))));
    add('ins', `Dove si inserisce il muscolo ${m.nome.toLowerCase()}?`, m.inserzione,
      pickDistractors(m.inserzione, [by(sameG, o => o.inserzione), by(sameT, o => o.inserzione)]));
    add('ori', `Da dove origina il muscolo ${m.nome.toLowerCase()}?`, m.origine,
      pickDistractors(m.origine, [by(sameG, o => o.origine), by(sameT, o => o.origine)]));
    add('az', `Qual è l'azione del muscolo ${m.nome.toLowerCase()}?`, m.azione,
      pickDistractors(m.azione, [by(diffG, o => o.azione), by(o => o.id !== m.id && o.t !== m.t, o => o.azione)]));
    if (/^Nn?\./.test(m.nervo)) {
      const dal = m.nervo.startsWith('Nn.') ? 'dai ' + m.nervo.replace(/^Nn\./, 'nn.') : 'dal ' + m.nervo.replace(/^N\./, 'n.');
      add('rev', `Quale di questi muscoli è innervato ${dal}?`, m.nome,
        pickDistractors(m.nome, [by(o => sameT(o) && disjointNerves(o.nervo, m.nervo), o => o.nome),
          by(o => any(o) && disjointNerves(o.nervo, m.nervo), o => o.nome)]));
    }
  }
  return qs;
}

function jointQuestions() {
  const qs = [];
  const clsOf = j => CLS[j.id] || j.id;
  for (const j of ARTICOLAZIONI) {
    const expl = `${j.nome}: ${j.tipo}. Superfici: ${j.ossa}. Movimenti: ${j.movimenti}.${j.nota ? ' ' + j.nota : ''}`;
    const others = ARTICOLAZIONI.filter(o => o.id !== j.id);
    const add = (key, q, a, w) => { if (w) qs.push({ id: `j:${j.id}:${key}`, t: 'art', q, a, w, x: expl }); };
    if (CLS[j.id]) {
      add('tipo', `Come si classifica l'articolazione ${j.nome.toLowerCase()}?`, CLS[j.id],
        pickDistractors(CLS[j.id], [[...new Set(Object.values(CLS))]]));
    }
    add('mov', `Quali movimenti consente l'articolazione ${j.nome.toLowerCase()}?`, j.movimenti,
      pickDistractors(j.movimenti, [others.filter(o => clsOf(o) !== clsOf(j)).map(o => o.movimenti)]));
    add('leg', `Quali legamenti/strutture appartengono all'articolazione ${j.nome.toLowerCase()}?`, j.legamenti,
      pickDistractors(j.legamenti, [others.map(o => o.legamenti)]));
    add('ossa', `Quali superfici ossee formano l'articolazione ${j.nome.toLowerCase()}?`, j.ossa,
      pickDistractors(j.ossa, [others.map(o => o.ossa)]));
  }
  return qs;
}

function nerveQuestions() {
  const qs = [];
  for (const n of NERVI) {
    const expl = `${n.nome} (plesso ${n.plesso.toLowerCase()}, ${n.radici}): innerva ${n.innerva}. Lesione: ${n.lesione}.`;
    const others = NERVI.filter(o => o.id !== n.id);
    const add = (key, q, a, w) => { if (w) qs.push({ id: `n:${n.id}:${key}`, t: 'nervi', q, a, w, x: expl }); };
    add('radici', `Da quali radici origina il ${n.nome.replace(/^N\./, 'n.')}?`, n.radici,
      pickDistractors(n.radici, [others.filter(o => o.plesso === n.plesso).map(o => o.radici), others.map(o => o.radici)]));
    add('inn', `Che cosa innerva il ${n.nome.replace(/^N\./, 'n.')}?`, n.innerva,
      pickDistractors(n.innerva, [others.map(o => o.innerva)]));
    add('les', `Una lesione del ${n.nome.replace(/^N\./, 'n.')} provoca tipicamente:`, n.lesione,
      pickDistractors(n.lesione, [others.filter(o => o.plesso === n.plesso).map(o => o.lesione), others.map(o => o.lesione)]));
    add('plesso', `A quale plesso appartiene il ${n.nome.replace(/^N\./, 'n.')}?`, `Plesso ${n.plesso.toLowerCase()}`,
      pickDistractors(`Plesso ${n.plesso.toLowerCase()}`, [['Plesso cervicale', 'Plesso brachiale', 'Plesso lombare', 'Plesso sacrale']]));
  }
  return qs;
}

function cranialQuestions() {
  const qs = [];
  const label = c => `${c.n} — ${c.nome}`;
  for (const c of CRANICI) {
    const expl = `${c.n} nervo cranico, ${c.nome} (${c.tipo.toLowerCase()}): ${c.funzione}.`;
    const others = CRANICI.filter(o => o.n !== c.n);
    const add = (key, q, a, w) => { if (w) qs.push({ id: `c:${c.n}:${key}`, t: 'cranici', q, a, w, x: expl }); };
    add('num', `Quale numero romano identifica il nervo ${c.nome.toLowerCase()}?`, c.n, pickDistractors(c.n, [others.map(o => o.n)]));
    add('fun', `Qual è la funzione del nervo ${c.nome.toLowerCase()} (${c.n})?`, c.funzione, pickDistractors(c.funzione, [others.map(o => o.funzione)]));
    add('rev', `Quale nervo cranico è responsabile di: ${c.funzione.charAt(0).toLowerCase() + c.funzione.slice(1)}?`, label(c),
      pickDistractors(label(c), [others.map(label)]));
    const tipi = ['Sensitivo', 'Motore', 'Misto', 'Esclusivamente vegetativo'];
    add('tipo', `Dal punto di vista funzionale, il nervo ${c.nome.toLowerCase()} (${c.n}) è:`, c.tipo,
      pickDistractors(c.tipo, [tipi], 3, v => !c.tipo.startsWith(v)));
  }
  return qs;
}

function theoryQuestions() {
  return TEORIA.map(d => ({ id: 't:' + hash(d.q), t: d.t, q: d.q, a: d.a, w: d.w, x: d.x }));
}

let _all = null;
export function allQuestions() {
  // Rigenerate ad ogni sessione: i distrattori cambiano, gli id restano stabili
  _all = [...muscleQuestions(), ...jointQuestions(), ...nerveQuestions(), ...cranialQuestions(), ...theoryQuestions()];
  return _all;
}

export function countByTopic() {
  const qs = _all || allQuestions();
  const c = {};
  for (const q of qs) c[q.t] = (c[q.t] || 0) + 1;
  return c;
}

// Priorità: prima le domande sbagliate l'ultima volta, poi quelle mai viste,
// poi le altre; con una componente casuale per variare.
export function buildQuiz(topicIds, n, { onlyWrong = false } = {}) {
  const set = new Set(topicIds);
  let pool = allQuestions().filter(q => set.has(q.t));
  if (onlyWrong) pool = pool.filter(q => state.stats[q.id]?.last === 0);
  const score = q => {
    const s = state.stats[q.id];
    let v = Math.random();
    if (!s) v += 0.8;
    else if (s.last === 0) v += 1.5;
    else v -= Math.min(1, s.ok * 0.15);
    return v;
  };
  pool = pool.map(q => [score(q), q]).sort((a, b) => b[0] - a[0]).map(p => p[1]);
  // Evita due domande sullo stesso elemento (es. stesso muscolo) di fila se possibile
  const picked = [], used = new Set();
  for (const q of pool) {
    if (picked.length >= n) break;
    const base = q.id.split(':').slice(0, 2).join(':');
    if (used.has(base) && pool.length > n * 2) continue;
    used.add(base); picked.push(q);
  }
  for (const q of pool) { if (picked.length >= n) break; if (!picked.includes(q)) picked.push(q); }
  return shuffle(picked).map(q => {
    const options = shuffle([q.a, ...q.w]);
    return { ...q, options, correct: options.indexOf(q.a) };
  });
}

// Esame: distribuzione equilibrata tra gli argomenti scelti
export function buildExam(topicIds, n) {
  const per = Math.max(1, Math.floor(n / topicIds.length));
  let qs = [];
  for (const t of shuffle(topicIds)) qs.push(...buildQuiz([t], per));
  if (qs.length < n) {
    const have = new Set(qs.map(q => q.id));
    qs.push(...buildQuiz(topicIds, n * 2).filter(q => !have.has(q.id)).slice(0, n - qs.length));
  }
  return shuffle(qs).slice(0, n);
}

// ===== Flashcard =====
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const row = (k, v) => v ? `<div class="fc-row"><span>${k}</span><p>${esc(v)}</p></div>` : '';

export function allCards() {
  const cards = [];
  for (const m of MUSCOLI) cards.push({
    id: 'fm:' + m.id, t: m.t, front: m.nome, sub: `Muscolo · ${m.g}`,
    back: row('Origine', m.origine) + row('Inserzione', m.inserzione) + row('Innervazione', `${m.nervo} (${m.radici})`) + row('Azione', m.azione) + row('Nota', m.nota),
  });
  for (const j of ARTICOLAZIONI) cards.push({
    id: 'fj:' + j.id, t: 'art', front: j.nome, sub: 'Articolazione',
    back: row('Tipo', j.tipo) + row('Superfici', j.ossa) + row('Legamenti', j.legamenti) + row('Movimenti', j.movimenti) + row('Nota', j.nota),
  });
  for (const n of NERVI) cards.push({
    id: 'fn:' + n.id, t: 'nervi', front: n.nome, sub: `Plesso ${n.plesso.toLowerCase()}`,
    back: row('Radici', n.radici) + row('Innerva', n.innerva) + row('Lesione', n.lesione),
  });
  for (const c of CRANICI) cards.push({
    id: 'fc:' + c.n, t: 'cranici', front: `${c.n} — ${c.nome}`, sub: 'Nervo cranico',
    back: row('Tipo', c.tipo) + row('Funzione', c.funzione),
  });
  for (const d of TEORIA) cards.push({
    id: 'ft:' + hash(d.q), t: d.t, front: d.q, sub: 'Teoria',
    back: `<p class="fc-answer">${esc(d.a)}</p>` + (d.x ? `<p class="muted">${esc(d.x)}</p>` : ''),
  });
  return cards;
}

export { esc };

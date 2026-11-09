// Anatomia — router e schermate

import { TOPICS, topicById } from './topics.js';
import { MUSCOLI } from './data/muscoli.js';
import { ARTICOLAZIONI } from './data/articolazioni.js';
import { NERVI, CRANICI } from './data/nervi.js';
import { TEORIA } from './data/teoria.js';
import { allQuestions, countByTopic, buildQuiz, buildExam, allCards, shuffle, esc } from './quiz.js';
import { state, save, recordAnswer, topicStats, globalStats, isDue, gradeCard, cardState, recordExam, resetAll } from './store.js';

const view = document.getElementById('view');
let cleanup = null; // rimuove timer/scorciatoie della schermata precedente

const h = (html) => { view.innerHTML = html; };
const $ = (sel, root = view) => root.querySelector(sel);
const $$ = (sel, root = view) => [...root.querySelectorAll(sel)];
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

// Avvisi e conferme dentro la pagina (i popup del browser possono essere bloccati)
function notify(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(notify._t);
  notify._t = setTimeout(() => t.classList.remove('show'), 3500);
}
function ask(msg, okLabel = 'Conferma') {
  return new Promise(resolve => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><p>${esc(msg)}</p>
      <div class="row gap end"><button class="btn" data-r="0">Annulla</button><button class="btn primary" data-r="1">${esc(okLabel)}</button></div></div>`;
    const close = v => { m.remove(); document.removeEventListener('keydown', key, true); resolve(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } };
    m.addEventListener('click', e => { if (e.target === m) return close(false); const r = e.target.closest('[data-r]'); if (r) close(r.dataset.r === '1'); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(m);
    m.querySelector('[data-r="1"]').focus();
  });
}

function onKeys(map) {
  const fn = e => {
    if (e.target.matches('input, textarea, select')) return;
    const f = map[e.key];
    if (f) { e.preventDefault(); f(e); }
  };
  document.addEventListener('keydown', fn);
  return () => document.removeEventListener('keydown', fn);
}

function bar(value, cls = '') {
  return `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div>`;
}

// Preferenze argomenti (comodità per-dispositivo)
function loadSel(key) {
  try { const v = JSON.parse(localStorage.getItem('anat-sel-' + key)); if (Array.isArray(v) && v.length) return v; } catch (e) {}
  return TOPICS.map(t => t.id);
}
function saveSel(key, v) { try { localStorage.setItem('anat-sel-' + key, JSON.stringify(v)); } catch (e) {} }

function topicPicker(key) {
  const sel = new Set(loadSel(key));
  const counts = countByTopic();
  const areas = [...new Set(TOPICS.map(t => t.area))];
  return `
    <div class="picker" data-key="${key}">
      <div class="picker-head">
        <strong>Argomenti</strong>
        <span><button class="link" data-all>Tutti</button> · <button class="link" data-none>Nessuno</button></span>
      </div>
      ${areas.map(a => `
        <div class="area">${a}</div>
        <div class="chips">
          ${TOPICS.filter(t => t.area === a).map(t => `
            <label class="chip"><input type="checkbox" value="${t.id}" ${sel.has(t.id) ? 'checked' : ''}>
            <span>${t.icon} ${t.nome} <em>${counts[t.id] || 0}</em></span></label>`).join('')}
        </div>`).join('')}
    </div>`;
}
function bindPicker(key) {
  const root = $(`.picker[data-key="${key}"]`);
  const read = () => $$('input', root).filter(i => i.checked).map(i => i.value);
  root.addEventListener('change', () => saveSel(key, read()));
  $('[data-all]', root).onclick = () => { $$('input', root).forEach(i => i.checked = true); saveSel(key, read()); };
  $('[data-none]', root).onclick = () => { $$('input', root).forEach(i => i.checked = false); saveSel(key, read()); };
  return read;
}

// ======================= HOME =======================
function renderHome() {
  const g = globalStats();
  const cards = allCards();
  const due = cards.filter(c => cardState(c.id) && isDue(c.id)).length;
  const fresh = cards.filter(c => !cardState(c.id)).length;
  const counts = countByTopic();
  const last = state.exams[0];
  h(`
    <section class="hero">
      <h1>Studia anatomia,<br>un argomento alla volta.</h1>
      <p class="muted">Flashcard con ripasso intelligente, quiz a risposta multipla e simulazioni d'esame sul programma di anatomia umana.</p>
    </section>

    <section class="stats">
      <div class="stat"><b>${due}</b><span>flashcard da ripassare</span></div>
      <div class="stat"><b>${g.ok + g.ko}</b><span>risposte date</span></div>
      <div class="stat"><b>${g.pct === null ? '—' : g.pct + '%'}</b><span>risposte corrette</span></div>
      <div class="stat"><b>${last ? last.voto : '—'}</b><span>ultimo voto simulato</span></div>
    </section>

    <section class="actions">
      <a class="action primary" href="#flashcard"><span>🃏</span><div><b>Ripasso flashcard</b><small>${due ? due + ' da ripassare' : 'Nessun ripasso in scadenza'} · ${fresh} nuove</small></div></a>
      <a class="action" href="#quiz-rapido"><span>⚡</span><div><b>Quiz rapido</b><small>10 domande su tutto il programma</small></div></a>
      <a class="action" href="#esame"><span>🎓</span><div><b>Simulazione d'esame</b><small>30 domande a tempo, voto in trentesimi</small></div></a>
      <a class="action ${g.wrong ? 'warn' : ''}" href="#quiz-errori"><span>🔁</span><div><b>Ripeti gli errori</b><small>${g.wrong ? g.wrong + ' domande sbagliate da ripassare' : 'Nessun errore da ripassare'}</small></div></a>
    </section>

    <section>
      <div class="sec-head"><h2>Il tuo programma</h2><a href="#progressi">Dettagli</a></div>
      <div class="topics">
        ${TOPICS.map(t => {
          const s = topicStats(t.id);
          const cov = pct(s.seen, counts[t.id] || 0);
          return `<a class="topic" href="#quiz-t-${t.id}">
            <span class="ti">${t.icon}</span>
            <div class="tb"><b>${t.nome}</b>
              ${bar(cov)}
              <small class="muted">${cov}% visto · ${s.pct === null ? 'non ancora svolto' : s.pct + '% corrette'}</small>
            </div></a>`;
        }).join('')}
      </div>
    </section>`);
}

// ======================= STUDIA =======================
const STUDY_TABS = [
  { id: 'muscoli', nome: 'Muscoli' },
  { id: 'articolazioni', nome: 'Articolazioni' },
  { id: 'nervi', nome: 'Nervi' },
  { id: 'cranici', nome: 'Nervi cranici' },
  { id: 'teoria', nome: 'Teoria' },
];

function field(k, v) { return v ? `<div class="f"><span>${k}</span><p>${esc(v)}</p></div>` : ''; }

function renderStudy(tab = 'muscoli') {
  if (!STUDY_TABS.some(t => t.id === tab)) tab = 'muscoli';
  h(`
    <div class="page-head"><h1>Studia</h1><p class="muted">Schede di consultazione. Tocca una voce per aprirla.</p></div>
    <nav class="tabs">${STUDY_TABS.map(t => `<a href="#studia-${t.id}" class="${t.id === tab ? 'on' : ''}">${t.nome}</a>`).join('')}</nav>
    <input type="search" id="q" class="search" placeholder="Cerca (es. sciatico, rotula, C5…)" autocomplete="off">
    <div id="list"></div>`);

  let groups = [];
  if (tab === 'muscoli') {
    for (const t of ['mus-sup', 'mus-tronco', 'mus-inf']) {
      const ms = MUSCOLI.filter(m => m.t === t);
      groups.push({ title: topicById(t).nome, items: ms.map(m => ({
        key: [m.nome, m.g, m.origine, m.inserzione, m.nervo, m.radici, m.azione, m.nota].join(' '),
        html: `<details class="item"><summary><b>${esc(m.nome)}</b><small>${esc(m.g)} · ${esc(m.nervo)}</small></summary>
          ${field('Origine', m.origine)}${field('Inserzione', m.inserzione)}${field('Innervazione', `${m.nervo} (${m.radici})`)}${field('Azione', m.azione)}${field('Nota', m.nota)}</details>` })) });
    }
  } else if (tab === 'articolazioni') {
    groups.push({ title: 'Articolazioni', items: ARTICOLAZIONI.map(j => ({
      key: [j.nome, j.tipo, j.ossa, j.legamenti, j.movimenti, j.nota].join(' '),
      html: `<details class="item"><summary><b>${esc(j.nome)}</b><small>${esc(j.tipo)}</small></summary>
        ${field('Superfici', j.ossa)}${field('Legamenti', j.legamenti)}${field('Movimenti', j.movimenti)}${field('Nota', j.nota)}</details>` })) });
  } else if (tab === 'nervi') {
    for (const p of ['Cervicale', 'Brachiale', 'Lombare', 'Sacrale']) {
      groups.push({ title: `Plesso ${p.toLowerCase()}`, items: NERVI.filter(n => n.plesso === p).map(n => ({
        key: [n.nome, n.radici, n.innerva, n.lesione].join(' '),
        html: `<details class="item"><summary><b>${esc(n.nome)}</b><small>${esc(n.radici)}</small></summary>
          ${field('Innerva', n.innerva)}${field('Lesione', n.lesione)}</details>` })) });
    }
  } else if (tab === 'cranici') {
    groups.push({ title: 'I 12 nervi cranici', items: CRANICI.map(c => ({
      key: [c.n, c.nome, c.tipo, c.funzione].join(' '),
      html: `<details class="item"><summary><b>${c.n} — ${esc(c.nome)}</b><small>${esc(c.tipo)}</small></summary>${field('Funzione', c.funzione)}</details>` })) });
  } else {
    for (const t of TOPICS) {
      const ds = TEORIA.filter(d => d.t === t.id);
      if (!ds.length) continue;
      groups.push({ title: `${t.icon} ${t.nome}`, items: ds.map(d => ({
        key: [d.q, d.a, d.x].join(' '),
        html: `<details class="item"><summary><b>${esc(d.q)}</b></summary><p class="answer">${esc(d.a)}</p>${d.x ? `<p class="muted">${esc(d.x)}</p>` : ''}</details>` })) });
    }
  }

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const draw = () => {
    const q = norm($('#q').value.trim());
    const out = groups.map(g => {
      const items = q ? g.items.filter(i => norm(i.key).includes(q)) : g.items;
      return items.length ? `<h2 class="group">${g.title} <small class="muted">${items.length}</small></h2>${items.map(i => i.html).join('')}` : '';
    }).join('');
    $('#list').innerHTML = out || '<p class="empty">Nessun risultato.</p>';
    if (q) $$('#list details').forEach(d => { if ($$('#list details').length <= 3) d.open = true; });
  };
  $('#q').addEventListener('input', draw);
  draw();
}

// ======================= FLASHCARD =======================
function renderFlashSetup() {
  const cards = allCards();
  const sel = new Set(loadSel('flash'));
  const inSel = cards.filter(c => sel.has(c.t));
  const due = inSel.filter(c => cardState(c.id) && isDue(c.id)).length;
  const fresh = inSel.filter(c => !cardState(c.id)).length;
  h(`
    <div class="page-head"><h1>Flashcard</h1>
      <p class="muted">Leggi la domanda, prova a rispondere a mente, poi gira la carta e valuta onestamente. Le carte che sai tornano sempre più di rado (1, 2, 4, 8… giorni), quelle che sbagli tornano subito.</p></div>
    <div class="card">
      ${topicPicker('flash')}
      <div class="row gap">
        <label>Nuove carte per sessione
          <select id="newN"><option>10</option><option selected>20</option><option>40</option><option value="9999">Tutte</option></select>
        </label>
      </div>
      <p class="muted" id="sum">${due} da ripassare · ${fresh} nuove negli argomenti scelti</p>
      <button class="btn primary big" id="go">Inizia</button>
    </div>`);
  const read = bindPicker('flash');
  const upd = () => {
    const s = new Set(read());
    const c = cards.filter(x => s.has(x.t));
    $('#sum').textContent = `${c.filter(x => cardState(x.id) && isDue(x.id)).length} da ripassare · ${c.filter(x => !cardState(x.id)).length} nuove negli argomenti scelti`;
  };
  $('.picker').addEventListener('change', upd);
  $$('.picker button').forEach(b => b.addEventListener('click', upd));
  $('#go').onclick = () => {
    const s = new Set(read());
    if (!s.size) return notify('Scegli almeno un argomento.');
    const pool = cards.filter(c => s.has(c.t));
    const dueCards = shuffle(pool.filter(c => cardState(c.id) && isDue(c.id)));
    const newCards = shuffle(pool.filter(c => !cardState(c.id))).slice(0, +$('#newN').value);
    const deck = [...dueCards, ...newCards];
    if (!deck.length) {
      const next = pool.map(c => cardState(c.id)?.d).filter(Boolean).sort((a, b) => a - b)[0];
      return notify('Niente da ripassare ora in questi argomenti.' + (next ? ` Prossimo ripasso: ${new Date(next).toLocaleDateString('it-IT')}.` : ''));
    }
    playFlash(deck);
  };
}

function playFlash(deck) {
  let i = 0, flipped = false;
  const tally = { again: 0, hard: 0, good: 0 };
  const total = deck.length;

  const draw = () => {
    if (i >= deck.length) return done();
    const c = deck[i];
    const t = topicById(c.t);
    h(`
      <div class="play-head"><a href="#flashcard" class="link">✕ Esci</a><span class="muted">${Math.min(i + 1, deck.length)} / ${deck.length}</span></div>
      ${bar(pct(i, deck.length))}
      <div class="flash ${flipped ? 'flipped' : ''}" id="card" tabindex="0">
        <div class="fc-meta">${t.icon} ${t.nome} · ${esc(c.sub)}</div>
        <div class="fc-front">${esc(c.front)}</div>
        ${flipped ? `<div class="fc-back">${c.back}</div>` : '<div class="fc-hint">Tocca per girare <kbd>Spazio</kbd></div>'}
      </div>
      <div class="grade ${flipped ? '' : 'hidden'}">
        <button class="btn bad" data-g="again">Non la sapevo<kbd>1</kbd></button>
        <button class="btn mid" data-g="hard">Incerto<kbd>2</kbd></button>
        <button class="btn good" data-g="good">La sapevo<kbd>3</kbd></button>
      </div>`);
    $('#card').onclick = () => { if (!flipped) { flipped = true; draw(); } };
    $$('[data-g]').forEach(b => b.onclick = () => grade(b.dataset.g));
  };
  const grade = g => {
    if (!flipped) return;
    const c = deck[i];
    gradeCard(c.id, g);
    tally[g]++;
    if (g === 'again') deck.push(c); // ritorna in fondo alla sessione
    i++; flipped = false; draw();
  };
  const done = () => {
    cleanup?.(); cleanup = null;
    h(`<div class="card center">
      <div class="big-emoji">✅</div><h1>Sessione completata</h1>
      <p class="muted">${total} carte · ${tally.good} sapute · ${tally.hard} incerte · ${tally.again} da rivedere</p>
      <div class="row gap center"><a class="btn primary" href="#flashcard">Nuova sessione</a><a class="btn" href="#home">Home</a></div></div>`);
  };
  cleanup = onKeys({
    ' ': () => { if (!flipped) { flipped = true; draw(); } },
    'Enter': () => { if (!flipped) { flipped = true; draw(); } },
    '1': () => grade('again'), '2': () => grade('hard'), '3': () => grade('good'),
  });
  draw();
}

// ======================= QUIZ =======================
function renderQuizSetup() {
  h(`
    <div class="page-head"><h1>Quiz</h1><p class="muted">Domande a risposta multipla generate dal programma. Dopo ogni risposta vedi la spiegazione. Le domande sbagliate tornano più spesso.</p></div>
    <div class="card">
      ${topicPicker('quiz')}
      <label>Numero di domande
        <select id="n"><option>10</option><option selected>20</option><option>30</option><option>50</option></select></label>
      <button class="btn primary big" id="go">Inizia il quiz</button>
    </div>`);
  const read = bindPicker('quiz');
  $('#go').onclick = () => {
    const t = read();
    if (!t.length) return notify('Scegli almeno un argomento.');
    playQuiz(buildQuiz(t, +$('#n').value), 'Quiz');
  };
}

function playQuiz(qs, title, backHref = '#quiz') {
  if (!qs.length) {
    h(`<div class="card center"><div class="big-emoji">🎉</div><h1>Niente da ripassare</h1><p class="muted">Non ci sono domande in questa selezione.</p><a class="btn primary" href="#home">Home</a></div>`);
    return;
  }
  let i = 0, answered = null, ok = 0;
  const log = [];
  const draw = () => {
    const q = qs[i];
    const t = topicById(q.t);
    h(`
      <div class="play-head"><a href="${backHref}" class="link">✕ Esci</a><span class="muted">${title} · ${i + 1} / ${qs.length}</span><span class="score">✓ ${ok}</span></div>
      ${bar(pct(i, qs.length))}
      <div class="q card">
        <div class="fc-meta">${t.icon} ${t.nome}</div>
        <h2 class="q-text">${esc(q.q)}</h2>
        <div class="opts">${q.options.map((o, k) => {
          let cls = '';
          if (answered !== null) cls = k === q.correct ? 'right' : (k === answered ? 'wrong' : 'dim');
          return `<button class="opt ${cls}" data-k="${k}" ${answered !== null ? 'disabled' : ''}><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`;
        }).join('')}</div>
        ${answered !== null ? `
          <div class="feedback ${answered === q.correct ? 'ok' : 'ko'}">
            <b>${answered === q.correct ? 'Esatto!' : 'Risposta corretta: ' + esc(q.a)}</b>
            ${q.x ? `<p>${esc(q.x)}</p>` : ''}
          </div>
          <button class="btn primary big" id="next">${i + 1 < qs.length ? 'Avanti' : 'Vedi risultato'} <kbd>Invio</kbd></button>` : ''}
      </div>`);
    $$('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k));
    $('#next')?.addEventListener('click', next);
  };
  const answer = k => {
    if (answered !== null || k >= qs[i].options.length) return;
    answered = k;
    const q = qs[i];
    const right = k === q.correct;
    if (right) ok++;
    recordAnswer(q, right);
    log.push({ q, right });
    draw();
  };
  const next = () => {
    if (answered === null) return;
    i++; answered = null;
    if (i >= qs.length) return done();
    draw(); window.scrollTo(0, 0);
  };
  const done = () => {
    cleanup?.(); cleanup = null;
    const wrong = log.filter(l => !l.right);
    h(`<div class="card center">
        <div class="big-emoji">${pct(ok, qs.length) >= 80 ? '🏆' : pct(ok, qs.length) >= 60 ? '👍' : '📚'}</div>
        <h1>${ok} / ${qs.length} corrette</h1>
        <p class="muted">${pct(ok, qs.length)}% di risposte esatte</p>
        <div class="row gap center"><a class="btn primary" href="${backHref}">Nuovo quiz</a>${wrong.length ? '<a class="btn" href="#quiz-errori">Ripeti errori</a>' : ''}<a class="btn" href="#home">Home</a></div>
      </div>
      ${wrong.length ? `<h2 class="group">Da ripassare</h2>${wrong.map(l => `
        <div class="review ko"><b>${esc(l.q.q)}</b><p>✓ ${esc(l.q.a)}</p>${l.q.x ? `<p class="muted">${esc(l.q.x)}</p>` : ''}</div>`).join('')}` : ''}`);
  };
  cleanup = onKeys({
    '1': () => answer(0), '2': () => answer(1), '3': () => answer(2), '4': () => answer(3),
    'Enter': () => next(),
  });
  draw();
}

// ======================= ESAME =======================
function renderExamSetup() {
  const last = state.exams.slice(0, 5);
  h(`
    <div class="page-head"><h1>Simulazione d'esame</h1>
      <p class="muted">Domande miste distribuite su tutti gli argomenti scelti, a tempo, senza correzione fino alla consegna. Voto in trentesimi: 18 è la sufficienza, lode con tutte le risposte corrette.</p></div>
    <div class="card">
      ${topicPicker('exam')}
      <div class="row gap">
        <label>Domande <select id="n"><option>15</option><option selected>30</option><option>45</option></select></label>
        <label>Minuti <select id="min"><option>15</option><option selected>30</option><option>45</option><option value="0">Senza limite</option></select></label>
      </div>
      <button class="btn primary big" id="go">Inizia la simulazione</button>
    </div>
    ${last.length ? `<h2 class="group">Ultime simulazioni</h2>
      <div class="card">${last.map(e => `<div class="hist"><span>${new Date(e.at).toLocaleDateString('it-IT')}</span><span>${e.ok}/${e.n}</span><b class="${e.passed ? 'pos' : 'neg'}">${e.voto}</b></div>`).join('')}</div>` : ''}`);
  const read = bindPicker('exam');
  $('#go').onclick = () => {
    const t = read();
    if (!t.length) return notify('Scegli almeno un argomento.');
    playExam(buildExam(t, +$('#n').value), +$('#min').value, t);
  };
}

function playExam(qs, minutes, topics) {
  const answers = new Array(qs.length).fill(null);
  let i = 0;
  const end = minutes ? Date.now() + minutes * 60000 : null;
  let timer = null;

  const fmt = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const tick = () => {
    const el = $('#timer');
    if (!end || !el) return;
    const left = end - Date.now();
    el.textContent = '⏱ ' + fmt(left);
    el.classList.toggle('urgent', left < 60000);
    if (left <= 0) finish(true);
  };
  const draw = () => {
    const q = qs[i];
    h(`
      <div class="play-head"><button class="link" id="quit">✕ Abbandona</button><span id="timer" class="timer">${end ? '' : 'Senza limite'}</span><button class="btn small primary" id="end">Consegna</button></div>
      <div class="qgrid">${qs.map((_, k) => `<button class="${k === i ? 'cur' : ''} ${answers[k] !== null ? 'done' : ''}" data-j="${k}">${k + 1}</button>`).join('')}</div>
      <div class="q card">
        <div class="fc-meta">Domanda ${i + 1} di ${qs.length}</div>
        <h2 class="q-text">${esc(q.q)}</h2>
        <div class="opts">${q.options.map((o, k) => `<button class="opt ${answers[i] === k ? 'sel' : ''}" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`).join('')}</div>
        <div class="row between">
          <button class="btn" id="prev" ${i === 0 ? 'disabled' : ''}>← Precedente</button>
          <button class="btn" id="nx">${i + 1 < qs.length ? 'Successiva →' : 'Riepilogo'}</button>
        </div>
      </div>`);
    tick();
    $$('.opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
    $$('.qgrid button').forEach(b => b.onclick = () => { i = +b.dataset.j; draw(); });
    $('#prev').onclick = () => { if (i > 0) { i--; draw(); } };
    $('#nx').onclick = () => { if (i + 1 < qs.length) { i++; draw(); } else confirmEnd(); };
    $('#end').onclick = confirmEnd;
    $('#quit').onclick = async () => { if (await ask('Abbandonare la simulazione? Le risposte non verranno salvate.', 'Abbandona')) { stop(); location.hash = '#esame'; } };
  };
  const choose = k => { if (k >= qs[i].options.length) return; answers[i] = k; draw(); };
  const confirmEnd = async () => {
    const miss = answers.filter(a => a === null).length;
    if (await ask(miss ? `Hai ancora ${miss} domande senza risposta. Consegnare comunque?` : 'Consegnare la prova?', 'Consegna')) finish(false);
  };
  const stop = () => { clearInterval(timer); cleanup?.(); cleanup = null; };
  const finish = (timeout) => {
    stop();
    let ok = 0;
    qs.forEach((q, k) => {
      const right = answers[k] === q.correct;
      if (right) ok++;
      if (answers[k] !== null) recordAnswer(q, right);
      else recordAnswer(q, false);
    });
    const raw = ok / qs.length * 30;
    const voto = ok === qs.length ? '30L' : String(Math.round(raw));
    const passed = Math.round(raw) >= 18;
    recordExam({ at: Date.now(), n: qs.length, ok, voto, passed, topics });
    // Analisi per argomento
    const byT = {};
    qs.forEach((q, k) => { const b = byT[q.t] || (byT[q.t] = { ok: 0, n: 0 }); b.n++; if (answers[k] === q.correct) b.ok++; });
    h(`
      <div class="card center">
        ${timeout ? '<p class="warn">⏱ Tempo scaduto: prova consegnata automaticamente.</p>' : ''}
        <div class="voto ${passed ? 'pos' : 'neg'}">${voto === '30L' ? '30 e lode' : voto}<small>/30</small></div>
        <h1>${passed ? 'Esame superato' : 'Non ancora sufficiente'}</h1>
        <p class="muted">${ok} risposte corrette su ${qs.length}</p>
        <div class="row gap center"><a class="btn primary" href="#esame">Nuova simulazione</a><a class="btn" href="#quiz-errori">Ripeti errori</a></div>
      </div>
      <h2 class="group">Per argomento</h2>
      <div class="card">${Object.entries(byT).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, b]) => `
        <div class="tstat"><span>${topicById(t).icon} ${topicById(t).nome}</span><span>${b.ok}/${b.n}</span>${bar(pct(b.ok, b.n), pct(b.ok, b.n) < 60 ? 'low' : '')}</div>`).join('')}</div>
      <h2 class="group">Correzione</h2>
      ${qs.map((q, k) => {
        const a = answers[k], right = a === q.correct;
        return `<div class="review ${right ? 'ok' : 'ko'}"><b>${k + 1}. ${esc(q.q)}</b>
          ${a === null ? '<p class="muted">Nessuna risposta</p>' : right ? '' : `<p>✗ ${esc(q.options[a])}</p>`}
          <p>✓ ${esc(q.a)}</p>${!right && q.x ? `<p class="muted">${esc(q.x)}</p>` : ''}</div>`;
      }).join('')}`);
    window.scrollTo(0, 0);
  };
  if (end) timer = setInterval(tick, 1000);
  cleanup = () => { clearInterval(timer); kb(); };
  const kb = onKeys({
    '1': () => choose(0), '2': () => choose(1), '3': () => choose(2), '4': () => choose(3),
    'ArrowRight': () => { if (i + 1 < qs.length) { i++; draw(); } },
    'ArrowLeft': () => { if (i > 0) { i--; draw(); } },
  });
  draw();
}

// ======================= PROGRESSI =======================
function renderProgress() {
  const counts = countByTopic();
  const g = globalStats();
  const cards = allCards();
  const boxes = [0, 0, 0, 0, 0, 0, 0];
  let fresh = 0;
  for (const c of cards) { const s = cardState(c.id); if (s) boxes[s.b]++; else fresh++; }
  const rows = TOPICS.map(t => ({ t, s: topicStats(t.id), n: counts[t.id] || 0 }));
  const weak = rows.filter(r => r.s.ok + r.s.ko >= 5).sort((a, b) => a.s.pct - b.s.pct).slice(0, 3);
  h(`
    <div class="page-head"><h1>Progressi</h1><p class="muted">Dati salvati solo su questo dispositivo.</p></div>
    <section class="stats">
      <div class="stat"><b>${g.seen}</b><span>domande diverse viste</span></div>
      <div class="stat"><b>${g.pct === null ? '—' : g.pct + '%'}</b><span>risposte corrette</span></div>
      <div class="stat"><b>${boxes.slice(4).reduce((a, b) => a + b, 0)}</b><span>flashcard consolidate</span></div>
      <div class="stat"><b>${state.exams.length}</b><span>simulazioni svolte</span></div>
    </section>
    ${weak.length ? `<div class="card tip"><b>Su cosa concentrarti:</b> ${weak.map(r => `<a href="#quiz-t-${r.t.id}">${r.t.nome} (${r.s.pct}%)</a>`).join(', ')}</div>` : ''}
    <h2 class="group">Argomenti</h2>
    <div class="card">${rows.map(r => `
      <a class="tstat" href="#quiz-t-${r.t.id}"><span>${r.t.icon} ${r.t.nome}</span>
      <span class="muted">${r.s.seen}/${r.n} viste · ${r.s.pct === null ? '—' : r.s.pct + '%'}</span>
      ${bar(r.s.pct ?? 0, r.s.pct !== null && r.s.pct < 60 ? 'low' : '')}</a>`).join('')}</div>
    <h2 class="group">Flashcard per livello</h2>
    <div class="card boxes">
      <div><b>${fresh}</b><small>Nuove</small></div>
      ${boxes.map((n, k) => `<div><b>${n}</b><small>${['Da rivedere', '1 g', '2 g', '4 g', '8 g', '16 g', '32 g'][k]}</small></div>`).join('')}
    </div>
    ${state.exams.length ? `<h2 class="group">Storico simulazioni</h2><div class="card">${state.exams.map(e => `
      <div class="hist"><span>${new Date(e.at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span><span>${e.ok}/${e.n}</span><b class="${e.passed ? 'pos' : 'neg'}">${e.voto}</b></div>`).join('')}</div>` : ''}
    <div class="row gap danger-zone">
      <button class="btn" id="export">Esporta progressi</button>
      <button class="btn" id="paste">Incolla backup</button>
      <label class="btn">Importa file<input type="file" id="import" accept="application/json,.json" hidden></label>
      <button class="btn bad" id="reset">Azzera tutto</button>
    </div>
    <textarea id="backup" class="backup" hidden aria-label="Backup dei progressi"></textarea>
    <button class="btn primary" id="restore" hidden>Ripristina da testo</button>`);
  $('#reset').onclick = async () => { if (await ask('Cancellare tutti i progressi (statistiche, flashcard, simulazioni)?', 'Cancella tutto')) { resetAll(); renderProgress(); notify('Progressi azzerati.'); } };
  $('#export').onclick = async () => {
    const json = JSON.stringify(state);
    try {
      await navigator.clipboard.writeText(json);
      notify('Progressi copiati negli appunti: incollali in una nota per conservarli.');
    } catch (e) {
      $('#backup').hidden = false; $('#backup').value = json; $('#backup').select();
      notify('Copia il testo selezionato e conservalo in una nota.');
    }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `anatomia-progressi-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { /* download non disponibile */ }
  };
  const applyBackup = text => {
    try {
      const d = JSON.parse(text);
      if (!d || typeof d !== 'object' || !d.stats) throw new Error();
      state.srs = d.srs || {}; state.stats = d.stats || {}; state.exams = d.exams || [];
      save(); renderProgress(); notify('Progressi ripristinati.');
    } catch (err) { notify('Testo o file non valido: usa un backup esportato da questa app.'); }
  };
  $('#paste').onclick = () => { $('#backup').hidden = false; $('#backup').value = ''; $('#backup').focus(); $('#restore').hidden = false; };
  $('#restore').onclick = () => applyBackup($('#backup').value);
  $('#import').onchange = async e => {
    const f = e.target.files[0]; if (f) applyBackup(await f.text());
  };
}

// ======================= ROUTER =======================
function route() {
  cleanup?.(); cleanup = null;
  const hash = location.hash.slice(1) || 'home';
  let m;
  if ((m = hash.match(/^studia(?:-(\w+))?$/))) return renderStudy(m[1]);
  if (hash === 'flashcard') return renderFlashSetup();
  if (hash === 'quiz') return renderQuizSetup();
  if (hash === 'quiz-rapido') return playQuiz(buildQuiz(TOPICS.map(t => t.id), 10), 'Quiz rapido', '#home');
  if (hash === 'quiz-errori') return playQuiz(buildQuiz(TOPICS.map(t => t.id), 20, { onlyWrong: true }), 'Ripasso errori', '#home');
  if ((m = hash.match(/^quiz-t-([\w-]+)$/)) && topicById(m[1])) return playQuiz(buildQuiz([m[1]], 10), topicById(m[1]).nome, '#home');
  if (hash === 'esame') return renderExamSetup();
  if (hash === 'progressi') return renderProgress();
  return renderHome();
}

function markNav() {
  const sec = (location.hash.slice(1) || 'home').split('-')[0];
  $$('[data-s]', document).forEach(a => a.classList.toggle('on', a.dataset.s === sec));
}

window.addEventListener('hashchange', () => { route(); markNav(); window.scrollTo(0, 0); });
allQuestions();
route(); markNav();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

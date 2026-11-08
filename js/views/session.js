// Seduta: esercizi con prescrizione (pianificato) ed eventuale eseguito, totali dal vivo

import {
  sessionById, athleteById, exById, newItem, deleteSession, duplicateSession, save
} from '../store.js';
import { KINDS, plannedKg, totals } from '../metrics.js';
import { liftById } from '../lifts.js';
import { App } from '../app.js';
import { openModal, confirmDlg, toast, pickExercise, exTag } from '../ui.js';
import { esc, fmtNum, fmtDay, mondayOf, addDays } from '../utils.js';

// Campi per tipo di esercizio: [campo, etichetta]
function fieldsFor(ex) {
  if (ex.kind === 'plio') return [['sets', 'Serie'], ['reps', 'Contatti/serie']];
  if (ex.kind === 'forza' && ex.lift) return [['sets', 'Serie'], ['reps', 'Rip'], ['pct', '%1RM'], ['kg', liftById(ex.lift)?.bw ? 'Zavorra kg' : 'kg'], ['rpe', 'RPE']];
  return [['sets', 'Serie'], ['reps', 'Rip'], ['kg', 'kg'], ['rpe', 'RPE']];
}

function inputs(it, ex, a, which) {
  const src = which === 'done' ? it.done : it;
  const fields = fieldsFor(ex).filter(([f]) => which === 'plan' || f !== 'pct');
  return `<div class="grid-in" style="--n:${fields.length}">${fields.map(([f, lab]) => {
    const ph = which === 'plan' && f === 'kg' && !it.kg && plannedKg(it, ex, a) ? `${fmtNum(plannedKg(it, ex, a), 1)}` : '';
    return `<label><span>${lab}</span><input inputmode="decimal" data-w="${which}" data-f="${f}" value="${esc(src[f] || '')}" placeholder="${ph}"></label>`;
  }).join('')}</div>`;
}

function itemCard(it, a, i, n) {
  const ex = exById(it.exerciseId);
  return `<div class="item" data-id="${it.id}">
    <div class="item-head">
      <span class="kchip k-${ex.kind}">${KINDS[ex.kind]?.short || ''}</span>
      <div class="item-name"><b>${esc(ex.name)}</b><small>${esc(exTag(ex))}</small></div>
      <span class="row-actions">
        <button class="icon-btn" data-mv="-1" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button>
        <button class="icon-btn" data-mv="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button>
        <button class="icon-btn danger" data-del aria-label="Rimuovi esercizio">✕</button>
      </span>
    </div>
    <div class="lbl">Pianificato</div>
    ${inputs(it, ex, a, 'plan')}
    <label class="done-toggle"><input type="checkbox" data-done ${it.done ? 'checked' : ''}> Eseguito</label>
    ${it.done ? `<div class="done-box">${inputs(it, ex, a, 'done')}</div>` : ''}
    <input class="note-in" data-f="note" data-w="plan" value="${esc(it.note || '')}" placeholder="Nota (tempo, recupero, indicazioni tecniche…)">
  </div>`;
}

function totalsLine(a, s) {
  const p = totals(a, [s], 'plan');
  const d = totals(a, [s], 'done');
  const parts = [];
  const both = (label, pv, dv, unit = '') => {
    if (pv || dv) parts.push(`<span>${label}: <b>${fmtNum(pv)}</b>${dv ? ` <small>/ ${fmtNum(dv)} eseg.</small>` : ''}${unit}</span>`);
  };
  both('Sollevamenti fondamentali', p.fond.nbl, d.fond.nbl);
  both('Tonnellaggio fondamentali', p.fond.ton, d.fond.ton, ' kg');
  both('Sollevamenti complementari', p.compl.nbl, d.compl.nbl);
  both('Tonnellaggio complementari', p.compl.ton, d.compl.ton, ' kg');
  both('Contatti', p.plioTot, d.plioTot);
  both('Rip. potenza', p.potenza.reps, d.potenza.reps);
  both('Serie accessori', p.acc.sets, d.acc.sets);
  return parts.join('') || '<span class="muted">Aggiungi esercizi per vedere i totali.</span>';
}

export function render(el, sid) {
  const s = sessionById(sid);
  const a = s && athleteById(s.athleteId);
  if (!s || !a) { el.innerHTML = '<p class="empty">Seduta non trovata. <a href="#/">Torna agli atleti</a></p>'; return; }
  const monday = mondayOf(s.date);

  el.innerHTML = `
    <nav class="crumbs"><a href="#/">Atleti</a> <span>/</span> <a href="#/a/${a.id}">${esc(a.name)}</a> <span>/</span> <a href="#/a/${a.id}/w/${monday}">Settimana</a> <span>/</span> Seduta</nav>
    <div class="page-head">
      <div class="sess-title">
        <input id="sname" class="title-in" value="${esc(s.name)}" aria-label="Nome della seduta">
        <p class="sub">${fmtDay(s.date)} · <input type="date" id="sdate" value="${s.date}" aria-label="Data della seduta"></p>
      </div>
      <div class="row">
        <button class="btn" id="dup">Duplica</button>
        <button class="btn danger ghost" id="del">Elimina</button>
      </div>
    </div>
    <div class="items">${s.items.map((it, i) => itemCard(it, a, i, s.items.length)).join('') || '<p class="empty">Nessun esercizio. Aggiungi il primo.</p>'}</div>
    <button class="btn primary block" id="addEx">+ Aggiungi esercizio</button>
    <div class="sess-totals" id="tot">${totalsLine(a, s)}</div>`;

  const refreshTotals = () => { el.querySelector('#tot').innerHTML = totalsLine(a, s); };

  el.querySelector('#sname').oninput = e => { s.name = e.target.value; save(); };
  el.querySelector('#sdate').onchange = e => {
    if (!e.target.value) return;
    s.date = e.target.value; save(); App.render();
  };
  el.querySelector('#addEx').onclick = () => pickExercise(id => {
    s.items.push(newItem(id)); save(); App.render();
    const last = el.querySelector('.item:last-child input[data-f="sets"]');
    if (last) { last.scrollIntoView({ block: 'center' }); last.focus(); }
  });

  const items = el.querySelector('.items');
  // Gli input aggiornano lo stato senza ridisegnare (non si perde il focus)
  items.addEventListener('input', e => {
    const f = e.target.dataset.f;
    const card = e.target.closest('[data-id]');
    if (!f || !card) return;
    const it = s.items.find(x => x.id === card.dataset.id);
    const target = e.target.dataset.w === 'done' ? it.done : it;
    target[f] = e.target.value.trim();
    save();
    if (f === 'pct' || f === 'kg') {
      const kgIn = card.querySelector('input[data-w="plan"][data-f="kg"]');
      const k = plannedKg(it, exById(it.exerciseId), a);
      if (kgIn) kgIn.placeholder = !it.kg && k ? fmtNum(k, 1) : '';
    }
    refreshTotals();
  });
  items.addEventListener('change', e => {
    if (!e.target.matches('[data-done]')) return;
    const it = s.items.find(x => x.id === e.target.closest('[data-id]').dataset.id);
    if (e.target.checked) {
      // Precompila l'eseguito con il pianificato: si corregge solo ciò che è cambiato
      const k = plannedKg(it, exById(it.exerciseId), a);
      it.done = { sets: it.sets, reps: it.reps, kg: k ? String(k) : '', rpe: it.rpe };
    } else it.done = null;
    save(); App.render();
  });
  items.addEventListener('click', async e => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const i = s.items.findIndex(x => x.id === card.dataset.id);
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const j = i + Number(mv.dataset.mv);
      [s.items[i], s.items[j]] = [s.items[j], s.items[i]];
      save(); App.render(); return;
    }
    if (e.target.closest('[data-del]') && await confirmDlg('Rimuovere questo esercizio dalla seduta?', 'Rimuovi', true)) {
      s.items.splice(i, 1); save(); App.render();
    }
  });

  el.querySelector('#dup').onclick = () => openModal('Duplica seduta', `
    <form class="form" id="dpf">
      <p>Crea una copia del pianificato (senza l'eseguito) in un altro giorno.</p>
      <label>Giorno<input type="date" name="d" value="${addDays(s.date, 7)}" required></label>
      <div class="modal-actions"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Duplica</button></div>
    </form>`, (m, close) => {
    m.querySelector('#dpf').onsubmit = ev => {
      ev.preventDefault();
      const c = duplicateSession(s, String(new FormData(ev.target).get('d')));
      close(); toast('Seduta duplicata'); App.go(`#/s/${c.id}`);
    };
  });
  el.querySelector('#del').onclick = async () => {
    if (await confirmDlg('Eliminare la seduta?', 'Elimina', true)) {
      deleteSession(s.id); toast('Seduta eliminata'); App.go(`#/a/${a.id}/w/${monday}`);
    }
  };
}

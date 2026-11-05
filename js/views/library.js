// Libreria esercizi: categoria, alzata collegata, classe pliometrica

import { state, saveExercise, deleteExercise, exerciseUsed } from '../store.js';
import { KINDS, LIFTS, PLYO } from '../metrics.js';
import { App } from '../app.js';
import { openModal, confirmDlg, toast, exTag } from '../ui.js';
import { esc } from '../utils.js';

function form(ex) {
  const v = ex || { name: '', kind: 'forza', lift: null, plyo: 'bassa' };
  const used = ex && exerciseUsed(ex.id);
  openModal(ex ? 'Modifica esercizio' : 'Nuovo esercizio', `
    <form class="form" id="exf">
      <label>Nome<input name="name" required value="${esc(v.name)}"></label>
      <label>Categoria<select name="kind">${Object.entries(KINDS).map(([k, x]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
      <label data-for="forza">Conta come alzata di gara
        <select name="lift"><option value="">No, esercizio di forza generico</option>
          ${LIFTS.map(l => `<option value="${l.id}" ${l.id === v.lift ? 'selected' : ''}>${l.name}</option>`).join('')}</select>
        <small>Se collegato, entra nei totali di quell'alzata e si può programmare in %1RM del suo massimale.</small></label>
      <label data-for="plio">Classe di intensità
        <select name="plyo">${PLYO.map(p => `<option value="${p.id}" ${p.id === v.plyo ? 'selected' : ''}>${p.name}</option>`).join('')}</select>
        <small>Classificazione tua (convenzione), non una misura.</small></label>
      ${used ? '<p class="warnline">Esercizio già usato: cambiando categoria o classe cambiano anche i totali delle settimane passate.</p>' : ''}
      <div class="modal-actions">
        ${ex ? `<button type="button" class="btn danger ghost" id="exdel" ${used ? 'disabled title="Usato in qualche seduta"' : ''}>Elimina</button>` : ''}
        <button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Salva</button>
      </div>
    </form>`, (m, close) => {
    const form = m.querySelector('#exf');
    // form.elements: form.name restituirebbe l'attributo name del form, non il campo
    const f = form.elements;
    const sync = () => m.querySelectorAll('[data-for]').forEach(l => { l.hidden = l.dataset.for !== f.kind.value; });
    f.kind.onchange = sync;
    sync();
    form.onsubmit = e => {
      e.preventDefault();
      const kind = f.kind.value;
      saveExercise({
        ...(ex || {}), name: f.name.value.trim(), kind,
        lift: kind === 'forza' ? (f.lift.value || null) : null,
        plyo: kind === 'plio' ? f.plyo.value : null
      });
      close(); App.render();
    };
    const del = m.querySelector('#exdel');
    if (del) del.onclick = async () => {
      close();
      if (await confirmDlg(`Eliminare “${ex.name}” dalla libreria?`, 'Elimina', true)) { deleteExercise(ex.id); toast('Esercizio eliminato'); App.render(); }
    };
  });
}

export function render(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Libreria esercizi</h1><p class="sub">${state.exercises.length} esercizi · la categoria decide come si misura volume e intensità</p></div>
      <button class="btn primary" id="add">+ Esercizio</button>
    </div>
    <div class="lib">${Object.entries(KINDS).map(([k, x]) => {
      const rows = state.exercises.filter(e => e.kind === k).sort((a, b) => a.name.localeCompare(b.name, 'it'));
      return `<section class="card"><h2><span class="kchip k-${k}">${x.short}</span> ${x.name} <small class="muted">${rows.length}</small></h2>
        <div class="lib-list">${rows.map(e => `<button class="lib-row" data-id="${esc(e.id)}"><span>${esc(e.name)}</span><small>${esc(exTag(e))}</small></button>`).join('')}</div>
      </section>`;
    }).join('')}</div>`;
  el.querySelector('#add').onclick = () => form(null);
  el.querySelector('.lib').onclick = e => {
    const r = e.target.closest('[data-id]');
    if (r) form(state.exercises.find(x => x.id === r.dataset.id));
  };
}

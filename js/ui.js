// Modali, conferme, toast e selettore esercizi

import { state } from './store.js';
import { KINDS, LIFTS, PLYO } from './metrics.js';
import { esc } from './utils.js';

export function openModal(title, body, onMount) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Chiudi">✕</button></div>
      <div class="modal-body">${body}</div>
    </div>`;
  document.body.appendChild(wrap);
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', e => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  if (onMount) onMount(wrap.querySelector('.modal'), close);
  const first = wrap.querySelector('input, select');
  if (first && matchMedia('(pointer: fine)').matches) first.focus();
  return close;
}

export function confirmDlg(message, okLabel = 'Conferma', danger = false) {
  return new Promise(resolve => {
    let answered = false;
    const close = openModal('Conferma', `
      <p>${esc(message)}</p>
      <div class="modal-actions">
        <button class="btn" data-close>Annulla</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(okLabel)}</button>
      </div>`, m => {
      m.querySelector('#cf-ok').onclick = () => { answered = true; close(); resolve(true); };
    });
    // Se si chiude in altro modo la risposta è "no"
    const obs = new MutationObserver(() => {
      if (!document.body.contains(document.querySelector('#cf-ok'))) { obs.disconnect(); if (!answered) resolve(false); }
    });
    obs.observe(document.body, { childList: true });
  });
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

export const exTag = ex => {
  if (ex.kind === 'forza' && ex.lift) return LIFTS.find(l => l.id === ex.lift)?.name || '';
  if (ex.kind === 'plio') return 'Intensità ' + (PLYO.find(p => p.id === ex.plyo)?.name || '').toLowerCase();
  return '';
};

export function pickExercise(onPick) {
  let kind = '';
  const close = openModal('Aggiungi esercizio', `
    <input type="search" id="px-q" placeholder="Cerca esercizio…" autocomplete="off">
    <div class="chips" id="px-k">
      <button class="chip on" data-k="">Tutti</button>
      ${Object.entries(KINDS).map(([k, v]) => `<button class="chip" data-k="${k}">${v.name}</button>`).join('')}
    </div>
    <div class="pick-list" id="px-list"></div>`, m => {
    const q = m.querySelector('#px-q');
    const list = m.querySelector('#px-list');
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const rows = state.exercises
        .filter(e => (!kind || e.kind === kind) && (!s || e.name.toLowerCase().includes(s)))
        .sort((a, b) => a.name.localeCompare(b.name, 'it'));
      list.innerHTML = rows.map(e => `
        <button class="pick-row" data-id="${esc(e.id)}">
          <span class="kchip k-${e.kind}">${KINDS[e.kind]?.short || ''}</span>
          <span>${esc(e.name)}</span><small>${esc(exTag(e))}</small>
        </button>`).join('') || '<p class="muted">Nessun esercizio. Aggiungilo dalla Libreria.</p>';
    };
    q.oninput = draw;
    m.querySelector('#px-k').onclick = e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      kind = b.dataset.k;
      m.querySelectorAll('#px-k .chip').forEach(c => c.classList.toggle('on', c === b));
      draw();
    };
    list.onclick = e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      close();
      onPick(b.dataset.id);
    };
    draw();
  });
}

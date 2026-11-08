// Modale di creazione / modifica atleta (usata dalla home e dalla timeline)

import { addAthlete, save } from '../store.js';
import { LIFTS, LIFT_GROUPS, liftsOf } from '../lifts.js';
import { openModal, toast } from '../ui.js';
import { esc, mondayOf, todayYmd } from '../utils.js';

export function athleteForm(a, onSaved) {
  const v = a || { name: '', sport: '', planStart: mondayOf(todayYmd()), compName: '', compDate: '', maxes: {} };
  openModal(a ? 'Modifica atleta' : 'Nuovo atleta', `
    <form id="af" class="form">
      <label>Nome<input name="name" required value="${esc(v.name)}" placeholder="Nome e cognome"></label>
      <label>Sport / categoria<input name="sport" value="${esc(v.sport)}" placeholder="es. Powerlifting -74 kg, Calcio…"></label>
      <label>Inizio del piano<input type="date" name="planStart" required value="${esc(v.planStart)}">
        <small>Viene portato al lunedì di quella settimana.</small></label>
      <div class="form-row">
        <label>Obiettivo / gara<input name="compName" value="${esc(v.compName || '')}" placeholder="facoltativo"></label>
        <label>Data<input type="date" name="compDate" value="${esc(v.compDate || '')}"></label>
      </div>
      ${LIFT_GROUPS.map(g => `<fieldset><legend>Massimali · ${g.name} (kg)</legend>
        <div class="form-row ${g.id === 'fond' ? 'three' : 'four'}">
          ${liftsOf(g.id).map(l => `<label>${l.name}${l.bw ? ' <small>(zavorra)</small>' : ''}<input inputmode="decimal" name="max-${l.id}" value="${esc(v.maxes?.[l.id] || '')}"></label>`).join('')}
        </div>
        ${g.id === 'fond' ? '<small>Servono a convertire le % del massimale in kg e a calcolare l\'intensità media. Lascia vuoto ciò che non usi.</small>' : ''}
      </fieldset>`).join('')}
      <label>Peso corporeo (kg)<input inputmode="decimal" name="bodyweight" value="${esc(v.bodyweight || '')}">
        <small>Serve per le trazioni zavorrate: il carico sollevato è peso corporeo + zavorra, quindi %1RM, tonnellaggio e 1RM stimato lo includono.</small></label>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Annulla</button>
        <button class="btn primary">${a ? 'Salva' : 'Crea atleta'}</button>
      </div>
    </form>`, (m, close) => {
    m.querySelector('#af').onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        name: String(fd.get('name')).trim(),
        sport: String(fd.get('sport')).trim(),
        planStart: mondayOf(String(fd.get('planStart'))),
        compName: String(fd.get('compName')).trim(),
        compDate: String(fd.get('compDate')),
        maxes: Object.fromEntries(LIFTS.map(l => [l.id, String(fd.get('max-' + l.id)).trim()])),
        bodyweight: String(fd.get('bodyweight')).trim()
      };
      if (!data.name) return;
      let saved = a;
      if (a) { Object.assign(a, data); save(); toast('Atleta aggiornato'); }
      else saved = addAthlete(data);
      close();
      onSaved(saved);
    };
  });
}

// Modale di creazione / modifica atleta (usata dalla home e dalla timeline)

import { addAthlete, save } from '../store.js';
import { LIFTS } from '../metrics.js';
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
      <fieldset><legend>Massimali (kg)</legend>
        <div class="form-row three">
          ${LIFTS.map(l => `<label>${l.name}<input inputmode="decimal" name="max-${l.id}" value="${esc(v.maxes?.[l.id] || '')}"></label>`).join('')}
        </div>
        <small>Servono a convertire le % del massimale in kg e a calcolare l'intensità media.</small>
      </fieldset>
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
        maxes: Object.fromEntries(LIFTS.map(l => [l.id, String(fd.get('max-' + l.id)).trim()]))
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

// Home: un riquadro per ogni atleta con blocco in corso, gara e onda del carico

import { state, blockAt, blockType, planWeeks, sessionsOfWeek, weekInBlock } from '../store.js';
import { metricById, weekMetrics, scalar } from '../metrics.js';
import { sparkline } from '../charts.js';
import { App } from '../app.js';
import { athleteForm } from './forms.js';
import { esc, todayYmd, mondayOf, diffDays, fmtDM } from '../utils.js';

function card(a, today, mon) {
  const b = blockAt(a, today);
  const weeks = planWeeks(a);
  const metric = metricById(a.metric);
  const values = weeks.map(w => scalar(metric, weekMetrics(a, w, 'plan')));
  const colors = weeks.map(w => blockType(blockAt(a, w)?.type).color);
  const cur = weeks.indexOf(mon);

  // Esercizi eseguiti / pianificati nelle sedute della settimana fino a oggi
  const due = sessionsOfWeek(a.id, mon).filter(s => s.date <= today).flatMap(s => s.items);
  const doneN = due.filter(i => i.done).length;

  const days = a.compDate ? diffDays(today, a.compDate) : null;
  return `
    <a class="ath-card" href="#/a/${a.id}">
      <div class="ath-top">
        <div><h3>${esc(a.name)}</h3><p class="muted">${esc(a.sport || '—')}</p></div>
        ${days != null && days >= 0 ? `<div class="countdown"><b>${days}</b><span>giorni a<br>${esc(a.compName || 'obiettivo')}</span></div>` : ''}
      </div>
      <div class="ath-block">
        ${b ? `<span class="bchip" style="--c:${blockType(b.type).color}">${esc(b.name)}</span>
               <span class="muted">settimana ${weekInBlock(b, mon)} di ${b.weeks}</span>`
            : '<span class="muted">Fuori dal piano</span>'}
      </div>
      <div class="ath-spark">${sparkline(values, colors, cur)}</div>
      <div class="ath-foot">
        <span class="muted">${esc(metric.label)} · pianificato</span>
        <span>${due.length ? `Questa settimana: <b>${doneN}/${due.length}</b> esercizi eseguiti` : 'Nessuna seduta finora'}</span>
      </div>
    </a>`;
}

export function render(el) {
  const today = todayYmd();
  const mon = mondayOf(today);
  const list = state.athletes.filter(a => !a.archived);
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Atleti</h1><p class="sub">${list.length} ${list.length === 1 ? 'atleta' : 'atleti'} · settimana del ${fmtDM(mon)}</p></div>
      <button class="btn primary" id="add">+ Nuovo atleta</button>
    </div>
    ${state.settings.demo ? '<div class="notice">Stai guardando <b>atleti di esempio</b> per provare l\'app. Li togli quando vuoi da <a href="#/dati">Dati</a>.</div>' : ''}
    <div class="cards">${list.map(a => card(a, today, mon)).join('') || '<p class="empty">Nessun atleta. Crea il primo con “Nuovo atleta”.</p>'}</div>`;
  el.querySelector('#add').onclick = () => athleteForm(null, a => App.go(`#/a/${a.id}`));
}

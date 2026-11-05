// Timeline della stagione di un atleta: grafico pianificato/eseguito, blocchi, elenco settimane

import {
  athleteById, blocksWithDates, blockAt, blockType, planWeeks, weekInBlock, sessionsOfWeek,
  BLOCK_TYPES, addBlock, moveBlock, removeBlock, deleteAthlete, save
} from '../store.js';
import { METRICS, metricById, weekMetrics, scalar, PLYO, LIFTS } from '../metrics.js';
import { seasonChart } from '../charts.js';
import { App } from '../app.js';
import { athleteForm } from './forms.js';
import { confirmDlg, toast } from '../ui.js';
import { esc, fmtNum, fmtDM, fmtRange, todayYmd, mondayOf, diffDays } from '../utils.js';

function metricSelect(current) {
  const groups = [...new Set(METRICS.map(m => m.group))];
  return `<select id="metric" aria-label="Metrica del grafico">${groups.map(g => `
    <optgroup label="${esc(g)}">${METRICS.filter(m => m.group === g).map(m =>
      `<option value="${m.id}" ${m.id === current ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</optgroup>`).join('')}
  </select>`;
}

export function render(el, id) {
  const a = athleteById(id);
  if (!a) { el.innerHTML = '<p class="empty">Atleta non trovato. <a href="#/">Torna agli atleti</a></p>'; return; }
  const today = todayYmd();
  const mon = mondayOf(today);
  const weeks = planWeeks(a);
  const blocks = blocksWithDates(a);
  const metric = metricById(a.metric);
  const cur = weeks.indexOf(mon);

  const planM = weeks.map(w => weekMetrics(a, w, 'plan'));
  const doneM = weeks.map(w => (w <= mon ? weekMetrics(a, w, 'done') : null));
  const plan = planM.map(m => metric.get(m));
  // Eseguito: null per le settimane future o senza nulla né in piano né fatto
  const done = doneM.map((m, i) => {
    if (!m) return null;
    const v = scalar(metric, m);
    return v || scalar(metric, planM[i]) ? v : null;
  });
  const bands = blocks.map(b => ({
    start: weeks.indexOf(b.start), len: b.weeks, name: b.name, color: blockType(b.type).color
  })).filter(b => b.start >= 0);

  const b = blockAt(a, today);
  const days = a.compDate ? diffDays(today, a.compDate) : null;
  const maxes = LIFTS.filter(l => a.maxes?.[l.id]).map(l => `${l.name} ${esc(a.maxes[l.id])}`).join(' · ');

  el.innerHTML = `
    <nav class="crumbs"><a href="#/">Atleti</a> <span>/</span> ${esc(a.name)}</nav>
    <div class="page-head">
      <div><h1>${esc(a.name)}</h1><p class="sub">${esc(a.sport || '')}${maxes ? ' · Massimali: ' + maxes + ' kg' : ''}</p></div>
      <div class="row">
        <button class="btn" id="edit">Modifica</button>
        <a class="btn primary" href="#/a/${a.id}/w/${mon}">Settimana corrente →</a>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><span>Blocco in corso</span><b>${b ? `<i class="dot" style="--c:${blockType(b.type).color}"></i>${esc(b.name)}` : '—'}</b>
        <small>${b ? `settimana ${weekInBlock(b, mon)} di ${b.weeks} · fino al ${fmtDM(b.end)}` : 'oggi è fuori dal piano'}</small></div>
      <div class="kpi"><span>Stagione</span><b>${cur >= 0 ? `S${cur + 1} di ${weeks.length}` : `${weeks.length} settimane`}</b>
        <small>dal ${fmtDM(a.planStart)}</small></div>
      <div class="kpi"><span>${esc(a.compName || 'Obiettivo')}</span><b>${days == null ? '—' : days >= 0 ? `tra ${days} giorni` : 'passato'}</b>
        <small>${a.compDate ? fmtDM(a.compDate) : 'nessuna data impostata'}</small></div>
    </div>

    <section class="card">
      <div class="card-head"><h2>Andamento della stagione</h2>${metricSelect(metric.id)}</div>
      <div class="chart-scroll" id="cs">${weeks.length ? seasonChart({
        weeks: weeks.map(w => ({ monday: w, color: blockType(blockAt(a, w)?.type).color })),
        plan, done, bands, current: cur, dec: metric.dec || 0, doneOnly: metric.doneOnly,
        stackColors: PLYO.map(p => p.color)
      }) : ''}</div>
      <div class="legend">
        ${metric.doneOnly ? '' : `<span><i class="lg-bar"></i>Pianificato${metric.stacked ? ' (per classe)' : ' (colore del blocco)'}</span>`}
        <span><i class="lg-dot"></i>Eseguito</span>
        ${metric.stacked ? PLYO.map(p => `<span><i class="lg-sq" style="background:${p.color}"></i>${p.name}</span>`).join('') : ''}
        <span class="muted">Unità: ${esc(metric.unit)} · tocca una settimana per aprirla</span>
      </div>
      ${metric.doneOnly ? '<p class="note">1RM stimato con Epley sulle ripetizioni a cedimento ricostruite dall\'RPE (rip + RIR), solo se rip + RIR ≤ 10. Origine della formula non peer-reviewed, validata a posteriori: vedi Dati → Metodo e fonti.</p>' : ''}
    </section>

    <section class="card">
      <div class="card-head"><h2>Blocchi</h2>
        <label class="inline">Inizio piano <input type="date" id="pstart" value="${a.planStart}"></label>
      </div>
      <div class="blocks">${blocks.map((bl, i) => `
        <div class="block-row" data-id="${bl.id}">
          <i class="dot" style="--c:${blockType(bl.type).color}"></i>
          <select data-f="type" aria-label="Tipo di blocco">${BLOCK_TYPES.map(t => `<option value="${t.id}" ${t.id === bl.type ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
          <input data-f="name" value="${esc(bl.name)}" aria-label="Nome del blocco">
          <label class="weeks"><input data-f="weeks" type="number" min="1" max="26" value="${bl.weeks}" aria-label="Settimane"> sett.</label>
          <span class="muted dates">${fmtDM(bl.start)} – ${fmtDM(bl.end)}</span>
          <span class="row-actions">
            <button class="icon-btn" data-mv="-1" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button>
            <button class="icon-btn" data-mv="1" ${i === blocks.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button>
            <button class="icon-btn danger" data-del aria-label="Elimina blocco">✕</button>
          </span>
        </div>`).join('') || '<p class="muted">Nessun blocco: aggiungi il primo per disegnare la stagione.</p>'}
      </div>
      <div class="add-block">
        <select id="nbtype" aria-label="Tipo del nuovo blocco">${BLOCK_TYPES.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        <button class="btn" id="addb">+ Aggiungi blocco in coda</button>
      </div>
    </section>

    <section class="card">
      <h2>Settimane</h2>
      <div class="table-wrap"><table class="tbl weeks-tbl">
        <thead><tr><th>Sett.</th><th>Date</th><th>Blocco</th><th class="r">Sedute</th><th class="r">${esc(metric.label)}<br><small>pianif. / eseguito</small></th></tr></thead>
        <tbody>${weeks.map((w, i) => {
          const wb = blockAt(a, w);
          const n = sessionsOfWeek(a.id, w).length;
          return `<tr class="${i === cur ? 'cur' : ''}" data-week="${w}">
            <td><b>S${i + 1}</b></td><td>${fmtRange(w)}</td>
            <td>${wb ? `<i class="dot" style="--c:${blockType(wb.type).color}"></i>${esc(wb.name)} <small class="muted">${weekInBlock(wb, w)}/${wb.weeks}</small>` : '<span class="muted">—</span>'}</td>
            <td class="r">${n}</td>
            <td class="r">${metric.doneOnly ? '' : fmtNum(scalar(metric, planM[i]), metric.dec || 0)} ${doneM[i] ? `/ <b>${fmtNum(scalar(metric, doneM[i]), metric.dec || 0)}</b>` : ''}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>

    <div class="danger-zone"><button class="btn danger ghost" id="delA">Elimina atleta</button></div>`;

  // Centra il grafico sulla settimana corrente
  const cs = el.querySelector('#cs');
  if (cur >= 0) cs.scrollLeft = Math.max(0, cur * 50 - cs.clientWidth / 2 + 25);

  el.querySelector('#metric').onchange = e => { a.metric = e.target.value; save(); App.render(); };
  el.querySelector('#edit').onclick = () => athleteForm(a, () => App.render());
  cs.onclick = e => { const h = e.target.closest('[data-week]'); if (h) App.go(`#/a/${a.id}/w/${h.dataset.week}`); };
  el.querySelector('.weeks-tbl tbody').onclick = e => {
    const r = e.target.closest('[data-week]');
    if (r) App.go(`#/a/${a.id}/w/${r.dataset.week}`);
  };

  el.querySelector('#pstart').onchange = e => {
    if (!e.target.value) return;
    a.planStart = mondayOf(e.target.value);
    save(); App.render();
  };
  el.querySelector('#addb').onclick = () => { addBlock(a, el.querySelector('#nbtype').value); App.render(); };

  el.querySelector('.blocks').addEventListener('change', e => {
    const row = e.target.closest('[data-id]');
    const f = e.target.dataset.f;
    if (!row || !f) return;
    const bl = a.blocks.find(x => x.id === row.dataset.id);
    if (f === 'weeks') bl.weeks = Math.min(26, Math.max(1, parseInt(e.target.value, 10) || 1));
    else if (f === 'type') {
      // Se il nome era quello predefinito del tipo, segue il nuovo tipo
      if (bl.name === blockType(bl.type).name) bl.name = blockType(e.target.value).name;
      bl.type = e.target.value;
    } else bl.name = e.target.value.trim() || blockType(bl.type).name;
    save(); App.render();
  });
  el.querySelector('.blocks').addEventListener('click', async e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const mv = e.target.closest('[data-mv]');
    if (mv) { moveBlock(a, row.dataset.id, Number(mv.dataset.mv)); App.render(); return; }
    if (e.target.closest('[data-del]')) {
      if (await confirmDlg('Eliminare il blocco? Le sedute restano dove sono, i blocchi successivi si spostano indietro.', 'Elimina', true)) {
        removeBlock(a, row.dataset.id); App.render();
      }
    }
  });

  el.querySelector('#delA').onclick = async () => {
    if (await confirmDlg(`Eliminare ${a.name} e tutte le sue sedute? Non si può annullare.`, 'Elimina', true)) {
      deleteAthlete(a.id); toast('Atleta eliminato'); App.go('#/');
    }
  };
}

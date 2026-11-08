// Microciclo: sedute giorno per giorno + totali settimanali pianificato / eseguito / variazione

import {
  athleteById, blockAt, blockType, weekInBlock, planWeeks, sessionsOn, sessionsOfWeek,
  addSession, copyWeek
} from '../store.js';
import { weekMetrics, totals, LIFTS, PLYO } from '../metrics.js';
import { App } from '../app.js';
import { openModal, toast } from '../ui.js';
import { esc, fmtNum, fmtDM, fmtRange, addDays, todayYmd, mondayOf, DOW_NAMES } from '../utils.js';

// Righe della tabella dei totali: [gruppo, etichetta, getter, decimali, delta in punti?]
function rowDefs() {
  const R = [];
  for (const l of LIFTS) {
    const L = m => m.lifts[l.id];
    R.push(
      [l.name, 'Sollevamenti (NBL)', m => L(m).nbl],
      [l.name, 'Serie', m => L(m).sets],
      [l.name, l.bw ? 'Tonnellaggio (kg, con peso corporeo)' : 'Tonnellaggio (kg)', m => L(m).ton],
      [l.name, 'Intensità media (%1RM)', m => L(m).pct, 1, true],
      [l.name, 'Frequenza (sedute)', m => L(m).freq],
      [l.name, l.bw ? '1RM stimato (zavorra kg)' : '1RM stimato (kg)', m => L(m).e1rm, 1, false, true]
    );
  }
  R.push(
    ['Altri esercizi di forza', 'Ripetizioni', m => m.altro.nbl],
    ['Altri esercizi di forza', 'Tonnellaggio (kg)', m => m.altro.ton],
    ...PLYO.map(p => ['Pliometria', `Contatti · ${p.name.toLowerCase()}`, m => m.plio[p.id]]),
    ['Pliometria', 'Contatti totali', m => m.plioTot],
    ['Potenza', 'Ripetizioni', m => m.potenza.reps],
    ['Potenza', 'Tonnellaggio (kg)', m => m.potenza.ton],
    ['Accessori', 'Serie', m => m.acc.sets]
  );
  return R;
}

function delta(cur, prev, points) {
  if (!prev && !cur) return '';
  if (points) return prev && cur ? `${cur - prev >= 0 ? '+' : ''}${fmtNum(cur - prev, 1)} pt` : '—';
  if (!prev) return '<span class="muted">nuovo</span>';
  const d = (cur - prev) / prev * 100;
  return `<span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '↑ +' : d < 0 ? '↓ ' : ''}${fmtNum(d, 0)}%</span>`;
}

function totalsTable(plan, done, prev) {
  let lastGroup = '';
  const rows = rowDefs().filter(([, , g, , , doneOnly]) =>
    (doneOnly ? 0 : g(plan)) || (done && g(done)) || (!doneOnly && g(prev)));
  if (!rows.length) return '<p class="muted">Nessun esercizio programmato in questa settimana.</p>';
  return `<div class="table-wrap"><table class="tbl totals">
    <thead><tr><th></th><th class="r">Pianificato</th><th class="r">Eseguito</th><th class="r" title="Variazione del pianificato rispetto alla settimana precedente">Δ sett. prec.</th></tr></thead>
    <tbody>${rows.map(([grp, label, g, dec = 0, points, doneOnly]) => {
      const head = grp !== lastGroup ? `<tr class="grp"><td colspan="4">${esc(grp)}</td></tr>` : '';
      lastGroup = grp;
      return `${head}<tr><td>${esc(label)}</td>
        <td class="r">${doneOnly ? '' : fmtNum(g(plan), dec)}</td>
        <td class="r"><b>${done ? fmtNum(g(done), dec) : ''}</b></td>
        <td class="r">${doneOnly ? '' : delta(g(plan), g(prev), points)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function sessionCard(a, s) {
  const t = totals(a, [s], 'plan');
  const n = s.items.length;
  const d = s.items.filter(i => i.done).length;
  const bits = [];
  if (t.fond.nbl) bits.push(`${fmtNum(t.fond.nbl)} soll.`);
  if (t.compl.nbl) bits.push(`${fmtNum(t.compl.nbl)} soll. compl.`);
  if (t.plioTot) bits.push(`${fmtNum(t.plioTot)} contatti`);
  if (t.potenza.reps) bits.push(`${fmtNum(t.potenza.reps)} rip pot.`);
  return `<a class="sess" href="#/s/${s.id}">
    <b>${esc(s.name)}</b>
    <small>${n} esercizi${bits.length ? ' · ' + bits.join(' · ') : ''}</small>
    <span class="sess-state ${n && d === n ? 'ok' : d ? 'part' : ''}">${n && d === n ? 'Eseguita' : d ? `${d}/${n} eseguiti` : 'Da fare'}</span>
  </a>`;
}

function copyDialog(a, from, to, label) {
  if (!sessionsOfWeek(a.id, from).length) { toast('La settimana di origine è vuota'); return; }
  const existing = sessionsOfWeek(a.id, to).length;
  openModal(label, `
    <form class="form" id="cpf">
      <p>Copia le sedute della settimana <b>${fmtRange(from)}</b> nella settimana <b>${fmtRange(to)}</b>, stessi giorni. Si copia solo il pianificato.</p>
      ${existing ? `<p class="warnline">La settimana di arrivo ha già ${existing} sedute: le nuove si aggiungono, non le sostituiscono.</p>` : ''}
      <label>Variazione di intensità (punti %1RM)
        <input name="d" inputmode="decimal" value="0" placeholder="es. 2,5 oppure -5">
        <small>Applicata solo agli esercizi programmati in %1RM. Serve a costruire la progressione.</small></label>
      <div class="modal-actions"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Copia</button></div>
    </form>`, (m, close) => {
    m.querySelector('#cpf').onsubmit = e => {
      e.preventDefault();
      const d = parseFloat(String(new FormData(e.target).get('d')).replace(',', '.')) || 0;
      const n = copyWeek(a.id, from, to, d);
      close();
      toast(`${n} sedute copiate`);
      App.go(`#/a/${a.id}/w/${to}`);
      App.render();
    };
  });
}

export function render(el, aid, monday) {
  const a = athleteById(aid);
  if (!a) { el.innerHTML = '<p class="empty">Atleta non trovato. <a href="#/">Torna agli atleti</a></p>'; return; }
  monday = mondayOf(monday);
  const today = todayYmd();
  const weeks = planWeeks(a);
  const idx = weeks.indexOf(monday);
  const b = blockAt(a, monday);
  const isPastOrNow = monday <= mondayOf(today);

  const plan = weekMetrics(a, monday, 'plan');
  const done = isPastOrNow ? weekMetrics(a, monday, 'done') : null;
  const prev = weekMetrics(a, addDays(monday, -7), 'plan');

  el.innerHTML = `
    <nav class="crumbs"><a href="#/">Atleti</a> <span>/</span> <a href="#/a/${a.id}">${esc(a.name)}</a> <span>/</span> Settimana</nav>
    <div class="page-head">
      <div>
        <h1>${idx >= 0 ? `Settimana ${idx + 1}` : 'Settimana'} <span class="h-sub">${fmtRange(monday)}</span></h1>
        <p class="sub">${b ? `<span class="bchip" style="--c:${blockType(b.type).color}">${esc(b.name)}</span> settimana ${weekInBlock(b, monday)} di ${b.weeks}` : 'Fuori dai blocchi del piano'}</p>
      </div>
      <div class="row">
        <a class="btn" href="#/a/${a.id}/w/${addDays(monday, -7)}" aria-label="Settimana precedente">‹</a>
        <a class="btn" href="#/a/${a.id}/w/${mondayOf(today)}">Oggi</a>
        <a class="btn" href="#/a/${a.id}/w/${addDays(monday, 7)}" aria-label="Settimana successiva">›</a>
      </div>
    </div>

    <div class="days">${DOW_NAMES.map((dn, i) => {
      const date = addDays(monday, i);
      const ss = sessionsOn(a.id, date);
      return `<div class="day ${date === today ? 'today' : ''}">
        <div class="day-head"><b>${dn}</b><span class="muted">${fmtDM(date)}</span></div>
        ${ss.map(s => sessionCard(a, s)).join('')}
        <button class="add-sess" data-date="${date}" aria-label="Aggiungi seduta ${dn}">+ Seduta</button>
      </div>`;
    }).join('')}</div>

    <div class="row wrap">
      <button class="btn" id="cpPrev">Copia qui la settimana precedente</button>
      <button class="btn" id="cpNext">Copia questa nella successiva</button>
    </div>

    <section class="card">
      <div class="card-head"><h2>Totali della settimana</h2>
        <span class="muted">${plan.sessions} sedute pianificate${done ? ` · ${done.sessions} con esercizi eseguiti` : ''}</span></div>
      ${totalsTable(plan, done, prev)}
      <p class="note">Δ = quanto hai cambiato il pianificato rispetto alla settimana prima: è una descrizione, non un giudizio. Formule e fonti in Dati → Metodo e fonti.</p>
    </section>`;

  el.querySelector('.days').onclick = e => {
    const btn = e.target.closest('.add-sess');
    if (!btn) return;
    openModal('Nuova seduta', `
      <form class="form" id="nsf">
        <label>Nome<input name="n" value="Seduta" required></label>
        <label>Giorno<input type="date" name="d" value="${btn.dataset.date}" required></label>
        <div class="modal-actions"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Crea e programma</button></div>
      </form>`, (m, close) => {
      m.querySelector('#nsf').onsubmit = ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const s = addSession(a.id, String(fd.get('d')), String(fd.get('n')).trim());
        close();
        App.go(`#/s/${s.id}`);
      };
    });
  };
  el.querySelector('#cpPrev').onclick = () => copyDialog(a, addDays(monday, -7), monday, 'Copia la settimana precedente');
  el.querySelector('#cpNext').onclick = () => copyDialog(a, monday, addDays(monday, 7), 'Copia nella settimana successiva');
}

// Backup, dati di esempio e pagina "Metodo e fonti"

import { state, replaceData, removeDemo, save } from '../store.js';
import { App } from '../app.js';
import { confirmDlg, toast } from '../ui.js';
import { todayYmd, fmtDM, diffDays } from '../utils.js';

const SOURCES = [
  ['Sollevamenti (NBL)', 'Serie × ripetizioni per alzata. Conteggio.', 'Definizione'],
  ['Tonnellaggio', 'Serie × ripetizioni × kg. Mostrato sempre insieme a NBL e intensità perché da solo non distingue carichi alti da molte ripetizioni.', 'McBride et al., J Strength Cond Res 2009 · Scott et al., Sports Med 2016'],
  ['Intensità media (%1RM)', '(Tonnellaggio ÷ NBL) ÷ massimale. Le varianti usano il massimale dell\'alzata a cui le colleghi (tua scelta).', 'Definizione · Scott et al., Sports Med 2016'],
  ['RPE', 'Scala basata sulle ripetizioni in riserva (RIR).', 'Zourdos et al., J Strength Cond Res 2016 · Helms et al., Strength Cond J 2016'],
  ['1RM stimato', 'Epley sulle ripetizioni a cedimento ricostruite come rip + RIR; solo se ≤ 10, arrotondato a 2,5 kg. Epley nasce da un manuale (non peer-reviewed) ed è validata a posteriori.', 'LeSuer et al., J Strength Cond Res 1997 · combinazione con RIR: convenzione'],
  ['Contatti pliometrici', 'Serie × contatti. Le classi bassa/media/alta/shock sono la tua classificazione degli esercizi.', 'Convenzione · graduatoria di intensità: Jensen & Ebben 2007, Ebben et al. 2008 (da verificare)'],
  ['Blocchi', 'Etichette del coach, nessun calcolo derivato.', 'Issurin, Sports Med 2010 · tapering: Bosquet et al., Med Sci Sports Exerc 2007']
];

export function render(el) {
  const last = state.settings.lastBackup;
  const age = last ? diffDays(last, todayYmd()) : null;
  el.innerHTML = `
    <div class="page-head"><div><h1>Dati</h1><p class="sub">Tutto resta su questo dispositivo. Nessun server, costo zero.</p></div></div>

    <section class="card">
      <h2>Backup</h2>
      <p>${last ? `Ultimo backup: ${fmtDM(last)}${age > 14 ? ' — <b class="warn">più di due settimane fa</b>' : ''}.` : '<b class="warn">Non hai ancora fatto un backup.</b>'}
        I dati vivono nel browser: se lo svuoti li perdi. Scarica un backup ogni tanto e per spostare i dati dal PC al telefono.</p>
      <div class="row wrap">
        <button class="btn primary" id="exp">Scarica backup</button>
        <label class="btn">Ripristina da file<input type="file" id="imp" accept="application/json,.json" hidden></label>
      </div>
    </section>

    ${state.settings.demo || state.athletes.some(a => a.demo) ? `
    <section class="card">
      <h2>Dati di esempio</h2>
      <p>Gli atleti con “(esempio)” servono solo a provare l'app.</p>
      <button class="btn danger ghost" id="demo">Rimuovi gli atleti di esempio</button>
    </section>` : ''}

    <section class="card">
      <h2>Metodo e fonti</h2>
      <p class="muted">L'app descrive il carico che pianifichi e quello eseguito. Non prescrive, non predice e non usa indici inventati (niente INOL, ACWR o tabella di Prilepin come “zona ottimale”). L'elenco completo con DOI e limiti è nel file FONTI.md del progetto.</p>
      <div class="table-wrap"><table class="tbl src">
        <thead><tr><th>Metrica</th><th>Come si calcola</th><th>Fonte / natura</th></tr></thead>
        <tbody>${SOURCES.map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;

  el.querySelector('#exp').onclick = () => {
    state.settings.lastBackup = todayYmd();
    save();
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `ciclo-backup-${todayYmd()}.json` });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    App.render();
  };
  el.querySelector('#imp').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.athletes) || !Array.isArray(d.sessions)) throw new Error('formato');
      if (!(await confirmDlg(`Sostituire i dati attuali con il backup (${d.athletes.length} atleti, ${d.sessions.length} sedute)?`, 'Ripristina', true))) return;
      replaceData(d);
      toast('Backup ripristinato');
      App.go('#/');
    } catch {
      toast('File non valido: non è un backup di Ciclo');
    }
  };
  const demo = el.querySelector('#demo');
  if (demo) demo.onclick = async () => {
    if (await confirmDlg('Rimuovere gli atleti di esempio e le loro sedute?', 'Rimuovi', true)) {
      removeDemo(); toast('Esempi rimossi'); App.go('#/');
    }
  };
}

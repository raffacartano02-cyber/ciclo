// Grafici SVG fatti a mano: stagione (barre pianificato + punti eseguito + fascia blocchi) e sparkline

import { esc, fmtNum, fmtShort } from './utils.js';

const COLW = 50;

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/*
  weeks: [{ monday, color }]       colore del blocco della settimana
  plan:  numero o array (a pila)   valore pianificato
  done:  numero o null             valore eseguito (null = settimana futura o senza dati)
  bands: [{ start, len, name, color }] indici di settimana dei blocchi
*/
export function seasonChart({ weeks, plan, done, bands, current, stackColors, dec = 0, doneOnly = false }) {
  const padL = 8, top = 20, H = 150;
  const bandY = top + H + 10, bandH = 22, labY = bandY + bandH + 16;
  const W = padL * 2 + weeks.length * COLW;
  const totalH = labY + 16;
  const planTot = plan.map(v => Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v);
  const max = niceMax(Math.max(...planTot, ...done.map(v => v || 0)));
  const y = v => top + H - (v / max) * H;
  const cx = i => padL + i * COLW + COLW / 2;
  const out = [];

  out.push(`<svg class="season" viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}" role="img" aria-label="Andamento della stagione">`);
  if (current >= 0) out.push(`<rect x="${padL + current * COLW}" y="0" width="${COLW}" height="${labY + 4}" class="cur-col" rx="6"/>`);
  for (const g of [0.5, 1]) out.push(`<line x1="${padL}" x2="${W - padL}" y1="${y(max * g)}" y2="${y(max * g)}" class="grid"/>`);
  out.push(`<line x1="${padL}" x2="${W - padL}" y1="${y(0)}" y2="${y(0)}" class="axis"/>`);

  weeks.forEach((w, i) => {
    const bw = 26, x = cx(i) - bw / 2;
    if (!doneOnly) {
      if (Array.isArray(plan[i])) {
        let base = 0;
        plan[i].forEach((v, k) => {
          if (v > 0) out.push(`<rect x="${x}" y="${y(base + v)}" width="${bw}" height="${y(base) - y(base + v)}" fill="${stackColors[k]}" class="bar"/>`);
          base += v;
        });
      } else if (plan[i] > 0) {
        out.push(`<rect x="${x}" y="${y(plan[i])}" width="${bw}" height="${y(0) - y(plan[i])}" fill="${w.color}" class="bar" rx="3"/>`);
      }
      if (planTot[i] > 0) out.push(`<text x="${cx(i)}" y="${y(planTot[i]) - 5}" class="val">${fmtNum(planTot[i], dec)}</text>`);
    }
  });

  // Eseguito: punti uniti da una linea dove le settimane sono consecutive
  const segs = [];
  let seg = [];
  done.forEach((v, i) => {
    if (v == null) { if (seg.length) segs.push(seg); seg = []; return; }
    seg.push(`${cx(i)},${y(v)}`);
  });
  if (seg.length) segs.push(seg);
  segs.filter(s => s.length > 1).forEach(s => out.push(`<path d="M${s.join('L')}" class="done-line"/>`));
  done.forEach((v, i) => {
    if (v == null) return;
    out.push(`<circle cx="${cx(i)}" cy="${y(v)}" r="4.5" class="done-dot"/>`);
    if (doneOnly && v > 0) out.push(`<text x="${cx(i)}" y="${y(v) - 9}" class="val">${fmtNum(v, dec)}</text>`);
  });

  for (const b of bands) {
    const bx = padL + b.start * COLW + 2, bw = b.len * COLW - 4;
    out.push(`<rect x="${bx}" y="${bandY}" width="${bw}" height="${bandH}" rx="5" fill="${b.color}" class="band"/>`);
    const label = bw > 70 ? b.name : bw > 36 ? b.name.slice(0, 4) + '.' : '';
    if (label) out.push(`<text x="${bx + 8}" y="${bandY + 15}" class="band-txt">${esc(label)}</text>`);
  }
  weeks.forEach((w, i) => {
    out.push(`<text x="${cx(i)}" y="${labY}" class="wk ${i === current ? 'on' : ''}">S${i + 1}</text>`);
    out.push(`<text x="${cx(i)}" y="${labY + 13}" class="wk-d">${fmtShort(w.monday)}</text>`);
    out.push(`<rect x="${padL + i * COLW}" y="0" width="${COLW}" height="${totalH}" fill="transparent" class="hit" data-week="${w.monday}"><title>Apri la settimana del ${fmtShort(w.monday)}</title></rect>`);
  });
  out.push('</svg>');
  return out.join('');
}

// Mini grafico a barre per le card degli atleti
export function sparkline(values, colors, current) {
  const w = 8, gap = 3, h = 34;
  const max = Math.max(1, ...values);
  const W = values.length * (w + gap);
  return `<svg class="spark" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" aria-hidden="true">${values.map((v, i) => {
    const bh = Math.max(v > 0 ? 2 : 0, (v / max) * (h - 4));
    return `<rect x="${i * (w + gap)}" y="${h - bh}" width="${w}" height="${bh}" rx="2" fill="${colors[i]}" opacity="${i === current ? 1 : 0.55}"${i === current ? ' class="spark-cur"' : ''}/>`;
  }).join('')}</svg>`;
}

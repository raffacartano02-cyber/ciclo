// Funzioni di servizio: id, escape HTML, numeri e date locali (YYYY-MM-DD)

export const uid = () =>
  (globalThis.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// I valori inseriti sono stringhe: accetta virgola o punto, vuoto = 0
export const num = v => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isFinite(n) ? n : 0;
};

export const fmtNum = (n, dec = 0) =>
  Number(n || 0).toLocaleString('it-IT', { maximumFractionDigits: dec });

export const round25 = n => Math.round(n / 2.5) * 2.5;

/* ===== Date: sempre stringhe locali YYYY-MM-DD, mai UTC ===== */

const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayYmd = () => ymd(new Date());
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const dowIdx = s => (parseYmd(s).getDay() + 6) % 7; // 0 = lunedì
export const mondayOf = s => addDays(s, -dowIdx(s));
export const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

const DOW = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const MON = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
export const DOW_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const fmtDM = s => { const d = parseYmd(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtDay = s => `${DOW[dowIdx(s)]} ${fmtDM(s)}`;
export const fmtShort = s => { const d = parseYmd(s); return `${d.getDate()}/${d.getMonth() + 1}`; };
export const fmtRange = monday => `${fmtDM(monday)} – ${fmtDM(addDays(monday, 6))}`;

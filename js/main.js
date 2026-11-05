// Router a hash e avvio

import { App } from './app.js';
import * as athletes from './views/athletes.js';
import * as timeline from './views/timeline.js';
import * as week from './views/week.js';
import * as session from './views/session.js';
import * as library from './views/library.js';
import * as data from './views/data.js';

const view = document.getElementById('view');

function route() {
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/a\/([^/]+)\/w\/(\d{4}-\d{2}-\d{2})$/))) return week.render(view, m[1], m[2]);
  if ((m = h.match(/^#\/a\/([^/]+)$/))) return timeline.render(view, m[1]);
  if ((m = h.match(/^#\/s\/([^/]+)$/))) return session.render(view, m[1]);
  if (h === '#/libreria') return library.render(view);
  if (h === '#/dati') return data.render(view);
  return athletes.render(view);
}

function markNav() {
  const h = location.hash || '#/';
  const section = h.startsWith('#/libreria') ? 'libreria' : h.startsWith('#/dati') ? 'dati' : 'atleti';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.s === section));
}

App.render = () => { route(); markNav(); };

window.addEventListener('hashchange', () => { App.render(); window.scrollTo(0, 0); });
App.render();

if ('storage' in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

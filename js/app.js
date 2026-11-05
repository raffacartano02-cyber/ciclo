// Oggetto condiviso dalle viste (evita import circolari con main.js)
export const App = {
  render: () => {},
  go: hash => { location.hash = hash; }
};

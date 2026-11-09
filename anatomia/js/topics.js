// Argomenti del programma d'esame

export const TOPICS = [
  { id: 'gen', nome: 'Generalità e terminologia', area: 'Fondamenti', icon: '🧭' },
  { id: 'osteo', nome: 'Osteologia', area: 'Apparato locomotore', icon: '🦴' },
  { id: 'art', nome: 'Artrologia', area: 'Apparato locomotore', icon: '🦵' },
  { id: 'mio', nome: 'Miologia generale', area: 'Apparato locomotore', icon: '💪' },
  { id: 'mus-sup', nome: 'Muscoli dell\'arto superiore', area: 'Apparato locomotore', icon: '✋' },
  { id: 'mus-tronco', nome: 'Muscoli di tronco, collo e testa', area: 'Apparato locomotore', icon: '🫁' },
  { id: 'mus-inf', nome: 'Muscoli dell\'arto inferiore', area: 'Apparato locomotore', icon: '🦶' },
  { id: 'nervi', nome: 'Nervi periferici e plessi', area: 'Sistema nervoso', icon: '⚡' },
  { id: 'cranici', nome: 'Nervi cranici', area: 'Sistema nervoso', icon: '🧠' },
  { id: 'sn', nome: 'Sistema nervoso (SNC e autonomo)', area: 'Sistema nervoso', icon: '🧬' },
  { id: 'cv', nome: 'Apparato cardiovascolare', area: 'Splancnologia', icon: '❤️' },
  { id: 'resp', nome: 'Apparato respiratorio', area: 'Splancnologia', icon: '🌬️' },
  { id: 'dig', nome: 'Apparato digerente', area: 'Splancnologia', icon: '🍽️' },
  { id: 'uro', nome: 'Apparato urinario', area: 'Splancnologia', icon: '💧' },
  { id: 'endo', nome: 'Sistema endocrino', area: 'Splancnologia', icon: '⚗️' },
];

export const topicById = id => TOPICS.find(t => t.id === id);

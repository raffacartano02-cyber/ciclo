# Anatomia — studio e quiz

App web (PWA, funziona anche offline) per preparare l'esame di anatomia umana.
Nessun server, nessun account, nessun costo: i progressi restano sul dispositivo.

## Funzioni
- **Studia** — schede consultabili con ricerca: 60 muscoli (origine, inserzione,
  innervazione con radici, azione, note cliniche), 21 articolazioni, 22 nervi dei
  plessi, 12 nervi cranici, oltre 100 domande di teoria (osteologia, artrologia,
  miologia, sistema nervoso, splancnologia).
- **Flashcard** con ripetizione dilazionata (sistema di Leitner: 1, 2, 4, 8, 16, 32 giorni).
- **Quiz** a risposta multipla (oltre 600 domande generate dai dati, con spiegazione);
  le domande sbagliate tornano più spesso.
- **Simulazione d'esame** a tempo, voto in trentesimi e analisi per argomento.
- **Progressi** per argomento, storico simulazioni, esporta/importa i dati.

Scorciatoie da tastiera: `1-4` per rispondere, `Invio` avanti, `Spazio` gira la carta.

## Avvio in locale
```
cd anatomia
python3 -m http.server 8000
```
poi apri http://localhost:8000. Pubblicabile gratis su GitHub Pages.

## Contenuti
Dati tratti dai manuali standard (Gray, Netter, Anastasi). Le radici nervose indicano
i livelli prevalenti: alcuni testi riportano varianti di un livello. In caso di
differenze, fa fede il testo adottato dal proprio docente.

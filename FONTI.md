# FONTI — Ciclo (app di programmazione per coach)

Vincolo dell'utente: **ogni calcolo deve avere una fonte scientifica**; ciò che è una
definizione aritmetica o una convenzione va dichiarato come tale, mai spacciato per evidenza.
L'app **descrive** il carico pianificato ed eseguito: non prescrive, non predice, non fa
affermazioni su infortuni o recupero.

Legenda: **[DEF]** definizione aritmetica · **[PR]** fonte peer-reviewed · **[CONV]** convenzione
(non deriva da uno studio) · **[DA VERIFICARE]** riferimento citato a memoria, da controllare
col revisore prima di mostrarlo come fonte nell'app.

## 1. Volume dei fondamentali

- **Sollevamenti (NBL)** = Σ serie × ripetizioni per alzata. **[DEF]** È un conteggio.
- **Tonnellaggio (volume load)** = Σ serie × ripetizioni × kg. **[DEF]**
  - McBride JM, McCaulley GO, Cormie P, Nuzzo JL, Cavill MJ, Triplett NT. *Comparison of methods
    to quantify volume during resistance exercise.* J Strength Cond Res. 2009;23(1):106-110. **[PR]**
  - Scott BR, Duthie GM, Thornton HR, Dascombe BJ. *Training monitoring for resistance exercise:
    theory and applications.* Sports Med. 2016;46(5):687-698. **[PR]**
  - Limite noto (McBride 2009): il tonnellaggio da solo non distingue carichi alti/poche ripetizioni
    da carichi bassi/molte ripetizioni; per questo l'app lo mostra **sempre insieme** a NBL e
    intensità media.
- **Serie** = numero di serie pianificate o eseguite. **[DEF]**
- **Frequenza** = numero di giorni distinti della settimana in cui compare l'alzata. **[DEF]**

## 2. Intensità

- **Intensità media (%1RM)** = (tonnellaggio / NBL) / massimale × 100. **[DEF]** Media pesata
  sulle ripetizioni del carico relativo. Scott et al. 2016 (sopra) discute l'intensità relativa
  come variabile di monitoraggio. **[PR]**
  - **[CONV]** Le varianti (es. squat con pausa) sono riferite al massimale dell'alzata di gara
    a cui il coach le collega. È una scelta del coach, non un dato fisiologico.
- **kg da %1RM** = % × massimale, arrotondato a 2,5 kg. **[DEF]** Arrotondamento **[CONV]**
  (dischi disponibili).
- **RPE basato sulle ripetizioni in riserva (RIR)**:
  - Zourdos MC et al. *Novel resistance training-specific rating of perceived exertion scale
    measuring repetitions in reserve.* J Strength Cond Res. 2016;30(1):267-275. **[PR]**
  - Helms ER, Cronin J, Storey A, Zourdos MC. *Application of the repetitions in reserve-based
    rating of perceived exertion scale for resistance training.* Strength Cond J.
    2016;38(4):42-49. **[PR]**

## 3. 1RM stimato (solo dati eseguiti)

- Formula: kg × (1 + (rip + RIR) / 30), con RIR = 10 − RPE. Epley sulle ripetizioni "a cedimento"
  ricostruite dall'RPE.
  - Epley B. *Poundage chart.* Boyd Epley Workout, 1985. **NON peer-reviewed** (manuale). Validata
    a posteriori da terzi:
  - LeSuer DA, McCormick JH, Mayhew JL, Wasserstein RL, Arnold MD. *The accuracy of prediction
    equations for estimating 1-RM performance in the bench press, squat, and deadlift.*
    J Strength Cond Res. 1997;11(4):211-213. **[PR]**
  - Ricostruire le ripetizioni a cedimento come rip + RIR segue la logica della scala RIR
    (Zourdos 2016, Helms 2016). **[PR]** per la scala; la combinazione con Epley è **[CONV]**.
- **[CONV]** Calcolo solo se rip + RIR ≤ 10 e RPE fra 6 e 10. Arrotondamento a 2,5 kg (nessuna
  precisione finta, come in Overload `FONTI-MOTORE.md` §8, divieti 17-18).
- Nessun errore tipico mostrato: non verificato per Epley.

## 4. Pliometria

- **Contatti al suolo** = Σ serie × contatti per serie. **[DEF]** Il conteggio dei contatti come
  misura di volume è prassi dei manuali NSCA (non peer-reviewed). **[CONV]**
- **Classi di intensità bassa / media / alta / shock** **[CONV]**: classificazione attribuita dal
  coach a ogni esercizio, modificabile in Libreria. La graduatoria di intensità fra esercizi
  pliometrici è stata quantificata in:
  - Jensen RL, Ebben WP. *Quantifying plyometric intensity via rate of force development, knee
    joint, and ground reaction forces.* J Strength Cond Res. 2007;21(3):763-767. **[PR]**
    **[DA VERIFICARE]**
  - Ebben WP, Simenz C, Jensen RL. *Evaluation of plyometric intensity using electromyography.*
    J Strength Cond Res. 2008;22(3):861-868. **[PR]** **[DA VERIFICARE]**
  - La classe "shock" (drop/depth jump) viene dal metodo d'urto di Verkhoshansky (letteratura
    sovietica, non peer-reviewed in senso moderno). **[CONV]**

## 5. Potenza e accessori

- Ripetizioni, serie e tonnellaggio: stesse definizioni del §1. **[DEF]**

## 6. Blocchi della stagione

I tipi di blocco sono **etichette** che il coach assegna; l'app non ne ricava calcoli.
- Accumulo / Trasformazione / Realizzazione: Issurin VB. *New horizons for the methodology and
  physiology of training periodization.* Sports Med. 2010;40(3):189-206. **[PR]**
- Tapering: Bosquet L, Montpetit J, Arvisais D, Mujika I. *Effects of tapering on performance:
  a meta-analysis.* Med Sci Sports Exerc. 2007;39(8):1358-1365. **[PR]**
- Scarico (deload), Gara, Transizione, Preparazione generale: etichette d'uso comune. **[CONV]**

## 7. Cose che l'app NON fa (divieti)

1. Nessun indice composito inventato (niente INOL: non peer-reviewed; niente ACWR).
2. Nessuna tabella di Prilepin come "zona ottimale" (non peer-reviewed).
3. Nessuna previsione di prestazione o di rischio infortuni.
4. Le variazioni % fra settimane sono **descrittive** (quanto hai cambiato tu il piano), non
   giudizi su cosa sia "troppo".

# Tennis Player Widget

Widget React/Vite per pagine dinamiche di tennisti su WordPress.

## Setup rapido

### 1. Ottieni la chiave API
1. Vai su https://rapidapi.com/jjrm365-kIFr3Nx_odV/api/tennis-api-atp-wta-itf
2. Registrati/accedi a RapidAPI (gratuito)
3. Iscriviti al piano **Basic (Free)** — 500 richieste/mese gratuite
4. Copia la tua `X-RapidAPI-Key`

### 2. Configura le variabili d'ambiente

Crea un file `.env` nella root del progetto:
```
VITE_RAPIDAPI_KEY=la_tua_chiave_qui
```

### 3. Sviluppo locale
```bash
npm install
npm run dev
```

### 4. Deploy su Vercel
1. Crea repo su GitHub e carica il progetto
2. Importa su Vercel (vercel.com)
3. In Vercel → Settings → Environment Variables: aggiungi `VITE_RAPIDAPI_KEY`
4. Deploy!

### 5. Embed su WordPress
Nel tuo post/pagina WordPress, usa il blocco HTML personalizzato:
```html
<iframe 
  src="https://IL-TUO-DOMINIO.vercel.app/?player=207989" 
  width="100%" 
  height="700" 
  frameborder="0"
  style="border-radius: 12px;"
></iframe>
```

## Aggiungere giocatori
Nel file `src/App.jsx`, modifica l'array `PLAYERS`:
```js
{ id: 'ID_GIOCATORE', name: 'Nome Cognome', country: 'ITA', flag: '🇮🇹', tour: 'atp' }
```

Per trovare l'ID di un giocatore: cerca su https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/search?query=cognome

## Struttura dati visualizzati
- Ranking ATP/WTA attuale + punti
- Titoli totali, titoli anno in corso, Slam
- Ultimi 5 risultati con avversario e punteggio
- Prossimi 3 tornei con superficie e categoria
- Prize money e info profilo

## Note API
- Piano gratuito: 500 req/mese
- I dati vengono ricaricati ogni volta che l'utente seleziona un giocatore
- Senza chiave API, il widget mostra dati DEMO (Sinner simulato)

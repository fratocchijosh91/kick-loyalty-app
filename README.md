# 🎮 KICK LOYALTY SYSTEM

Sistema completo di loyalty e rewards per streamer su Kick!

## 📋 COSA INCLUDE

✅ **Backend Node.js** con Express  
✅ **Frontend React 18** con Vite  
✅ **Sistema Autenticazione** (mock + OAuth ready)  
✅ **CRUD Rewards** completo  
✅ **Dashboard Analytics**  
✅ **Pricing Page**  
✅ **MongoDB Integration** (opzionale)  
✅ **Design Responsive** mobile-friendly  

---

## 🚀 INSTALLAZIONE RAPIDA

### Prerequisiti
- **Node.js** v18+ (scarica da https://nodejs.org)
- **npm** (incluso con Node.js)

### Step 1: Scarica il Progetto

Estrai il file ZIP nella cartella che preferisci (es. Desktop).

### Step 2: Installa Backend

Apri il **Prompt dei Comandi** (Terminal) e digita:

```bash
cd Desktop\kick-loyalty-app\backend
npm install
```

Aspetta che finisca l'installazione (può richiedere 1-2 minuti).

### Step 3: Installa Frontend

In un **NUOVO** Prompt dei Comandi:

```bash
cd Desktop\kick-loyalty-app\frontend
npm install
```

---

## ▶️ AVVIO DELL'APPLICAZIONE

### Terminal 1 - Backend

```bash
cd Desktop\kick-loyalty-app\backend
npm run dev
```

Dovresti vedere:
```
🚀 Server running on http://localhost:5000
ℹ️  MongoDB non configurato - usando mock data
```

### Terminal 2 - Frontend

```bash
cd Desktop\kick-loyalty-app\frontend
npm run dev
```

Dovresti vedere:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Apri il Browser

Vai a: **http://localhost:3000**

---

## 🧪 TESTING (Senza Configurazioni)

1. Clicca su **"Login con Kick"**
2. Verrai automaticamente loggato come utente demo
3. Esplora la dashboard!

### Cosa Puoi Testare:

✅ **Dashboard** - Vedi statistiche e rewards  
✅ **Crea Reward** - Clicca "+ Nuovo Reward"  
✅ **Elimina Reward** - Clicca "Elimina" su un reward  
✅ **Analytics** - Vedi grafici e metriche  
✅ **Pricing** - Confronta i piani  

---

## ⚙️ CONFIGURAZIONE (Opzionale)

### MongoDB (Database)

**Opzione 1: MongoDB Atlas (Cloud - GRATIS)**

1. Vai su: https://www.mongodb.com/cloud/atlas
2. Crea un account gratuito
3. Crea un cluster (Shared - FREE)
4. Ottieni la **connection string**
5. Apri `backend/.env`
6. Sostituisci:
   ```
   MONGODB_URI=mongodb+srv://tuo_user:password@cluster.mongodb.net/kick-loyalty
   ```

**Opzione 2: MongoDB Locale**

```bash
# Windows (con Chocolatey)
choco install mongodb

# Mac
brew install mongodb-community

# Linux
sudo apt-get install mongodb
```

### Kick OAuth

Quando Kick rilascerà le API OAuth:

1. Registra la tua app su Kick Developer Portal
2. Ottieni `CLIENT_ID` e `CLIENT_SECRET`
3. Aggiorna `backend/.env`:
   ```
   KICK_CLIENT_ID=tuo_client_id
   KICK_CLIENT_SECRET=tuo_client_secret
   ```

### Stripe (Pagamenti)

1. Crea account su: https://stripe.com
2. Vai in **Developers → API Keys**
3. Copia le chiavi in `backend/.env`

---

## 📁 STRUTTURA PROGETTO

```
kick-loyalty-app/
│
├── backend/
│   ├── server.js          # Server principale
│   ├── package.json       # Dipendenze backend
│   └── .env               # Configurazioni
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json       # Dipendenze frontend
    ├── .env
    └── src/
        ├── main.jsx       # Entry point
        ├── App.jsx        # Applicazione principale
        └── styles/
            └── App.css    # Stili
```

---

## 🎨 PERSONALIZZAZIONE

### Cambia i Colori

Apri `frontend/src/styles/App.css` e modifica:

```css
:root {
  --primary: #00FF00;      /* Verde neon */
  --secondary: #FF6B00;    /* Arancione */
  --background: #0a0a0a;   /* Nero */
}
```

### Aggiungi Nuovi Reward Types

In `App.jsx`, nella funzione `createReward`, puoi aggiungere:
- `type: 'emote'` - Per emote custom
- `type: 'shoutout'` - Per menzioni
- `type: 'vip'` - Per status VIP
- `type: 'custom'` - Personalizzato

---

## 🐛 RISOLUZIONE PROBLEMI

### Errore: "npm non è riconosciuto"

**Soluzione:** Installa Node.js da https://nodejs.org

### Errore: "Port 5000 già in uso"

**Soluzione:** Cambia porta in `backend/.env`:
```
PORT=5001
```

Poi aggiorna anche in `frontend/.env`:
```
VITE_API_URL=http://localhost:5001/api
```

### Errore: "Cannot find module"

**Soluzione:**
```bash
cd backend
npm install

cd ../frontend
npm install
```

### L'app non si carica

1. Verifica che entrambi i server siano avviati
2. Controlla che non ci siano errori nel terminal
3. Prova a ricaricare la pagina (Ctrl+R)

---

## 🚀 DEPLOY (Produzione)

### Backend

**Railway** (GRATIS):
1. Vai su https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Seleziona il progetto
4. Aggiungi le variabili d'ambiente da `.env`

**Alternative:** Heroku, Render, DigitalOcean

### Frontend

**Vercel** (GRATIS):
1. Vai su https://vercel.com
2. "New Project" → Importa da GitHub
3. Vercel rileva automaticamente Vite
4. Deploy!

**Alternative:** Netlify, Cloudflare Pages

### Database

**MongoDB Atlas** (GRATIS):
- Già cloud-based
- Copia la connection string nel backend su Railway/Heroku

---

## 📊 API ENDPOINTS

### Auth
- `POST /api/auth/login` - Login mock
- `GET /api/auth/kick/callback` - OAuth callback

### Rewards
- `GET /api/rewards` - Lista rewards
- `POST /api/rewards` - Crea reward
- `PUT /api/rewards/:id` - Modifica reward
- `DELETE /api/rewards/:id` - Elimina reward

### Stats
- `GET /api/stats` - Statistiche generali
- `GET /api/analytics` - Dati analytics

---

## 💡 FEATURES PIANIFICATE

- [ ] Integrazione Kick API completa
- [ ] Sistema notifiche real-time
- [ ] Pagamenti Stripe
- [ ] Export dati CSV/Excel
- [ ] Grafici interattivi avanzati
- [ ] Sistema badge achievements
- [ ] Multi-lingua support

---

## 🤝 SUPPORTO

Per domande o problemi:
1. Controlla questa documentazione
2. Verifica la console del browser (F12)
3. Controlla i log del terminal

---

## 📝 NOTE IMPORTANTI

⚠️ **Sicurezza:**
- Cambia `JWT_SECRET` in `.env` prima del deploy
- Non committare `.env` su GitHub
- Usa HTTPS in produzione

⚠️ **Performance:**
- Il mock data è solo per testing
- Configura MongoDB per produzione
- Usa caching per API pesanti

---

## ✅ CHECKLIST PRE-DEPLOY

- [ ] MongoDB configurato
- [ ] Kick OAuth configurato
- [ ] Stripe configurato
- [ ] Environment variables settate
- [ ] JWT_SECRET cambiato
- [ ] Testing completo
- [ ] Backup database
- [ ] Domini configurati

---

## 🎉 INIZIA SUBITO!

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (nuovo terminal)
cd frontend
npm install
npm run dev
```

Vai a **http://localhost:3000** e buon lavoro! 🚀

---

**Made with ❤️ for Kick Streamers**

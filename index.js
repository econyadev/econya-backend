// index.js — Backend Econya (Render)

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Render fournit PORT

// Sécurité / compat Render
app.set('trust proxy', 1);

// Middlewares
app.use(cors());
app.use(express.json());

// Routes simples
app.get('/', (_req, res) => {
  res.status(200).send('Econya Backend — OK');
});

// Santé (deux alias : /sante et /health)
app.get(['/sante', '/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'econya-backend', ts: Date.now() });
});

// Ping
app.get('/ping', (_req, res) => res.type('text').send('pong'));

// 404 propre
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Lancement (important : écouter sur process.env.PORT)
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
});

// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Route de test santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend Econya opérationnel' });
});

// Exemple de route API
app.get('/api/message', (req, res) => {
  res.json({ message: 'Bienvenue sur l’API Econya !' });
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

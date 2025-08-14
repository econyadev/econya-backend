
// Backend Econya – API minimale + démos "banque"
// Dépendances : express, cors, dotenv (déjà dans ton package.json)
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------
// CORS + JSON
// ------------------------------------------------------------------
app.use(cors({ origin: "*", methods: ["GET"] }));
app.use(express.json());

// URL publique de ton backend (utile pour construire les liens mock OB)
const PUBLIC_BASE =
  process.env.PUBLIC_BASE || "https://econya-backend.onrender.com";

// URL publique du site (pour un éventuel redirect depuis /ob/callback)
const PUBLIC_SITE =
  process.env.PUBLIC_SITE || "https://econya.fr";

// Version simple
const VERSION = "0.3.3";

// ------------------------------------------------------------------
// SANTÉ / PING
// ------------------------------------------------------------------
app.get("/sante", (req, res) => {
  res.json({ status: "ok", service: "econya-backend", ts: Date.now(), version: VERSION });
});

app.get("/ping", (req, res) => res.type("text").send("pong"));

// ------------------------------------------------------------------
// Données démo : comptes + transactions
// (en prod, ces données viennent d'une base ou d’un agrégateur bancaire)
// ------------------------------------------------------------------
const DEMO_ACCOUNTS = [
  { id: "cc",  name: "Compte courant", iban: "FR76 **** **** 1234", balance: 1245.32, currency: "EUR" },
  { id: "la",  name: "Livret A",       iban: "FR76 **** **** 5678", balance:  980.00, currency: "EUR" }
];

// Quelques transactions démo (YYYY-MM pour filtrer)
const DEMO_TX = [
  { date: "2025-08-14", label: "Supermarché", amount: -45.90,  category: "Courses"    },
  { date: "2025-08-13", label: "Salaire",     amount: 2000.00, category: "Revenus"    },
  { date: "2025-08-10", label: "Café",        amount: -2.80,   category: "Sorties"    },
  { date: "2025-07-28", label: "Internet",    amount: -29.99,  category: "Abonnements"},
  { date: "2025-07-15", label: "Essence",     amount: -58.40,  category: "Transport"  }
];

// /mescomptes : renvoie la liste des comptes (démo)
app.get("/mescomptes", (req, res) => {
  res.json({ accounts: DEMO_ACCOUNTS });
});

// /transactions : ?month=YYYY-MM pour filtrer (facultatif)
app.get("/transactions", (req, res) => {
  const month = (req.query.month || "").trim(); // ex: "2025-08"
  let tx = DEMO_TX;
  if (/^\d{4}-\d{2}$/.test(month)) {
    tx = DEMO_TX.filter(t => t.date.startsWith(month));
  }
  res.json({ month: month || null, items: tx });
});

// ------------------------------------------------------------------
// Open Banking (mock) – parcours simplifié pour la démo
// ------------------------------------------------------------------

// mémoire locale pour représenter un “compte lié”
let obLinked = false;

// 1) /ob/start : construit l’URL du “fournisseur” fictif et la renvoie
app.get("/ob/start", (req, res) => {
  const callbackUrl = `${PUBLIC_BASE}/ob/callback`;
  const providerUrl = `${PUBLIC_BASE}/ob/provider?cb=${encodeURIComponent(callbackUrl)}`;
  res.json({ url: providerUrl });
});

// 2) /ob/provider : page HTML très simple représentant un fournisseur d’accès
app.get("/ob/provider", (req, res) => {
  const cb = req.query.cb || `${PUBLIC_BASE}/ob/callback`;
  res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Fournisseur (démo)</title></head>
<body style="font-family:system-ui;margin:40px">
  <h1>Fournisseur bancaire (démo)</h1>
  <p>Cette page simule le consentement à la connexion bancaire.</p>
  <div style="display:flex;gap:12px;margin-top:16px">
    <a href="${cb}?ok=1" style="padding:10px 14px;background:#0a7f3f;color:#fff;border-radius:8px;text-decoration:none">Autoriser</a>
    <a href="${cb}?ok=0" style="padding:10px 14px;background:#bbb;color:#222;border-radius:8px;text-decoration:none">Refuser</a>
  </div>
</body></html>`);
});

// 3) /ob/callback : reçoit ok=1/0 et “marque” la liaison
app.get("/ob/callback", (req, res) => {
  obLinked = req.query.ok === "1";
  // Tu peux rediriger vers ton site si tu veux une vraie UX :
  // return res.redirect(`${PUBLIC_SITE}/bank-link.html?linked=${obLinked ? 1 : 0}`);
  res.json({ linked: obLinked });
});

// (optionnel) statut “open banking”
app.get("/ob/status", (req, res) => res.json({ linked: obLinked }));

// ------------------------------------------------------------------
// 404 JSON
// ------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

// ------------------------------------------------------------------
// Démarrage
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Econya backend v${VERSION} démarré sur le port ${PORT}`);
});

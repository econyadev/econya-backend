/**
 * Econya – Backend (Express)
 * - Santé: /ping, /sante
 * - Open Banking (mock): /ob/* + /mescomptes + /transactions (+ /transactions/month/:ym)
 * - Bons plans (affiliation): /deals, /deals/stats, /go?id=...
 *
 * Dépendances: express, cors
 * (optionnel mais conseillé: ajouter helmet)
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Config de base ---
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

const PUBLIC_BASE =
  process.env.PUBLIC_BASE || "https://econya-backend.onrender.com";

// ---------------------------------------------------------------------------
// 1) Santé
// ---------------------------------------------------------------------------

app.get("/ping", (_req, res) => res.type("text/plain").send("pong"));

app.get("/sante", (_req, res) => {
  res.json({ status: "ok", service: "econya-backend", ts: Date.now() });
});

// ---------------------------------------------------------------------------
// 2) Open Banking (mock très simple pour la démo)
// ---------------------------------------------------------------------------

let obLinked = false; // mémoire locale (mock)

app.get("/ob/start", (req, res) => {
  // retourne une URL "fournisseur" fictive avec callback
  const callbackUrl = `${PUBLIC_BASE}/ob/callback`;
  const u = new URL(`${PUBLIC_BASE}/ob/provider`);
  u.searchParams.set("callback", callbackUrl);
  res.json({ url: u.toString() });
});

app.get("/ob/provider", (req, res) => {
  const callback = req.query.callback || `${PUBLIC_BASE}/ob/callback`;
  res.type("html").send(`<!doctype html>
  <meta charset="utf-8">
  <title>Fournisseur (DEMO)</title>
  <style>body{font-family:ui-sans-serif,system-ui;background:#081c14;color:#fff;display:grid;place-items:center;height:100vh}</style>
  <div>
    <h1>Fournisseur bancaire (DEMO)</h1>
    <p>Simulez une autorisation de connexion.</p>
    <a href="${callback}?ok=1" style="display:inline-block;padding:10px 14px;background:#2bd970;color:#082; font-weight:700;border-radius:10px;text-decoration:none">
      Autoriser et revenir
    </a>
  </div>`);
});

app.get("/ob/callback", (req, res) => {
  obLinked = req.query.ok === "1";
  res.type("html").send(`<!doctype html>
  <meta charset="utf-8">
  <title>Comptes reliés</title>
  <style>body{font-family:ui-sans-serif,system-ui;background:#081c14;color:#fff;display:grid;place-items:center;height:100vh}</style>
  <div>
    <h1>${obLinked ? "✅ Comptes reliés" : "❌ Opération annulée"}</h1>
    <p><a href="https://econya.fr/banque.html" style="color:#7efcac">Retourner à Econya</a></p>
  </div>`);
});

app.get("/ob/status", (_req, res) => {
  res.json({ linked: obLinked });
});

// ---------------------------------------------------------------------------
// 3) Données bancaires DEMO (mock)
// ---------------------------------------------------------------------------

const DEMO_ACCOUNTS = [
  { id: "CC", name: "Compte courant", iban: "FR76 **** **** **** 1234", balance: 980, currency: "EUR" },
  { id: "LA", name: "Livret A", iban: "FR76 **** **** **** 5678", balance: 1225.32, currency: "EUR" }
];

const DEMO_TX = [
  { id: "t1", date: "2025-08-01", label: "Supermarché", amount: -49.90, category: "Courses" },
  { id: "t2", date: "2025-08-03", label: "Salaire", amount: 2200, category: "Revenus" },
  { id: "t3", date: "2025-08-05", label: "Essence", amount: -58, category: "Transport" },
  { id: "t4", date: "2025-07-28", label: "Internet", amount: -29.99, category: "Abonnements" },
  { id: "t5", date: "2025-07-25", label: "Restaurant", amount: -32.4, category: "Sorties" }
];

app.get("/mescomptes", (_req, res) => {
  res.json({ accounts: DEMO_ACCOUNTS });
});

app.get("/transactions", (_req, res) => {
  res.json({ transactions: DEMO_TX, length: DEMO_TX.length });
});

app.get("/transactions/month/:ym", (req, res) => {
  const ym = String(req.params.ym || "");
  const tx = DEMO_TX.filter(t => t.date.startsWith(ym));
  res.json({ ym, length: tx.length, transactions: tx });
});

// ---------------------------------------------------------------------------
// 4) Bons plans (affiliation) – data locale + stats de clics/économies
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const DEALS_FILE = path.join(DATA_DIR, "deals.json");
const STATS_FILE = path.join(DATA_DIR, "deals-stats.json");

// assure le dossier
fs.mkdirSync(DATA_DIR, { recursive: true });

// helpers JSON
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// seeds si fichiers absents
if (!fs.existsSync(DEALS_FILE)) {
  writeJSON(DEALS_FILE, {
    deals: [
      {
        id: "energy-eco",
        label: "Offre électricité verte -10% vs TRV",
        partner: "EnerGreen",
        // remplace par ton lien affilié réel
        link: "https://example.com/aff/energreen",
        saving: 120, // économie €/an indicative
        category: "Énergie",
        country: "FR"
      },
      {
        id: "mobile-5g",
        label: "Forfait mobile 80 Go à prix cassé",
        partner: "TelEco",
        link: "https://example.com/aff/teleco",
        saving: 90,
        category: "Télécom",
        country: "FR"
      },
      {
        id: "bank-cashback",
        label: "Compte avec cashback (jusqu’à 5%)",
        partner: "BankX",
        link: "https://example.com/aff/bankx",
        saving: 50,
        category: "Banque",
        country: "FR"
      }
    ]
  });
}
if (!fs.existsSync(STATS_FILE)) {
  writeJSON(STATS_FILE, { clicks: {}, saved_estimate_eur: 0, lastupdate: null });
}

// API: liste des deals
app.get("/deals", (_req, res) => {
  const db = readJSON(DEALS_FILE, { deals: [] });
  res.json({ ok: true, deals: db.deals });
});

// API: stats globales
app.get("/deals/stats", (_req, res) => {
  const st = readJSON(STATS_FILE, { clicks: {}, saved_estimate_eur: 0, lastupdate: null });
  res.json({ ok: true, stats: st });
});

/**
 * Redirect traqué:
 *   /go?id=<dealId>&src=<source>&md=<medium>&cmp=<campaign>
 * - Ajoute des UTM au lien de sortie
 * - Incrémente le compteur de clics
 * - Ajoute l’économie estimée (indicative) au total
 */
app.get("/go", (req, res) => {
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).send("missing id");

  const src = String(req.query.src || "econya");
  const md  = String(req.query.md  || "bons-plans");
  const cmp = String(req.query.cmp || id);

  const db = readJSON(DEALS_FILE, { deals: [] });
  const deal = (db.deals || []).find(d => d.id === id);
  if (!deal) return res.status(404).send("deal not found");

  // 1) cible avec UTM
  let target = deal.link;
  try {
    const u = new URL(deal.link);
    u.searchParams.set("utm_source", src);
    u.searchParams.set("utm_medium", md);
    u.searchParams.set("utm_campaign", cmp);
    target = u.toString();
  } catch {
    // lien non parsable => on redirige tel quel
  }

  // 2) stats
  const st = readJSON(STATS_FILE, { clicks: {}, saved_estimate_eur: 0, lastupdate: null });
  st.clicks[id] = (st.clicks[id] || 0) + 1;

  const save = Number(deal.saving || 0);
  st.saved_estimate_eur = Math.max(0, (st.saved_estimate_eur || 0) + save);
  st.lastupdate = new Date().toISOString();
  writeJSON(STATS_FILE, st);

  // 3) redirection
  return res.redirect(302, target);
});

// ---------------------------------------------------------------------------
// 5) Fallback 404 JSON
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Econya backend prêt sur : http://localhost:${PORT}`);
});

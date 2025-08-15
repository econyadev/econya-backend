// GET /go?id=... -> redirection vers le lien affilié + comptage + UTM
app.get("/go", (req, res) => {
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).send("missing id");

  const source   = String(req.query.src || "econya");
  const medium   = String(req.query.md  || "bons-plans");
  const campaign = String(req.query.cm  || "site");

  // 1) trouve le deal
  const db = readJSON(DEALS_FILE, { deals: [] });
  const deal = db.deals.find(d => d.id === id);
  if (!deal || !deal.link || deal.link === "#") {
    return res.status(404).send("deal not found");
  }

  // 2) ajoute UTM aux liens
  let target = deal.link;
  try {
    const u = new URL(deal.link);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", medium);
    u.searchParams.set("utm_campaign", campaign);
    u.searchParams.set("utm_content", id);
    target = u.toString();
  } catch { /* si le lien est relatif, on redirige tel quel */ }

  // 3) incrémente statistiques (clics + estimation €)
  const st = readJSON(STATS_FILE, { clicks:{}, saved_estimate_eur:0, lastUpdate:null });
  st.clicks[id] = (st.clicks[id] || 0) + 1;
  // estimation brute : on ajoute "saving" (€/mois) à la cagnotte – c'est indicatif
  const save = Number(deal.saving || 0);
  if (isFinite(save)) st.saved_estimate_eur = Math.max(0, st.saved_estimate_eur + save);
  st.lastUpdate = new Date().toISOString();
  writeJSON(STATS_FILE, st);

  // 4) redirection 302
  res.redirect(302, target);
});


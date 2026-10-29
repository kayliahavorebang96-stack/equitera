// =========================================================
// EQUITERA - script principal
// Connexion par mot de passe, 4 rôles, tableaux de bord interactifs.
// =========================================================

import DEMO from "./demo-data.js";
import { FEMMES, HOMMES, EPICENES } from "./prenoms.js";

// ----- Adresses des scénarios Make (inchangées) -----
const WEBHOOK_CRITERES = "https://hook.eu1.make.com/a7dgmc7qd6467rbaujvfsx176xgpfl3o";
const WEBHOOK_DESACTIVER_CRITERE = "https://hook.eu1.make.com/lvo7h2gqc5viqqua9up3xaea3rcacbhh";
const WEBHOOK_CV_REFUSES = "https://hook.eu1.make.com/s74e4s98cdnm5c92cqvqbq2fjek5qxt9";
const WEBHOOK_ANNULER = "https://hook.eu1.make.com/xwjqge75efy01v46wf7n6hub75811kun";
const WEBHOOK_ENVOYER_MOTIF = "https://hook.eu1.make.com/eo7nwea1tttsbig43k3xpho31m6u1nik";
const WEBHOOK_STATS = "https://hook.eu1.make.com/wkl44qrvvttyuu6mq174fr1w1cp1fyz9";
const WEBHOOK_RGPD = "https://hook.eu1.make.com/tb2i90sgpqrcnzdtryyk79zsc5wmxrex";
const WEBHOOK_HISTORIQUE = "https://hook.eu1.make.com/fkrme0qxa7djgxzghxpfuja3b07swqwa";
const WEBHOOK_PURGE = "https://hook.eu1.make.com/j9shytvloq58plu4me82jlyozmltvwsh";
// Nouveau scénario à créer : renvoie TOUTES les lignes de la feuille Candidatures.
// Tant qu'il n'est pas renseigné, le site fonctionne en mode démonstration (demo-data.js).
const WEBHOOK_CANDIDATURES = "https://hook.eu1.make.com/dc639a6swkt1fifbyla4b1oxfnyuo2zg";
// Scénario « ajouter-candidature » : ajoute un CV importé dans la feuille Candidatures
const WEBHOOK_AJOUTER_CV = "https://hook.eu1.make.com/6tjc1tp1ggwptwebdn4rdevfw9ap3lpc";

// Colonnes de la feuille Candidatures
const C = { ID: "0", NOM: "1", POSTE: "2", RECU: "3", SCORE: "4", STATUT: "5", CRITERE: "6", MOTIF: "7", DECIDEUR: "8", DATE_DEC: "9", SUPPR: "10", EMAIL: "11" };

// =========================================================
// Rôles et droits
// =========================================================
const ROLES = {
  admin: {
    label: "Administrateur",
    vues: ["dashboard", "analyse", "regles", "review", "equipe", "rgpd", "rapports", "utilisateurs", "securite", "parametres"],
    accueil: "Vous avez accès à toute la plateforme : comptes, sécurité, paramètres d'audit et purge RGPD.",
  },
  directeur: {
    label: "Directeur RH",
    vues: ["dashboard", "analyse", "regles", "rgpd", "rapports"],
    accueil: "Votre vue de pilotage : conformité AI Act, équité des recrutements et rapports pour les autorités.",
  },
  responsable: {
    label: "Responsable recrutement",
    vues: ["dashboard", "analyse", "regles", "review", "equipe"],
    accueil: "Supervisez les règles de tri, les écarts d'équité par poste et la charge de votre équipe.",
  },
  recruteur: {
    label: "Recruteur",
    vues: ["dashboard", "review"],
    accueil: "Traitez les refus automatiques qui vous sont attribués et informez chaque candidat.",
  },
};

const DROITS = [
  { id: "decider", label: "Annuler un refus ou envoyer un motif", roles: ["admin", "responsable", "recruteur"] },
  { id: "desactiver", label: "Désactiver une règle de tri", roles: ["admin", "responsable"] },
  { id: "exporter", label: "Exporter une vue en PDF", roles: ["admin", "directeur", "responsable"] },
  { id: "rapports", label: "Générer les rapports d'audit", roles: ["admin", "directeur"] },
  { id: "purger", label: "Purger les CV expirés", roles: ["admin"] },
  { id: "utilisateurs", label: "Gérer les comptes et les rôles", roles: ["admin"] },
  { id: "securite", label: "Consulter le journal de sécurité", roles: ["admin"] },
  { id: "parametres", label: "Modifier les paramètres d'audit", roles: ["admin"] },
];

// Comptes de démonstration : seules les empreintes SHA-256 des mots de passe sont stockées.
const COMPTES_DEFAUT = [
  { id: "u1", nom: "Kayliah", poste: "Administratrice de la plateforme", email: "admin@equitera.fr", role: "admin", actif: true, empreinte: "fcf44c5f7302b2387bf34ed5b265690b339bd8356f5df66807fc4a21e581ce8b" },
  { id: "u2", nom: "Farah", poste: "Directrice des ressources humaines", email: "direction@equitera.fr", role: "directeur", actif: true, empreinte: "50368f07c29ea1943a37db4b19b239d890b9bc112c1002265a95ff0a4e46d0b1" },
  { id: "u3", nom: "Yasmine", poste: "Responsable recrutement", email: "talent@equitera.fr", role: "responsable", actif: true, empreinte: "bb464c628eb58de038f0951fe39bc623a0788d9f5ef09b7ad1fa7e6c71381b1d" },
  { id: "u4", nom: "Elodie", poste: "Chargée de recrutement", email: "elodie@equitera.fr", role: "recruteur", actif: true, empreinte: "ca4617da6c3a66e62f600fd626f2d5b1a8f89e3ead04fce84216a6aa7ad207c0" },
  { id: "u5", nom: "Lucas", poste: "Chargé de recrutement", email: "lucas@equitera.fr", role: "recruteur", actif: true, empreinte: "91c28026e2efac3643235c4448dd9e28d80f2582294ae823efa0a83e9cf09e31" },
];

const PARAMETRES_DEFAUT = {
  interdits: ["Age", "Localisation", "Lieu de résidence", "Situation familiale", "Sexe", "Origine", "Handicap", "Religion", "Grossesse"],
  suspects: ["Trou dans le parcours", "Continuité du parcours", "Disponibilité immédiate", "Disponibilite"],
  seuil: 20,
  alerteJours: 90,
  // En mode démonstration, les décisions sont quand même envoyées à Make
  // (les identifiants CANDxxx existent aussi dans Google Sheets) : les emails partent vraiment.
  envoisReels: true,
};

// =========================================================
// Stockage local (toujours protégé par try/catch)
// =========================================================
function lire(cle, defaut, session = false) {
  try {
    const v = (session ? sessionStorage : localStorage).getItem(cle);
    return v ? JSON.parse(v) : defaut;
  } catch (e) { return defaut; }
}
function ecrire(cle, valeur, session = false) {
  try { (session ? sessionStorage : localStorage).setItem(cle, JSON.stringify(valeur)); } catch (e) { /* indisponible */ }
}

let comptes = lire("eq-comptes", COMPTES_DEFAUT);
let parametres = { ...PARAMETRES_DEFAUT, ...lire("eq-parametres", {}) };
let journal = lire("eq-journal", []);
let utilisateur = comptes.find((c) => c.id === lire("eq-session", null, true) && c.actif) || null;

function peut(droit) {
  if (!utilisateur) return false;
  const d = DROITS.find((x) => x.id === droit);
  return !!d && d.roles.includes(utilisateur.role);
}
function voitVue(vue) {
  return !!utilisateur && ROLES[utilisateur.role].vues.includes(vue);
}
function verrou(droit) {
  return peut(droit) ? "" : ` disabled title="Action non autorisée pour votre rôle"`;
}

function tracer(evenement, detail = "", niveau = "info", qui = utilisateur ? utilisateur.nom : "-") {
  journal.unshift({ date: new Date().toISOString(), qui, evenement, detail, niveau });
  journal = journal.slice(0, 400);
  ecrire("eq-journal", journal);
}

async function empreinte(email, mdp) {
  const octets = new TextEncoder().encode(`equitera:${email.toLowerCase()}:${mdp}`);
  const h = await crypto.subtle.digest("SHA-256", octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =========================================================
// Outils
// =========================================================
const $ = (id) => document.getElementById(id);
function esc(v) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
function lireDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(1899, 11, 30 + Math.floor(+s));
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function fDate(v) { const d = lireDate(v); return d ? d.toLocaleDateString("fr-FR") : esc(v); }
function aujourdhuiTexte() { return new Date().toLocaleDateString("fr-FR"); }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function badge(type, texte) { return `<span class="badge ${type}">${texte}</span>`; }
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

const TEINTES = [["#efedff", "#4a3be0"], ["#e4efff", "#1d5fd1"], ["#ffece6", "#c2410c"], ["#e3f6ee", "#0f7a45"], ["#fde7f1", "#b0206a"], ["#fff3cf", "#8a5a00"]];
function avatar(nom, taille = "sm") {
  const [bg, fg] = TEINTES[hash(nom) % TEINTES.length];
  const ini = String(nom || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join("");
  return `<span class="avatar ${taille}" style="background:${bg};color:${fg}">${esc(ini)}</span>`;
}
function personne(nom, detail) { return `<div class="person">${avatar(nom)}<div><strong>${esc(nom)}</strong><small>${esc(detail)}</small></div></div>`; }

const ICONES = {
  dossiers: '<svg viewBox="0 0 20 20"><path d="M3 5.5h5l1.5 2H17v8.5H3z"/></svg>',
  taux: '<svg viewBox="0 0 20 20"><path d="M4 16L16 4M6 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 15.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>',
  alerte: '<svg viewBox="0 0 20 20"><path d="M10 3l8 14H2zM10 8v4M10 14.5v.5"/></svg>',
  bouclier: '<svg viewBox="0 0 20 20"><path d="M10 2.5l6 2.5v4.5c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V5z"/><path d="M7.5 10l2 2 3.5-4"/></svg>',
  check: '<svg viewBox="0 0 20 20"><path d="M4 10.5l3.5 3.5L16 5.5"/></svg>',
  mail: '<svg viewBox="0 0 20 20"><rect x="3" y="4.5" width="14" height="11" rx="2"/><path d="M3.5 5.5L10 10.5l6.5-5"/></svg>',
  horloge: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/></svg>',
  personne: '<svg viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.2"/><path d="M4 17c.8-3 3-4.8 6-4.8s5.2 1.8 6 4.8"/></svg>',
  rapport: '<svg viewBox="0 0 20 20"><path d="M5 2.5h7l3 3v12H5zM12 2.5v3h3M8 10h5M8 13.5h5"/></svg>',
};

// ----- Notifications et modale -----
let toastTimer;
function notifier(message, type = "") {
  const t = $("toast");
  t.textContent = message;
  t.className = "toast " + type;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4800);
}
function ouvrirModale(titre, corps, boutons = []) {
  $("modal-title").textContent = titre;
  $("modal-body").innerHTML = corps;
  const foot = $("modal-foot");
  foot.innerHTML = "";
  boutons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "btn " + (b.classe || "btn-outline");
    btn.textContent = b.texte;
    if (b.desactive) btn.disabled = true;
    btn.onclick = () => b.action(btn);
    foot.appendChild(btn);
  });
  $("modal").hidden = false;
}
function fermerModale() { $("modal").hidden = true; }
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") fermerModale(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerModale(); });

// =========================================================
// Connexion
// =========================================================
const MAX_ECHECS = 5;
const DUREE_VERROU = 60 * 1000;

document.querySelectorAll("[data-demo]").forEach((tr) => {
  tr.addEventListener("click", () => {
    $("login-email").value = tr.dataset.demo;
    $("login-mdp").value = tr.dataset.mdp;
    $("login-mdp").focus();
  });
});

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim().toLowerCase();
  const mdp = $("login-mdp").value;
  const erreur = $("login-erreur");
  const verrous = lire("eq-verrous", {});
  const v = verrous[email] || { echecs: 0, jusqua: 0 };

  if (v.jusqua > Date.now()) {
    erreur.textContent = `Compte temporairement verrouillé. Réessayez dans ${Math.ceil((v.jusqua - Date.now()) / 1000)} secondes.`;
    return;
  }
  if (!window.crypto || !crypto.subtle) {
    erreur.textContent = "La connexion sécurisée nécessite une adresse en https.";
    return;
  }

  const compte = comptes.find((c) => c.email.toLowerCase() === email);
  const ok = compte && compte.actif && compte.empreinte === (await empreinte(email, mdp));

  if (!ok) {
    v.echecs += 1;
    if (v.echecs >= MAX_ECHECS) {
      v.jusqua = Date.now() + DUREE_VERROU;
      v.echecs = 0;
      tracer("Compte verrouillé", `${email} après ${MAX_ECHECS} échecs`, "bad", email);
      erreur.textContent = "Trop de tentatives. Compte verrouillé pendant 1 minute.";
    } else {
      tracer("Échec de connexion", email, "warn", email);
      erreur.textContent = compte && !compte.actif
        ? "Ce compte est désactivé. Contactez un administrateur."
        : `Email ou mot de passe incorrect (${MAX_ECHECS - v.echecs} essais restants).`;
    }
    verrous[email] = v;
    ecrire("eq-verrous", verrous);
    return;
  }

  delete verrous[email];
  ecrire("eq-verrous", verrous);
  erreur.textContent = "";
  $("login-mdp").value = "";
  utilisateur = compte;
  ecrire("eq-session", compte.id, true);
  tracer("Connexion", ROLES[compte.role].label, "ok");
  demarrerSession();
});

function afficherConnexion() {
  $("app").hidden = true;
  $("login").hidden = false;
  $("login-email").focus();
}

function deconnecter() {
  if (utilisateur) tracer("Déconnexion", "", "info");
  utilisateur = null;
  ecrire("eq-session", null, true);
  location.hash = "";
  afficherConnexion();
}

function demarrerSession() {
  $("login").hidden = true;
  $("app").hidden = false;
  appliquerRole();
  if (!voitVue(location.hash.slice(1))) location.hash = "#dashboard";
  afficherVue();
  rendreTout();
}

function appliquerRole() {
  const r = utilisateur.role;
  $("side-name").textContent = utilisateur.nom;
  $("side-role").textContent = ROLES[r].label;
  $("side-avatar").outerHTML = avatar(utilisateur.nom).replace('class="avatar', 'id="side-avatar" class="avatar');
  document.querySelectorAll("[data-view-link]").forEach((a) => { a.hidden = !voitVue(a.dataset.viewLink); });
  document.querySelectorAll(".nav-group").forEach((g) => {
    let el = g.nextElementSibling, visible = false;
    while (el && !el.classList.contains("nav-group")) { if (!el.hidden) visible = true; el = el.nextElementSibling; }
    g.hidden = !visible;
  });
  document.querySelectorAll("[data-roles]").forEach((el) => { el.hidden = !el.dataset.roles.split(",").includes(r); });
  document.querySelectorAll("[data-perm]").forEach((b) => {
    if (b.id === "btn-purge") return;
    b.disabled = !peut(b.dataset.perm);
  });
  $("nav-review-label").textContent = r === "recruteur" ? "Ma file de revue" : "File de revue";
}

// =========================================================
// Navigation
// =========================================================
function afficherVue() {
  if (!utilisateur) return;
  let vue = location.hash.replace("#", "") || "dashboard";
  if (!voitVue(vue)) vue = "dashboard";
  document.querySelectorAll(".view").forEach((s) => {
    const active = s.id === vue;
    s.classList.toggle("is-active", active);
    if (active) document.title = `${s.dataset.title} - Equitera`;
  });
  document.querySelectorAll("[data-view-link]").forEach((a) => a.classList.toggle("is-active", a.dataset.viewLink === vue));
  window.scrollTo(0, 0);
  // Les graphiques doivent être redessinés quand leur vue devient visible
  requestAnimationFrame(() => Object.values(graphiques).forEach((g) => g && g.resize()));
}
window.addEventListener("hashchange", afficherVue);

// =========================================================
// Données
// =========================================================
const donnees = { candidatures: [], criteres: [], rgpd: [] };
let mode = "demo";
const motifsEnvoyes = new Set();

async function lireWebhook(url) {
  if (!url || url.startsWith("COLLER")) throw new Error("non configuré");
  const r = await fetch(url);
  const json = await r.json();
  return (json.array || []).filter((l) => l["0"] !== null && l["0"] !== undefined && l["0"] !== "");
}

async function chargerDonnees() {
  const demo = DEMO || { candidatures: [], criteres: [], rgpd: [] };
  const [cand, crit, rgpd] = await Promise.allSettled([lireWebhook(WEBHOOK_CANDIDATURES), lireWebhook(WEBHOOK_CRITERES), lireWebhook(WEBHOOK_RGPD)]);
  mode = cand.status === "fulfilled" && cand.value.length ? "live" : "demo";
  donnees.candidatures = mode === "live" ? cand.value : structuredClone(demo.candidatures);
  donnees.criteres = crit.status === "fulfilled" && crit.value.length ? crit.value : structuredClone(demo.criteres);
  donnees.rgpd = rgpd.status === "fulfilled" && rgpd.value.length ? rgpd.value : structuredClone(demo.rgpd);
  const pill = $("mode-pill");
  pill.className = "mode-pill " + mode;
  pill.textContent = mode === "live" ? "Données en direct" : "Mode démonstration";
  $("source-info").textContent = mode === "live"
    ? `${donnees.candidatures.length} candidatures lues depuis Google Sheets via Make.`
    : `${donnees.candidatures.length} candidatures de démonstration (demo-data.js). Renseignez WEBHOOK_CANDIDATURES pour passer en données réelles.`;
}

// ----- Classification des critères -----
function niveau(critere) {
  if (!critere) return "";
  const n = norm(critere);
  if (parametres.interdits.some((x) => norm(x) === n)) return "interdit";
  if (parametres.suspects.some((x) => norm(x) === n)) return "suspect";
  return "legitime";
}
const NIVEAUX = {
  interdit: { badge: "bad", label: "Interdit" },
  suspect: { badge: "warn", label: "Suspect" },
  legitime: { badge: "ok", label: "Légitime" },
};
function badgeNiveau(crit) {
  const n = niveau(crit);
  return n ? badge(NIVEAUX[n].badge, NIVEAUX[n].label) : `<span class="muted">-</span>`;
}

const STATUTS = {
  Accepte: { badge: "ok", label: "Accepté" },
  Refuse_auto: { badge: "warn", label: "Refus à revoir" },
  Refuse_valide: { badge: "ink", label: "Refus validé" },
  Refuse_annule: { badge: "brand", label: "Refus annulé" },
  En_attente: { badge: "neutral", label: "En attente" },
};
function badgeStatut(s) { const x = STATUTS[s] || { badge: "neutral", label: s || "-" }; return badge(x.badge, x.label); }
const estRefusAlgo = (c) => !!c[C.CRITERE] && String(c[C.STATUT]).startsWith("Refuse");
const aRevoir = (c) => c[C.STATUT] === "Refuse_auto" && !motifsEnvoyes.has(c[C.ID]);
const traiteHumain = (c) => c[C.STATUT] === "Refuse_valide" || c[C.STATUT] === "Refuse_annule";

// ----- Attribution des refus aux recruteurs -----
function recruteurs() { return comptes.filter((c) => c.role === "recruteur" && c.actif); }
function attribueA(c) {
  if (c[C.DECIDEUR]) return c[C.DECIDEUR];
  const liste = recruteurs();
  return liste.length ? liste[hash(c[C.ID]) % liste.length].nom : "-";
}

// ----- Statistiques -----
function statsParPoste(rows) {
  const parPoste = {};
  rows.forEach((c) => {
    if (c[C.STATUT] === "En_attente") return;
    const p = c[C.POSTE] || "Non renseigné";
    parPoste[p] = parPoste[p] || { poste: p, total: 0, refus: 0, biais: 0 };
    parPoste[p].total++;
    if (estRefusAlgo(c)) {
      parPoste[p].refus++;
      if (niveau(c[C.CRITERE]) !== "legitime") parPoste[p].biais++;
    }
  });
  return Object.values(parPoste).map((s) => ({ ...s, taux: pct(s.refus, s.total) })).sort((a, b) => b.taux - a.taux);
}

function moisGlissants(n = 12) {
  const res = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    res.push({ cle: `${m.getFullYear()}-${m.getMonth()}`, label: m.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), refus: 0, conformes: 0, risque: 0 });
  }
  return res;
}
function serieMensuelle() {
  const mois = moisGlissants(14);
  donnees.candidatures.filter(estRefusAlgo).forEach((c) => {
    const d = lireDate(c[C.RECU]);
    if (!d) return;
    const m = mois.find((x) => x.cle === `${d.getFullYear()}-${d.getMonth()}`);
    if (!m) return;
    m.refus++;
    const risque = niveau(c[C.CRITERE]) !== "legitime";
    if (risque) m.risque++;
    // Conforme : refus légitime, ou refus à risque corrigé par un humain
    if (!risque || c[C.STATUT] === "Refuse_annule") m.conformes++;
  });
  // Moyenne glissante sur 3 mois : les volumes mensuels sont faibles, on lisse pour lire la tendance
  return mois.slice(2).map((m, i) => {
    const fenetre = mois.slice(i, i + 3);
    const somme = (k) => fenetre.reduce((s, x) => s + x[k], 0);
    return { label: m.label, refus: somme("refus"), conformes: somme("conformes"), risque: somme("risque") };
  });
}

function joursRestants(c) {
  const d = lireDate(c[C.SUPPR]);
  if (!d) return null;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  return Math.round((d - auj) / 86400000);
}
function cvExpires() { return donnees.candidatures.filter((c) => { const j = joursRestants(c); return j !== null && j < 0; }); }

function evaluerRegle(r) {
  const s = norm(r["4"]);
  if (s.startsWith("inactif") || s.startsWith("desactiv")) return { type: "neutral", label: "Désactivée", active: false };
  const n = norm(r["1"]);
  if (parametres.interdits.some((x) => n.includes(norm(x))) || /age|residence|familiale/.test(n)) return { type: "bad", label: "Interdite", active: true };
  if (s === "suspect") return { type: "warn", label: "À risque", active: true };
  return { type: "ok", label: "Conforme", active: true };
}

function controles() {
  const refusAttente = donnees.candidatures.filter(aRevoir);
  const tousRefus = donnees.candidatures.filter(estRefusAlgo);
  const refusInterdits = tousRefus.filter((c) => niveau(c[C.CRITERE]) === "interdit");
  const interditsAttente = refusAttente.filter((c) => niveau(c[C.CRITERE]) === "interdit").length;
  const stats = statsParPoste(donnees.candidatures);
  const taux = stats.map((s) => s.taux);
  const ecart = taux.length ? Math.max(...taux) - Math.min(...taux) : 0;
  const regles = donnees.criteres.map(evaluerRegle).filter((e) => e.active);
  const nbInterdites = regles.filter((e) => e.type === "bad").length;
  const nbRisque = regles.filter((e) => e.type === "warn").length;
  const donneesInterdites = donnees.rgpd.filter((r) => norm(r["2"]) === "interdit").length;
  const expires = cvExpires().length;
  const part = (mauvais, total) => (total ? Math.round(100 * (1 - mauvais / total)) : 100);

  // Chaque contrôle vaut de 0 à 100 % : le score progresse à chaque correction
  const liste = [
    { label: "Aucune règle interdite active", score: Math.max(0, 100 - 50 * nbInterdites), n: nbInterdites, lien: "#regles", type: "bad", titre: "Règles interdites encore actives", detail: "Désactivez-les dans l'audit des règles." },
    { label: "Refus sur critère interdit corrigés", score: part(interditsAttente, refusInterdits.length), n: interditsAttente, lien: "#review", type: "bad", titre: "Refus sur critère interdit", detail: "À annuler : ils constituent une discrimination." },
    { label: "Aucune donnée interdite collectée", score: part(donneesInterdites, donnees.rgpd.length), n: donneesInterdites, lien: "#rgpd", type: "bad", titre: "Données interdites collectées", detail: "Retirez-les de l'extraction des CV." },
    { label: "Durée de conservation respectée", score: expires ? Math.min(95, part(expires * 10, donnees.candidatures.length)) : 100, n: expires, lien: "#rgpd", type: "bad", titre: "CV conservés plus de 2 ans", detail: "Lancez la purge RGPD." },
    { label: `Écart d'équité inférieur à ${parametres.seuil} points`, score: ecart <= parametres.seuil ? 100 : Math.max(0, Math.round(100 - (ecart - parametres.seuil) * 2)), n: `${Math.round(ecart)} pts`, lien: "#analyse", type: "warn", titre: "Écart d'équité entre postes", detail: `Au-delà du seuil de ${parametres.seuil} points.` },
    { label: "Aucune règle à risque active", score: part(nbRisque, regles.length), n: nbRisque, lien: "#regles", type: "warn", titre: "Règles à risque à justifier", detail: "Vérifiez qu'elles sont liées au poste." },
    { label: "Refus revus par un humain", score: part(refusAttente.length, tousRefus.length), n: refusAttente.length, lien: "#review", type: "warn", titre: "Refus en attente de revue", detail: "Aucun refus ne doit partir sans validation." },
  ].map((x) => ({ ...x, ok: x.score === 100 }));
  const score = Math.round(liste.reduce((t, x) => t + x.score, 0) / liste.length);
  return { ecart, liste, score };
}

// =========================================================
// Graphiques (Chart.js)
// =========================================================
const COULEURS = {
  ink: "#101a3f", indigo: "#5b4cf0", indigo2: "#8b7cf8", indigo3: "#c9c1fd", coral: "#ff7a59",
  ok: "#12a150", warn: "#f79009", bad: "#f04461", grille: "#e7eaf4", texte: "#5d6685",
};
const PALETTE_LEGITIME = ["#5b4cf0", "#8b7cf8", "#101a3f", "#3e7bfa", "#c9c1fd"];
const PALETTE_SUSPECT = ["#f79009", "#fbbf5a"];
const PALETTE_INTERDIT = ["#f04461", "#ff8aa0", "#b4233c", "#ffc2cd"];
const graphiques = {};
const grapheDispo = () => typeof window.Chart !== "undefined";

if (grapheDispo()) {
  Chart.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.color = COULEURS.texte;
  Chart.defaults.plugins.tooltip.backgroundColor = COULEURS.ink;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.titleFont = { weight: "800", size: 13 };
}

function dessiner(id, config) {
  if (!grapheDispo()) return;
  const canvas = $(id);
  if (!canvas) return;
  if (graphiques[id]) graphiques[id].destroy();
  graphiques[id] = new Chart(canvas, config);
}

function couleursCriteres(noms) {
  let i = 0, j = 0, k = 0;
  return noms.map((n) => {
    const niv = niveau(n);
    if (niv === "interdit") return PALETTE_INTERDIT[i++ % PALETTE_INTERDIT.length];
    if (niv === "suspect") return PALETTE_SUSPECT[j++ % PALETTE_SUSPECT.length];
    return PALETTE_LEGITIME[k++ % PALETTE_LEGITIME.length];
  });
}

function donut(id, rows, auClic) {
  const compte = {};
  rows.filter(estRefusAlgo).forEach((c) => { compte[c[C.CRITERE]] = (compte[c[C.CRITERE]] || 0) + 1; });
  const noms = Object.keys(compte).sort((a, b) => compte[b] - compte[a]);
  const total = noms.reduce((s, n) => s + compte[n], 0);
  dessiner(id, {
    type: "doughnut",
    data: { labels: noms, datasets: [{ data: noms.map((n) => compte[n]), backgroundColor: couleursCriteres(noms), borderColor: "#fff", borderWidth: 3, hoverOffset: 10 }] },
    options: {
      cutout: "64%", maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "rectRounded", padding: 12, boxWidth: 10, font: { weight: "700", size: 12.5 } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} refus (${pct(ctx.raw, total)} %), critère ${NIVEAUX[niveau(ctx.label)]?.label.toLowerCase() || ""}` } },
      },
      onClick: (_, el) => { if (el.length && auClic) auClic(noms[el[0].index]); },
      onHover: (e, el) => { e.native.target.style.cursor = el.length ? "pointer" : "default"; },
    },
  });
}

// =========================================================
// Vue d'ensemble (adaptée au rôle)
// =========================================================
function hkpi(icone, label, valeur, foot, niveauFoot = "") {
  return `<div class="hkpi"><div class="hkpi-top"><span class="hkpi-icon">${ICONES[icone]}</span>${label}</div><div class="hkpi-value">${valeur}</div><div class="hkpi-foot ${niveauFoot}">${foot}</div></div>`;
}

function rendreDashboard() {
  const r = utilisateur.role;
  const heure = new Date().getHours();
  $("hero-date").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("hero-title").textContent = `${heure < 18 ? "Bonjour" : "Bonsoir"}, ${utilisateur.nom}`;
  $("hero-sub").textContent = ROLES[r].accueil;

  const all = donnees.candidatures;
  const douzeMois = all.filter((c) => { const d = lireDate(c[C.RECU]); return d && (Date.now() - d) / 86400000 <= 366; });
  const decides = douzeMois.filter((c) => c[C.STATUT] !== "En_attente");
  const refus = decides.filter(estRefusAlgo);
  const attente = all.filter(aRevoir);
  const ctrl = controles();
  const score = ctrl.score;

  const actions = {
    admin: `<a class="btn btn-glass" href="#utilisateurs">Gérer les comptes</a><a class="btn btn-white" href="#rgpd">Purge RGPD</a>`,
    directeur: `<a class="btn btn-glass" href="#analyse">Voir l'analyse</a><a class="btn btn-white" href="#rapports">Générer un rapport</a>`,
    responsable: `<a class="btn btn-glass" href="#equipe">Charge de l'équipe</a><a class="btn btn-white" href="#review">File de revue</a>`,
    recruteur: `<a class="btn btn-white" href="#review">Traiter ma file</a>`,
  };
  $("hero-actions").innerHTML = actions[r];

  if (r === "recruteur") {
    const maFile = attente.filter((c) => attribueA(c) === utilisateur.nom);
    const interdits = maFile.filter((c) => niveau(c[C.CRITERE]) === "interdit").length;
    const mesDec = all.filter((c) => c[C.DECIDEUR] === utilisateur.nom);
    const envoyes = mesDec.filter((c) => c[C.STATUT] === "Refuse_valide").length;
    $("hero-kpis").innerHTML =
      hkpi("dossiers", "Ma file", maFile.length, maFile.length ? "refus à traiter" : "rien en attente", maFile.length ? "warn" : "ok") +
      hkpi("alerte", "Critères interdits", interdits, interdits ? "à annuler en priorité" : "aucun dans ma file", interdits ? "bad" : "ok") +
      hkpi("check", "Mes décisions", mesDec.length, "depuis le début", "") +
      hkpi("mail", "Motifs envoyés", envoyes + [...motifsEnvoyes].length, "candidats informés", "ok");
    rendreMaFile(maFile, mesDec);
    return;
  }

  $("hero-kpis").innerHTML =
    hkpi("dossiers", "Candidatures analysées", douzeMois.length, "sur les 12 derniers mois") +
    hkpi("taux", "Taux de refus automatique", `${pct(refus.length, decides.length)} %`, `${refus.length} refus par l'algorithme`, pct(refus.length, decides.length) > 50 ? "bad" : "") +
    hkpi("horloge", "Refus à revoir", attente.length, `dont ${attente.filter((c) => niveau(c[C.CRITERE]) === "interdit").length} sur un critère interdit`, attente.length ? "warn" : "ok") +
    hkpi("bouclier", "Score de conformité", `${score} %`, score >= 80 ? "conforme AI Act" : score >= 50 ? "à améliorer" : "insuffisant", score >= 80 ? "ok" : score >= 50 ? "warn" : "bad");

  // Courbe d'évolution
  const serie = serieMensuelle();
  dessiner("chart-tendance", {
    type: "line",
    data: {
      labels: serie.map((m) => m.label),
      datasets: [
        { label: "Refus conformes (légitimes ou corrigés)", data: serie.map((m) => pct(m.conformes, m.refus)), borderColor: COULEURS.indigo, backgroundColor: "rgba(91,76,240,0.12)", fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4, pointBackgroundColor: "#fff", pointBorderWidth: 2 },
        { label: "Refus sur critère à risque", data: serie.map((m) => pct(m.risque, m.refus)), borderColor: COULEURS.coral, backgroundColor: "transparent", tension: 0.4, borderWidth: 3, borderDash: [6, 5], pointRadius: 3, pointBackgroundColor: COULEURS.coral },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + " %" }, grid: { color: COULEURS.grille } }, x: { grid: { display: false } } },
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 16, font: { weight: "700" } } }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label} : ${ctx.raw} %` } } },
    },
  });

  // Jauge
  const couleur = score >= 80 ? COULEURS.ok : score >= 50 ? COULEURS.warn : COULEURS.bad;
  $("gauge").innerHTML = `
    <div class="gauge">
      <svg viewBox="0 0 240 132" aria-hidden="true">
        <path d="M 20 120 A 100 100 0 0 1 220 120" stroke="#edf0f7" stroke-width="22" fill="none" pathLength="100"/>
        ${score > 0 ? `<path d="M 20 120 A 100 100 0 0 1 220 120" stroke="${couleur}" stroke-width="22" fill="none" pathLength="100" stroke-dasharray="${score} 100"/>` : ""}
      </svg>
      <div class="gauge-center"><strong>${score} %</strong><span>moyenne des ${ctrl.liste.length} contrôles</span></div>
      <ul class="checks">${ctrl.liste.map((x) => `<li class="${x.ok ? "yes" : x.score >= 50 ? "part" : "no"}"><i>${x.ok ? "✓" : "!"}</i>${x.label}<b>${x.score} %</b></li>`).join("")}</ul>
    </div>`;

  donut("chart-donut-dash", douzeMois, (critere) => { filtres.critere = critere; location.hash = "#analyse"; rendreAnalyse(); });

  const taches = ctrl.liste.filter((x) => !x.ok).sort((a, b) => (a.type === "bad" ? -1 : 1) - (b.type === "bad" ? -1 : 1));
  $("task-list").innerHTML = taches.length
    ? taches.slice(0, 5).map((x) => `<li>${badge(x.type, x.type === "bad" ? "Critique" : "À traiter")}<div class="task-text"><strong>${x.titre} : ${x.n}</strong><span>${x.detail}</span></div>${voitVue(x.lien.slice(1)) ? `<a href="${x.lien}">Ouvrir</a>` : ""}</li>`).join("")
    : `<li>${badge("ok", "Conforme")}<div class="task-text"><strong>Aucune action requise</strong><span>Tous les contrôles sont réussis.</span></div></li>`;

  const tousRefus = all.filter(estRefusAlgo);
  const tauxCtrl = pct(tousRefus.filter(traiteHumain).length, tousRefus.length);
  $("dark-taux").textContent = `${tauxCtrl} %`;
  $("dark-text").textContent = `des refus automatiques ont été revus par un humain. ${attente.length} restent en attente.`;
  requestAnimationFrame(() => ($("dark-bar").style.width = tauxCtrl + "%"));
}

function rendreMaFile(maFile, mesDec) {
  const ordre = { interdit: 0, suspect: 1, legitime: 2 };
  const tri = [...maFile].sort((a, b) => ordre[niveau(a[C.CRITERE])] - ordre[niveau(b[C.CRITERE])]);
  $("ma-file").innerHTML = tri.length
    ? tri.slice(0, 7).map((c) => `
        <li>${avatar(c[C.NOM])}
          <div class="task-text"><strong>${esc(c[C.NOM])}</strong><span>${esc(c[C.POSTE])}, critère ${esc(c[C.CRITERE])}</span></div>
          ${badgeNiveau(c[C.CRITERE])}
          <button class="btn btn-soft btn-sm" onclick="ouvrirDecision('${esc(c[C.ID])}')">Décider</button>
        </li>`).join("")
    : `<li class="empty">Votre file est vide. Bravo.</li>`;
  $("mes-decisions").textContent = mesDec.length;
  const annules = mesDec.filter((c) => c[C.STATUT] === "Refuse_annule").length;
  $("mes-decisions-texte").textContent = `${annules} refus annulés et ${mesDec.length - annules} motifs envoyés. Chaque décision est tracée à votre nom.`;
  $("rappel-interdits").innerHTML = parametres.interdits.map((x) => badge("bad", esc(x))).join(" ") + " " + parametres.suspects.slice(0, 3).map((x) => badge("warn", esc(x))).join(" ");
}

// =========================================================
// Analyse des refus (filtres + graphiques cliquables)
// =========================================================
const filtres = { poste: "", periode: 12, biais: "tous", critere: "", recherche: "" };
let page = 1;
const PAR_PAGE = 12;

$("f-poste").addEventListener("change", (e) => { filtres.poste = e.target.value; page = 1; rendreAnalyse(); });
$("f-periode").addEventListener("change", (e) => { filtres.periode = +e.target.value; page = 1; rendreAnalyse(); });
document.querySelectorAll("#f-biais .chip").forEach((chip) => chip.addEventListener("click", () => {
  filtres.biais = chip.dataset.biais;
  document.querySelectorAll("#f-biais .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
  page = 1;
  rendreAnalyse();
}));

function filtrer(rows, ignorer = {}) {
  return rows.filter((c) => {
    if (filtres.periode) {
      const d = lireDate(c[C.RECU]);
      if (!d || (Date.now() - d) / 86400000 > filtres.periode * 30.5) return false;
    }
    if (!ignorer.poste && filtres.poste && c[C.POSTE] !== filtres.poste) return false;
    if (!ignorer.critere && filtres.critere && c[C.CRITERE] !== filtres.critere) return false;
    const n = niveau(c[C.CRITERE]);
    if (filtres.biais === "conforme" && (n === "interdit" || n === "suspect")) return false;
    if (filtres.biais === "suspect" && n !== "suspect") return false;
    if (filtres.biais === "interdit" && n !== "interdit") return false;
    if (filtres.recherche && !norm(`${c[C.ID]} ${c[C.NOM]} ${c[C.POSTE]}`).includes(filtres.recherche)) return false;
    return true;
  });
}

function rendreAnalyse() {
  const postes = [...new Set(donnees.candidatures.map((c) => c[C.POSTE]).filter(Boolean))].sort();
  const sel = $("f-poste");
  sel.innerHTML = `<option value="">Tous les postes</option>` + postes.map((p) => `<option${p === filtres.poste ? " selected" : ""}>${esc(p)}</option>`).join("");

  const pills = [];
  if (filtres.poste) pills.push(["poste", `Poste : ${filtres.poste}`]);
  if (filtres.critere) pills.push(["critere", `Critère : ${filtres.critere}`]);
  if (filtres.recherche) pills.push(["recherche", `Recherche : ${filtres.recherche}`]);
  $("active-filters").innerHTML = pills.map(([k, t]) => `<button class="filter-pill" onclick="retirerFiltre('${k}')">${esc(t)} <b>×</b></button>`).join("");

  const rows = filtrer(donnees.candidatures);
  const decides = rows.filter((c) => c[C.STATUT] !== "En_attente");
  const refus = decides.filter(estRefusAlgo);
  const biais = refus.filter((c) => niveau(c[C.CRITERE]) !== "legitime");
  const revus = refus.filter(traiteHumain);
  $("analyse-kpis").innerHTML = [
    ["", "dossiers", rows.length, "candidatures filtrées"],
    ["warn", "taux", `${pct(refus.length, decides.length)} %`, "de refus automatiques"],
    [biais.length ? "bad" : "ok", "alerte", biais.length, "refus sur critère à risque"],
    ["ok", "check", `${pct(revus.length, refus.length)} %`, "des refus revus par un humain"],
  ].map(([n, i, v, l]) => `<div class="mkpi ${n}"><span class="mkpi-icon">${ICONES[i]}</span><div><strong>${v}</strong><span>${l}</span></div></div>`).join("");

  // Barres par poste (le filtre poste est ignoré pour garder la comparaison)
  const stats = statsParPoste(filtrer(donnees.candidatures, { poste: true }));
  const min = stats.length ? Math.min(...stats.map((s) => s.taux)) : 0;
  const seuil = min + parametres.seuil;
  const ecart = stats.length ? Math.max(...stats.map((s) => s.taux)) - min : 0;
  const alerte = $("equity-alert");
  alerte.className = "badge " + (ecart > parametres.seuil ? "bad" : "ok");
  alerte.textContent = `Écart de ${ecart} points`;
  dessiner("chart-postes", {
    type: "bar",
    data: {
      labels: stats.map((s) => s.poste),
      datasets: [
        { type: "line", label: `Seuil d'alerte (${seuil} %)`, data: stats.map(() => seuil), borderColor: COULEURS.bad, borderDash: [6, 6], borderWidth: 2, pointRadius: 0 },
        {
          label: "Taux de refus", data: stats.map((s) => s.taux), borderRadius: 10, borderSkipped: false, maxBarThickness: 46,
          backgroundColor: stats.map((s) => (s.poste === filtres.poste ? COULEURS.ink : s.taux > seuil ? COULEURS.bad : s.taux >= seuil - 8 ? COULEURS.warn : COULEURS.indigo)),
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + " %" }, grid: { color: COULEURS.grille } }, x: { grid: { display: false }, ticks: { font: { weight: "700" }, maxRotation: 40, minRotation: 0 } } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ctx.datasetIndex === 1 ? ` ${ctx.raw} % de refus (${stats[ctx.dataIndex].refus} sur ${stats[ctx.dataIndex].total}), dont ${stats[ctx.dataIndex].biais} sur critère à risque` : ` ${ctx.dataset.label}` } },
      },
      onClick: (_, el) => { const b = el.find((x) => x.datasetIndex === 1); if (b) { filtres.poste = filtres.poste === stats[b.index].poste ? "" : stats[b.index].poste; page = 1; rendreAnalyse(); } },
      onHover: (e, el) => { e.native.target.style.cursor = el.length ? "pointer" : "default"; },
    },
  });

  donut("chart-donut", filtrer(donnees.candidatures, { critere: true }), (critere) => { filtres.critere = filtres.critere === critere ? "" : critere; page = 1; rendreAnalyse(); });
  rendreHeatmap(filtrer(donnees.candidatures, { poste: true, critere: true }));
  rendreTableCandidats(rows);
}

function retirerFiltre(k) {
  if (k === "recherche") { filtres.recherche = ""; $("recherche").value = ""; }
  else filtres[k] = "";
  page = 1;
  rendreAnalyse();
}

function rendreHeatmap(rows) {
  const refus = rows.filter(estRefusAlgo);
  const postes = [...new Set(refus.map((c) => c[C.POSTE]))].sort();
  const crits = [...new Set(refus.map((c) => c[C.CRITERE]))].sort((a, b) => ({ interdit: 0, suspect: 1, legitime: 2 }[niveau(a)] - { interdit: 0, suspect: 1, legitime: 2 }[niveau(b)]));
  if (!postes.length) { $("heatmap").innerHTML = `<p class="empty">Aucun refus pour ces filtres.</p>`; return; }
  const max = Math.max(1, ...postes.flatMap((p) => crits.map((k) => refus.filter((c) => c[C.POSTE] === p && c[C.CRITERE] === k).length)));
  const couleurCase = (k, n) => {
    const t = 0.18 + 0.82 * (n / max);
    const base = { interdit: "240,68,97", suspect: "247,144,9", legitime: "91,76,240" }[niveau(k)];
    return `background: rgba(${base},${t.toFixed(2)}); color: ${t > 0.55 ? "#fff" : "#101a3f"}`;
  };
  let html = `<div class="heatmap" style="grid-template-columns: 220px repeat(${crits.length}, 1fr)"><div></div>`;
  html += crits.map((k) => `<div class="hm-head">${esc(k)}</div>`).join("");
  postes.forEach((p) => {
    html += `<div class="hm-label">${esc(p)}</div>`;
    crits.forEach((k) => {
      const n = refus.filter((c) => c[C.POSTE] === p && c[C.CRITERE] === k).length;
      html += n
        ? `<button class="hm-cell" style="${couleurCase(k, n)}" title="${esc(p)}, ${esc(k)} : ${n} refus" onclick="filtrerCase('${esc(p)}','${esc(k)}')">${n}</button>`
        : `<div class="hm-cell zero"></div>`;
    });
  });
  $("heatmap").innerHTML = html + "</div>";
}
function filtrerCase(poste, critere) { filtres.poste = poste; filtres.critere = critere; page = 1; rendreAnalyse(); $("candidats-body").scrollIntoView({ behavior: "smooth", block: "center" }); }

function rendreTableCandidats(rows) {
  const tri = [...rows].sort((a, b) => (lireDate(b[C.RECU]) || 0) - (lireDate(a[C.RECU]) || 0));
  const pages = Math.max(1, Math.ceil(tri.length / PAR_PAGE));
  page = Math.min(page, pages);
  $("table-count").textContent = `${tri.length} candidatures correspondent aux filtres.`;
  $("candidats-body").innerHTML = tri.slice((page - 1) * PAR_PAGE, page * PAR_PAGE).map((c) => {
    const n = niveau(c[C.CRITERE]);
    const cls = c[C.STATUT] === "Refuse_auto" && n === "interdit" ? "row-bad" : c[C.STATUT] === "Refuse_auto" && n === "suspect" ? "row-warn" : "";
    return `<tr class="${cls}">
      <td>${personne(c[C.NOM], c[C.ID])}</td>
      <td>${esc(c[C.POSTE])}</td>
      <td class="muted">${fDate(c[C.RECU])}</td>
      <td>${badgeStatut(c[C.STATUT])}</td>
      <td>${c[C.CRITERE] ? `<span class="tag">${esc(c[C.CRITERE])}</span>` : `<span class="muted">-</span>`}</td>
      <td>${badgeNiveau(c[C.CRITERE])}</td>
      <td>${c[C.DECIDEUR] ? `${esc(c[C.DECIDEUR])}<br><small class="muted">${fDate(c[C.DATE_DEC])}</small>` : `<span class="muted">-</span>`}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" class="empty">Aucune candidature ne correspond à ces filtres.</td></tr>`;
  $("pager").innerHTML = `<span>Page ${page} sur ${pages}</span><div>
    <button class="btn btn-outline btn-sm" ${page <= 1 ? "disabled" : ""} onclick="changerPage(-1)">Précédent</button>
    <button class="btn btn-outline btn-sm" ${page >= pages ? "disabled" : ""} onclick="changerPage(1)">Suivant</button></div>`;
}
function changerPage(d) { page += d; rendreTableCandidats(filtrer(donnees.candidatures)); }

// =========================================================
// Règles de tri
// =========================================================
function rendreRegles() {
  const compte = { ok: 0, warn: 0, bad: 0, neutral: 0 };
  $("criteres-body").innerHTML = donnees.criteres.map((r) => {
    const ev = evaluerRegle(r);
    compte[ev.type]++;
    const risque = ev.active && ev.type !== "ok";
    const id = esc(r["0"]);
    return `<tr class="${ev.active && ev.type === "bad" ? "row-bad" : ev.active && ev.type === "warn" ? "row-warn" : ""}">
      <td class="id">${id}</td><td><strong>${esc(r["1"])}</strong></td><td class="muted">${esc(r["2"])}</td><td class="num">${esc(r["3"])}</td>
      <td>${badge(ev.type, ev.label)}</td><td class="muted">${fDate(r["5"])}</td>
      <td><div class="row-actions">${risque ? `<button class="btn btn-link" onclick="expliquerRegle('${id}')">Pourquoi ?</button>` : ""}${ev.active && voitVue("regles") && peut("desactiver") ? `<button class="btn ${risque ? "btn-danger" : "btn-outline"} btn-sm" onclick="desactiverRegle('${id}')">Désactiver</button>` : ""}</div></td>
    </tr>`;
  }).join("");
  $("regles-stats").innerHTML = [["ok", compte.ok, "Conformes"], ["warn", compte.warn, "À risque"], ["bad", compte.bad, "Interdites"], ["neutral", compte.neutral, "Désactivées"]]
    .map(([t, n, l]) => `<div class="stat ${t}"><b>${n}</b><span>${l}</span></div>`).join("");
  $("regles-count").textContent = `${donnees.criteres.length} règles, dont ${compte.warn + compte.bad} à risque encore actives.`;
  $("badge-regles").textContent = compte.warn + compte.bad || "";
}

function expliquerRegle(id) {
  const r = donnees.criteres.find((x) => String(x["0"]) === id);
  if (!r) return;
  const ev = evaluerRegle(r);
  ouvrirModale(`Règle « ${r["1"]} » : ${ev.label.toLowerCase()}`, `
    <div class="callout ${ev.type === "bad" ? "danger" : "warning"}"><strong>${ev.type === "bad" ? "Critère discriminatoire" : "Critère à justifier"}</strong>
    <p>${ev.type === "bad" ? "Cette règle s'appuie sur une caractéristique protégée (article L1132-1 du Code du travail). L'AI Act impose de corriger ce biais dans un système à haut risque." : "Cette règle peut désavantager indirectement certains profils. Elle n'est acceptable que si elle répond à une exigence réelle du poste."}</p></div>
    <dl class="detail-list"><dt>Règle</dt><dd>${esc(r["1"])}</dd><dt>Description</dt><dd>${esc(r["2"])}</dd><dt>Poids</dt><dd>${esc(r["3"])}</dd></dl>
    <p>Recommandation : désactiver la règle, puis revoir les refus déjà prononcés sur ce critère.</p>`,
    [{ texte: "Fermer", action: fermerModale }, ...(peut("desactiver") ? [{ texte: "Désactiver la règle", classe: "btn-primary", action: () => { fermerModale(); desactiverRegle(id); } }] : [])]);
}

function desactiverRegle(id) {
  if (!peut("desactiver")) return notifier("Action non autorisée pour votre rôle.", "bad");
  const r = donnees.criteres.find((x) => String(x["0"]) === id);
  ouvrirModale("Désactiver la règle", `<p>La règle <strong>${esc(r ? r["1"] : id)}</strong> ne sera plus appliquée par l'algorithme. Action enregistrée au nom de <strong>${esc(utilisateur.nom)}</strong>.</p>`, [
    { texte: "Annuler", action: fermerModale },
    { texte: "Désactiver", classe: "btn-primary", action: async (btn) => {
      btn.disabled = true;
      try {
        if (mode === "live" || parametres.envoisReels) await fetch(`${WEBHOOK_DESACTIVER_CRITERE}?id_critere=${encodeURIComponent(id)}`);
        if (r) { r["4"] = "Desactive"; r["5"] = aujourdhuiTexte(); }
        tracer("Règle désactivée", r ? r["1"] : id, "warn");
        fermerModale();
        notifier(`Règle « ${r ? r["1"] : id} » désactivée.`);
        rendreTout();
      } catch (e) { btn.disabled = false; notifier("La désactivation a échoué. Vérifiez le scénario Make.", "bad"); }
    } },
  ]);
}

// =========================================================
// File de revue et décisions
// =========================================================
let filtreRevue = "tous";
document.querySelectorAll("#review-chips .chip").forEach((chip) => chip.addEventListener("click", () => {
  filtreRevue = chip.dataset.filtre;
  document.querySelectorAll("#review-chips .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
  rendreRevue();
}));
$("f-recruteur").addEventListener("change", rendreRevue);

function fileVisible() {
  let rows = donnees.candidatures.filter(aRevoir);
  if (utilisateur.role === "recruteur") rows = rows.filter((c) => attribueA(c) === utilisateur.nom);
  const rec = $("f-recruteur").value;
  if (rec && utilisateur.role !== "recruteur") rows = rows.filter((c) => attribueA(c) === rec);
  if (filtres.recherche) rows = rows.filter((c) => norm(`${c[C.ID]} ${c[C.NOM]} ${c[C.POSTE]}`).includes(filtres.recherche));
  return rows;
}

function rendreRevue() {
  const recru = utilisateur.role === "recruteur";
  $("review-title").textContent = recru ? "Ma file de revue" : "File de revue";
  $("review-sub").textContent = recru
    ? "Les refus automatiques qui vous sont attribués. Annulez les refus injustes et informez les autres candidats."
    : "Chaque refus automatique doit être validé par une personne avant d'être communiqué au candidat.";
  const selRec = $("f-recruteur");
  const actuel = selRec.value;
  selRec.innerHTML = `<option value="">Toute l'équipe</option>` + recruteurs().map((r) => `<option${r.nom === actuel ? " selected" : ""}>${esc(r.nom)}</option>`).join("");

  const base = fileVisible();
  const ordre = { interdit: 0, suspect: 1, legitime: 2 };
  ["tous", "interdit", "suspect", "legitime"].forEach((k) => { $("chip-" + k).textContent = k === "tous" ? base.length : base.filter((c) => niveau(c[C.CRITERE]) === k).length; });
  const rows = base.filter((c) => filtreRevue === "tous" || niveau(c[C.CRITERE]) === filtreRevue).sort((a, b) => ordre[niveau(a[C.CRITERE])] - ordre[niveau(b[C.CRITERE])]);

  $("review-body").innerHTML = rows.map((c) => {
    const n = niveau(c[C.CRITERE]);
    return `<tr class="${n === "interdit" ? "row-bad" : n === "suspect" ? "row-warn" : ""}">
      <td>${personne(c[C.NOM], c[C.ID])}</td>
      <td>${esc(c[C.POSTE])}</td>
      <td>${badge(NIVEAUX[n]?.badge || "neutral", `${esc(c[C.CRITERE])}${n === "interdit" ? " : interdit" : n === "suspect" ? " : suspect" : ""}`)}</td>
      <td class="muted">${esc(c[C.MOTIF])}</td>
      <td>${esc(attribueA(c))}</td>
      <td><div class="row-actions"><button class="btn ${n === "interdit" ? "btn-primary" : "btn-outline"} btn-sm" onclick="ouvrirDecision('${esc(c[C.ID])}')"${verrou("decider")}>Décider</button></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="empty">${base.length ? "Aucun refus pour ce filtre." : "Aucun refus en attente de revue."}</td></tr>`;

  const decisions = donnees.candidatures.filter(traiteHumain).filter((c) => !recru || c[C.DECIDEUR] === utilisateur.nom)
    .sort((a, b) => (lireDate(b[C.DATE_DEC]) || 0) - (lireDate(a[C.DATE_DEC]) || 0));
  $("journal-title").textContent = recru ? "Mes décisions" : "Journal des décisions humaines";
  $("journal-body").innerHTML = decisions.slice(0, 25).map((c) => `<tr>
      <td>${personne(c[C.NOM], c[C.ID])}</td><td>${esc(c[C.POSTE])}</td><td><span class="tag">${esc(c[C.CRITERE])}</span></td>
      <td>${badgeStatut(c[C.STATUT])}</td><td><strong>${esc(c[C.DECIDEUR])}</strong></td><td class="muted">${fDate(c[C.DATE_DEC])}</td></tr>`).join("")
    || `<tr><td colspan="6" class="empty">Aucune décision enregistrée.</td></tr>`;

  $("badge-review").textContent = (recru ? donnees.candidatures.filter(aRevoir).filter((c) => attribueA(c) === utilisateur.nom) : donnees.candidatures.filter(aRevoir)).length || "";
}

// =========================================================
// Import d'un CV (analyse simulée dans le navigateur)
// Le site n'a pas de serveur : le contenu du fichier n'est pas lu.
// Un refus proposé entre dans la file de revue et attend une décision humaine.
// =========================================================
const CV_FORMATS = [".pdf", ".docx", ".doc"];
const CV_TAILLE_MAX = 10 * 1024 * 1024;
const zoneCV = $("drop-area");
const inputCV = $("cv-file-input");
const titreZoneCV = zoneCV.querySelector(".drop-title");
const sousZoneCV = zoneCV.querySelector(".drop-sub");
const titreZoneInitial = titreZoneCV.innerHTML;
const sousZoneInitial = sousZoneCV.textContent;
let cvChoisi = null;
let nomAuto = "";
// Champs Nom et Email du candidat, ajoutés au-dessus du choix du poste
const champsCandidat = document.createElement("div");
champsCandidat.className = "grid g-1-1";
champsCandidat.style.marginTop = "16px";
champsCandidat.innerHTML = `
  <label class="field"><span>Nom du candidat</span><input id="cv-nom" required placeholder="Rempli à partir du nom du fichier" /></label>
  <label class="field"><span>Email du candidat</span><input id="cv-email" type="email" required placeholder="prenom.nom@exemple.fr" /></label>`;
$("form-upload-cv").querySelector(".upload-options").before(champsCandidat);

function reinitialiserDepot() {
  cvChoisi = null;
  inputCV.value = "";
  titreZoneCV.innerHTML = titreZoneInitial;
  sousZoneCV.textContent = sousZoneInitial;
  zoneCV.classList.remove("has-file");
  $("cv-nom").value = "";
  $("cv-email").value = "";
  nomAuto = "";
}

function choisirCV(fichier) {
  if (!fichier) return;
  const point = fichier.name.lastIndexOf(".");
  const ext = point >= 0 ? fichier.name.slice(point).toLowerCase() : "";
  if (!CV_FORMATS.includes(ext)) { reinitialiserDepot(); return notifier("Format non accepté : choisissez un fichier PDF ou DOCX.", "bad"); }
  if (fichier.size > CV_TAILLE_MAX) { reinitialiserDepot(); return notifier("Fichier trop lourd : 10 Mo maximum.", "bad"); }
  cvChoisi = fichier;
  titreZoneCV.innerHTML = `<strong>${esc(fichier.name)}</strong>`;
  sousZoneCV.textContent = `${Math.max(1, Math.round(fichier.size / 1024))} Ko · cliquez pour choisir un autre fichier`;
  zoneCV.classList.add("has-file");
  // Propose un nom tiré du fichier, sans écraser un nom tapé à la main
  if (!$("cv-nom").value || $("cv-nom").value === nomAuto) { nomAuto = nomDepuisFichier(fichier.name); $("cv-nom").value = nomAuto; }
}

inputCV.addEventListener("change", (e) => choisirCV(e.target.files[0]));
["dragenter", "dragover"].forEach((t) => zoneCV.addEventListener(t, (e) => { e.preventDefault(); zoneCV.classList.add("is-dragover"); }));
["dragleave", "drop"].forEach((t) => zoneCV.addEventListener(t, (e) => { e.preventDefault(); zoneCV.classList.remove("is-dragover"); }));
zoneCV.addEventListener("drop", (e) => choisirCV(e.dataTransfer.files[0]));
// Si le fichier est lâché à côté de la zone, le navigateur ne doit pas l'ouvrir à la place du site
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

function nomDepuisFichier(nomFichier) {
  const base = nomFichier.replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ");
  const mots = base.split(/\s+/).filter((m) => m && !/^(cv|resume|curriculum|vitae|\d+)$/i.test(m));
  const nom = mots.map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()).join(" ");
  return nom || "Candidat importé";
}

function analyserCV(fichier, poste) {
  const graine = hash(`${fichier.name}|${fichier.size}|${poste}`);
  const score = 35 + (graine % 61); // entre 35 et 95
  // L'algorithme ne peut refuser que sur des critères qu'il utilise vraiment (règles désactivées exclues)
  const desactivees = donnees.criteres.filter((r) => !evaluerRegle(r).active).map((r) => norm(r["1"]));
  const refus = donnees.candidatures.filter((c) => estRefusAlgo(c) && !desactivees.includes(norm(c[C.CRITERE])));
  const memePoste = refus.filter((c) => c[C.POSTE] === poste);
  const source = memePoste.length ? memePoste : refus;
  const modele = source.length ? source[(graine >>> 3) % source.length] : null;
  return { score, refuse: score < 60 && !!modele, critere: modele ? modele[C.CRITERE] : "", motif: modele ? modele[C.MOTIF] : "" };
}

$("form-upload-cv").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!cvChoisi) return notifier("Choisissez d'abord un CV au format PDF ou DOCX.", "bad");
  const fichier = cvChoisi;
  const poste = $("cv-poste-target").value;
  const nom = $("cv-nom").value.trim() || nomDepuisFichier(fichier.name);
  const email = $("cv-email").value.trim();
  const btn = $("btn-process-cv");
  btn.disabled = true;
  btn.textContent = "Analyse en cours…";
  await new Promise((ok) => setTimeout(ok, 700));

  const r = analyserCV(fichier, poste);
  const auj = new Date();
  const suppression = new Date(auj);
  suppression.setFullYear(auj.getFullYear() + 2);
  const c = {
    [C.ID]: "IMP" + String(Date.now()).slice(-6),
    [C.NOM]: nom,
    [C.POSTE]: poste,
    [C.RECU]: auj.toLocaleDateString("fr-FR"),
    [C.SCORE]: r.score,
    [C.STATUT]: r.refuse ? "Refuse_auto" : "Accepte",
    [C.CRITERE]: r.refuse ? r.critere : "",
    [C.MOTIF]: r.refuse ? r.motif : "",
    [C.DECIDEUR]: "",
    [C.DATE_DEC]: "",
    [C.SUPPR]: suppression.toLocaleDateString("fr-FR"),
    [C.EMAIL]: email,
  };

  // Enregistrement dans Google Sheets via Make : le candidat existe alors partout,
  // et les décisions (annulation, envoi du motif par email) fonctionnent comme pour les autres.
  btn.textContent = "Enregistrement…";
  let enregistre = false;
  try {
    const champs = { id: c[C.ID], nom, poste, recu: c[C.RECU], score: r.score, statut: c[C.STATUT], critere: c[C.CRITERE], motif: c[C.MOTIF], suppr: c[C.SUPPR], email };
    const rep = await (await fetch(`${WEBHOOK_AJOUTER_CV}?${Object.entries(champs).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`)).text();
    enregistre = rep.includes("success");
  } catch (err) {
    console.error(err);
  }
  // Sans Make, le CV reste seulement dans cette page et ses décisions ne passent pas par Make
  if (!enregistre) c.importe = true;

  donnees.candidatures.unshift(c);
  tracer("CV importé", `${nom} (${c[C.ID]}), ${poste} : ${r.refuse ? "refus proposé, en attente de revue" : "accepté"}${enregistre ? ", enregistré dans Google Sheets" : ", non enregistré"}`);
  btn.disabled = false;
  btn.textContent = "Traiter et analyser le CV";
  reinitialiserDepot();
  rendreTout();

  afficherResultatCV(c, r, { fichier, nom, email, poste, enregistre });
});

// Fenêtre de résultat d'un CV : verdict, vérification des règles de tri, puis décision directe
function afficherResultatCV(c, r, ctx) {
  const n = r.refuse ? niveau(c[C.CRITERE]) : "";
  const crit = norm(c[C.CRITERE]);
  const correspond = (regle) => crit && (norm(regle["1"]).includes(crit) || crit.includes(norm(regle["1"])));
  const regles = donnees.criteres.filter((x) => x["1"]);
  const lignesRegles = regles.map((regle) => {
    const ev = evaluerRegle(regle);
    let resultat;
    if (!ev.active) resultat = `<span class="muted">Règle désactivée</span>`;
    else if (r.refuse && correspond(regle)) resultat = badge(n === "interdit" ? "bad" : n === "suspect" ? "warn" : "neutral", "✗ Bloquant");
    else resultat = badge("ok", "✓ Conforme");
    return `<tr${r.refuse && ev.active && correspond(regle) ? ' class="cv-bloquant"' : ""}><td>${esc(regle["1"])}</td><td>${badge(ev.type, ev.label)}</td><td>${resultat}</td></tr>`;
  });
  if (r.refuse && !regles.some(correspond)) {
    lignesRegles.push(`<tr class="cv-bloquant"><td>${esc(c[C.CRITERE])}</td><td>${badgeNiveau(c[C.CRITERE])}</td><td>${badge(n === "interdit" ? "bad" : n === "suspect" ? "warn" : "neutral", "✗ Bloquant")}</td></tr>`);
  }

  const verdict = !r.refuse
    ? { type: "ok", icone: "✓", titre: "Bon profil", texte: "L’algorithme retient ce CV : il passe à l’étape suivante du recrutement. Aucune décision n’est nécessaire." }
    : n === "interdit"
      ? { type: "bad", icone: "!", titre: "Refus proposé sur un critère interdit", texte: `L’algorithme veut refuser ce CV à cause de « ${esc(c[C.CRITERE])} ». Ce critère est interdit par l’article L1132-1 du Code du travail : ce refus ne peut pas être validé.` }
      : n === "suspect"
        ? { type: "warn", icone: "?", titre: "Refus proposé sur un critère suspect", texte: `L’algorithme veut refuser ce CV à cause de « ${esc(c[C.CRITERE])} ». Ce critère n’est acceptable que s’il est justifié par le poste.` }
        : { type: "neutral", icone: "i", titre: "Refus proposé sur un critère lié au poste", texte: `L’algorithme veut refuser ce CV à cause de « ${esc(c[C.CRITERE])} », un critère légitime. Un recruteur doit tout de même confirmer avant tout envoi.` };

  const peutDecider = peut("decider");
  let consigne = "";
  if (r.refuse && !peutDecider) consigne = `<div class="callout warning"><strong>Votre rôle ne permet pas de décider</strong><p>Le compte ${esc(ROLES[utilisateur.role].label)} ne prend pas de décision sur les candidatures, pour séparer les responsabilités. Connectez-vous avec un compte recruteur ou responsable recrutement pour traiter ce refus.</p></div>`;
  else if (n === "interdit") consigne = `<div class="callout danger"><strong>Action attendue : annuler le refus</strong><p>Le candidat sera retenu, et la décision enregistrée avec votre nom et la date.</p></div>`;
  else if (n === "suspect") consigne = `<div class="callout warning"><strong>Action attendue : vérifier le lien avec le poste</strong><p>Annulez le refus, ou validez-le avec un motif qui explique en quoi ce critère est nécessaire pour le poste.</p></div>`;
  else if (r.refuse) consigne = `<div class="callout info"><strong>Action attendue : confirmer ou annuler</strong><p>Validez le refus et envoyez un motif clair au candidat, ou annulez-le si vous n’êtes pas d’accord avec l’algorithme.</p></div>`;

  const stockage = ctx.enregistre
    ? `<p class="muted-p">Candidature enregistrée dans Google Sheets. Analyse simulée pour la démonstration : le contenu du fichier n’est pas lu.</p>`
    : `<div class="callout warning"><strong>Non enregistré dans Google Sheets</strong><p>Make n’a pas répondu : le CV reste visible jusqu’au rechargement de la page, et aucun email ne pourra être envoyé. Vérifiez que le scénario « ajouter-candidature » est actif.</p></div>`;

  const corps = `
    <div class="cv-verdict ${verdict.type}">
      <span class="cv-icon" aria-hidden="true">${verdict.icone}</span>
      <div><strong>${verdict.titre}</strong><p>${verdict.texte}</p></div>
    </div>
    <dl class="detail-list">
      <dt>Candidat</dt><dd>${esc(ctx.nom)} (${esc(c[C.ID])})</dd>
      <dt>Poste</dt><dd>${esc(ctx.poste)}</dd>
      <dt>Fichier</dt><dd>${esc(ctx.fichier.name)}</dd>
      <dt>Score de l’algorithme</dt><dd><span class="cv-score"><i class="${verdict.type}" style="width:${r.score}%"></i></span> ${r.score} / 100</dd>
    </dl>
    <h4 class="cv-titre">Vérification des règles de tri</h4>
    <div class="table-wrap cv-checks"><table>
      <thead><tr><th>Règle</th><th>Évaluation de la règle</th><th>Résultat pour ce CV</th></tr></thead>
      <tbody>${lignesRegles.join("") || `<tr><td colspan="3">Aucune règle de tri chargée.</td></tr>`}</tbody>
    </table></div>
    ${consigne}
    ${stockage}`;

  let boutons;
  if (!r.refuse) {
    boutons = voitVue("analyse") && utilisateur.role !== "recruteur"
      ? [{ texte: "Fermer", action: fermerModale }, { texte: "Voir la candidature", classe: "btn-primary", action: () => voirCandidat(c[C.ID], "analyse") }]
      : [{ texte: "Fermer", classe: "btn-primary", action: fermerModale }];
  } else if (!peutDecider) {
    boutons = [{ texte: "Fermer", action: fermerModale }, { texte: "Voir dans la file de revue", classe: "btn-primary", action: () => voirCandidat(c[C.ID], "review") }];
  } else if (n === "interdit") {
    boutons = [{ texte: "Plus tard", action: () => voirCandidat(c[C.ID], "review") }, { texte: "Annuler le refus", classe: "btn-primary", action: (b) => decider(c, "annuler", b) }];
  } else {
    boutons = [
      { texte: "Annuler le refus", classe: "btn-outline", action: (b) => decider(c, "annuler", b) },
      { texte: n === "suspect" ? "Valider avec un motif" : "Valider et envoyer le motif", classe: "btn-primary", action: () => ouvrirDecision(c[C.ID]) },
    ];
  }
  ouvrirModale(r.refuse ? `Analyse de ${ctx.nom} : refus proposé` : `Analyse de ${ctx.nom} : bon profil`, corps, boutons);
}

// Emmène vers le candidat qui vient d'être importé : la recherche l'isole, puis sa ligne est surlignée
function voirCandidat(id, vue) {
  fermerModale();
  location.hash = "#" + vue;
  const champ = $("recherche");
  champ.value = id;
  champ.dispatchEvent(new Event("input"));
  setTimeout(() => {
    const corps = $(vue === "review" ? "review-body" : "candidats-body");
    corps.scrollIntoView({ behavior: "smooth", block: "center" });
    const ligne = corps.querySelector("tr");
    if (ligne) ligne.classList.add("row-new");
  }, 200);
}

// Noms de pages plus clairs, sans modifier index.html
(() => {
  const renommer = (vue, texte) => {
    const lien = document.querySelector(`#nav a[data-view-link="${vue}"]`);
    if (lien) [...lien.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).forEach((n) => { n.textContent = texte; });
  };
  const page = (id, titre, intro) => {
    const s = $(id);
    if (!s) return;
    s.dataset.title = titre;
    const h1 = s.querySelector(".page-head h1"), p = s.querySelector(".page-head p");
    if (h1) h1.textContent = titre;
    if (p) p.textContent = intro;
  };
  renommer("rgpd", "Données et conservation");
  renommer("rapports", "Rapports");
  page("rgpd", "Données et conservation", "Deux vérifications exigées par le RGPD : l’outil de tri ne doit collecter aucune donnée interdite (âge, situation familiale, photo…), et chaque CV doit être supprimé 2 ans après sa réception.");
  page("rapports", "Rapports", "Trois documents prêts à partager : le rapport AI Act pour les autorités, le bilan d’équité pour la direction et le registre RGPD pour le délégué à la protection des données. Chacun s’ouvre dans un nouvel onglet et se télécharge en PDF.");
})();

// Lien vers le module statistique « Équité par groupe » (page séparée, données fictives)
(() => {
  const rgpd = document.querySelector('#nav a[data-view-link="rgpd"]');
  if (!rgpd) return;
  const lien = document.createElement("a");
  lien.href = "equite-groupes.html";
  lien.innerHTML = '<svg viewBox="0 0 20 20"><path d="M3 17h14M5 14V9M10 14V5M15 14v-3"/></svg>Équité par groupe';
  rgpd.before(lien);
})();

// Modèles de motif : jamais de critère discriminatoire dans le texte envoyé au candidat
const CONSEILS = {
  experience: "Nous vous encourageons à postuler de nouveau lorsque vous aurez acquis davantage d'expérience sur ce type de mission.",
  competences: "Une formation complémentaire sur ces compétences renforcerait votre candidature pour nos prochaines offres.",
  diplome: "D'autres postes de notre entreprise pourraient mieux correspondre à votre formation : n'hésitez pas à consulter nos offres.",
};
function genererMotif(c) {
  const n = niveau(c[C.CRITERE]);
  const cle = norm(c[C.CRITERE]);
  if (n === "legitime") {
    return `Après une étude attentive de votre candidature au poste de ${c[C.POSTE]}, nous ne sommes pas en mesure d'y donner une suite favorable. Le point déterminant a été le suivant : ${String(c[C.MOTIF] || "").toLowerCase()}. ${CONSEILS[cle] || ""} Nous vous remercions sincèrement pour l'intérêt que vous portez à notre entreprise.`.replace(/\s+/g, " ").trim();
  }
  return `Après une étude attentive de votre candidature au poste de ${c[C.POSTE]}, nous avons retenu des profils correspondant plus précisément aux exigences techniques du poste. Votre candidature reste dans notre vivier et nous vous contacterons si une offre correspond à votre parcours. Nous vous remercions pour l'intérêt que vous portez à notre entreprise.`;
}
function contientMotInterdit(texte) {
  const t = norm(texte);
  const mots = [...parametres.interdits, "enfant", "enceinte", "quartier", "domicile", "ans d'age", "trop age", "trop jeune", "senior"];
  return mots.find((m) => norm(m).length > 3 && t.includes(norm(m)));
}

function ouvrirDecision(id) {
  if (!peut("decider")) return notifier("Votre rôle ne permet pas de décider.", "bad");
  const c = donnees.candidatures.find((x) => x[C.ID] === id);
  if (!c) return;
  const n = niveau(c[C.CRITERE]);
  const avert = {
    interdit: `<div class="callout danger"><strong>Refus fondé sur un critère interdit</strong><p>« ${esc(c[C.CRITERE])} » est une caractéristique protégée. Ce refus doit être annulé : aucun motif ne peut être envoyé.</p></div>`,
    suspect: `<div class="callout warning"><strong>Critère suspect</strong><p>« ${esc(c[C.CRITERE])} » n'est acceptable que s'il est justifié par le poste. En cas de doute, annulez le refus.</p></div>`,
    legitime: `<div class="callout info"><strong>Critère légitime</strong><p>Vous pouvez confirmer le refus et informer le candidat avec un motif clair.</p></div>`,
  }[n];
  ouvrirModale(`Décision pour ${c[C.NOM]}`, `
    <dl class="detail-list">
      <dt>Candidat</dt><dd>${esc(c[C.NOM])} (${esc(c[C.ID])})</dd>
      <dt>Poste</dt><dd>${esc(c[C.POSTE])}</dd>
      <dt>Motif de l'algorithme</dt><dd>${esc(c[C.MOTIF])}</dd>
      <dt>Destinataire</dt><dd>${esc(c[C.EMAIL])}</dd>
      <dt>Décision prise par</dt><dd>${esc(utilisateur.nom)}</dd>
    </dl>
    ${avert}
    ${n === "interdit" ? "" : `
    <label class="field">
      <span class="row-between">Motif envoyé au candidat <button type="button" class="btn btn-soft btn-sm" id="btn-generer">Générer le motif</button></span>
      <textarea id="motif-texte" rows="6" maxlength="900">${esc(genererMotif(c))}</textarea>
    </label>
    <p>L'email commencera par « Bonjour ${esc(c[C.NOM])}, ». Le texte ne doit jamais mentionner l'âge, le domicile, la situation familiale ou l'origine.</p>`}`,
    [
      { texte: "Fermer", action: fermerModale },
      { texte: "Annuler le refus", classe: n === "interdit" ? "btn-primary" : "btn-outline", action: (b) => decider(c, "annuler", b) },
      ...(n === "interdit" ? [] : [{ texte: "Valider et envoyer le motif", classe: "btn-primary", action: (b) => decider(c, "envoyer", b) }]),
    ]);
  const gen = $("btn-generer");
  if (gen) gen.onclick = () => { $("motif-texte").value = genererMotif(c); notifier("Motif généré. Relisez-le avant l'envoi."); };
}

async function decider(c, action, btn) {
  if (!peut("decider")) return;
  const texte = action === "envoyer" ? $("motif-texte").value.trim() : "";
  if (action === "envoyer") {
    const mot = contientMotInterdit(texte);
    if (!texte) return notifier("Le motif est vide.", "bad");
    if (mot) return notifier(`Le motif mentionne « ${mot} », un critère interdit. Reformulez-le.`, "bad");
  }
  btn.disabled = true;
  btn.textContent = "Envoi…";
  // Un CV importé n'existe pas dans Google Sheets : sa décision reste dans le site
  const viaMake = !c.importe && (mode === "live" || parametres.envoisReels);
  try {
    if (viaMake) {
      const url = action === "annuler"
        ? `${WEBHOOK_ANNULER}?id_candidature=${encodeURIComponent(c[C.ID])}&rh_nom=${encodeURIComponent(utilisateur.nom)}`
        : `${WEBHOOK_ENVOYER_MOTIF}?id_candidature=${encodeURIComponent(c[C.ID])}&rh_nom=${encodeURIComponent(utilisateur.nom)}&motif_perso=${encodeURIComponent(esc(texte).replace(/\n/g, "<br>"))}`;
      const rep = await (await fetch(url)).text();
      if (action === "envoyer" && !rep.includes("success")) throw new Error(rep || "réponse vide");
    }
    c[C.STATUT] = action === "annuler" ? "Refuse_annule" : "Refuse_valide";
    c[C.DECIDEUR] = utilisateur.nom;
    c[C.DATE_DEC] = aujourdhuiTexte();
    if (action === "envoyer") motifsEnvoyes.add(c[C.ID]);
    tracer(action === "annuler" ? "Refus annulé" : "Motif envoyé", `${c[C.NOM]} (${c[C.ID]}), critère ${c[C.CRITERE]}`, action === "annuler" ? "ok" : "info");
    fermerModale();
    notifier(action === "annuler"
      ? `Refus de ${c[C.NOM]} annulé${viaMake ? " et enregistré dans Google Sheets" : " (simulation)"}.`
      : viaMake ? `Motif envoyé par email à ${c[C.EMAIL]}.` : `Motif de ${c[C.NOM]} validé (simulation : aucun email envoyé).`);
    rendreTout();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = action === "annuler" ? "Annuler le refus" : "Valider et envoyer le motif";
    notifier(`L'action a échoué : vérifiez que le scénario Make est actif et que ${c[C.ID]} existe dans Google Sheets.`, "bad");
    console.error(e);
  }
}

// =========================================================
// Charge des recruteurs
// =========================================================
function rendreEquipe() {
  const lignes = recruteurs().map((r) => {
    const attente = donnees.candidatures.filter(aRevoir).filter((c) => attribueA(c) === r.nom);
    const decisions = donnees.candidatures.filter((c) => c[C.DECIDEUR] === r.nom);
    const annules = decisions.filter((c) => c[C.STATUT] === "Refuse_annule").length;
    return { nom: r.nom, attente: attente.length, interdits: attente.filter((c) => niveau(c[C.CRITERE]) === "interdit").length, valides: decisions.length - annules, annules, taux: pct(annules, decisions.length) };
  });
  $("equipe-body").innerHTML = lignes.map((l) => `<tr>
    <td>${personne(l.nom, "Recruteur")}</td><td class="num"><strong>${l.attente}</strong></td>
    <td class="num">${l.interdits ? badge("bad", l.interdits) : "0"}</td><td class="num">${l.valides}</td><td class="num">${l.annules}</td>
    <td style="min-width:180px"><div class="row-between"><div class="dark-bar" style="flex:1;background:#edf0f7"><span style="width:${l.taux}%"></span></div><strong>${l.taux} %</strong></div></td>
  </tr>`).join("") || `<tr><td colspan="6" class="empty">Aucun recruteur actif.</td></tr>`;

  dessiner("chart-equipe", {
    type: "bar",
    data: {
      labels: lignes.map((l) => l.nom),
      datasets: [
        { label: "En attente", data: lignes.map((l) => l.attente), backgroundColor: COULEURS.coral, borderRadius: 8, maxBarThickness: 38 },
        { label: "Refus validés", data: lignes.map((l) => l.valides), backgroundColor: COULEURS.indigo, borderRadius: 8, maxBarThickness: 38 },
        { label: "Refus annulés", data: lignes.map((l) => l.annules), backgroundColor: COULEURS.indigo3, borderRadius: 8, maxBarThickness: 38 },
      ],
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: COULEURS.grille } }, x: { grid: { display: false }, ticks: { font: { weight: "700" } } } }, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 16 } } } },
  });

  const moy = lignes.length ? lignes.reduce((s, l) => s + l.attente, 0) / lignes.length : 0;
  const alertes = [];
  lignes.forEach((l) => {
    if (l.interdits) alertes.push(["bad", `${l.nom} a ${l.interdits} refus interdit(s) en attente`, "À annuler en priorité."]);
    if (l.attente > moy * 1.4 && l.attente > 2) alertes.push(["warn", `${l.nom} est surchargé(e)`, `${l.attente} refus en attente contre ${Math.round(moy)} en moyenne.`]);
  });
  $("equipe-alertes").innerHTML = alertes.length
    ? alertes.map(([t, a, b]) => `<li>${badge(t, t === "bad" ? "Critique" : "Charge")}<div class="task-text"><strong>${esc(a)}</strong><span>${esc(b)}</span></div></li>`).join("")
    : `<li>${badge("ok", "Équilibré")}<div class="task-text"><strong>Charge équilibrée</strong><span>Aucune alerte.</span></div></li>`;
}

// =========================================================
// RGPD et purge
// =========================================================
function rendreRGPD() {
  const expires = cvExpires();
  const proches = donnees.candidatures.filter((c) => { const j = joursRestants(c); return j !== null && j >= 0 && j <= parametres.alerteJours; });
  const interdites = donnees.rgpd.filter((r) => norm(r["2"]) === "interdit").length;
  $("rgpd-kpis").innerHTML = [
    ["", "dossiers", donnees.rgpd.length, "données extraites des CV"],
    [interdites ? "bad" : "ok", "alerte", interdites, "données interdites"],
    [expires.length ? "bad" : "ok", "horloge", expires.length, "CV à purger (plus de 2 ans)"],
    [proches.length ? "warn" : "ok", "bouclier", proches.length, `suppressions dans ${parametres.alerteJours} jours`],
  ].map(([n, i, v, l]) => `<div class="mkpi ${n}"><span class="mkpi-icon">${ICONES[i]}</span><div><strong>${v}</strong><span>${l}</span></div></div>`).join("");

  $("rgpd-body").innerHTML = donnees.rgpd.map((r) => {
    const interdit = norm(r["2"]) === "interdit";
    return `<tr class="${interdit ? "row-bad" : ""}"><td><strong>${esc(r["0"])}</strong></td><td>${esc(r["1"])}</td><td>${interdit ? badge("bad", "Interdite") : badge("ok", "Autorisée")}</td><td class="muted">${esc(r["3"])}</td></tr>`;
  }).join("");

  const liste = [...expires, ...proches].sort((a, b) => joursRestants(a) - joursRestants(b));
  $("retention-body").innerHTML = liste.map((c) => {
    const j = joursRestants(c);
    const ecoule = Math.min(100, Math.max(0, ((730 - j) / 730) * 100));
    return `<tr><td>${personne(c[C.NOM], c[C.ID])}</td><td>${fDate(c[C.SUPPR])}</td>
      <td style="min-width:150px"><div class="dark-bar" style="background:#edf0f7"><span style="width:${ecoule}%;background:${j < 0 ? COULEURS.bad : COULEURS.warn}"></span></div></td>
      <td>${j < 0 ? badge("bad", `Expiré depuis ${-j} j`) : badge("warn", `Dans ${j} j`)}</td></tr>`;
  }).join("") || `<tr><td colspan="4" class="empty">Aucun CV expiré ou proche de l'expiration.</td></tr>`;

  const btn = $("btn-purge");
  btn.hidden = !peut("purger");
  btn.disabled = !expires.length;
  btn.textContent = expires.length ? `Purger ${expires.length} CV expirés` : "Aucun CV à purger";
}

function lancerPurge() {
  const expires = cvExpires();
  if (!peut("purger") || !expires.length) return;
  ouvrirModale("Purger les CV expirés", `
    <div class="callout danger"><strong>Action irréversible</strong><p>Les données personnelles de ces ${expires.length} candidatures seront définitivement effacées.</p></div>
    <dl class="detail-list">${expires.map((c) => `<dt>${esc(c[C.ID])}</dt><dd>${esc(c[C.NOM])}, expiré le ${fDate(c[C.SUPPR])}</dd>`).join("")}</dl>
    <p>Base légale : RGPD, article 5.1.e (limitation de la conservation). Durée retenue : 2 ans.</p>`,
    [{ texte: "Annuler", action: fermerModale }, { texte: `Effacer ${expires.length} CV`, classe: "btn-danger", action: async (btn) => {
      btn.disabled = true;
      try {
        if (mode === "live") await fetch(WEBHOOK_PURGE);
        const ids = new Set(expires.map((c) => c[C.ID]));
        donnees.candidatures = donnees.candidatures.filter((c) => !ids.has(c[C.ID]));
        tracer("Purge RGPD", `${ids.size} CV effacés`, "warn");
        fermerModale();
        notifier(`${ids.size} CV effacés conformément au RGPD.`);
        if (mode === "live") setTimeout(async () => { await chargerDonnees(); rendreTout(); }, 4000);
        rendreTout();
      } catch (e) { btn.disabled = false; notifier("La purge a échoué. Vérifiez le scénario purge-cv.", "bad"); }
    } }]);
}

// =========================================================
// Rapports d'audit
// =========================================================
const RAPPORTS = [
  { id: "aiact", titre: "Rapport d'audit AI Act", texte: "Pour les autorités de contrôle : le système respecte-t-il les exigences d'un usage à haut risque ?", points: ["Verdict et classification du système", "Exigences des articles 9 à 14 et contrôles", "Traçabilité et actions recommandées"] },
  { id: "equite", titre: "Bilan d'équité", texte: "Pour le comité de direction : le tri est-il juste, où sont les écarts, que faut-il corriger ?", points: ["Verdict sur l'écart entre postes et entre femmes et hommes", "Critères qui provoquent les refus et taux d'annulation", "Tests statistiques et actions recommandées"] },
  { id: "rgpd", titre: "Registre RGPD", texte: "Pour le délégué à la protection des données : le traitement respecte-t-il le RGPD ?", points: ["Fiche du traitement et base légale", "Minimisation et conservation des CV", "Journal des purges et actions recommandées"] },
];
function rendreRapports() {
  $("rapports-grid").innerHTML = RAPPORTS.map((r) => `
    <article class="card report-card">
      <span class="report-icon">${ICONES.rapport}</span>
      <div><h2 style="font-size:19px;font-weight:800">${r.titre}</h2><p class="muted-p" style="margin:4px 0 0">${r.texte}</p></div>
      <ul>${r.points.map((p) => `<li>${p}</li>`).join("")}</ul>
      <button class="btn btn-primary" onclick="genererRapport('${r.id}')"${verrou("rapports")}>Ouvrir le rapport</button>
    </article>`).join("");
}

// =========================================================
// Statistiques et genre déduit du prénom (rapports, analyse des CV)
// =========================================================
function statLnGamma(z) {
  const g = 7, k = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - statLnGamma(1 - z);
  z -= 1; let x = k[0];
  for (let i = 1; i < g + 2; i++) x += k[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function statGammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 500; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - statLnGamma(a));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - statLnGamma(a)) * h;
}
// Test exact de Fisher bilatéral sur [[a, b], [c, d]]
function statFisher(a, b, c, d) {
  const lf = (n) => statLnGamma(n + 1);
  const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
  const proba = (x) => Math.exp(lf(r1) + lf(r2) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x));
  const pObs = proba(a);
  let p = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const px = proba(x); if (px <= pObs * (1 + 1e-7)) p += px; }
  return Math.min(1, p);
}
// Khi-deux d'indépendance sur un tableau 2 × 2, avec l'effectif attendu minimal
function statKhi2(a, b, c, d) {
  const n = a + b + c + d;
  const att = [(a + b) * (a + c) / n, (a + b) * (b + d) / n, (c + d) * (a + c) / n, (c + d) * (b + d) / n];
  const obs = [a, b, c, d];
  const chi2 = obs.reduce((s, o, i) => s + (att[i] ? (o - att[i]) ** 2 / att[i] : 0), 0);
  return { chi2, p: statGammaQ(0.5, chi2 / 2), minAttendu: Math.min(...att) };
}
function genreDuPrenom(nom) {
  const prenom = norm(String(nom || "").split(/\s+/)[0]);
  if (!prenom || EPICENES.has(prenom)) return "Indéterminé";
  if (FEMMES.has(prenom)) return "Femme";
  if (HOMMES.has(prenom)) return "Homme";
  const premier = prenom.split("-")[0];
  if (FEMMES.has(premier)) return "Femme";
  if (HOMMES.has(premier)) return "Homme";
  return "Indéterminé";
}
// Comparaison femmes et hommes, sur la décision de l'algorithme ou la décision finale
function equiteGenre(mode = "algo") {
  const dec = (s) => mode === "algo"
    ? (s === "Accepte" ? 1 : String(s).startsWith("Refuse") ? 0 : null)
    : (s === "Accepte" || s === "Refuse_annule" ? 1 : s === "Refuse_valide" ? 0 : null);
  const g = { Femme: { n: 0, k: 0 }, Homme: { n: 0, k: 0 } };
  let indetermines = 0;
  donnees.candidatures.forEach((c) => {
    const d = dec(c[C.STATUT]); if (d === null) return;
    const genre = genreDuPrenom(c[C.NOM]);
    if (!g[genre]) { indetermines++; return; }
    g[genre].n++; g[genre].k += d;
  });
  const f = g.Femme, h = g.Homme;
  if (!f.n || !h.n) return null;
  const tf = f.k / f.n, th = h.k / h.n;
  const khi = statKhi2(f.k, f.n - f.k, h.k, h.n - h.k);
  const pF = statFisher(f.k, f.n - f.k, h.k, h.n - h.k);
  const fisherRetenu = khi.minAttendu < 5;
  const p = fisherRetenu ? pF : khi.p;
  const ratio = Math.min(tf, th) / Math.max(tf, th || 1);
  const defavorise = tf < th ? "Femme" : "Homme";
  return { f, h, tf, th, ecart: Math.abs(tf - th) * 100, ratio, pF, khi, p, test: fisherRetenu ? "test exact de Fisher" : "khi-deux", indetermines, defavorise,
    etat: ratio < 0.8 && p < 0.05 ? "bad" : ratio < 0.8 || p < 0.05 ? "warn" : "ok" };
}
const fmtP = (p) => (p < 0.001 ? "< 0,001" : p.toLocaleString("fr-FR", { maximumFractionDigits: 3 }));

// ---------- Rapports : briques communes ----------
function prVerdict(type, titre, texte) {
  return `<div class="pr-verdict ${type}"><strong>${titre}</strong><p>${texte}</p></div>`;
}
function prActions(liste) {
  return `<h2>Actions recommandées</h2><ol class="pr-actions">${liste.map((a) => `<li>${a}</li>`).join("")}</ol>`;
}
function prBarre(valeur, max, type = "brand") {
  const w = max ? Math.round((valeur / max) * 100) : 0;
  return `<span class="pr-bar"><i class="${type}" style="width:${w}%"></i></span>`;
}

// ---------- Bilan d'équité : le tri est-il juste, où sont les écarts, que faire ? ----------
function corpsBilanEquite() {
  const stats = statsParPoste(donnees.candidatures);
  const total = stats.reduce((s, x) => s + x.total, 0);
  const refusTot = stats.reduce((s, x) => s + x.refus, 0);
  const tauxGlobal = pct(refusTot, total);
  const plus = stats[0];
  const moins = stats[stats.length - 1];
  const ecart = plus && moins ? plus.taux - moins.taux : 0;
  const limite = moins ? moins.taux + parametres.seuil : 0;
  const refus = donnees.candidatures.filter(estRefusAlgo);
  const aRisque = refus.filter((c) => niveau(c[C.CRITERE]) !== "legitime");

  const verdict = !stats.length
    ? prVerdict("neutral", "Données insuffisantes", "Aucune candidature exploitable pour calculer un bilan.")
    : ecart > parametres.seuil
      ? prVerdict("bad", `Alerte : écart de ${ecart} points entre les postes`, `Le poste « ${esc(plus.poste)} » est refusé à ${plus.taux} %, contre ${moins.taux} % pour « ${esc(moins.poste)} ». L’écart dépasse le seuil de ${parametres.seuil} points fixé dans les paramètres d’audit : les règles appliquées aux postes les plus refusés doivent être vérifiées.`)
      : prVerdict("ok", `Écart maîtrisé : ${ecart} points entre les postes`, `L’écart entre le poste le plus refusé et le moins refusé reste sous le seuil de ${parametres.seuil} points.`);

  const lignesPostes = stats.map((s) => {
    const diff = s.taux - tauxGlobal;
    const etat = s.taux > limite ? `<span class="pr-tag bad">Au-dessus du seuil</span>` : `<span class="pr-tag ok">Dans le seuil</span>`;
    return `<tr><td>${esc(s.poste)}</td><td class="num">${s.total}</td><td>${prBarre(s.taux, 100, s.taux > limite ? "bad" : "brand")} <b>${s.taux} %</b></td><td class="num">${diff > 0 ? "+" : ""}${diff} pts</td><td class="num">${s.biais} sur ${s.refus}</td><td>${etat}</td></tr>`;
  }).join("");

  // Critères qui provoquent les refus, et ce que les recruteurs en ont fait
  const parCritere = {};
  refus.forEach((c) => {
    const k = c[C.CRITERE];
    parCritere[k] = parCritere[k] || { critere: k, n: 0, annules: 0, valides: 0 };
    parCritere[k].n++;
    if (c[C.STATUT] === "Refuse_annule") parCritere[k].annules++;
    if (c[C.STATUT] === "Refuse_valide") parCritere[k].valides++;
  });
  const criteres = Object.values(parCritere).sort((a, b) => b.n - a.n);
  const maxN = criteres.length ? criteres[0].n : 0;
  const etiquette = { interdit: `<span class="pr-tag bad">Interdit</span>`, suspect: `<span class="pr-tag warn">Suspect</span>`, legitime: `<span class="pr-tag ok">Légitime</span>` };
  const lignesCriteres = criteres.slice(0, 8).map((x) => {
    const decides = x.annules + x.valides;
    return `<tr><td>${esc(x.critere)}</td><td>${etiquette[niveau(x.critere)]}</td><td>${prBarre(x.n, maxN, niveau(x.critere) === "interdit" ? "bad" : niveau(x.critere) === "suspect" ? "warn" : "brand")} <b>${x.n}</b></td><td class="num">${pct(x.n, refus.length)} %</td><td class="num">${decides ? `${pct(x.annules, decides)} %` : "-"}</td></tr>`;
  }).join("");

  const valides = refus.filter((c) => c[C.STATUT] === "Refuse_valide").length;
  const annules = refus.filter((c) => c[C.STATUT] === "Refuse_annule").length;
  const attente = refus.filter(aRevoir);
  const interditsAttente = attente.filter((c) => niveau(c[C.CRITERE]) === "interdit").length;

  const actions = [];
  donnees.criteres.filter((r) => { const e = evaluerRegle(r); return e.active && e.type === "bad"; })
    .forEach((r) => actions.push(`Désactiver la règle « ${esc(r["1"])} » : elle repose sur un critère interdit par l’article L1132-1 du Code du travail.`));
  stats.filter((s) => s.taux > limite).forEach((s) => actions.push(`Auditer les règles appliquées au poste « ${esc(s.poste)} » : ${s.taux} % de refus, soit ${s.taux - moins.taux} points de plus que le poste le moins refusé.`));
  if (interditsAttente) actions.push(`Traiter en priorité les ${interditsAttente} refus fondés sur un critère interdit encore en attente dans la file de revue.`);
  criteres.filter((x) => x.annules + x.valides >= 3 && pct(x.annules, x.annules + x.valides) >= 50)
    .forEach((x) => actions.push(`Revoir le critère « ${esc(x.critere)} » : les recruteurs annulent ${pct(x.annules, x.annules + x.valides)} % des refus qu’il provoque, signe qu’il écarte de bons profils.`));
  if (!actions.length) actions.push("Aucune action urgente. Refaire ce bilan chaque mois pour suivre l’évolution des écarts.");

  return `${verdict}
    <div class="pr-kpis">
      <div><b>${total}</b>candidatures analysées</div>
      <div><b>${tauxGlobal} %</b>taux de refus moyen</div>
      <div><b>${ecart} pts</b>écart maximal entre postes (seuil ${parametres.seuil})</div>
      <div><b>${pct(aRisque.length, refus.length)} %</b>des refus sur un critère interdit ou suspect</div>
    </div>
    <h2>Taux de refus par poste</h2>
    <p class="pr-note">Un poste est au-dessus du seuil quand son taux dépasse celui du poste le moins refusé de plus de ${parametres.seuil} points (limite actuelle : ${limite} %). L’écart à la moyenne compare chaque poste au taux moyen de ${tauxGlobal} %.</p>
    <table><tr><th>Poste</th><th class="num">Candidatures</th><th>Taux de refus</th><th class="num">Écart à la moyenne</th><th class="num">Refus à risque</th><th>État</th></tr>${lignesPostes}</table>
    <h2>Critères qui provoquent les refus</h2>
    <p class="pr-note">Le taux d’annulation indique la part des refus que les recruteurs ont annulés après relecture. Un taux élevé signale un critère qui écarte des candidats à tort.</p>
    <table><tr><th>Critère</th><th>Niveau</th><th>Refus provoqués</th><th class="num">Part des refus</th><th class="num">Taux d’annulation</th></tr>${lignesCriteres}</table>
    <h2>Effet du contrôle humain</h2>
    <table><tr><th>Refus automatiques</th><th class="num">Validés par un humain</th><th class="num">Annulés par un humain</th><th class="num">En attente</th><th class="num">Dont critère interdit</th></tr>
    <tr><td class="num">${refus.length}</td><td class="num">${valides}</td><td class="num">${annules}</td><td class="num">${attente.length}</td><td class="num">${interditsAttente}</td></tr></table>
    <p class="pr-note">Sans contrôle humain, les ${annules} refus annulés auraient été envoyés aux candidats.</p>
    ${prActions(actions)}`;
}

// ---------- Registre RGPD : fiche de traitement, minimisation, conservation, purges ----------
function corpsRegistreRGPD() {
  const registre = donnees.rgpd;
  const interdites = registre.filter((x) => norm(x["2"]) === "interdit");
  const expires = cvExpires();
  const proches = donnees.candidatures.filter((c) => { const j = joursRestants(c); return j !== null && j >= 0 && j <= parametres.alerteJours; });
  const sixMois = donnees.candidatures.filter((c) => { const j = joursRestants(c); return j !== null && j > parametres.alerteJours && j <= 183; });
  const sansDate = donnees.candidatures.filter((c) => joursRestants(c) === null);
  const attente = donnees.candidatures.filter(aRevoir);
  const purges = journal.filter((e) => e.evenement === "Purge RGPD").slice(0, 10);

  const problemes = [];
  if (interdites.length) problemes.push(`${interdites.length} donnée${interdites.length > 1 ? "s" : ""} interdite${interdites.length > 1 ? "s" : ""} encore collectée${interdites.length > 1 ? "s" : ""}`);
  if (expires.length) problemes.push(`${expires.length} CV conservé${expires.length > 1 ? "s" : ""} au-delà de 2 ans`);
  if (attente.length) problemes.push(`${attente.length} refus automatique${attente.length > 1 ? "s" : ""} sans décision humaine`);
  const verdict = problemes.length
    ? prVerdict("bad", "Points de non-conformité à corriger", `${problemes.join(", ")}.`)
    : prVerdict("ok", "Traitement conforme", "Aucune donnée interdite collectée, aucun CV conservé au-delà de 2 ans, aucun refus sans décision humaine.");

  const fiche = [
    ["Finalité", "Contrôler le tri automatique des candidatures, valider chaque refus par un humain et informer les candidats du motif."],
    ["Base légale", "Mesures précontractuelles prises à la demande du candidat (article 6.1.b du RGPD)."],
    ["Personnes concernées", "Candidats aux offres d’emploi ; recruteurs, pour la traçabilité des décisions."],
    ["Données traitées", registre.filter((x) => norm(x["2"]) !== "interdit").map((x) => esc(x["0"])).join(", ") || "-"],
    ["Destinataires", "Équipe RH habilitée, selon les droits de chaque rôle (recruteur, responsable recrutement, directeur RH)."],
    ["Durée de conservation", "2 ans après la réception du CV, puis suppression (recommandation de la CNIL pour les candidats non retenus)."],
    ["Décisions automatisées", "Aucun refus n’est communiqué sans décision humaine (article 22). Le candidat reçoit un motif clair."],
    ["Mesures de sécurité", "Accès par rôle, journal des décisions et de sécurité, purge journalisée, alerte avant suppression."],
  ].map(([k, v]) => `<tr><th class="pr-th-side">${k}</th><td>${v}</td></tr>`).join("");

  const lignesRegistre = registre.map((x) => {
    const interdit = norm(x["2"]) === "interdit";
    return `<tr><td>${esc(x["0"])}</td><td>${esc(x["1"])}</td><td>${interdit ? `<span class="pr-tag bad">Interdite</span>` : `<span class="pr-tag ok">Autorisée</span>`}</td><td>${esc(x["3"])}</td><td>${interdit ? "Cesser la collecte et effacer les valeurs existantes" : "Conserver"}</td></tr>`;
  }).join("");

  const lignesPurge = expires.slice(0, 15).map((c) => `<tr><td>${esc(c[C.ID])}</td><td>${esc(c[C.POSTE])}</td><td>${fDate(c[C.SUPPR])}</td><td class="num">${-joursRestants(c)} jours</td></tr>`).join("");
  const lignesJournal = purges.length
    ? purges.map((e) => `<tr><td>${new Date(e.date).toLocaleString("fr-FR")}</td><td>${esc(e.qui)}</td><td>${esc(e.detail)}</td></tr>`).join("")
    : `<tr><td colspan="3">Aucune purge enregistrée dans le journal de cette session.</td></tr>`;

  const actions = [];
  interdites.forEach((x) => actions.push(`Arrêter la collecte de « ${esc(x["0"])} » dans l’outil de tri et effacer les valeurs déjà enregistrées.`));
  if (expires.length) actions.push(`Lancer la purge des ${expires.length} CV expirés depuis la page Données et conservation.`);
  if (proches.length) actions.push(`Prévoir la suppression de ${proches.length} CV qui atteignent 2 ans dans les ${parametres.alerteJours} prochains jours.`);
  if (sansDate.length) actions.push(`Renseigner la date de suppression de ${sansDate.length} candidature${sansDate.length > 1 ? "s" : ""} qui n’en ont pas.`);
  if (attente.length) actions.push(`Faire relire par un recruteur les ${attente.length} refus en attente avant tout envoi au candidat.`);
  if (!actions.length) actions.push("Aucune action urgente. Vérifier ce registre à chaque modification de l’outil de tri.");

  return `${verdict}
    <div class="pr-kpis">
      <div><b>${registre.length}</b>données recensées</div>
      <div><b>${interdites.length}</b>données interdites collectées</div>
      <div><b>${expires.length}</b>CV à purger</div>
      <div><b>${proches.length}</b>suppressions dans ${parametres.alerteJours} jours</div>
    </div>
    <h2>Fiche du traitement</h2>
    <table class="pr-fiche">${fiche}</table>
    <h2>Minimisation : registre des données extraites des CV</h2>
    <table><tr><th>Donnée</th><th>Catégorie</th><th>Statut</th><th>Justification</th><th>Action</th></tr>${lignesRegistre}</table>
    <h2>Conservation des CV</h2>
    <table><tr><th>Expirés (à purger)</th><th>Suppression dans ${parametres.alerteJours} jours</th><th>Suppression dans 6 mois</th><th>Sans date de suppression</th></tr>
    <tr><td class="num">${expires.length}</td><td class="num">${proches.length}</td><td class="num">${sixMois.length}</td><td class="num">${sansDate.length}</td></tr></table>
    ${expires.length ? `<p class="pr-note">CV à purger, identifiés par leur seul numéro : le nom des candidats n’est pas repris dans ce registre, par minimisation.${expires.length > 15 ? ` Les 15 premiers sur ${expires.length}.` : ""}</p>
    <table><tr><th>Identifiant</th><th>Poste</th><th>Date de suppression prévue</th><th class="num">Retard</th></tr>${lignesPurge}</table>` : ""}
    <h2>Journal des purges</h2>
    <table><tr><th>Date</th><th>Par</th><th>Détail</th></tr>${lignesJournal}</table>
    ${prActions(actions)}`;
}

// ---------- Rapport AI Act : le système respecte-t-il les exigences d'un usage à haut risque ? ----------
function corpsRapportAIAct() {
  const ctrl = controles();
  const refus = donnees.candidatures.filter(estRefusAlgo);
  const revus = refus.filter(traiteHumain);
  const attente = donnees.candidatures.filter(aRevoir);
  const interditsAttente = attente.filter((c) => niveau(c[C.CRITERE]) === "interdit").length;
  const regles = donnees.criteres.map((r) => ({ r, ev: evaluerRegle(r) }));
  const actives = regles.filter((x) => x.ev.active);
  const interdites = actives.filter((x) => x.ev.type === "bad");
  const risque = actives.filter((x) => x.ev.type === "warn");
  const decisions = donnees.candidatures.filter(traiteHumain);
  const genre = equiteGenre("algo");

  const verdict = ctrl.score >= 80
    ? prVerdict("ok", `Conformité satisfaisante : score de ${ctrl.score} %`, "Les principales exigences d’un système à haut risque sont couvertes. Les points restants figurent dans les actions recommandées.")
    : ctrl.score >= 50
      ? prVerdict("warn", `Conformité partielle : score de ${ctrl.score} %`, `${ctrl.liste.filter((x) => !x.ok).length} contrôles sur ${ctrl.liste.length} ne sont pas entièrement réussis. Le système peut être utilisé sous supervision, mais les corrections doivent être planifiées.`)
      : prVerdict("bad", `Conformité insuffisante : score de ${ctrl.score} %`, "Plusieurs exigences essentielles ne sont pas respectées. Les refus automatiques ne devraient pas être communiqués avant correction.");

  const exigences = [
    ["Gestion des risques (article 9)", interdites.length ? `<span class="pr-tag bad">${interdites.length} règle${interdites.length > 1 ? "s" : ""} interdite${interdites.length > 1 ? "s" : ""} active${interdites.length > 1 ? "s" : ""}</span>` : `<span class="pr-tag ok">Aucune règle interdite active</span>`, `${actives.length} règles actives, dont ${risque.length} à risque à justifier.`],
    ["Données et biais (article 10)", genre ? `<span class="pr-tag ${genre.etat}">Ratio femmes-hommes ${fmtNombre(genre.ratio, 2)}</span>` : `<span class="pr-tag warn">Non mesuré</span>`, genre ? `Écart de ${fmtNombre(genre.ecart, 1)} points entre femmes et hommes, ${genre.test}, p-valeur ${fmtP(genre.p)}. Écart maximal entre postes : ${Math.round(ctrl.ecart)} points.` : "Pas assez de prénoms reconnus pour mesurer l’écart femmes-hommes."],
    ["Journalisation (article 12)", `<span class="pr-tag ok">${decisions.length} décisions tracées</span>`, "Chaque décision humaine est enregistrée avec son auteur et sa date ; le journal de sécurité trace les connexions, imports et purges."],
    ["Transparence (article 13)", `<span class="pr-tag ok">${regles.length} règles documentées</span>`, "Les règles de tri, leur poids et leur évaluation sont consultables ; chaque candidat refusé reçoit un motif clair."],
    ["Contrôle humain (article 14)", attente.length ? `<span class="pr-tag ${interditsAttente ? "bad" : "warn"}">${attente.length} refus en attente</span>` : `<span class="pr-tag ok">Tous les refus revus</span>`, `${pct(revus.length, refus.length)} % des ${refus.length} refus automatiques ont été revus par une personne${interditsAttente ? `, mais ${interditsAttente} refus sur critère interdit attendent encore une décision` : ""}.`],
  ].map(([e, etat, detail]) => `<tr><td><strong>${e}</strong></td><td>${etat}</td><td>${detail}</td></tr>`).join("");

  const lignesControles = ctrl.liste.map((x) => `<tr><td>${esc(x.label)}</td><td class="num">${x.score} %</td><td>${x.ok ? `<span class="pr-tag ok">Réussi</span>` : `<span class="pr-tag ${x.type === "bad" ? "bad" : "warn"}">À corriger</span>`}</td><td>${x.ok ? "-" : esc(x.detail)}</td></tr>`).join("");
  const lignesRegles = regles.map(({ r, ev }) => `<tr><td>${esc(r["1"])}</td><td class="num">${esc(r["3"])}</td><td><span class="pr-tag ${ev.type === "neutral" ? "ok" : ev.type}">${ev.label}</span></td><td>${!ev.active ? "Aucune, règle désactivée" : ev.type === "bad" ? "Désactiver immédiatement" : ev.type === "warn" ? "Justifier le lien avec le poste ou désactiver" : "Conserver"}</td></tr>`).join("");
  const lignesDecisions = decisions.slice(-15).reverse().map((c) => `<tr><td>${esc(c[C.ID])}</td><td>${esc(c[C.CRITERE])}</td><td>${STATUTS[c[C.STATUT]] ? STATUTS[c[C.STATUT]].label : esc(c[C.STATUT])}</td><td>${esc(c[C.DECIDEUR])}</td><td>${fDate(c[C.DATE_DEC])}</td></tr>`).join("") || `<tr><td colspan="5">Aucune décision humaine enregistrée.</td></tr>`;

  const actions = ctrl.liste.filter((x) => !x.ok).map((x) => `${esc(x.titre)} : ${esc(x.detail)}`);
  interdites.forEach((x) => actions.push(`Désactiver la règle « ${esc(x.r["1"])} », fondée sur un critère interdit.`));
  if (genre && genre.etat !== "ok") actions.push(`Analyser l’écart entre femmes et hommes (ratio ${fmtNombre(genre.ratio, 2)}) dans la page Équité par groupe.`);
  if (!actions.length) actions.push("Aucune action urgente. Refaire cet audit à chaque modification des règles de tri.");

  return `${verdict}
    <div class="pr-kpis">
      <div><b>${ctrl.score} %</b>score de conformité (moyenne de ${ctrl.liste.length} contrôles)</div>
      <div><b>${refus.length}</b>refus proposés par l’algorithme</div>
      <div><b>${pct(revus.length, refus.length)} %</b>des refus revus par un humain</div>
      <div><b>${attente.length}</b>refus en attente, dont ${interditsAttente} sur critère interdit</div>
    </div>
    <h2>Classification du système</h2>
    <table class="pr-fiche">
      <tr><th class="pr-th-side">Système contrôlé</th><td>Outil de tri automatique de CV, qui propose d’accepter ou de refuser chaque candidature.</td></tr>
      <tr><th class="pr-th-side">Catégorie AI Act</th><td>Système à haut risque : l’annexe III vise les systèmes destinés au recrutement, notamment pour analyser et filtrer les candidatures.</td></tr>
      <tr><th class="pr-th-side">Calendrier</th><td>Obligations des systèmes à haut risque applicables au 2 décembre 2027, après le report approuvé par le Parlement européen le 16 juin 2026.</td></tr>
      <tr><th class="pr-th-side">Rôle d’Equitera</th><td>Supervision humaine, traçabilité et surveillance des biais du système contrôlé.</td></tr>
    </table>
    <h2>Exigences et état actuel</h2>
    <table><tr><th>Exigence</th><th>État</th><th>Constat</th></tr>${exigences}</table>
    <h2>Contrôles de conformité</h2>
    <p class="pr-note">Le score de conformité est la moyenne de ces contrôles. C’est un indicateur interne de pilotage, pas une certification.</p>
    <table><tr><th>Contrôle</th><th class="num">Score</th><th>Résultat</th><th>Action</th></tr>${lignesControles}</table>
    <h2>Règles de tri appliquées par l’algorithme</h2>
    <table><tr><th>Règle</th><th class="num">Poids</th><th>Évaluation</th><th>Action</th></tr>${lignesRegles}</table>
    <h2>Traçabilité : dernières décisions humaines</h2>
    <p class="pr-note">Les candidats sont identifiés par leur seul numéro, par minimisation des données.</p>
    <table><tr><th>Candidature</th><th>Critère</th><th>Décision</th><th>Par</th><th>Date</th></tr>${lignesDecisions}</table>
    ${prActions(actions)}`;
}

// Bloc femmes-hommes ajouté au bilan d'équité
function blocEquiteGenre() {
  const a = equiteGenre("algo"), f = equiteGenre("finale");
  if (!a) return `<h2>Écart entre femmes et hommes</h2><p class="pr-note">Pas assez de prénoms reconnus pour comparer femmes et hommes.</p>`;
  const ligne = (x, lib) => x ? `<tr><td><strong>${lib}</strong></td><td class="num">${fmtNombre(x.tf * 100, 1)} % (n = ${x.f.n})</td><td class="num">${fmtNombre(x.th * 100, 1)} % (n = ${x.h.n})</td><td class="num">${fmtNombre(x.ecart, 1)} pts</td><td class="num">${fmtNombre(x.ratio, 2)}</td><td>${x.test}</td><td class="num">${fmtP(x.p)}</td><td><span class="pr-tag ${x.etat}">${x.etat === "bad" ? "Alerte" : x.etat === "warn" ? "À surveiller" : "Pas d’écart"}</span></td></tr>` : "";
  return `<h2>Écart entre femmes et hommes</h2>
    <p class="pr-note">Le genre n’est pas collecté : il est déduit du prénom, et ${a.indetermines} candidature${a.indetermines > 1 ? "s" : ""} au prénom épicène ou inconnu ${a.indetermines > 1 ? "sont exclues" : "est exclue"}. Alerte si le ratio d’impact est sous 0,8 (règle des quatre cinquièmes) et que l’écart est significatif au seuil de 5 %. Une alerte n’est pas une preuve de discrimination.</p>
    <table><tr><th>Décision</th><th class="num">Femmes retenues</th><th class="num">Hommes retenus</th><th class="num">Écart</th><th class="num">Ratio</th><th>Test</th><th class="num">p-valeur</th><th>État</th></tr>${ligne(a, "Algorithme seul")}${ligne(f, "Après revue humaine")}</table>
    <p class="pr-note">Analyse détaillée (intervalles de confiance, graphiques, comparaison par poste) : page Équité par groupe.</p>`;
}
const fmtNombre = (x, d) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Ouverture des rapports dans un nouvel onglet ----------
const LOGO_RAPPORT = `<svg width="190" height="52" viewBox="0 0 360 96" aria-label="Equitera"><defs><linearGradient id="rg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#5B4CF0"/><stop offset="1" stop-color="#9B8CFF"/></linearGradient></defs><g transform="translate(48 48)"><circle r="36" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="56 44" transform="rotate(-10)"/><circle r="36" fill="none" stroke="#101A3F" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="24 76" transform="rotate(-170)"/><circle r="18" fill="none" stroke="#101A3F" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="74 26" transform="rotate(35)"/><circle r="7.5" fill="#FF7A59"/></g><text x="104" y="54" font-family="Plus Jakarta Sans, sans-serif" font-size="46" font-weight="800" fill="#101A3F">equitera</text><text x="106" y="80" font-family="Plus Jakarta Sans, sans-serif" font-size="14.5" font-weight="700" fill="#5B4CF0" letter-spacing="3.2">HUMAN ETHICS AI</text></svg>`;
const CSS_RAPPORT = `
*{box-sizing:border-box}body{margin:0;background:#eef1fa;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#101a3f;-webkit-font-smoothing:antialiased}
.barre{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 24px;background:#101a3f;color:#fff;font-weight:700}
.barre button{padding:10px 18px;border:0;border-radius:12px;background:linear-gradient(135deg,#5b4cf0,#8b7cf8);color:#fff;font:inherit;font-weight:800;cursor:pointer}
.barre small{color:#aab1d6;font-weight:600}
.page{max-width:860px;margin:28px auto 60px;padding:40px 46px;background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(16,26,63,.08);font-size:14px;line-height:1.55}
.pr-head{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:3px solid #5b4cf0}
.pr-meta{text-align:right;font-size:12px;color:#5d6685}
h1{margin:20px 0 4px;font-size:28px;font-weight:800;letter-spacing:-.02em}
.pr-intro{margin:0;color:#5d6685}
h2{margin:26px 0 8px;font-size:17px;font-weight:800;break-after:avoid}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
th{padding:8px 10px;text-align:left;font-size:12px;font-weight:800;color:#5d6685;background:#f3f2ff;border-bottom:1px solid #d9dcf0}
td{padding:8px 10px;border-bottom:1px solid #e1e5f2;vertical-align:middle}
tr{break-inside:avoid}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}
.pr-kpis div{padding:12px;border-radius:12px;background:#f6f7fd;border:1px solid #e1e5f2;font-size:12px;color:#5d6685;line-height:1.35}
.pr-kpis b{display:block;margin-bottom:4px;font-size:22px;font-weight:800;color:#101a3f;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.pr-verdict{margin-top:18px;padding:14px 16px;border-radius:0 12px 12px 0;border-left:5px solid;break-inside:avoid}
.pr-verdict strong{display:block;font-size:16px}.pr-verdict p{margin:4px 0 0}
.pr-verdict.ok{border-color:#12a150;background:#e6f7ee}.pr-verdict.bad{border-color:#d92d48;background:#fdebee}
.pr-verdict.warn{border-color:#f79009;background:#fef3e2}.pr-verdict.neutral{border-color:#8c93ad;background:#f6f7fd}
.pr-tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:800;white-space:nowrap}
.pr-tag.ok{color:#12a150;background:#e6f7ee}.pr-tag.warn{color:#c26a00;background:#fef3e2}.pr-tag.bad{color:#d92d48;background:#fdebee}
.pr-bar{display:inline-block;width:64px;height:7px;margin-right:6px;border-radius:999px;background:#eef1fa;vertical-align:middle;overflow:hidden}
td:has(.pr-bar){white-space:nowrap}
.pr-bar i{display:block;height:100%;border-radius:999px;background:#5b4cf0}.pr-bar i.bad{background:#d92d48}.pr-bar i.warn{background:#f79009}
.pr-note{margin:6px 0 0;font-size:12px;color:#5d6685}
.pr-actions{margin:6px 0 0;padding-left:18px}.pr-actions li{margin-top:5px}
.pr-fiche .pr-th-side{width:28%;vertical-align:top}
.pr-sign{display:flex;justify-content:space-between;gap:20px;margin-top:30px;padding-top:12px;border-top:1px solid #e1e5f2;font-size:12px;color:#5d6685}
@media print{@page{size:A4;margin:14mm 12mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#fff}.barre{display:none}.page{margin:0;padding:0;max-width:none;box-shadow:none;border-radius:0;font-size:10.5pt}}
`;

function genererRapport(id) {
  if (!peut("rapports")) return;
  const r = RAPPORTS.find((x) => x.id === id);
  const corps = id === "aiact" ? corpsRapportAIAct() : id === "equite" ? corpsBilanEquite() + blocEquiteGenre() : corpsRegistreRGPD();
  const source = mode === "live" ? "Google Sheets, en temps réel" : "jeu de démonstration";
  const contenu = `<div class="pr-head">${LOGO_RAPPORT}<div class="pr-meta">Généré le ${new Date().toLocaleString("fr-FR")}<br>par ${esc(utilisateur.nom)}, ${ROLES[utilisateur.role].label}<br>Données : ${source}</div></div>
    <h1>${r.titre}</h1><p class="pr-intro">${r.texte}</p>${corps}
    <div class="pr-sign"><span>Document généré par Equitera, prototype universitaire de contrôle humain du recrutement automatisé. Données de démonstration.</span><span>Signature : ____________________</span></div>`;
  tracer("Rapport généré", r.titre, "info");
  const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${r.titre} - Equitera</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>${CSS_RAPPORT}</style></head><body>
    <div class="barre"><span>${r.titre} <small>· choisissez « Enregistrer au format PDF » dans la fenêtre d’impression</small></span><button type="button" onclick="window.print()">Télécharger en PDF</button></div>
    <main class="page">${contenu}</main></body></html>`;
  const onglet = window.open("", "_blank");
  if (onglet) {
    onglet.document.open();
    onglet.document.write(page);
    onglet.document.close();
    return;
  }
  // Fenêtres bloquées par le navigateur : impression directe du rapport depuis la page
  const el = $("print-report");
  el.innerHTML = contenu;
  document.body.classList.add("print-report-mode");
  window.print();
}

function exporterVue(vue) {
  if (!peut("exporter")) return;
  $(vue).classList.add("print-target");
  document.body.classList.add("print-view");
  tracer("Export PDF", vue, "info");
  window.print();
}
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-view", "print-report-mode");
  document.querySelectorAll(".print-target").forEach((s) => s.classList.remove("print-target"));
});

// =========================================================
// Administration : utilisateurs, sécurité, paramètres
// =========================================================
function sauverComptes() { ecrire("eq-comptes", comptes); }

function rendreUtilisateurs() {
  if (!peut("utilisateurs")) return;
  $("u-role").innerHTML = Object.entries(ROLES).map(([k, r]) => `<option value="${k}"${k === "recruteur" ? " selected" : ""}>${r.label}</option>`).join("");
  $("users-count").textContent = `${comptes.filter((c) => c.actif).length} comptes actifs sur ${comptes.length}.`;
  $("users-body").innerHTML = comptes.map((c) => {
    const soi = c.id === utilisateur.id;
    return `<tr>
      <td>${personne(c.nom, c.email)}</td>
      <td>${soi ? badge("brand", ROLES[c.role].label + " (vous)") : `<label class="field"><select onchange="changerRole('${c.id}', this.value)">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}"${k === c.role ? " selected" : ""}>${r.label}</option>`).join("")}</select></label>`}</td>
      <td>${c.actif ? badge("ok", "Actif") : badge("neutral", "Désactivé")}</td>
      <td><div class="row-actions">${soi ? "" : `<button class="btn btn-outline btn-sm" onclick="reinitialiserMdp('${c.id}')">Mot de passe</button><button class="btn ${c.actif ? "btn-danger" : "btn-outline"} btn-sm" onclick="basculerCompte('${c.id}')">${c.actif ? "Désactiver" : "Réactiver"}</button>`}</div></td>
    </tr>`;
  }).join("");
  $("matrix-head").innerHTML = `<tr><th>Action</th>${Object.values(ROLES).map((r) => `<th>${r.label.split(" ")[0]}</th>`).join("")}</tr>`;
  const vuesLabel = [["Vue d'ensemble", "dashboard"], ["Analyse des refus", "analyse"], ["Règles de tri", "regles"], ["File de revue", "review"], ["Charge des recruteurs", "equipe"], ["Données et conservation", "rgpd"], ["Rapports", "rapports"]];
  $("matrix-body").innerHTML =
    vuesLabel.map(([l, v]) => `<tr><td>Voir : ${l}</td>${Object.values(ROLES).map((r) => `<td>${r.vues.includes(v) ? '<span class="yes-txt">Oui</span>' : '<span class="no-txt">Non</span>'}</td>`).join("")}</tr>`).join("") +
    DROITS.map((d) => `<tr><td>${d.label}</td>${Object.keys(ROLES).map((k) => `<td>${d.roles.includes(k) ? '<span class="yes-txt">Oui</span>' : '<span class="no-txt">Non</span>'}</td>`).join("")}</tr>`).join("");
}

function adminsActifs() { return comptes.filter((c) => c.role === "admin" && c.actif).length; }
function changerRole(id, role) {
  const c = comptes.find((x) => x.id === id);
  if (!c || !peut("utilisateurs")) return;
  if (c.role === "admin" && role !== "admin" && adminsActifs() <= 1) { notifier("Il doit rester au moins un administrateur actif.", "bad"); return rendreUtilisateurs(); }
  tracer("Rôle modifié", `${c.nom} : ${ROLES[c.role].label} vers ${ROLES[role].label}`, "warn");
  c.role = role;
  sauverComptes();
  notifier(`${c.nom} est maintenant ${ROLES[role].label.toLowerCase()}.`);
  rendreTout();
}
function basculerCompte(id) {
  const c = comptes.find((x) => x.id === id);
  if (!c || !peut("utilisateurs")) return;
  if (c.actif && c.role === "admin" && adminsActifs() <= 1) return notifier("Impossible de désactiver le dernier administrateur.", "bad");
  c.actif = !c.actif;
  tracer(c.actif ? "Compte réactivé" : "Compte désactivé", c.email, "warn");
  sauverComptes();
  rendreTout();
}
function reinitialiserMdp(id) {
  const c = comptes.find((x) => x.id === id);
  if (!c) return;
  ouvrirModale(`Nouveau mot de passe pour ${c.nom}`, `
    <label class="field"><span>Mot de passe provisoire (8 caractères minimum)</span><input id="nouveau-mdp" type="password" minlength="8" /></label>
    <p>Communiquez-le à ${esc(c.nom)} par un canal sûr. Seule son empreinte chiffrée est conservée.</p>`,
    [{ texte: "Annuler", action: fermerModale }, { texte: "Enregistrer", classe: "btn-primary", action: async () => {
      const mdp = $("nouveau-mdp").value;
      if (mdp.length < 8) return notifier("8 caractères minimum.", "bad");
      c.empreinte = await empreinte(c.email, mdp);
      sauverComptes();
      tracer("Mot de passe réinitialisé", c.email, "warn");
      fermerModale();
      notifier(`Mot de passe de ${c.nom} mis à jour.`);
    } }]);
}
$("form-user").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!peut("utilisateurs")) return;
  const nom = $("u-nom").value.trim(), email = $("u-email").value.trim().toLowerCase(), role = $("u-role").value, mdp = $("u-mdp").value;
  if (comptes.some((c) => c.email.toLowerCase() === email)) return notifier("Un compte utilise déjà cet email.", "bad");
  if (mdp.length < 8) return notifier("Le mot de passe doit contenir 8 caractères minimum.", "bad");
  comptes.push({ id: "u" + Date.now(), nom, email, role, poste: ROLES[role].label, actif: true, empreinte: await empreinte(email, mdp) });
  sauverComptes();
  tracer("Compte créé", `${nom} (${ROLES[role].label})`, "info");
  e.target.reset();
  notifier(`Compte de ${nom} créé.`);
  rendreTout();
});

function rendreSecurite() {
  if (!peut("securite")) return;
  const auj = new Date().toDateString();
  const duJour = journal.filter((j) => new Date(j.date).toDateString() === auj);
  $("securite-kpis").innerHTML = [
    ["ok", "check", duJour.filter((j) => j.evenement === "Connexion").length, "connexions aujourd'hui"],
    ["warn", "alerte", duJour.filter((j) => j.evenement === "Échec de connexion").length, "échecs aujourd'hui"],
    ["bad", "bouclier", journal.filter((j) => j.evenement === "Compte verrouillé").length, "verrouillages"],
    ["", "dossiers", journal.length, "événements enregistrés"],
  ].map(([n, i, v, l]) => `<div class="mkpi ${n}"><span class="mkpi-icon">${ICONES[i]}</span><div><strong>${v}</strong><span>${l}</span></div></div>`).join("");
  const nv = { ok: ["ok", "Normal"], info: ["brand", "Info"], warn: ["warn", "Attention"], bad: ["bad", "Critique"] };
  $("journal-securite").innerHTML = journal.slice(0, 80).map((j) => `<tr><td class="muted">${new Date(j.date).toLocaleString("fr-FR")}</td><td><strong>${esc(j.qui)}</strong></td><td>${esc(j.evenement)}</td><td class="muted">${esc(j.detail)}</td><td>${badge(...(nv[j.niveau] || nv.info))}</td></tr>`).join("")
    || `<tr><td colspan="5" class="empty">Journal vide.</td></tr>`;
}
function viderJournal() {
  ouvrirModale("Vider le journal", "<p>Tous les événements de sécurité seront supprimés. Un nouvel événement tracera cette action.</p>", [
    { texte: "Annuler", action: fermerModale },
    { texte: "Vider", classe: "btn-danger", action: () => { journal = []; tracer("Journal vidé", "", "warn"); fermerModale(); rendreSecurite(); } },
  ]);
}

function rendreParametres() {
  if (!peut("parametres")) return;
  const editeur = (id, cle) => {
    $(id).innerHTML = parametres[cle].map((x, i) => `
        <span class="tag tag-edit ${cle === "interdits" ? "bad" : "warn"}">
          <button type="button" class="tag-link" title="Voir les refus sur ce critère" onclick="voirCritere(${i}, '${cle}')">${esc(x)}</button>
          <button type="button" class="tag-x" aria-label="Retirer ${esc(x)}" title="Retirer ce critère" onclick="retirerCritere('${cle}', ${i})">×</button>
        </span>`).join("")
      + `<input id="ajout-${cle}" placeholder="Ajouter un critère puis Entrée" onkeydown="if(event.key==='Enter'){event.preventDefault();ajouterCritere('${cle}', this.value)}" />`;
  };
  editeur("edit-interdits", "interdits");
  editeur("edit-suspects", "suspects");
  $("p-seuil").value = parametres.seuil;
  $("p-alerte").value = parametres.alerteJours;
  $("p-envois").checked = !!parametres.envoisReels;
}
function sauverParametres(detail) { ecrire("eq-parametres", parametres); tracer("Paramètres modifiés", detail, "warn"); rendreTout(); }
const LIBELLE_LISTE = { interdits: "critères interdits", suspects: "critères suspects" };
function ajouterCritere(cle, valeur) {
  const v = valeur.trim();
  if (!v) return;
  if ([...parametres.interdits, ...parametres.suspects].some((x) => norm(x) === norm(v))) return notifier(`« ${v} » figure déjà dans les listes.`, "bad");
  parametres[cle].push(v);
  sauverParametres(`Ajout de « ${v} » (${LIBELLE_LISTE[cle]})`);
  notifier(`« ${v} » ajouté aux ${LIBELLE_LISTE[cle]}. Les tableaux de bord sont recalculés.`);
  setTimeout(() => $("ajout-" + cle)?.focus(), 50);
}
function retirerCritere(cle, i) {
  const v = parametres[cle][i];
  parametres[cle].splice(i, 1);
  sauverParametres(`Retrait de « ${v} » (${LIBELLE_LISTE[cle]})`);
  notifier(`« ${v} » retiré des ${LIBELLE_LISTE[cle]}. Il sera désormais considéré comme légitime.`);
}
function voirCritere(i, cle) {
  const v = parametres[cle][i];
  const valeur = [...new Set(donnees.candidatures.map((c) => c[C.CRITERE]).filter(Boolean))].find((x) => norm(x) === norm(v));
  if (!valeur) return notifier(`Aucun refus fondé sur « ${v} » dans les données actuelles.`);
  filtres.critere = valeur; filtres.poste = ""; filtres.biais = "tous"; page = 1;
  document.querySelectorAll("#f-biais .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.biais === "tous"));
  location.hash = "#analyse";
  rendreAnalyse();
}
$("p-envois").addEventListener("change", (e) => {
  parametres.envoisReels = e.target.checked;
  sauverParametres(`Envois réels vers Make : ${e.target.checked ? "activés" : "désactivés"}`);
  notifier(e.target.checked ? "Les décisions seront envoyées à Make : les emails partiront vraiment." : "Les décisions seront simulées : aucun email ne partira.");
});
$("form-seuils").addEventListener("submit", (e) => {
  e.preventDefault();
  parametres.seuil = Math.min(60, Math.max(5, +$("p-seuil").value || 20));
  parametres.alerteJours = Math.min(180, Math.max(7, +$("p-alerte").value || 90));
  sauverParametres(`Seuil ${parametres.seuil} points, alerte ${parametres.alerteJours} jours`);
  notifier("Paramètres enregistrés.");
});
function reinitialiser() {
  ouvrirModale("Réinitialiser", "<p>Les paramètres d'audit et les comptes reviendront à leur état de démonstration. Vous serez déconnecté.</p>", [
    { texte: "Annuler", action: fermerModale },
    { texte: "Réinitialiser", classe: "btn-danger", action: () => {
      comptes = structuredClone(COMPTES_DEFAUT); parametres = { ...PARAMETRES_DEFAUT };
      sauverComptes(); ecrire("eq-parametres", parametres); tracer("Réinitialisation", "Paramètres et comptes", "warn");
      fermerModale(); deconnecter();
    } },
  ]);
}

// =========================================================
// Recherche, synthèse et rendu global
// =========================================================
$("recherche").addEventListener("input", (e) => {
  filtres.recherche = norm(e.target.value);
  const cible = voitVue("analyse") && utilisateur.role !== "recruteur" ? "#analyse" : "#review";
  if (filtres.recherche && location.hash !== cible && location.hash !== "#review") location.hash = cible;
  page = 1;
  rendreAnalyse();
  rendreRevue();
});

// =========================================================
// Notifications (adaptées au rôle)
// =========================================================
const ICONE_NIVEAU = { bad: ICONES.alerte, warn: ICONES.horloge, info: ICONES.personne, ok: ICONES.check };
function cleLues() { return "eq-notifs-lues-" + (utilisateur ? utilisateur.id : ""); }

function notifications() {
  const liste = [];
  const ctrl = controles();
  const r = utilisateur.role;

  if (r === "recruteur") {
    const maFile = donnees.candidatures.filter(aRevoir).filter((c) => attribueA(c) === utilisateur.nom);
    const interdits = maFile.filter((c) => niveau(c[C.CRITERE]) === "interdit");
    interdits.slice(0, 6).forEach((c) => liste.push({ id: "int-" + c[C.ID], type: "bad", titre: `${c[C.NOM]} : refus sur critère interdit`, detail: `${c[C.POSTE]}, critère ${c[C.CRITERE]}. Ce refus doit être annulé.`, lien: "#review", action: () => ouvrirDecision(c[C.ID]) }));
    if (maFile.length) liste.push({ id: "file-" + maFile.length, type: "warn", titre: `${maFile.length} refus dans votre file`, detail: "Chaque candidat attend une décision humaine.", lien: "#review" });
  } else {
    ctrl.liste.filter((x) => !x.ok && voitVue(x.lien.slice(1))).forEach((x) =>
      liste.push({ id: `ctrl-${x.titre}-${x.n}`, type: x.type, titre: `${x.titre} : ${x.n}`, detail: x.detail, lien: x.lien }));
    if (r === "responsable") {
      recruteurs().forEach((rec) => {
        const n = donnees.candidatures.filter(aRevoir).filter((c) => attribueA(c) === rec.nom && niveau(c[C.CRITERE]) === "interdit").length;
        if (n) liste.push({ id: `rec-${rec.nom}-${n}`, type: "warn", titre: `${rec.nom} : ${n} refus interdits en attente`, detail: "Vérifiez la charge de ce recruteur.", lien: "#equipe" });
      });
    }
    if (r === "admin") {
      const auj = new Date().toDateString();
      const echecs = journal.filter((j) => j.evenement === "Échec de connexion" && new Date(j.date).toDateString() === auj).length;
      const verrous = journal.filter((j) => j.evenement === "Compte verrouillé" && new Date(j.date).toDateString() === auj).length;
      if (verrous) liste.push({ id: `verrou-${auj}-${verrous}`, type: "bad", titre: `${verrous} compte(s) verrouillé(s) aujourd'hui`, detail: "Trop de tentatives de connexion échouées.", lien: "#securite" });
      if (echecs) liste.push({ id: `echec-${auj}-${echecs}`, type: "warn", titre: `${echecs} échec(s) de connexion aujourd'hui`, detail: "Consultez le journal de sécurité.", lien: "#securite" });
    }
    if (r === "directeur" && ctrl.score < 80) liste.push({ id: `score-${ctrl.score}`, type: "info", titre: `Score de conformité : ${ctrl.score} %`, detail: "Générez un rapport d'audit pour suivre les corrections.", lien: "#rapports" });
  }
  const ordre = { bad: 0, warn: 1, info: 2, ok: 3 };
  return liste.sort((a, b) => ordre[a.type] - ordre[b.type]);
}

function rendreNotifications() {
  const liste = notifications();
  const lues = new Set(lire(cleLues(), []));
  const nonLues = liste.filter((n) => !lues.has(n.id)).length;
  $("bell-count").textContent = nonLues || "";
  $("notif-sub").textContent = liste.length ? `${nonLues} non lue${nonLues > 1 ? "s" : ""} sur ${liste.length}` : "Tout est à jour";
  $("notif-list").innerHTML = liste.length
    ? liste.map((n, i) => `
      <li><button class="notif-item${lues.has(n.id) ? "" : " unread"}" type="button" data-i="${i}">
        <span class="notif-dot ${n.type}">${ICONE_NIVEAU[n.type]}</span>
        <span class="notif-text"><strong>${esc(n.titre)}</strong><span>${esc(n.detail)}</span><small>Ouvrir</small></span>
        ${lues.has(n.id) ? "" : '<span class="notif-new" aria-label="Non lue"></span>'}
      </button></li>`).join("")
    : `<li class="empty">Aucune alerte. Tout est conforme.</li>`;
  $("notif-list").querySelectorAll(".notif-item").forEach((b) => b.addEventListener("click", () => {
    const n = liste[+b.dataset.i];
    marquerLues([n.id]);
    fermerNotifications();
    location.hash = n.lien;
    if (n.action) setTimeout(n.action, 150);
  }));
}
function marquerLues(ids) {
  const lues = new Set(lire(cleLues(), []));
  ids.forEach((id) => lues.add(id));
  ecrire(cleLues(), [...lues].slice(-300));
  rendreNotifications();
}
function ouvrirNotifications() {
  rendreNotifications();
  $("notif-panel").hidden = false;
  $("bell-btn").setAttribute("aria-expanded", "true");
}
function fermerNotifications() {
  $("notif-panel").hidden = true;
  $("bell-btn").setAttribute("aria-expanded", "false");
}
$("bell-btn").addEventListener("click", (e) => { e.stopPropagation(); $("notif-panel").hidden ? ouvrirNotifications() : fermerNotifications(); });
$("notif-lu").addEventListener("click", () => marquerLues(notifications().map((n) => n.id)));
document.addEventListener("click", (e) => { if (!$("notif-panel").hidden && !e.target.closest(".notif-wrap")) fermerNotifications(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerNotifications(); });

function majStatutGlobal() {
  const ctrl = controles();
  const critiques = ctrl.liste.filter((x) => !x.ok && x.type === "bad").length;
  const vigilance = ctrl.liste.filter((x) => !x.ok).length;
  const s = $("compliance-status");
  s.className = "status-pill " + (critiques ? "bad" : vigilance ? "warn" : "ok");
  s.textContent = critiques ? "Non-conformités à corriger" : vigilance ? "Points de vigilance" : "Conforme AI Act et RGPD";
  rendreNotifications();
}

function rendreTout() {
  if (!utilisateur) return;
  appliquerRole();
  majStatutGlobal();
  rendreDashboard();
  if (voitVue("analyse")) rendreAnalyse();
  if (voitVue("regles")) rendreRegles();
  if (voitVue("review")) rendreRevue();
  if (voitVue("equipe")) rendreEquipe();
  if (voitVue("rgpd")) rendreRGPD();
  if (voitVue("rapports")) rendreRapports();
  if (voitVue("utilisateurs")) rendreUtilisateurs();
  if (voitVue("securite")) rendreSecurite();
  if (voitVue("parametres")) rendreParametres();
}

// Fonctions appelées depuis le HTML
Object.assign(window, {
  deconnecter, fermerModale, ouvrirDecision, expliquerRegle, desactiverRegle, lancerPurge, genererRapport, exporterVue,
  retirerFiltre, filtrerCase, changerPage, changerRole, basculerCompte, reinitialiserMdp, viderJournal,
  ajouterCritere, retirerCritere, voirCritere, reinitialiser,
});

// =========================================================
// Démarrage
// =========================================================
(async function demarrer() {
  await chargerDonnees();
  if (utilisateur) demarrerSession();
  else afficherConnexion();
})();
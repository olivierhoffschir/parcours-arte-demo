/**
 * synchro.js — mise en ligne du prototype, à la demande.
 *
 * Enregistrer écrit le contenu sur le dépôt ; le prototype public, lui, doit être
 * reconstruit pour que les modifications s'y voient. Ce n'est pas une lourdeur
 * gratuite : les brouillons vivent dans le dépôt privé, et c'est la construction
 * qui écarte tout ce qui n'est pas publié. Écrire un fichier ne peut donc pas
 * suffire à mettre en ligne.
 *
 * Le compteur de modifications en attente n'a aucun état à stocker : il se déduit
 * de l'écart entre le dernier passage réussi du workflow et l'état de la branche.
 */

import { lireJeton } from './github.js';
import { DEPOT } from './sources-contenu.js';

const API = 'https://api.github.com';
const WORKFLOW = 'publish.yml';

function entetes() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${lireJeton()}`,
  };
}

function base() {
  return `${API}/repos/${DEPOT.proprietaire}/${DEPOT.nom}`;
}

/**
 * Le dernier passage réussi, et ce qui a changé depuis dans le contenu.
 *
 * On compare le commit publié à la tête de la branche, en ne comptant que les
 * fichiers du dossier de contenu : un commit qui ne touche que du code ne compte
 * pas comme une modification éditoriale en attente.
 */
export async function etatSynchro() {
  if (!lireJeton()) return { possible: false, raison: 'aucun jeton d’accès' };

  const rRuns = await fetch(
    `${base()}/actions/workflows/${WORKFLOW}/runs`
      + `?status=success&branch=${DEPOT.branche}&per_page=1`,
    { headers: entetes(), cache: 'no-store' },
  );
  if (rRuns.status === 404) {
    return { possible: false, raison: 'le workflow de publication n’est pas encore sur la branche' };
  }
  if (!rRuns.ok) {
    return { possible: false, raison: `GitHub a répondu ${rRuns.status} (droit « Actions » manquant ?)` };
  }

  const dernier = (await rRuns.json()).workflow_runs?.[0] || null;
  if (!dernier) {
    return { possible: true, jamaisPublie: true, enAttente: null, date: null };
  }

  const rDiff = await fetch(
    `${base()}/compare/${dernier.head_sha}...${DEPOT.branche}`,
    { headers: entetes(), cache: 'no-store' },
  );
  if (!rDiff.ok) {
    return {
      possible: true, enAttente: null, date: dernier.updated_at,
      raison: 'comparaison impossible',
    };
  }
  const diff = await rDiff.json();
  const touches = (diff.files || [])
    .filter((f) => f.filename.startsWith(`${DEPOT.dossier}/`))
    .map((f) => f.filename.split('/').pop());

  return {
    possible: true,
    enAttente: touches.length,
    fichiers: touches,
    date: dernier.updated_at,
  };
}

/**
 * Déclenche la publication avec le droit « Actions : write ». Retourne son
 * identifiant, ou `null` si GitHub a pu recevoir la demande sans que le
 * navigateur obtienne sa confirmation.
 *
 * Aucun `inputs` n'est envoyé : la raison inscrite dans le commit de publication
 * est le défaut déclaré par `publish.yml`. La recopier ici en donnerait deux, à
 * tenir d'accord pour rien.
 */
export async function lancerSynchro() {
  let r;
  try {
    r = await fetch(`${base()}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: { ...entetes(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: DEPOT.branche,
        return_run_details: true,
      }),
    });
  } catch {
    // La connexion peut céder après réception côté GitHub : ne pas prétendre
    // que la demande a échoué, au risque de faire relancer un doublon.
    return null;
  }
  if (r.status === 403) {
    throw new Error('le jeton n’a pas le droit « Actions : read and write »');
  }
  if (r.status === 404) {
    throw new Error('workflow introuvable — publish.yml est-il sur la branche ?');
  }
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.json())?.message || ''; } catch { /* sans corps */ }
    throw new Error(`GitHub a répondu ${r.status}${detail ? ` (${detail})` : ''}`);
  }
  if (r.status === 204) return null;
  if (r.status !== 200) {
    throw new Error(`GitHub a répondu ${r.status} sans identifier la publication`);
  }
  let details;
  try { details = await r.json(); } catch { /* corps illisible */ }
  if (!Number.isInteger(details?.workflow_run_id)) {
    return null;
  }
  return details.workflow_run_id;
}

/**
 * Suit uniquement l'exécution que `lancerSynchro` vient de créer.
 */
export async function suivreSynchro({ surEtat, runId }) {
  const debut = Date.now();
  const LIMITE = 10 * 60 * 1000;   // au-delà, on rend la main plutôt que d'attendre
  const LIMITE_ERREURS = 3;
  let erreursConsecutives = 0;

  function signalerErreur(texte, reessayable = true) {
    if (reessayable) erreursConsecutives += 1;
    const reessayer = reessayable && erreursConsecutives < LIMITE_ERREURS;
    surEtat({
      etat: reessayer ? 'encours' : 'inconnu',
      texte: reessayer
        ? `suivi momentanément indisponible (${texte}), nouvelle tentative…`
        : `suivi interrompu (${texte})`,
    });
    return reessayer;
  }

  while (Date.now() - debut < LIMITE) {
    await new Promise((r) => setTimeout(r, 5000));

    let rep;
    try {
      rep = await fetch(`${base()}/actions/runs/${runId}`, {
        headers: entetes(), cache: 'no-store',
      });
    } catch (erreur) {
      if (signalerErreur(erreur.message)) continue;
      return null;
    }
    if (!rep.ok) {
      const reessayable = rep.status === 404 || rep.status === 429 || rep.status >= 500;
      if (signalerErreur(`GitHub a répondu ${rep.status}`, reessayable)) continue;
      return null;
    }

    let notre;
    try {
      notre = await rep.json();
    } catch {
      if (signalerErreur('réponse GitHub illisible')) continue;
      return null;
    }
    erreursConsecutives = 0;

    if (notre.status !== 'completed') {
      surEtat({ etat: 'encours', texte: 'construction et publication en cours…', url: notre.html_url });
      continue;
    }
    return {
      reussi: notre.conclusion === 'success',
      conclusion: notre.conclusion,
      url: notre.html_url,
      fin: notre.updated_at,
    };
  }
  return null;
}

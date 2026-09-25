/**
 * github.js — lecture et écriture des fichiers de contenu via l'API GitHub.
 *
 * Le back-office est une page statique : il n'y a pas de serveur à qui confier
 * l'écriture. C'est donc le navigateur qui écrit, avec un jeton d'accès unique et
 * partagé, saisi une fois par l'éditeur.
 *
 * Chaque enregistrement crée un commit directement sur `main` du dépôt privé — pas
 * de relecture ni de pull request, décision actée dans la spec.
 *
 * Deux points méritent l'attention :
 *
 *  · **encodage** — l'API rend le contenu en base64, et `atob()` en sort des octets,
 *    pas du texte : le contenu est plein d'accents et d'emoji. D'où le passage par
 *    TextDecoder à la lecture. À l'écriture, les blobs partent en `utf-8` et
 *    l'encodage ne se pose donc pas.
 *
 *  · **écriture concurrente** — les `sha` des fichiers chargés sont comparés à
 *    ceux du commit courant, puis la branche n'avance que par mise à jour non
 *    forcée. Une écriture concurrente fait échouer l'ensemble au lieu d'être
 *    écrasée.
 */

import { CONFIG_LOCALE_POSSIBLE } from './environnement.js';
import { DEPOT } from './sources-contenu.js';

const CLE_JETON = 'bo-jeton-github';
const API = 'https://api.github.com';
export const CODE_CONTENU_PERIME = 'CONTENU_PERIME';

function marquerContenuPerime(erreur) {
  erreur.code = CODE_CONTENU_PERIME;
  return erreur;
}

/* ───────────────────────── jeton ───────────────────────── */

/**
 * Jeton fourni par un fichier de configuration local, s'il existe.
 *
 * C'est l'alternative à un jeton écrit en dur dans le code : le confort est le
 * même — rien à saisir — mais `config.local.js` est dans .gitignore, donc le
 * secret ne part pas dans l'historique du dépôt où il resterait lisible par tous
 * les collaborateurs, définitivement, même après révocation.
 */
let jetonLocal = null;

/* Jeton déchiffré depuis le coffre. En mémoire SEULEMENT : il n'est jamais écrit
   dans le navigateur, donc fermer l'onglet le perd et il faut ressaisir la phrase.
   C'est voulu — l'outil est ouvert sur une adresse publique. */
let jetonCoffre = '';

export function poserJetonCoffre(valeur) {
  jetonCoffre = (valeur || '').trim();
}

export async function chargerConfigLocale() {
  if (jetonLocal !== null) return jetonLocal;
  // Là où ce fichier ne peut pas exister, ne pas le demander : voir `environnement.js`.
  if (!CONFIG_LOCALE_POSSIBLE) { jetonLocal = ''; return jetonLocal; }
  try {
    const mod = await import('../config.local.js');
    jetonLocal = (mod.JETON || '').trim();
  } catch {
    // Fichier absent : c'est le cas normal, on saisira le jeton dans l'interface.
    jetonLocal = '';
  }
  return jetonLocal;
}

/** D'où vient le jeton en vigueur — utile à afficher, pour éviter la confusion. */
export function sourceJeton() {
  if (jetonCoffre) return 'coffre';
  try {
    if (localStorage.getItem(CLE_JETON)) return 'navigateur';
  } catch { /* navigation privée */ }
  return jetonLocal ? 'fichier' : null;
}

export function lireJeton() {
  // Le coffre prime : c'est la porte d'entrée normale sur le site public.
  if (jetonCoffre) return jetonCoffre;
  try {
    const enregistre = localStorage.getItem(CLE_JETON);
    if (enregistre) return enregistre;
  } catch {
    // Navigation privée : on se rabat sur la configuration locale.
  }
  return jetonLocal || '';
}

export function poserJeton(valeur) {
  try {
    if (valeur) localStorage.setItem(CLE_JETON, valeur.trim());
    else localStorage.removeItem(CLE_JETON);
  } catch {
    // Navigation privée : l'outil reste utilisable, le jeton juste non conservé.
  }
}

export function aUnJeton() {
  return !!lireJeton();
}

/* ───────────────────────── encodage ───────────────────────── */

/** base64 → UTF-8. */
function depuisBase64(b64) {
  const binaire = atob(String(b64).replace(/\s/g, ''));
  const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(octets);
}

/* ───────────────────────── appels ───────────────────────── */

function url(chemin) {
  return `${API}/repos/${DEPOT.proprietaire}/${DEPOT.nom}/contents/`
    + `${DEPOT.dossier}/${chemin}?ref=${DEPOT.branche}`;
}

function entetes(jeton) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${jeton}`,
  };
}

/** Traduit les échecs de l'API en phrases utilisables par un éditeur. */
async function expliquer(reponse) {
  let detail = '';
  try {
    detail = (await reponse.json())?.message || '';
  } catch {
    // Réponse sans corps JSON : le code suffit.
  }
  const ou = `${DEPOT.proprietaire}/${DEPOT.nom}@${DEPOT.branche}`;
  switch (reponse.status) {
    case 401:
      return 'jeton refusé — il est peut-être expiré ou mal collé';
    case 403:
      return detail.includes('rate limit')
        ? 'trop de requêtes envoyées à GitHub, réessayez dans un moment'
        : 'jeton accepté mais sans le droit d’écrire sur ce dépôt';
    case 404:
      return `fichier ou dépôt introuvable sur ${ou} — le jeton donne-t-il accès à ce dépôt ?`;
    case 409:
      return 'le contenu a changé sur le dépôt depuis son chargement';
    case 422:
      return `refusé par GitHub : ${detail}`;
    default:
      return `GitHub a répondu ${reponse.status}${detail ? ` (${detail})` : ''}`;
  }
}

/**
 * Lit un fichier de contenu. Retourne son objet et son `sha`, nécessaire pour
 * pouvoir le réécrire sans risquer d'effacer le travail de quelqu'un d'autre.
 */
export async function lireFichier(chemin) {
  const jeton = lireJeton();
  if (!jeton) throw new Error('aucun jeton d’accès');

  const r = await fetch(url(chemin), { headers: entetes(jeton), cache: 'no-store' });
  if (!r.ok) {
    const texte = r.status === 404
      ? await expliquerSourceIntrouvable(chemin)
      : await expliquer(r);
    throw new Error(texte);
  }

  const meta = await r.json();
  return { objet: JSON.parse(depuisBase64(meta.content)), sha: meta.sha };
}

/** Appel à l'API Git de ce dépôt, avec les mêmes erreurs lisibles que l'API Contents. */
async function appelerGit(chemin, options = {}) {
  const jeton = lireJeton();
  if (!jeton) throw new Error('aucun jeton d’accès');

  const r = await fetch(`${API}/repos/${DEPOT.proprietaire}/${DEPOT.nom}/${chemin}`, {
    ...options,
    headers: {
      ...entetes(jeton),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (!r.ok) {
    const erreur = new Error(await expliquer(r));
    erreur.statutHttp = r.status;
    if (r.status === 409) marquerContenuPerime(erreur);
    throw erreur;
  }
  return r.json();
}

async function expliquerSourceIntrouvable(chemin) {
  const source = `${DEPOT.dossier}/${chemin}`;
  const ou = `${DEPOT.proprietaire}/${DEPOT.nom}@${DEPOT.branche}`;
  try {
    await appelerGit(`git/ref/heads/${DEPOT.branche}`, { cache: 'no-store' });
    return `« ${source} » n’existe pas sur ${ou}. `
      + `Cette version du back-office n’est pas alignée sur les sources de ${DEPOT.branche}. `
      + 'Republiez le site ou, en développement, alignez votre branche sur main.';
  } catch (erreur) {
    if (erreur.statutHttp === 404) {
      return `« ${source} » introuvable sur ${ou} — le jeton donne-t-il accès à ce dépôt ?`;
    }
    return `« ${source} » introuvable sur ${ou} ; impossible d’en confirmer la cause : `
      + erreur.message;
  }
}

/**
 * Écrit plusieurs fichiers dans un seul commit.
 *
 * L'API Contents crée un commit par fichier : avec quatre sources, un échec au
 * milieu laisserait le contenu dans un état hybride. L'API Git construit ici les
 * blobs et l'arbre, puis avance `main` une seule fois. Avant cela, le SHA de
 * chaque source chargée est contrôlé, y compris celles que cet enregistrement ne
 * modifie pas : les quatre fichiers forment un seul contenu cohérent. La mise à
 * jour de la référence n'est jamais forcée : un commit concurrent fait donc
 * échouer l'ensemble sans écraser personne.
 */
export async function ecrireFichiers(fichiers, shaCharges, messageCommit) {
  if (!fichiers.length) return { commit: null, fichiers: [] };

  const reference = await appelerGit(`git/ref/heads/${DEPOT.branche}`);
  const commitAvant = reference.object.sha;
  const commit = await appelerGit(`git/commits/${commitAvant}`);

  await Promise.all(Object.entries(shaCharges).map(async ([chemin, sha]) => {
    let meta;
    try {
      meta = await appelerGit(
        `contents/${DEPOT.dossier}/${chemin}?ref=${encodeURIComponent(commitAvant)}`,
      );
    } catch (erreur) {
      // La référence vient de répondre : ce 404 porte bien sur la source.
      if (erreur.statutHttp === 404) {
        erreur.message = `le contenu a changé sur le dépôt depuis son chargement `
          + `(${chemin} introuvable)`;
        marquerContenuPerime(erreur);
      }
      throw erreur;
    }
    if (meta.sha !== sha) {
      throw marquerContenuPerime(
        new Error(`le contenu a changé sur le dépôt depuis son chargement (${chemin})`),
      );
    }
  }));

  const blobs = await Promise.all(fichiers.map(({ objet }) => appelerGit('git/blobs', {
    method: 'POST',
    body: JSON.stringify({
      content: `${JSON.stringify(objet, null, 2)}\n`,
      encoding: 'utf-8',
    }),
  })));

  const arbre = await appelerGit('git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: commit.tree.sha,
      tree: fichiers.map(({ chemin }, index) => ({
        path: `${DEPOT.dossier}/${chemin}`,
        mode: '100644',
        type: 'blob',
        sha: blobs[index].sha,
      })),
    }),
  });

  const nouveauCommit = await appelerGit('git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: messageCommit,
      tree: arbre.sha,
      parents: [commitAvant],
    }),
  });

  try {
    await appelerGit(`git/refs/heads/${DEPOT.branche}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: nouveauCommit.sha, force: false }),
    });
  } catch (erreur) {
    if (erreur.statutHttp === 422) {
      throw marquerContenuPerime(
        new Error('le contenu a changé sur le dépôt pendant l’enregistrement'),
      );
    }
    throw erreur;
  }

  return {
    commit: nouveauCommit.sha.slice(0, 7),
    fichiers: fichiers.map(({ chemin }, index) => ({ chemin, sha: blobs[index].sha })),
  };
}

/**
 * Vérifie qu'un jeton fonctionne et qu'il peut écrire, AVANT de laisser croire
 * que l'enregistrement marchera. Un jeton en lecture seule passerait sinon les
 * premiers écrans sans rien dire, et échouerait à la première sauvegarde.
 *
 * ⚠️ Le champ `permissions` de `GET /repos` ne sert à rien ici : il décrit le rôle
 * de l'UTILISATEUR sur le dépôt — propriétaire ou admin, donc `push: true` quoi
 * qu'il arrive — et non les droits du jeton. Une version antérieure de cette
 * fonction s'y fiait ; le même contrôle, écrit à l'identique dans publish.yml,
 * passait au vert juste avant que GitHub refuse le push. Constaté, pas supposé.
 *
 * On exerce donc réellement le droit : créer un blob demande « Contents: write »,
 * exactement comme un enregistrement. Un blob non référencé n'apparaît dans aucun
 * commit ni aucune branche — il est ramassé par le GC de GitHub.
 */
export async function verifierJeton(jetonCandidat) {
  const jeton = (jetonCandidat || lireJeton()).trim();
  if (!jeton) return { ok: false, raison: 'aucun jeton saisi' };

  const r = await fetch(`${API}/repos/${DEPOT.proprietaire}/${DEPOT.nom}`, {
    headers: entetes(jeton),
  });
  if (!r.ok) return { ok: false, raison: await expliquer(r) };

  const sonde = await fetch(
    `${API}/repos/${DEPOT.proprietaire}/${DEPOT.nom}/git/blobs`,
    {
      method: 'POST',
      headers: { ...entetes(jeton), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'sonde de droits', encoding: 'utf-8' }),
    },
  );
  if (!sonde.ok) {
    return {
      ok: false,
      raison: sonde.status === 403
        ? 'ce jeton peut lire le dépôt mais pas y écrire — il lui faut '
          + '« Contents : Read and write »'
        : await expliquer(sonde),
    };
  }
  return { ok: true };
}

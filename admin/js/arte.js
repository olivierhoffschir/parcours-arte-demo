/**
 * arte.js — récupération automatique des métadonnées d'une vidéo depuis arte.tv.
 *
 * Point d'entrée public d'arte.tv, interrogeable DIRECTEMENT depuis le navigateur :
 * l'endpoint répond avec `access-control-allow-origin: *`. C'était la seule
 * inconnue technique de la spec, elle est levée — pas besoin de reporter cette
 * récupération au moment de la synchronisation.
 *
 * La réponse décrit toute la page du programme (y compris les recommandations),
 * d'où la recherche du bloc dont le `programId` correspond à celui demandé : le
 * premier bloc rencontré est souvent un AUTRE programme.
 */

import { identifiantLisible } from './texte.js';
import {
  identifiantProgrammeArteValide,
} from '../../react-app-desktop/src/domaine/contenu-editorial.js';

const ENDPOINT = 'https://api-cdn.arte.tv/api/emac/v4/{langue}/web/programs/{id}';

export function identifiantValide(id) {
  return identifiantProgrammeArteValide(String(id || '').trim().toUpperCase());
}

/** Parcourt la réponse en profondeur et retourne le bloc du programme demandé. */
function trouverProgramme(noeud, programId) {
  if (Array.isArray(noeud)) {
    for (const v of noeud) {
      const t = trouverProgramme(v, programId);
      if (t) return t;
    }
    return null;
  }
  if (noeud && typeof noeud === 'object') {
    if (noeud.programId === programId && noeud.title) return noeud;
    for (const v of Object.values(noeud)) {
      const t = trouverProgramme(v, programId);
      if (t) return t;
    }
  }
  return null;
}

/** L'URL d'image porte un jeton __SIZE__ ; le catalogue utilise 940x530. */
function imageEn940(url) {
  return url ? String(url).replace('__SIZE__', '940x530') : '';
}

/**
 * Les genres d'arte.tv sont des rubriques de catalogue (« Documentaires et
 * reportages »), là où le prototype affiche un mot (« documentaire »). Sans cette
 * table, l'éditeur devrait corriger le champ à chaque ajout — ce qui viderait de
 * son sens la récupération automatique.
 *
 * Le vocabulaire cible est celui du `GENRE_MAP` de `src/i18n.js`, qui sait traduire
 * ces valeurs en allemand. Un genre inconnu est laissé tel quel : mieux vaut une
 * valeur verbeuse qu'une valeur fausse.
 */
const GENRES = [
  [/d[ée]cryptage|dessous des cartes/i, 'décryptage'],
  [/docus[ée]rie/i, 'docusérie'],
  [/s[ée]rie/i, 'série'],
  [/documentaire|reportage/i, 'documentaire'],
  [/magazine|actualit/i, 'magazine'],
  [/enqu[êe]te/i, 'enquête'],
  [/cin[ée]ma|film/i, 'film'],
  [/fiction/i, 'fiction'],
  [/concert|musique|spectacle/i, 'concert'],
  [/[ée]mission|divertissement/i, 'émission'],
];

function normaliserGenre(label) {
  const brut = String(label || '').trim();
  if (!brut) return '';
  const trouve = GENRES.find(([motif]) => motif.test(brut));
  return trouve ? trouve[1] : brut.toLowerCase();
}

/**
 * Certaines descriptions d'arte.tv arrivent balisées (`<p>…</p>`, `<br>`).
 * Le prototype affiche du texte, pas du HTML : les balises s'y verraient
 * littéralement. On les retire ici, une fois, plutôt que dans chaque appelant.
 */
function texteSeul(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:apos|#39);/g, '’')
    .replace(/&(?:laquo|#171);/g, '«')
    .replace(/&(?:raquo|#187);/g, '»')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Disponibilité déduite de la date de fin de publication : inutile de la saisir.
 * En l'absence d'information, on considère la vidéo disponible — ne pas faire
 * disparaître une vidéo d'un parcours sur un simple doute.
 */
function estDisponible(p) {
  if (!p.publishEnd) return true;
  const fin = Date.parse(p.publishEnd);
  return Number.isNaN(fin) ? true : fin > Date.now();
}

/**
 * Interroge arte.tv et retourne les champs exploitables, ou lève une erreur
 * explicite. Aucun champ n'est inventé : ce qui manque revient en chaîne vide.
 */
export async function recupererVideo(programId, langue = 'fr') {
  const id = String(programId || '').trim().toUpperCase();
  if (!identifiantValide(id)) {
    throw new Error(`« ${id} » n'a pas la forme d'un identifiant ARTE (ex. 113185-000-A)`);
  }

  const url = ENDPOINT.replace('{langue}', langue).replace('{id}', id);
  let reponse;
  try {
    reponse = await fetch(url);
  } catch {
    throw new Error('arte.tv est injoignable — vérifiez la connexion');
  }
  if (reponse.status === 404) {
    throw new Error(`aucun programme ${id} sur arte.tv`);
  }
  if (!reponse.ok) {
    throw new Error(`arte.tv a répondu ${reponse.status}`);
  }

  const p = trouverProgramme(await reponse.json(), id);
  if (!p) {
    throw new Error(`la réponse d'arte.tv ne contient pas ${id}`);
  }

  return {
    programId: id,
    titre: texteSeul(p.title),
    // `durationLabel` est déjà formaté (« 27 min ») : rien à convertir.
    duree: p.durationLabel || '',
    // Le titre de collection aide parfois à trancher (« Le Dessous des cartes »).
    type: normaliserGenre(p.genre?.label) || normaliserGenre(p.subtitle),
    image: imageEn940(p.mainImage?.url),
    // URL canonique renvoyée par arte.tv, avec son libellé — préférable au gabarit.
    url: p.url || `https://www.arte.tv/${langue}/videos/${id}/`,
    description: texteSeul(p.shortDescription || p.teaserText),
    contextAvant: texteSeul(p.teaserText || p.shortDescription),
    disponible: estDisponible(p),
    // Non repris dans la fiche, mais utile à afficher pour situer la vidéo.
    collection: texteSeul(p.subtitle),
  };
}

/** Identifiant interne d'une vidéo, dérivé du titre. Fixé à la création. */
export function identifiantDepuisTitre(titre, programId) {
  return identifiantLisible(titre, 44) || String(programId || '').toLowerCase();
}

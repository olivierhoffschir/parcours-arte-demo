/**
 * route.js — lire l'adresse du back-office.
 *
 * La route vit dans le fragment d'URL, ce qui rend chaque fiche partageable et le retour
 * navigateur naturel, sans serveur. Elle est lue **ici** et non dans `app.js` parce que
 * celui-ci démarre l'application au chargement : un test qui l'importerait lancerait
 * l'outil entier.
 *
 * Depuis le 17 août 2026, une adresse peut viser un **champ** précis, et une vidéo dans un
 * chapitre — c'est ce qui permet aux emplacements « à renseigner » du front de mener
 * directement là où l'on écrit :
 *
 *     #chapitre/<id>[/video/<videoId>][/champ/<cle>]
 *     #parcours/<id>[/champ/<cle>]
 *
 * **L'extension est suffixale**, donc toutes les adresses déjà partagées restent valides.
 * Et un suffixe incompris est **ignoré** plutôt que refusé : un lien vieilli, dont la vidéo
 * ou le champ a disparu, doit ouvrir la fiche. Un lien qui casse la page serait pire que
 * pas de lien du tout.
 */

const FICHES = new Set(['chapitre', 'parcours']);
const LISTES = new Set(['chapitres', 'parcours', 'traductions']);

/**
 * L'écran de repli : c'est là qu'on arrive sans adresse, et sur une adresse incomprise.
 *
 * La liste des **parcours** depuis le 18 août 2026. C'est par le parcours qu'on entre dans le
 * travail éditorial, et c'est de sa fiche qu'on ajoute un chapitre ; arriver sur la liste des
 * quarante chapitres obligeait à un détour pour toute tâche réelle. La navigation les avait
 * déjà mis dans cet ordre, et la spécification du back-office l'écrivait depuis le début.
 */
const DEFAUT = Object.freeze({ ecran: 'parcours' });

function decoder(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    /* Un pourcentage isolé rend `decodeURIComponent` en erreur. Le segment brut vaut
       mieux qu'une exception : au pire il ne résout rien, et la fiche s'ouvre. */
    return segment;
  }
}

/**
 * Décompose un fragment d'URL. Rend toujours un objet avec au moins `ecran` ; les clés
 * `id`, `video` et `champ` n'apparaissent que si l'adresse les porte réellement, pour que
 * l'appelant puisse tester leur présence sans distinguer « absent » de « vide ».
 */
export function lireRoute(fragment) {
  const brut = String(fragment || '').replace(/^#/, '');
  if (!brut) return { ...DEFAUT };

  const segments = brut.split('/');
  const [tete, ...reste] = segments;

  if (LISTES.has(tete) && reste.length === 0) return { ecran: tete };
  if (!FICHES.has(tete)) return { ...DEFAUT };

  const id = decoder(reste[0] || '');
  if (!id) return { ...DEFAUT };

  const route = { ecran: tete, id };

  /* Les suffixes se lisent par paires nom/valeur, dans n'importe quel ordre. Une paire
     incomplète ou inconnue est laissée de côté sans rien invalider — d'où la borne sur la
     **valeur** et non sur le nom : un dernier segment isolé n'est pas une paire. */
  for (let i = 1; i + 1 < reste.length; i += 2) {
    const nom = reste[i];
    const valeur = decoder(reste[i + 1]);
    if (!valeur) continue;
    if (nom === 'video') route.video = valeur;
    else if (nom === 'champ') route.champ = valeur;
  }

  return route;
}

/**
 * L'onglet de navigation auquel appartient une route, c'est-à-dire le lien qui doit
 * s'allumer. Une fiche appartient à la liste dont elle vient.
 *
 * Il se déduit de l'écran **déjà analysé**, et non d'un préfixe d'adresse : la règle
 * précédente amputait « parcours » de son « s » pour en faire `parcour/`, qui ne préfixe
 * aucune route, si bien que l'onglet Parcours n'était jamais allumé sur une fiche. Elle
 * marchait pour les chapitres par la seule coïncidence de leur nommage. Cette fonction
 * vit ici, et non dans `app.js`, pour la même raison que `lireRoute` : y être testable.
 */
export function ongletDe({ ecran } = {}) {
  return ecran === 'chapitre' ? 'chapitres' : ecran;
}

/* ─────────────── L'adresse du prototype ─────────────── */

/* Les écrans du prototype qui rendent un parcours et un chapitre, en Version 2. Ils sont
   nommés ici parce que le back-office ne peut pas importer `experiences/v2/routes.jsx`,
   qui monte des composants React. Un test lit ce fichier et refuse un nom qui n'y serait
   plus : c'est ce qui empêche ces deux chaînes de vieillir en silence.

   Pas de paramètre `v` : la Version 2 est l'expérience par défaut du prototype, et
   `bootstrap-experience.js` retire justement `v` pour elle. */
const ECRAN_PARCOURS = 'v2-hub';
const ECRAN_CHAPITRE = 'v2-chapter';

/**
 * L'adresse de la page du prototype qui rend ce contenu, ou `null` s'il n'y a rien à
 * montrer.
 *
 * Relative, et c'est ce qui la rend juste partout : le back-office est servi sous
 * `<site>/admin/`, donc `../` désigne le prototype aussi bien en développement que sur
 * l'adresse publique. Une adresse absolue aurait renvoyé le serveur de développement
 * vers le site en ligne.
 *
 * `chapitre` est le rang du chapitre dans le parcours, en base 1 — celui que la fiche
 * affiche déjà sur ses cartes.
 */
export function adresseDuPrototype({ parcours, chapitre } = {}) {
  if (!parcours) return null;
  const params = new URLSearchParams();
  params.set('screen', chapitre ? ECRAN_CHAPITRE : ECRAN_PARCOURS);
  params.set('parcours', parcours);
  if (chapitre) params.set('chapitre', String(chapitre));
  return `../?${params}`;
}

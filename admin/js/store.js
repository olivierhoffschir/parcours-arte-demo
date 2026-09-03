/**
 * store.js — état du back-office et accès aux fichiers de contenu.
 *
 * Quatre fichiers, qui sont la source de vérité du prototype :
 *   chapitres.json  un chapitre par entrée, identifiant unique
 *   parcours.json   méta + statut + liste ordonnée d'identifiants de chapitres
 *   experiences/v1.json  textes propres à la lecture historique
 *   experiences/v2.json  textes de synthèse du mode page
 *
 * Deux façons de lire, selon qu'un jeton d'accès est présent :
 *
 *  · **avec jeton** — par l'API GitHub. C'est la seule lecture fiable pour écrire
 *    ensuite : elle rapporte le `sha` de chaque fichier, sans lequel on écrirait
 *    à l'aveugle et on risquerait d'effacer le travail d'un autre éditeur.
 *  · **sans jeton** — par les fichiers servis à côté de la page. L'outil reste
 *    consultable, mais rien ne peut être enregistré.
 *
 * Un brouillon local est conservé dans le navigateur à chaque modification : une
 * fermeture d'onglet accidentelle ne doit pas coûter une demi-heure de saisie.
 */

import { aUnJeton, lireFichier, ecrireFichiers } from './github.js';
import { DEPOT, FICHIERS } from './sources-contenu.js';
import { identifiantLisible } from './texte.js';
import {
  formaterErreurEditoriale,
  obtenirValeurLocalisee,
  valeurEditorialeRemplie,
  validerContenuEditorial,
} from '../../react-app-desktop/src/domaine/contenu-editorial.js';

/* Repli local utilisé uniquement lorsque le back-office est servi depuis la
   racine du dépôt. Le déploiement public ne contient jamais les sources brutes. */
const CHEMIN_LOCAL = `../${DEPOT.dossier}`;
const CLE_BROUILLON = 'bo-parcours-brouillon';

/** Copie profonde, pour comparer l'état courant à l'état chargé. */
function copie(v) {
  return JSON.parse(JSON.stringify(v));
}

export const store = {
  chapitres: {},
  parcours: {},
  experiences: {
    v1: { schema: 1, parcours: {}, chapitres: {}, videos: {} },
    v2: { schema: 1, parcours: {}, chapitres: {}, videos: {} },
  },
  /** L'état tel qu'il a été chargé, pour savoir ce qui a changé. */
  origine: null,
  /** Le `sha` de chaque fichier au chargement — exigé par GitHub pour réécrire. */
  sha: {},
  /** D'où vient le contenu affiché : 'github' ou 'local'. */
  source: null,
  /** Champs saisis à la main : jamais écrasés par une récupération arte.tv. */
  saisisManuellement: new Set(),
  ecouteurs: new Set(),
};

/** Vrai si l'enregistrement est possible : jeton présent et lecture par l'API. */
export function peutEnregistrer() {
  return store.source === 'github';
}

/**
 * La langue dans laquelle on travaille, retenue d'un écran à l'autre.
 *
 * Quelqu'un qui rédige en allemand passe d'un parcours à ses chapitres : retomber
 * sur l'onglet français à chaque écran l'obligerait à recliquer sans cesse. La
 * langue suit donc la navigation, sans rien changer aux données — elle ne décide
 * que de ce qui est affiché. Elle vit ici, et non dans l'interface, parce que la
 * lecture d'un titre en dépend jusque dans les listes que le store lui-même compose.
 */
let langueDeTravail = 'fr';

export function langueActive() {
  return langueDeTravail;
}

export function poserLangueActive(langue) {
  langueDeTravail = langue === 'de' ? 'de' : 'fr';
}

export function surChangement(fn) {
  store.ecouteurs.add(fn);
  return () => store.ecouteurs.delete(fn);
}

function notifier() {
  invaliderContenuPropre();
  sauverBrouillonBientot();
  store.ecouteurs.forEach((fn) => fn());
}

/** À appeler après toute modification du contenu. */
export function modifie() {
  notifier();
}

/* ───────────────────────── chargement ───────────────────────── */

export async function charger() {
  let contenus;

  if (aUnJeton()) {
    const lus = await Promise.all(FICHIERS.map(({ chemin }) => lireFichier(chemin)));
    contenus = Object.fromEntries(FICHIERS.map(({ cle }, i) => [cle, lus[i].objet]));
    FICHIERS.forEach(({ chemin }, i) => { store.sha[chemin] = lus[i].sha; });
    store.source = 'github';
  } else {
    contenus = await lireEnLocal();
    store.source = 'local';
  }

  store.chapitres = nettoyerTraductions(contenus.chapitres);
  store.parcours = nettoyerTraductions(contenus.parcours);
  store.experiences = normaliserExperiences({ v1: contenus.v1, v2: contenus.v2 });
  invaliderContenuPropre();
  store.origine = contenuPropre();

  // Un brouillon plus récent reprend la main, mais jamais en silence.
  return { brouillon: lireBrouillon() };
}

/** Lecture sans jeton depuis les sources du dépôt servi localement. */
async function lireEnLocal() {
  try {
    const valeurs = await Promise.all(FICHIERS.map(async ({ chemin }) => {
      const r = await fetch(`${CHEMIN_LOCAL}/${chemin}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${chemin} : ${r.status}`);
      return r.json();
    }));
    return Object.fromEntries(FICHIERS.map(({ cle }, i) => [cle, valeurs[i]]));
  } catch (e) {
    throw new Error(`${CHEMIN_LOCAL} → ${e.message}`);
  }
}

/**
 * Retire les traductions restées vides.
 *
 * Afficher l'onglet allemand crée `i18n.de` sur chaque objet rendu, qu'on y écrive
 * ou non — c'est ce qui permet aux champs d'avoir une cible. Et un champ allemand
 * rempli puis effacé laisse un `""`. Sans ce nettoyage, consulter une fiche en
 * allemand sème des `"i18n": { "de": {} }` et des chaînes vides dans le contenu, qui
 * partent au dépôt et polluent les diffs sans rien dire.
 *
 * Le vide se juge avec la règle éditoriale partagée, la même que pour les extensions
 * V1 et V2 : ce qui disparaît de `v1.json` doit disparaître de `chapitres.json`,
 * sans quoi deux des quatre sources gardent un bruit dont les deux autres sont
 * débarrassées.
 *
 * Appelé au chargement ET avant l'enregistrement : ainsi ce qui est déjà semé
 * disparaît au prochain passage, et l'état en mémoire reste comparable au fichier.
 */
export function nettoyerTraductions(valeur) {
  if (Array.isArray(valeur)) {
    valeur.forEach(nettoyerTraductions);
    return valeur;
  }
  if (!valeur || typeof valeur !== 'object') return valeur;
  for (const [cle, v] of Object.entries(valeur)) {
    if (cle === 'i18n' && v && typeof v === 'object') {
      for (const [langue, trad] of Object.entries(v)) {
        if (nettoyerValeursVides(trad)) delete v[langue];
      }
      if (!Object.keys(v).length) delete valeur.i18n;
      continue;
    }
    nettoyerTraductions(v);
  }
  return valeur;
}

function normaliserExperiences(experiences = {}) {
  const v1 = nettoyerTraductions(copie(experiences.v1 || {}));
  const v2 = nettoyerTraductions(copie(experiences.v2 || {}));
  if (v1.schema == null) v1.schema = 1;
  if (v2.schema == null) v2.schema = 1;
  v1.parcours = v1.parcours || {};
  v1.chapitres = v1.chapitres || {};
  v1.videos = v1.videos || {};
  v2.parcours = v2.parcours || {};
  v2.chapitres = v2.chapitres || {};
  v2.videos = v2.videos || {};
  migrerPresentationsChapitresV2(v2.chapitres);
  return { v1, v2 };
}

/**
 * Reprend les brouillons qui séparaient encore question et promesse de chapitre.
 *
 * Le texte réuni garde au plus les deux phrases d'origine. La source courante n'emploie
 * plus ces clés, mais les brouillons locaux doivent rester ouvrables après la migration.
 */
function migrerPresentationsChapitresV2(chapitres) {
  for (const extension of Object.values(chapitres || {})) {
    const migrerLangue = (contenu) => {
      if (!contenu || typeof contenu !== 'object') return;
      if (!valeurEditorialeRemplie(contenu.presentation)) {
        const morceaux = [contenu.question, contenu.promesse]
          .filter(valeurEditorialeRemplie)
          .map((texte) => texte.trim());
        if (morceaux.length) contenu.presentation = morceaux.join(' ');
      }
      delete contenu.question;
      delete contenu.promesse;
    };

    migrerLangue(extension);
    Object.values(extension.i18n || {}).forEach(migrerLangue);

    if (Array.isArray(extension.provisoire)) {
      extension.provisoire = [...new Set(extension.provisoire
        .map((champ) => (
          champ === 'question' || champ === 'promesse' ? 'presentation' : champ
        ))
        .filter((champ) => champ !== 'presentation'
          || valeurEditorialeRemplie(extension.presentation)))];
      if (!extension.provisoire.length) delete extension.provisoire;
    }
  }
}

function contenuCourant() {
  return {
    chapitres: store.chapitres,
    parcours: store.parcours,
    experiences: store.experiences,
  };
}

let contenuCanonique = null;
let etatModifications = null;

function invaliderContenuPropre() {
  contenuCanonique = null;
  etatModifications = null;
}

/**
 * Copie canonique utilisée pour comparer, valider, écrire et sauver le brouillon.
 * Elle reste immuable et valable jusqu'à la prochaine notification de changement.
 */
function contenuPropre() {
  if (contenuCanonique) return contenuCanonique;
  const contenu = copie(contenuCourant());
  nettoyerTraductions(contenu.chapitres);
  nettoyerTraductions(contenu.parcours);
  nettoyerExperiences(contenu.experiences);
  contenuCanonique = contenu;
  return contenuCanonique;
}

function prendre(objet, cle) {
  if (!Object.prototype.hasOwnProperty.call(objet, cle)) return undefined;
  const valeur = objet[cle];
  delete objet[cle];
  return valeur;
}

/** Déplace les traductions des champs V1 sans toucher aux traductions communes. */
function extraireTraductionsV1(objet, champs) {
  const traductions = {};
  for (const [langue, source] of Object.entries(objet.i18n || {})) {
    const cible = {};
    for (const cle of champs) {
      const valeur = prendre(source, cle);
      if (valeur !== undefined) cible[cle] = valeur;
    }
    if (Object.keys(cible).length) traductions[langue] = cible;
    if (!Object.keys(source).length) delete objet.i18n[langue];
  }
  if (objet.i18n && !Object.keys(objet.i18n).length) delete objet.i18n;
  return traductions;
}

/** Aligne un brouillon sur le titre unique et retire la promesse de parcours supprimée. */
function migrerDefinitionsParcours(parcours) {
  for (const definition of Object.values(parcours)) {
    const titreRepris = valeurEditorialeRemplie(definition.teaserTitle);
    if (titreRepris) definition.title = definition.teaserTitle;
    delete definition.teaserTitle;
    delete definition.promesse;

    for (const traduction of Object.values(definition.i18n || {})) {
      if (valeurEditorialeRemplie(traduction.teaserTitle)) {
        traduction.title = traduction.teaserTitle;
      }
      delete traduction.teaserTitle;
      delete traduction.promesse;
    }

    if (Array.isArray(definition.provisoire)) {
      definition.provisoire = [...new Set(definition.provisoire
        .map((champ) => (champ === 'teaserTitle' && titreRepris ? 'title' : champ))
        .filter((champ) => champ !== 'teaserTitle' && champ !== 'promesse'))];
      if (!definition.provisoire.length) delete definition.provisoire;
    }
  }
  return parcours;
}

/**
 * Convertit le brouillon de l'ancien format vers les deux extensions.
 *
 * Les champs que l'ancien formulaire pouvait modifier sont tous conservés. Les
 * champs V1 sont extraits du commun et l'ancien `edito` devient l'extension V2,
 * comme les fichiers du dépôt. La fonction est pure pour pouvoir tester la reprise
 * sans navigateur.
 */
export function migrerBrouillon(brouillon) {
  if (!brouillon?.chapitres || !brouillon?.parcours) return null;
  if (brouillon.experiences) {
    const courant = copie(brouillon);
    delete courant.schemaBrouillon;
    migrerDefinitionsParcours(courant.parcours);
    return {
      ...courant,
      shaBase: copie(brouillon.shaBase || {}),
      experiences: normaliserExperiences(brouillon.experiences),
    };
  }

  const chapitres = copie(brouillon.chapitres);
  const parcours = migrerDefinitionsParcours(copie(brouillon.parcours));
  const v1 = { schema: 1, parcours: {}, chapitres: {}, videos: {} };

  // L'ancien modèle autorisait le même identifiant de vidéo dans plusieurs
  // chapitres. Le nouveau contrat l'interdit : chaque occurrence ambiguë reçoit
  // un identifiant stable, lié à sa place dans le chapitre.
  const occurrencesVideos = new Map();
  Object.values(chapitres).forEach((chapitre) => {
    (chapitre.videos || []).forEach((video) => {
      occurrencesVideos.set(video.id, (occurrencesVideos.get(video.id) || 0) + 1);
    });
  });
  const identifiantsUtilises = new Set(
    [...occurrencesVideos].filter(([, total]) => total === 1).map(([id]) => id),
  );
  const nouveauxIdsParAncien = new Map();
  for (const [cid, chapitre] of Object.entries(chapitres)) {
    (chapitre.videos || []).forEach((video, index) => {
      const ancienId = video.id;
      if (occurrencesVideos.get(ancienId) <= 1) {
        nouveauxIdsParAncien.set(ancienId, [ancienId]);
        return;
      }
      const base = `${cid}-video-${String(index + 1).padStart(2, '0')}`;
      let id = base;
      let suffixe = 2;
      while (identifiantsUtilises.has(id)) id = `${base}-${suffixe++}`;
      video.id = id;
      identifiantsUtilises.add(id);
      const nouveauxIds = nouveauxIdsParAncien.get(ancienId) || [];
      nouveauxIds.push(id);
      nouveauxIdsParAncien.set(ancienId, nouveauxIds);
    });
  }

  for (const [pid, definition] of Object.entries(parcours)) {
    const conclusion = prendre(definition, 'conclusion');
    const i18nConclusion = prendre(definition, 'i18nConclusion');
    // `badge` et `langue` n'étaient pas éditables et ont quitté le contrat V1.
    delete definition.langue;
    const texte = conclusion?.texte;
    if (texte !== undefined || i18nConclusion !== undefined) {
      v1.parcours[pid] = {};
      if (texte !== undefined) v1.parcours[pid].conclusion = { texte };
      if (i18nConclusion !== undefined) v1.parcours[pid].i18nConclusion = i18nConclusion;
    }
  }

  for (const [cid, chapitre] of Object.entries(chapitres)) {
    const extension = {};
    for (const cle of ['intro', 'transition']) {
      const valeur = prendre(chapitre, cle);
      if (valeur !== undefined) extension[cle] = valeur;
    }
    const i18n = extraireTraductionsV1(chapitre, ['intro', 'transition']);
    if (Object.keys(i18n).length) extension.i18n = i18n;

    for (const video of chapitre.videos || []) {
      const extensionVideo = {};
      for (const cle of ['titreContextuel', 'sousTitre', 'serie']) {
        const valeur = prendre(video, cle);
        if (valeur !== undefined) extensionVideo[cle] = valeur;
      }
      const traductions = extraireTraductionsV1(
        video,
        ['titreContextuel', 'sousTitre', 'serie'],
      );
      if (Object.keys(traductions).length) extensionVideo.i18n = traductions;
      if (Object.keys(extensionVideo).length) v1.videos[video.id] = extensionVideo;
    }
    if (Object.keys(extension).length) v1.chapitres[cid] = extension;
  }

  const ancienEdito = copie(brouillon.edito || {});
  const videosV2 = {};
  for (const [ancienId, extension] of Object.entries(ancienEdito.videos || {})) {
    const extensionPropre = copie(extension);
    // Les coquilles de démonstration v1…v10 portaient un éditorial généré à
    // partir de « undefined ». Un champ encore marqué provisoire n'a pas été
    // repris par l'éditeur : on l'écarte, tout en conservant les champs réellement
    // corrigés (leur repère provisoire avait alors été levé).
    if (/^v(?:[1-9]|10)$/.test(ancienId)) {
      for (const champ of extensionPropre.provisoire || []) delete extensionPropre[champ];
      delete extensionPropre.provisoire;
    }
    if (nettoyerValeursVides(extensionPropre)) continue;
    for (const nouvelId of nouveauxIdsParAncien.get(ancienId) || []) {
      videosV2[nouvelId] = copie(extensionPropre);
    }
  }
  const v2 = {
    schema: 1,
    parcours: {},
    chapitres: Object.fromEntries(Object.entries(ancienEdito.chapitres || {})
      .filter(([cid]) => Object.prototype.hasOwnProperty.call(chapitres, cid))),
    videos: videosV2,
  };
  // Ces champs ont été retirés du produit ; un vieux brouillon ne doit pas les
  // réintroduire et rendre tout nouvel enregistrement invalide.
  Object.values(v2.chapitres).forEach((extension) => { delete extension.bilan; });

  return {
    date: brouillon.date,
    shaBase: copie(brouillon.shaBase || {}),
    chapitres,
    parcours,
    experiences: normaliserExperiences({ v1, v2 }),
  };
}

function nettoyerValeursVides(valeur) {
  if (Array.isArray(valeur)) {
    return valeur.length === 0 || valeur.every((item) => nettoyerValeursVides(item));
  }
  if (typeof valeur === 'string') return !valeurEditorialeRemplie(valeur);
  if (!valeur || typeof valeur !== 'object') return valeur == null;
  for (const [cle, enfant] of Object.entries(valeur)) {
    if (nettoyerValeursVides(enfant)) delete valeur[cle];
  }
  return Object.keys(valeur).length === 0;
}

/** Retire les entrées créées par l'affichage d'un formulaire resté vide. */
export function nettoyerExperiences(experiences) {
  nettoyerTraductions(experiences);
  for (const id of ['v1', 'v2']) {
    const experience = experiences[id];
    for (const collection of ['parcours', 'chapitres', 'videos']) {
      if (!experience?.[collection]) continue;
      for (const [cle, extension] of Object.entries(experience[collection])) {
        if (nettoyerValeursVides(extension)) delete experience[collection][cle];
      }
    }
  }
  return experiences;
}

/**
 * Enregistre sur le dépôt les seuls fichiers qui ont changé.
 *
 * Écriture par fichier entier, mais sans perte : l'objet en mémoire est celui qui
 * a été lu et les formulaires n'en modifient que certaines clés. Les quatre
 * sources sont ensuite réunies dans un seul commit.
 *
 * Le `sha` de chaque fichier fait barrage à l'écrasement : si le dépôt a bougé
 * depuis le chargement, GitHub refuse et on le dit plutôt que de forcer.
 */
export async function enregistrer(messageCommit) {
  if (!peutEnregistrer()) throw new Error('aucun jeton d’accès en écriture');

  // Le DOM conserve des références directes vers les objets du store. Nettoyer
  // l'état en place détacherait les champs vides et ferait perdre une saisie faite
  // après l'enregistrement : on prépare donc une copie canonique.
  const courant = contenuPropre();

  const erreurs = validerContenuEditorial({
    chapitres: courant.chapitres,
    parcours: courant.parcours,
    v1: courant.experiences.v1,
    v2: courant.experiences.v2,
  });
  if (erreurs.length) {
    throw new Error(
      `contenu invalide :\n• ${erreurs.map(formaterErreurEditoriale).join('\n• ')}`,
    );
  }

  const chemins = calculerCheminsModifies(courant, store.origine);
  const aEcrire = FICHIERS
    .filter(({ chemin }) => chemins.includes(chemin))
    .map(({ cle, chemin }) => ({
      chemin,
      objet: cle === 'v1' || cle === 'v2' ? courant.experiences[cle] : courant[cle],
    }));
  if (!aEcrire.length) return { ecrits: [] };

  // Les quatre sources forment un ensemble : une modification distante de l'une
  // d'elles invalide le snapshot, même si cet enregistrement n'écrit pas ce fichier.
  const shaCharges = Object.fromEntries(
    FICHIERS.map(({ chemin }) => [chemin, store.sha[chemin]]),
  );
  const resultat = await ecrireFichiers(aEcrire, shaCharges, messageCommit);
  resultat.fichiers.forEach(({ chemin, sha }) => { store.sha[chemin] = sha; });
  const ecrits = resultat.fichiers.map(({ chemin }) => ({
    nom: chemin.replace(/\.json$/, ''),
    commit: resultat.commit,
  }));

  // Ce qui est écrit devient la nouvelle référence : plus rien n'est « modifié ».
  store.origine = copie(courant);
  notifier();
  /* Après `notifier()`, pas avant : une saisie faite pendant l'appel GitHub doit
     rester dans le brouillon. On ne l'efface que si le store correspond encore
     exactement au snapshot qui vient d'être écrit — et sinon on l'écrit tout de
     suite, sans attendre le report : c'est le moment où cette saisie n'existe
     nulle part ailleurs. */
  if (aDesModifications()) sauverBrouillonMaintenant();
  else oublierBrouillon();
  return { ecrits };
}

export function appliquerBrouillon(b) {
  const migre = migrerBrouillon(b);
  store.chapitres = migre.chapitres;
  store.parcours = migre.parcours;
  store.experiences = migre.experiences;
  // On reprend aussi la base du brouillon. Utiliser les SHA fraîchement chargés
  // autoriserait un vieux snapshot à écraser le travail publié depuis sa création.
  // Sans base (ancien format), l'enregistrement sera donc refusé plutôt que risqué.
  if (store.source === 'github') store.sha = copie(migre.shaBase || {});
  notifier();
}

/* ───────────────────────── brouillon local ───────────────────────── */

/**
 * Le brouillon est reporté de quelques centaines de millisecondes.
 *
 * Il était écrit à chaque frappe, et une écriture coûte une copie profonde du
 * contenu, sa sérialisation entière puis un appel bloquant à `localStorage` : au
 * volume du dépôt, la saisie s'en ressentait. Un report suffit — ce qu'il protège,
 * c'est la fermeture accidentelle d'un onglet, pas la demi-seconde qui précède.
 * `sauverBrouillonMaintenant` reste là pour le départ de la page.
 */
let brouillonEnAttente = null;
const DELAI_BROUILLON = 500;

function sauverBrouillonBientot() {
  if (brouillonEnAttente) return;
  brouillonEnAttente = setTimeout(() => {
    brouillonEnAttente = null;
    sauverBrouillonMaintenant();
  }, DELAI_BROUILLON);
  // Sous Node (les tests), un compte à rebours en vol retiendrait le processus.
  brouillonEnAttente?.unref?.();
}

export function sauverBrouillonMaintenant() {
  try {
    const courant = contenuPropre();
    localStorage.setItem(CLE_BROUILLON, JSON.stringify({
      date: new Date().toISOString(),
      shaBase: copie(store.sha),
      chapitres: courant.chapitres,
      parcours: courant.parcours,
      experiences: courant.experiences,
    }));
  } catch {
    // Quota dépassé : le brouillon est un confort, pas une garantie.
  }
}

export function lireBrouillon() {
  try {
    const b = migrerBrouillon(JSON.parse(localStorage.getItem(CLE_BROUILLON) || 'null'));
    if (!b) return null;
    // Un brouillon identique au fichier chargé n'a rien à proposer.
    const memeContenu = JSON.stringify({
      chapitres: b.chapitres, parcours: b.parcours, experiences: b.experiences,
    }) === JSON.stringify(store.origine);
    if (memeContenu) return null;
    b.conflits = store.source === 'github'
      ? FICHIERS
        .filter(({ chemin }) => b.shaBase?.[chemin] !== store.sha[chemin])
        .map(({ chemin }) => chemin)
      : [];
    return b;
  } catch {
    return null;
  }
}

export function oublierBrouillon() {
  // Une écriture reportée réécrirait le brouillon juste après son effacement.
  if (brouillonEnAttente) {
    clearTimeout(brouillonEnAttente);
    brouillonEnAttente = null;
  }
  try {
    localStorage.removeItem(CLE_BROUILLON);
  } catch {
    // Stockage bloqué : le brouillon est un confort, le commit reste un succès.
  }
}

/* ───────────────────────── ce qui a changé ───────────────────────── */

/**
 * Tout ce qui a changé depuis le chargement, calculé d'un seul tenant.
 *
 * Le bandeau d'en-tête et la barre du bas posent chacun les mêmes quatre questions
 * à chaque frappe, et chaque réponse sérialisait l'intégralité du contenu : une
 * dizaine de `JSON.stringify` des quatre fichiers par caractère tapé. Un seul
 * passage, mémorisé jusqu'à la prochaine notification, comme la copie canonique
 * dont il dépend.
 */
function modifications() {
  if (etatModifications) return etatModifications;
  const origine = store.origine;
  if (!origine) {
    etatModifications = { chapitres: [], parcours: [], experiences: {}, chemins: [] };
    return etatModifications;
  }
  const courant = contenuPropre();
  const differents = (collection) => {
    const avant = origine[collection];
    const apres = courant[collection];
    /* Test d'existence et non de vérité : « supprimé » veut dire que la clé a disparu,
       pas que sa valeur est fausse. Les deux coïncident tant que les collections portent
       des objets, ce qu'elles font — `nettoyerValeursVides` retire les entrées vides au
       lieu de les annuler — mais la condition doit dire ce qu'elle veut dire. */
    const present = (collection, id) => Object.prototype.hasOwnProperty.call(collection, id);
    return Object.keys(apres)
      .filter((id) => JSON.stringify(apres[id]) !== JSON.stringify(avant[id]))
      .concat(Object.keys(avant).filter((id) => !present(apres, id)));
  };
  etatModifications = {
    chapitres: differents('chapitres'),
    parcours: differents('parcours'),
    experiences: Object.fromEntries(['v1', 'v2'].map((id) => [
      id,
      JSON.stringify(courant.experiences[id]) !== JSON.stringify(origine.experiences[id]),
    ])),
    chemins: calculerCheminsModifies(courant, origine),
  };
  return etatModifications;
}

/** Identifiants des chapitres modifiés depuis le chargement. */
export function chapitresModifies() {
  return modifications().chapitres;
}

export function experienceModifiee(id) {
  return modifications().experiences[id] === true;
}

export function parcoursModifies() {
  return modifications().parcours;
}

/** Chemins à écrire, calcul pur testable sans GitHub ni navigateur. */
export function calculerCheminsModifies(courant, origine) {
  if (!origine) return [];
  const valeur = (contenu, cle) => (
    cle === 'v1' || cle === 'v2' ? contenu.experiences[cle] : contenu[cle]
  );
  return FICHIERS
    .filter(({ cle }) => JSON.stringify(valeur(courant, cle)) !== JSON.stringify(valeur(origine, cle)))
    .map(({ chemin }) => chemin);
}

export function aDesModifications() {
  return modifications().chemins.length > 0;
}

/**
 * Ce qui a changé, dit en français.
 *
 * La même phrase était composée deux fois, dans le bandeau d'en-tête et dans la
 * barre du bas, à un caractère près. Elles doivent dire la même chose : c'est le
 * même état.
 */
export function resumeDesModifications() {
  const { chapitres, parcours, experiences } = modifications();
  const parts = [];
  if (chapitres.length) parts.push(`${chapitres.length} chapitre${chapitres.length > 1 ? 's' : ''}`);
  if (parcours.length) parts.push(`${parcours.length} parcours`);
  if (experiences.v1) parts.push('l’expérience V1');
  if (experiences.v2) parts.push('l’expérience V2');
  return parts.join(', ');
}

/* ───────────────────────── lecture ───────────────────────── */

/**
 * Le titre d'un parcours tel qu'on l'affiche, dans la langue de travail.
 *
 * Le repli sur l'identifiant n'est pas décoratif : un parcours monté en allemand d'abord
 * apparaissait sous son identifiant dans les listes de rattachement et jusque dans les
 * alertes de suppression, là où il faut justement le reconnaître.
 */
export function titreDuParcours(p, pid) {
  return obtenirValeurLocalisee(p, 'title', langueDeTravail) || pid;
}

/** Les parcours dans lesquels un chapitre est employé. Un chapitre peut être partagé. */
export function parcoursUtilisant(chapitreId) {
  return Object.entries(store.parcours)
    .filter(([, p]) => (p.chapitres || []).includes(chapitreId))
    .map(([pid, p]) => ({
      id: pid,
      titre: titreDuParcours(p, pid),
      // Un parcours marqué publié est destiné à la prochaine construction publique.
      publie: p.statut === 'publie',
    }));
}

/**
 * Les chapitres, du plus récemment créé au plus ancien.
 *
 * Les chapitres créés dans l'outil s'ajoutaient en fin de fichier, donc en bas de
 * liste : le travail du jour se retrouvait derrière quarante chapitres migrés.
 *
 * Le tri s'appuie sur `cree`, écrit à la création. Les chapitres antérieurs à ce
 * champ n'en ont pas, et il n'y a aucun moyen honnête de le leur inventer : ils
 * restent donc dans l'ordre du fichier, en dessous — c'est-à-dire dans l'ordre
 * éditorial d'origine, qui n'est pas du bruit. `sort` est stable, ce qui le garantit.
 */
export function chapitresParRecence() {
  return parRecence(store.chapitres);
}

/** Les parcours, du plus récemment créé au plus ancien. Même règle. */
export function parcoursParRecence() {
  return parRecence(store.parcours);
}

/** Le tri lui-même, écrit une fois pour les deux. */
function parRecence(collection) {
  const quand = (id) => collection[id]?.cree || '';
  return Object.keys(collection).sort((a, b) => {
    const da = quand(a);
    const db = quand(b);
    if (da && db) return db.localeCompare(da);
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
}

/**
 * Ce qui interdit de supprimer un chapitre, ou `null` si rien ne s'y oppose.
 *
 * Un chapitre employé par un parcours marqué PUBLIÉ est destiné à la publication :
 * le supprimer le ferait disparaître à la prochaine synchronisation, en laissant un
 * parcours amputé sans que personne l'ait décidé. Deux gestes le débloquent, et ils
 * sont tous deux explicites : retirer le chapitre du parcours, ou dépublier le parcours.
 *
 * La règle vit ici, et pas seulement dans l'écran : `supprimerChapitre()` la
 * rejoue, pour qu'un autre point d'entrée ne puisse pas la contourner.
 */
export function obstacleSuppression(cid) {
  const publies = parcoursUtilisant(cid).filter((p) => p.publie);
  return publies.length ? { parcours: publies } : null;
}

/**
 * Position d'un chapitre dans un parcours, en base 1. Sert au numéro affiché.
 *
 * Longtemps sans appelant, elle en a un depuis que la fiche d'un chapitre annonce
 * « Chapitre 01 de <parcours> » : c'est ce qui relie les deux écrans.
 */
export function positionDans(parcoursId, chapitreId) {
  const liste = store.parcours[parcoursId]?.chapitres || [];
  const i = liste.indexOf(chapitreId);
  return i === -1 ? null : i + 1;
}

/* ───────────────────────── écriture ───────────────────────── */

export function creerChapitre(question) {
  const base = identifiantLisible(question, 48) || 'nouveau-chapitre';
  let cid = base;
  let n = 2;
  while (store.chapitres[cid]) cid = `${base}-${n++}`;
  store.chapitres[cid] = {
    question: question || '',
    accroche: '',
    videos: [],
    // Sert au tri de la liste, pour que le travail du jour soit en haut.
    cree: new Date().toISOString(),
  };
  modifie();
  return cid;
}

export function supprimerChapitre(cid) {
  const obstacle = obstacleSuppression(cid);
  if (obstacle) {
    throw new Error(
      `ce chapitre est utilisé par un parcours marqué publié (${obstacle.parcours
        .map((p) => p.titre).join(', ')})`,
    );
  }
  const videos = (store.chapitres[cid]?.videos || []).map((video) => video.id);
  delete store.chapitres[cid];
  delete store.experiences.v1.chapitres[cid];
  delete store.experiences.v2.chapitres[cid];
  videos.forEach((videoId) => {
    delete store.experiences.v1.videos[videoId];
    delete store.experiences.v2.videos[videoId];
  });
  // Un chapitre supprimé disparaît de TOUS les parcours qui l'employaient.
  Object.values(store.parcours).forEach((p) => {
    if (p.chapitres) p.chapitres = p.chapitres.filter((x) => x !== cid);
  });
  modifie();
}

export function deplacerVideo(cid, index, sens) {
  const v = store.chapitres[cid]?.videos;
  if (!v) return;
  const cible = index + sens;
  if (cible < 0 || cible >= v.length) return;
  [v[index], v[cible]] = [v[cible], v[index]];
  modifie();
}

export function supprimerVideo(cid, index) {
  const ch = store.chapitres[cid];
  if (!ch?.videos?.[index]) return;
  const [retiree] = ch.videos.splice(index, 1);
  if (retiree?.id) {
    delete store.experiences.v1.videos[retiree.id];
    delete store.experiences.v2.videos[retiree.id];
  }
  modifie();
}

/* ── Parcours ── */

export function creerParcours() {
  let pid = 'nouveau-parcours';
  let n = 2;
  while (store.parcours[pid]) pid = `nouveau-parcours-${n++}`;
  store.parcours[pid] = {
    id: pid,
    // Un parcours naît en brouillon : rien n'apparaît dans le prototype par accident.
    statut: 'brouillon',
    title: '',
    theme: '',
    meta: { accroche: '', image: '' },
    chapitres: [],
    // Sert au tri de la liste, comme pour les chapitres.
    cree: new Date().toISOString(),
  };
  modifie();
  return pid;
}

export function supprimerParcours(pid) {
  // Les chapitres ne sont PAS supprimés : ils peuvent servir ailleurs, et
  // retournent simplement dans la réserve.
  delete store.parcours[pid];
  delete store.experiences.v1.parcours[pid];
  delete store.experiences.v2.parcours[pid];
  modifie();
}

/**
 * Rattache un chapitre à un parcours. `avant` permet d'insérer à la position d'une
 * carte plutôt qu'en fin de liste, pour que le glisser-déposer soit précis.
 */
export function rattacherChapitre(pid, cid, avant) {
  const p = store.parcours[pid];
  if (!p || !store.chapitres[cid]) return;
  p.chapitres = p.chapitres || [];
  if (p.chapitres.includes(cid)) return;
  const i = avant ? p.chapitres.indexOf(avant) : -1;
  if (i === -1) p.chapitres.push(cid);
  else p.chapitres.splice(i, 0, cid);
  modifie();
}

/** Retirer d'un parcours n'est pas supprimer : le chapitre reste disponible. */
export function detacherChapitre(pid, cid) {
  const p = store.parcours[pid];
  if (!p?.chapitres) return;
  p.chapitres = p.chapitres.filter((x) => x !== cid);
  modifie();
}

/**
 * Déplace un chapitre dans l'ordre du parcours.
 *
 * `sens` vaut -1 ou +1 pour les flèches, et 0 pour un glisser-déposer. Celui-ci
 * vise la carte sous le curseur (`avant`) ; déposé dans le vide de la colonne, il
 * n'en visait aucune et le chapitre restait sur place, alors que le même geste
 * depuis la réserve le rattachait bien en fin de liste. Une carte déposée hors
 * d'une autre va donc au bout, dans les deux colonnes.
 */
export function deplacerChapitre(pid, index, sens, avant) {
  const p = store.parcours[pid];
  const liste = p?.chapitres;
  if (!liste || index < 0 || index >= liste.length) return;

  if (sens === 0) {
    if (avant === liste[index]) return;   // déposé sur lui-même
    const [cid] = liste.splice(index, 1);
    const cible = avant === undefined ? -1 : liste.indexOf(avant);
    if (cible === -1) liste.push(cid);
    else liste.splice(cible, 0, cid);
    modifie();
    return;
  }

  const cible = index + sens;
  if (cible < 0 || cible >= liste.length) return;
  [liste[index], liste[cible]] = [liste[cible], liste[index]];
  modifie();
}

/** Marque un champ comme saisi à la main, pour ne jamais l'écraser ensuite. */
export function marquerManuel(chemin) {
  store.saisisManuellement.add(chemin);
}

export function estManuel(chemin) {
  return store.saisisManuellement.has(chemin);
}

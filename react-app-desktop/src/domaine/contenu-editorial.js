const CHAMPS_V1_PARCOURS = new Set(['conclusion', 'i18nConclusion']);
const CHAMPS_V1_CHAPITRE = new Set(['intro', 'transition', 'i18n']);
const CHAMPS_V1_VIDEO = new Set(['titreContextuel', 'sousTitre', 'serie', 'i18n']);
const CHAMPS_V2_PARCOURS = new Set(['title', 'subtitle', 'meta']);
/* Les champs de parcours qu'un éditeur rédige, et que `provisoire` peut donc
   signaler comme repris d'un texte de remplissage plutôt qu'écrits. */
const CHAMPS_EDITABLES_PARCOURS = new Set([
  'title', 'subtitle', 'theme', 'notionsCles',
]);
/* Un champ supprimé reste refusé afin de signaler explicitement une source non migrée. */
const CHAMPS_PARCOURS_SUPPRIMES = ['teaserTitle', 'promesse'];
/* Le titre du chapitre reste le champ commun `chapitre.question`, celui que le back-office
   édite. La V2 ajoute un texte de présentation qui relie les programmes, sans en faire un
   résumé ni promettre un acquis artificiel, et peut porter un `titre` : un titre alternatif
   que l'adaptateur V2 applique à la place du titre commun dans ses vues. Seule la variante
   éditoriale l'écrit aujourd'hui ; le formulaire du back-office ne le propose pas. */
const CHAMPS_EDITABLES_V2_CHAPITRE = new Set(['titre', 'presentation', 'acquis']);
const CHAMPS_V2_CHAPITRE = new Set([...CHAMPS_EDITABLES_V2_CHAPITRE, 'provisoire', 'i18n']);
const CHAMPS_EDITABLES_V2_VIDEO = new Set([
  'bonneRaison', 'place', 'moments', 'retenir', 'resume', 'pont',
]);
/* Les quatre champs d'une notion. `reponse` porte la phrase d'acquis, les trois
   autres n'existent que pour la carte : sa question au recto, et la vidéo où la
   notion est expliquée avec la seconde exacte. */
const CHAMPS_NOTION = new Set(['question', 'reponse', 'videoId', 'timecode']);
const CHAMPS_V2_VIDEO = new Set([
  ...CHAMPS_EDITABLES_V2_VIDEO, 'provisoire', 'i18n',
]);

// La maquette ne prévoit qu'une rangée de six cartes dans cette rubrique.
const NOMBRE_CARTES_BIENTOT = 6;

/** Format d'identifiant de programme ARTE, ex. 113185-000-A. */
export const FORMAT_ID_PROGRAMME_ARTE = /^\d{5,6}-\d{3}-[A-Z]$/;

/**
 * Une valeur réellement exploitable par l'éditorial et l'affichage.
 * Les espaces seuls comptent comme du vide ; les tableaux gardent leur sémantique
 * de liste, sans imposer ici la validité de chacun de leurs éléments.
 */
export function valeurEditorialeRemplie(valeur) {
  if (typeof valeur === 'string') return valeur.trim().length > 0;
  if (Array.isArray(valeur)) return valeur.length > 0;
  return valeur != null;
}

function lireChemin(objet, chemin) {
  if (!objet) return undefined;
  if (!chemin.includes('.')) return objet[chemin];
  return chemin.split('.').reduce((courant, cle) => (
    courant == null ? courant : courant[cle]
  ), objet);
}

/**
 * Le champ tel qu'il est stocké dans une langue, sans repli sur une autre.
 *
 * Les écrans l'utilisent quand l'absence elle-même porte une information, par exemple
 * pour distinguer un texte à traduire d'un texte jamais écrit. La lecture du chemin reste
 * ici, commune avec la fonction de repli ci-dessous.
 */
export function obtenirValeurDansLangue(objet, champ, langue) {
  if (!objet) return undefined;
  if (!langue || langue === 'fr') return lireChemin(objet, champ);
  return lireChemin(objet.i18n?.[langue], champ);
}

/**
 * Le champ d'un contenu dans la langue demandée, avec repli réciproque.
 * Le français reste le pivot stocké à la racine ; si ce pivot est vide, la
 * première traduction remplie évite d'afficher un blanc.
 */
export function obtenirValeurLocalisee(objet, champ, langue) {
  if (!objet) return undefined;

  const pivot = obtenirValeurDansLangue(objet, champ, 'fr');
  if (!langue || langue === 'fr') {
    if (valeurEditorialeRemplie(pivot)) return pivot;
    for (const traduction of Object.values(objet.i18n || {})) {
      const valeur = lireChemin(traduction, champ);
      if (valeurEditorialeRemplie(valeur)) return valeur;
    }
    return pivot;
  }

  const traduction = obtenirValeurDansLangue(objet, champ, langue);
  return valeurEditorialeRemplie(traduction) ? traduction : pivot;
}

/** Un identifiant stocké doit être directement utilisable dans les URLs du player. */
export function identifiantProgrammeArteValide(identifiant) {
  return typeof identifiant === 'string' && FORMAT_ID_PROGRAMME_ARTE.test(identifiant);
}

function estObjet(valeur) {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
}

function possede(objet, propriete) {
  return estObjet(objet) && Object.prototype.hasOwnProperty.call(objet, propriete);
}

/**
 * Ajoute une erreur, avec de quoi la regrouper quand elle se répète.
 *
 * `repere` est optionnel et vaut `{ nature, cible }` : la **nature** est une clé stable qui
 * dit quel défaut a été trouvé, la **cible** dit où. Un parcours de démonstration aux dix
 * vidéos réduites à un identifiant produit trente phrases, trois par vidéo, toutes
 * identiques à l'identifiant près : le back-office s'en sert pour n'en afficher qu'une par
 * nature, comptée, et garder le détail dépliable.
 *
 * La phrase, elle, ne change pas : la chaîne de publication l'écrit dans son journal, où
 * elle est lue une par une. Le libellé du groupe appartient à l'interface, pas ici.
 */
function ajouterErreur(erreurs, chemin, message, repere = null) {
  erreurs.push({ chemin: [...chemin], message, ...(repere || {}) });
}

function sousChemin(chemin, ...segments) {
  return [...chemin, ...segments];
}

function dictionnaire(valeur, chemin, erreurs) {
  if (estObjet(valeur)) return valeur;
  ajouterErreur(erreurs, chemin, 'doit être un objet indexé par identifiant');
  return {};
}

function refuserChamps(objet, champs, chemin, erreurs) {
  if (!estObjet(objet)) return;
  for (const champ of champs) {
    if (possede(objet, champ)) {
      ajouterErreur(erreurs, sousChemin(chemin, champ), 'n’appartient pas à cette source');
    }
  }
}

function refuserChampsInconnus(objet, champsAcceptes, chemin, erreurs, schema = 'V1') {
  if (!estObjet(objet)) {
    ajouterErreur(erreurs, chemin, 'doit être un objet');
    return;
  }
  for (const champ of Object.keys(objet)) {
    if (!champsAcceptes.has(champ)) {
      ajouterErreur(
        erreurs,
        sousChemin(chemin, champ),
        `n’est pas prévu par le schéma ${schema}`,
      );
    }
  }
}

function validerTexte(valeur, chemin, erreurs, accepteNull = false) {
  if (valeur === undefined || (accepteNull && valeur === null)) return;
  if (typeof valeur !== 'string') ajouterErreur(erreurs, chemin, 'doit être un texte');
}

/** Le texte de chapitre doit rester lisible d'un coup d'œil dans l'itinéraire. */
function validerPresentationChapitre(valeur, chemin, erreurs) {
  validerTexte(valeur, chemin, erreurs, true);
  if (typeof valeur !== 'string') return;

  const phrases = valeur.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (phrases.length > 2) {
    ajouterErreur(erreurs, chemin, 'doit contenir deux phrases maximum');
  }
}

function validerBooleen(valeur, chemin, erreurs) {
  if (valeur !== undefined && typeof valeur !== 'boolean') {
    ajouterErreur(erreurs, chemin, 'doit être un booléen');
  }
}

function validerNombre(valeur, chemin, erreurs) {
  if (valeur === undefined || valeur === null) return;
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    ajouterErreur(erreurs, chemin, 'doit être un nombre');
  }
}

function validerMetaParcours(meta, chemin, erreurs) {
  if (meta === undefined) return;
  if (!estObjet(meta)) {
    ajouterErreur(erreurs, chemin, 'doit être un objet');
    return;
  }
  validerTexte(meta.accroche, sousChemin(chemin, 'accroche'), erreurs);
  validerTexte(meta.image, sousChemin(chemin, 'image'), erreurs);
}

function validerModulesRecommandes(modules, chemin, erreurs) {
  if (modules === undefined) return;
  if (!Array.isArray(modules)) {
    ajouterErreur(erreurs, chemin, 'doit être un tableau');
    return;
  }

  for (const [index, module] of modules.entries()) {
    const cheminModule = sousChemin(chemin, index);
    if (!estObjet(module)) {
      ajouterErreur(erreurs, cheminModule, 'doit être un objet');
      continue;
    }
    for (const champ of ['titre', 'theme', 'image']) {
      validerTexte(module[champ], sousChemin(cheminModule, champ), erreurs);
    }
    if (module.nbVideos !== undefined
      && (typeof module.nbVideos !== 'number' || !Number.isFinite(module.nbVideos))) {
      ajouterErreur(erreurs, sousChemin(cheminModule, 'nbVideos'), 'doit être un nombre');
    }
    for (const [langue, traduction] of traductions(
      module.i18n,
      sousChemin(cheminModule, 'i18n'),
      erreurs,
    )) {
      const cheminTraduction = sousChemin(cheminModule, 'i18n', langue);
      if (!estObjet(traduction)) {
        ajouterErreur(erreurs, cheminTraduction, 'doit être un objet');
        continue;
      }
      for (const champ of ['titre', 'theme']) {
        validerTexte(traduction[champ], sousChemin(cheminTraduction, champ), erreurs);
      }
    }
  }
}

function validerVideosPubliees(definition, chapitres, chemin, erreurs) {
  for (const chapitreId of definition.chapitres) {
    const chapitre = chapitres[chapitreId];
    if (!estObjet(chapitre) || !Array.isArray(chapitre.videos)) continue;

    if (typeof chapitre.question !== 'string'
      || !valeurEditorialeRemplie(chapitre.question)) {
      const cible = `le chapitre ${chapitreId}`;
      ajouterErreur(
        erreurs,
        chemin,
        `${cible} exige une question française non vide`,
        { nature: 'chapitre-question-vide', cible },
      );
    }

    for (const [index, video] of chapitre.videos.entries()) {
      if (!estObjet(video)) continue;
      const videoLisible = valeurEditorialeRemplie(video.id)
        ? `la vidéo ${video.id}`
        : `la vidéo ${index + 1}`;
      const cible = `${videoLisible} du chapitre ${chapitreId}`;

      if (!valeurEditorialeRemplie(video.programId)) {
        ajouterErreur(erreurs, chemin, `${cible} exige un programId ARTE non vide`,
          { nature: 'video-programid-vide', cible });
      } else if (!identifiantProgrammeArteValide(video.programId)) {
        ajouterErreur(erreurs, chemin, `${cible} a un programId ARTE invalide`,
          { nature: 'video-programid-invalide', cible });
      }
      if (typeof video.titre !== 'string' || !valeurEditorialeRemplie(video.titre)) {
        ajouterErreur(erreurs, chemin, `${cible} exige un titre français non vide`,
          { nature: 'video-titre-vide', cible });
      }
      if (typeof video.image !== 'string' || !valeurEditorialeRemplie(video.image)) {
        ajouterErreur(erreurs, chemin, `${cible} exige une image non vide`,
          { nature: 'video-image-vide', cible });
      }
    }
  }
}

function validerListeTextes(valeur, chemin, erreurs) {
  if (valeur === undefined) return;
  if (!Array.isArray(valeur) || valeur.some((item) => typeof item !== 'string')) {
    ajouterErreur(erreurs, chemin, 'doit être une liste de textes');
  }
}

/**
 * Un acquis est soit une phrase, soit une notion à quatre champs.
 *
 * Les deux formes coexistent : la carte retournable demande une question, une vidéo
 * et un timecode que les acquis déjà écrits n'ont pas, et l'éditorial les ajoute
 * chapitre par chapitre. Un acquis resté phrase n'est donc pas une erreur.
 */
function validerAcquis(valeur, chemin, erreurs, videosDuChapitre) {
  if (valeur === undefined) return;
  if (!Array.isArray(valeur)) {
    ajouterErreur(erreurs, chemin, 'doit être une liste de phrases ou de notions');
    return;
  }

  for (const [index, acquis] of valeur.entries()) {
    if (typeof acquis === 'string') continue;
    const cheminAcquis = sousChemin(chemin, index);
    if (!estObjet(acquis)) {
      ajouterErreur(erreurs, cheminAcquis, 'doit être une phrase ou une notion');
      continue;
    }

    refuserChampsInconnus(acquis, CHAMPS_NOTION, cheminAcquis, erreurs, 'V2');
    for (const champ of CHAMPS_NOTION) {
      validerTexte(acquis[champ], sousChemin(cheminAcquis, champ), erreurs, true);
    }
    if (!valeurEditorialeRemplie(acquis.reponse)) {
      ajouterErreur(
        erreurs,
        sousChemin(cheminAcquis, 'reponse'),
        'porte la phrase d’acquis et ne peut pas être vide',
      );
    }
    /* Un renvoi vers une vidéo d'un autre chapitre donnerait une carte qui ramène
       ailleurs que là où la notion est expliquée. */
    if (valeurEditorialeRemplie(acquis.videoId)
      && videosDuChapitre
      && !videosDuChapitre.has(acquis.videoId)) {
      ajouterErreur(
        erreurs,
        sousChemin(cheminAcquis, 'videoId'),
        `désigne ${acquis.videoId}, qui n’est pas une vidéo de ce chapitre`,
      );
    }
  }
}

/**
 * La forme unique que lisent les vues : une notion, ses quatre champs, `null` quand
 * un champ manque. Rend `null` pour un acquis sans phrase, qui n'a rien à afficher.
 */
export function normaliserAcquis(valeur) {
  if (typeof valeur === 'string') {
    return valeurEditorialeRemplie(valeur)
      ? { question: null, reponse: valeur, videoId: null, timecode: null }
      : null;
  }
  if (!estObjet(valeur) || !valeurEditorialeRemplie(valeur.reponse)) return null;
  return {
    question: valeur.question ?? null,
    reponse: valeur.reponse,
    videoId: valeur.videoId ?? null,
    timecode: valeur.timecode ?? null,
  };
}

function validerTransition(valeur, chemin, erreurs) {
  if (valeur === undefined) return;
  if (!estObjet(valeur)) {
    ajouterErreur(erreurs, chemin, 'doit être un objet');
    return;
  }
  refuserChampsInconnus(valeur, new Set(['texte']), chemin, erreurs);
  validerTexte(valeur.texte, sousChemin(chemin, 'texte'), erreurs, true);
}

function validerMoments(valeur, chemin, erreurs) {
  if (valeur === undefined) return;
  if (!Array.isArray(valeur) || valeur.some((moment) => (
    !Array.isArray(moment)
    || (moment.length !== 2 && moment.length !== 3)
    || typeof moment[0] !== 'string'
    || (moment[1] !== null && typeof moment[1] !== 'string')
    || (moment.length === 3 && moment[2] !== null && typeof moment[2] !== 'string')
  ))) {
    ajouterErreur(
      erreurs,
      chemin,
      'doit être une liste de couples ou triplets [repère, texte, contextualisation facultative]',
    );
  }
}

function validerProvisoire(valeur, champsEditables, chemin, erreurs) {
  validerListeTextes(valeur, chemin, erreurs);
  if (!Array.isArray(valeur)) return;
  for (const champ of valeur) {
    if (typeof champ === 'string' && !champsEditables.has(champ)) {
      ajouterErreur(erreurs, chemin, `référence le champ inconnu ${champ}`);
    }
  }
}

function traductions(i18n, chemin, erreurs) {
  if (i18n === undefined) return [];
  return Object.entries(dictionnaire(i18n, chemin, erreurs));
}

/** Rend une erreur structurée lisible dans une interface ou un journal. */
export function formaterErreurEditoriale({ chemin, message }) {
  const cheminLisible = chemin.reduce((texte, segment) => (
    typeof segment === 'number'
      ? `${texte}[${segment}]`
      : `${texte}${texte ? '.' : ''}${segment}`
  ), '');
  return cheminLisible ? `${cheminLisible} ${message}` : message;
}

/**
 * Valide les quatre sources éditoriales sans dépendre de Node ni du navigateur.
 * Le tableau vide est le seul résultat valide. Chaque erreur sépare son chemin,
 * sous forme de segments non ambigus, du message destiné à l'affichage.
 */
export function validerContenuEditorial(sources) {
  const erreurs = [];
  if (!estObjet(sources)) {
    return [{ chemin: [], message: 'les sources éditoriales doivent former un objet' }];
  }

  const chapitres = dictionnaire(sources.chapitres, ['chapitres'], erreurs);
  const parcours = dictionnaire(sources.parcours, ['parcours'], erreurs);
  const v1 = dictionnaire(sources.v1, ['v1'], erreurs);
  const v2 = dictionnaire(sources.v2, ['v2'], erreurs);

  const champsRacineExtension = new Set(['schema', 'parcours', 'chapitres', 'videos']);
  refuserChampsInconnus(v1, champsRacineExtension, ['v1'], erreurs);
  refuserChampsInconnus(
    v2,
    champsRacineExtension,
    ['v2'],
    erreurs,
    'V2',
  );

  const videosParChapitre = new Map();
  const chapitreParVideo = new Map();

  for (const [chapitreId, chapitre] of Object.entries(chapitres)) {
    const chemin = ['chapitres', chapitreId];
    if (!valeurEditorialeRemplie(chapitreId)) {
      ajouterErreur(erreurs, ['chapitres'], 'contient un identifiant vide');
    }
    if (!estObjet(chapitre)) {
      ajouterErreur(erreurs, chemin, 'doit être un objet');
      continue;
    }

    refuserChamps(
      chapitre,
      ['intro', 'transition', 'acquis', 'provisoire', 'bilan'],
      chemin,
      erreurs,
    );
    for (const champ of [
      'question', 'accroche', 'couleur', 'accentCouleur', 'heroImage', 'cree',
    ]) {
      validerTexte(chapitre[champ], sousChemin(chemin, champ), erreurs);
    }
    validerModulesRecommandes(
      chapitre.modulesRecommandes,
      sousChemin(chemin, 'modulesRecommandes'),
      erreurs,
    );
    for (const [langue, traduction] of traductions(
      chapitre.i18n,
      sousChemin(chemin, 'i18n'),
      erreurs,
    )) {
      if (!estObjet(traduction)) {
        ajouterErreur(erreurs, sousChemin(chemin, 'i18n', langue), 'doit être un objet');
        continue;
      }
      refuserChamps(
        traduction,
        ['intro', 'transition', 'acquis', 'bilan'],
        sousChemin(chemin, 'i18n', langue),
        erreurs,
      );
      for (const champ of ['question', 'accroche']) {
        validerTexte(
          traduction[champ],
          sousChemin(chemin, 'i18n', langue, champ),
          erreurs,
        );
      }
    }

    if (!Array.isArray(chapitre.videos)) {
      ajouterErreur(erreurs, sousChemin(chemin, 'videos'), 'doit être un tableau');
      videosParChapitre.set(chapitreId, new Set());
      continue;
    }

    const idsLocaux = new Set();
    for (const [index, video] of chapitre.videos.entries()) {
      const cheminVideo = sousChemin(chemin, 'videos', index);
      if (!estObjet(video)
        || typeof video.id !== 'string'
        || !valeurEditorialeRemplie(video.id)) {
        ajouterErreur(erreurs, sousChemin(cheminVideo, 'id'), 'doit être un identifiant non vide');
        continue;
      }
      if (idsLocaux.has(video.id)) {
        ajouterErreur(
          erreurs,
          sousChemin(chemin, 'videos'),
          `contient la vidéo ${video.id} répétée`,
        );
      }
      idsLocaux.add(video.id);
      const premierChapitre = chapitreParVideo.get(video.id);
      if (premierChapitre && premierChapitre !== chapitreId) {
        ajouterErreur(
          erreurs,
          sousChemin(cheminVideo, 'id'),
          `${video.id} est déjà utilisé dans le chapitre ${premierChapitre}`,
        );
      } else {
        chapitreParVideo.set(video.id, chapitreId);
      }
      refuserChamps(
        video,
        [
          'titreContextuel', 'sousTitre', 'serie',
          'place', 'moments', 'retenir', 'resume', 'pont', 'provisoire',
        ],
        cheminVideo,
        erreurs,
      );
      for (const champ of [
        'titre', 'type', 'duree', 'programId', 'image', 'url',
        'contextAvant', 'description', 'bonneRaison',
      ]) {
        validerTexte(video[champ], sousChemin(cheminVideo, champ), erreurs);
      }
      validerBooleen(
        video.disponible,
        sousChemin(cheminVideo, 'disponible'),
        erreurs,
      );
      for (const [langue, traduction] of traductions(
        video.i18n,
        sousChemin(cheminVideo, 'i18n'),
        erreurs,
      )) {
        if (!estObjet(traduction)) {
          ajouterErreur(
            erreurs,
            sousChemin(cheminVideo, 'i18n', langue),
            'doit être un objet',
          );
          continue;
        }
        refuserChamps(
          traduction,
          [
            'titreContextuel', 'sousTitre', 'serie',
            'place', 'moments', 'retenir', 'resume', 'pont',
          ],
          sousChemin(cheminVideo, 'i18n', langue),
          erreurs,
        );
        for (const champ of ['titre', 'contextAvant', 'description', 'bonneRaison']) {
          validerTexte(
            traduction[champ],
            sousChemin(cheminVideo, 'i18n', langue, champ),
            erreurs,
          );
        }
      }
    }
    videosParChapitre.set(chapitreId, idsLocaux);
  }

  for (const [parcoursId, definition] of Object.entries(parcours)) {
    const chemin = ['parcours', parcoursId];
    if (!valeurEditorialeRemplie(parcoursId)) {
      ajouterErreur(erreurs, ['parcours'], 'contient un identifiant vide');
    }
    if (!estObjet(definition)) {
      ajouterErreur(erreurs, chemin, 'doit être un objet');
      continue;
    }
    if (definition.id !== parcoursId) {
      ajouterErreur(
        erreurs,
        sousChemin(chemin, 'id'),
        `vaut ${String(definition.id)} au lieu de ${parcoursId}`,
      );
    }
    if (!['publie', 'brouillon'].includes(definition.statut)) {
      ajouterErreur(erreurs, sousChemin(chemin, 'statut'), 'doit valoir publie ou brouillon');
    }
    refuserChamps(
      definition,
      ['langue', 'conclusion', 'i18nConclusion', ...CHAMPS_PARCOURS_SUPPRIMES],
      chemin,
      erreurs,
    );
    for (const champ of ['id', 'title', 'subtitle', 'theme', 'cree']) {
      validerTexte(definition[champ], sousChemin(chemin, champ), erreurs);
    }
    /* Le compte de notions clés est un nombre saisi, pas un calcul : la maquette
       le présente comme un engagement éditorial sur le contenu. */
    validerNombre(definition.notionsCles, sousChemin(chemin, 'notionsCles'), erreurs);
    /* Signale les champs encore remplis d'un texte d'attente. Marqueur de travail
       éditorial : il ne sort pas dans la vue publique. */
    validerProvisoire(
      definition.provisoire,
      CHAMPS_EDITABLES_PARCOURS,
      sousChemin(chemin, 'provisoire'),
      erreurs,
    );
    validerMetaParcours(definition.meta, sousChemin(chemin, 'meta'), erreurs);
    for (const [langue, traduction] of traductions(
      definition.i18n,
      sousChemin(chemin, 'i18n'),
      erreurs,
    )) {
      const cheminTraduction = sousChemin(chemin, 'i18n', langue);
      if (!estObjet(traduction)) {
        ajouterErreur(erreurs, cheminTraduction, 'doit être un objet');
        continue;
      }
      refuserChamps(traduction, CHAMPS_PARCOURS_SUPPRIMES, cheminTraduction, erreurs);
      for (const champ of ['title', 'subtitle', 'theme']) {
        validerTexte(traduction[champ], sousChemin(cheminTraduction, champ), erreurs);
      }
      validerMetaParcours(
        traduction.meta,
        sousChemin(cheminTraduction, 'meta'),
        erreurs,
      );
    }

    if (!Array.isArray(definition.chapitres)) {
      ajouterErreur(erreurs, sousChemin(chemin, 'chapitres'), 'doit être un tableau');
      continue;
    }
    if (definition.statut === 'publie' && definition.chapitres.length === 0) {
      ajouterErreur(erreurs, chemin, 'est publié mais ne contient aucun chapitre');
    }
    if (definition.statut === 'publie'
      && (typeof definition.title !== 'string'
        || !valeurEditorialeRemplie(definition.title))) {
      ajouterErreur(
        erreurs,
        sousChemin(chemin, 'title'),
        'doit porter un title français non vide pour être publié',
      );
    }
    if (definition.statut === 'publie') {
      validerVideosPubliees(definition, chapitres, chemin, erreurs);
    }

    const references = new Set();
    for (const chapitreId of definition.chapitres) {
      if (typeof chapitreId !== 'string' || !valeurEditorialeRemplie(chapitreId)) {
        ajouterErreur(erreurs, sousChemin(chemin, 'chapitres'), 'contient un identifiant invalide');
        continue;
      }
      if (references.has(chapitreId)) {
        ajouterErreur(
          erreurs,
          sousChemin(chemin, 'chapitres'),
          `contient la référence ${chapitreId} répétée`,
        );
      }
      references.add(chapitreId);
      if (!possede(chapitres, chapitreId)) {
        ajouterErreur(
          erreurs,
          sousChemin(chemin, 'chapitres'),
          `référence le chapitre absent ${chapitreId}`,
        );
      } else if (definition.statut === 'publie' && videosParChapitre.get(chapitreId)?.size === 0) {
        ajouterErreur(
          erreurs,
          chemin,
          `est publié mais son chapitre ${chapitreId} ne contient aucune vidéo`,
        );
      }
    }
  }

  if (v1.schema !== 1) ajouterErreur(erreurs, ['v1', 'schema'], 'doit valoir 1');
  if (v2.schema !== 1) ajouterErreur(erreurs, ['v2', 'schema'], 'doit valoir 1');

  const parcoursV1 = dictionnaire(v1.parcours, ['v1', 'parcours'], erreurs);
  for (const [parcoursId, extension] of Object.entries(parcoursV1)) {
    const chemin = ['v1', 'parcours', parcoursId];
    if (!possede(parcours, parcoursId)) {
      ajouterErreur(erreurs, chemin, 'est une extension orpheline');
    }
    refuserChampsInconnus(extension, CHAMPS_V1_PARCOURS, chemin, erreurs);
    if (extension?.conclusion !== undefined) {
      refuserChampsInconnus(
        extension.conclusion,
        new Set(['texte']),
        sousChemin(chemin, 'conclusion'),
        erreurs,
      );
      validerListeTextes(
        extension.conclusion?.texte,
        sousChemin(chemin, 'conclusion', 'texte'),
        erreurs,
      );
    }
    for (const [langue, traduction] of traductions(
      extension?.i18nConclusion,
      sousChemin(chemin, 'i18nConclusion'),
      erreurs,
    )) {
      refuserChampsInconnus(
        traduction,
        new Set(['texte']),
        sousChemin(chemin, 'i18nConclusion', langue),
        erreurs,
      );
      validerListeTextes(
        traduction?.texte,
        sousChemin(chemin, 'i18nConclusion', langue, 'texte'),
        erreurs,
      );
    }
  }

  const chapitresV1 = dictionnaire(v1.chapitres, ['v1', 'chapitres'], erreurs);
  for (const [chapitreId, extension] of Object.entries(chapitresV1)) {
    const chemin = ['v1', 'chapitres', chapitreId];
    if (!possede(chapitres, chapitreId)) {
      ajouterErreur(erreurs, chemin, 'est une extension orpheline');
    }
    refuserChampsInconnus(extension, CHAMPS_V1_CHAPITRE, chemin, erreurs);
    validerListeTextes(extension?.intro, sousChemin(chemin, 'intro'), erreurs);
    validerTransition(extension?.transition, sousChemin(chemin, 'transition'), erreurs);
    for (const [langue, traduction] of traductions(
      extension?.i18n,
      sousChemin(chemin, 'i18n'),
      erreurs,
    )) {
      refuserChampsInconnus(
        traduction,
        new Set(['intro', 'transition']),
        sousChemin(chemin, 'i18n', langue),
        erreurs,
      );
      validerListeTextes(
        traduction?.intro,
        sousChemin(chemin, 'i18n', langue, 'intro'),
        erreurs,
      );
      validerTransition(
        traduction?.transition,
        sousChemin(chemin, 'i18n', langue, 'transition'),
        erreurs,
      );
    }
  }

  const videosV1 = dictionnaire(v1.videos, ['v1', 'videos'], erreurs);
  for (const [videoId, extension] of Object.entries(videosV1)) {
    const chemin = ['v1', 'videos', videoId];
    if (!chapitreParVideo.has(videoId)) {
      ajouterErreur(erreurs, chemin, 'est une extension orpheline');
    }
    refuserChampsInconnus(extension, CHAMPS_V1_VIDEO, chemin, erreurs);
    for (const champ of ['titreContextuel', 'sousTitre', 'serie']) {
      validerTexte(extension?.[champ], sousChemin(chemin, champ), erreurs, true);
    }
    for (const [langue, traduction] of traductions(
      extension?.i18n,
      sousChemin(chemin, 'i18n'),
      erreurs,
    )) {
      refuserChampsInconnus(
        traduction,
        new Set(['titreContextuel', 'sousTitre', 'serie']),
        sousChemin(chemin, 'i18n', langue),
        erreurs,
      );
      for (const champ of ['titreContextuel', 'sousTitre', 'serie']) {
        validerTexte(
          traduction?.[champ],
          sousChemin(chemin, 'i18n', langue, champ),
          erreurs,
          true,
        );
      }
    }
  }

  const chapitresV2 = dictionnaire(v2.chapitres, ['v2', 'chapitres'], erreurs);
  for (const [chapitreId, extension] of Object.entries(chapitresV2)) {
    const chemin = ['v2', 'chapitres', chapitreId];
    if (!possede(chapitres, chapitreId)) {
      ajouterErreur(erreurs, chemin, 'est une extension orpheline');
    }
    const videosDuChapitre = videosParChapitre.get(chapitreId);
    refuserChampsInconnus(extension, CHAMPS_V2_CHAPITRE, chemin, erreurs, 'V2');
    validerTexte(extension?.titre, sousChemin(chemin, 'titre'), erreurs, true);
    validerPresentationChapitre(
      extension?.presentation,
      sousChemin(chemin, 'presentation'),
      erreurs,
    );
    validerAcquis(
      extension?.acquis,
      sousChemin(chemin, 'acquis'),
      erreurs,
      videosDuChapitre,
    );
    validerProvisoire(
      extension?.provisoire,
      CHAMPS_EDITABLES_V2_CHAPITRE,
      sousChemin(chemin, 'provisoire'),
      erreurs,
    );
    for (const [langue, traduction] of traductions(
      extension?.i18n,
      sousChemin(chemin, 'i18n'),
      erreurs,
    )) {
      /* Pas de `titre` traduit : comme les textes alternatifs de parcours, le titre alternatif
         n'existe qu'en français, et l'allemand garde le titre commun des éditeurs. */
      refuserChampsInconnus(
        traduction,
        new Set(['presentation', 'acquis']),
        sousChemin(chemin, 'i18n', langue),
        erreurs,
        'V2',
      );
      validerPresentationChapitre(
        traduction?.presentation,
        sousChemin(chemin, 'i18n', langue, 'presentation'),
        erreurs,
      );
      validerAcquis(
        traduction?.acquis,
        sousChemin(chemin, 'i18n', langue, 'acquis'),
        erreurs,
        videosDuChapitre,
      );
    }
  }

  const videosV2 = dictionnaire(v2.videos, ['v2', 'videos'], erreurs);
  for (const [videoId, extension] of Object.entries(videosV2)) {
    const chemin = ['v2', 'videos', videoId];
    if (!chapitreParVideo.has(videoId)) {
      ajouterErreur(erreurs, chemin, 'est une extension orpheline');
    }
    refuserChampsInconnus(extension, CHAMPS_V2_VIDEO, chemin, erreurs, 'V2');
    for (const champ of ['bonneRaison', 'place', 'resume', 'pont']) {
      validerTexte(extension?.[champ], sousChemin(chemin, champ), erreurs, true);
    }
    validerListeTextes(extension?.retenir, sousChemin(chemin, 'retenir'), erreurs);
    validerProvisoire(
      extension?.provisoire,
      CHAMPS_EDITABLES_V2_VIDEO,
      sousChemin(chemin, 'provisoire'),
      erreurs,
    );
    validerMoments(extension?.moments, sousChemin(chemin, 'moments'), erreurs);
    for (const [langue, traduction] of traductions(
      extension?.i18n,
      sousChemin(chemin, 'i18n'),
      erreurs,
    )) {
      refuserChampsInconnus(
        traduction,
        new Set(['bonneRaison', 'place', 'moments', 'retenir', 'resume', 'pont']),
        sousChemin(chemin, 'i18n', langue),
        erreurs,
        'V2',
      );
      for (const champ of ['bonneRaison', 'place', 'resume', 'pont']) {
        validerTexte(
          traduction?.[champ],
          sousChemin(chemin, 'i18n', langue, champ),
          erreurs,
          true,
        );
      }
      validerListeTextes(
        traduction?.retenir,
        sousChemin(chemin, 'i18n', langue, 'retenir'),
        erreurs,
      );
      validerMoments(
        traduction?.moments,
        sousChemin(chemin, 'i18n', langue, 'moments'),
        erreurs,
      );
    }
  }

  const parcoursV2 = dictionnaire(v2.parcours, ['v2', 'parcours'], erreurs);
  for (const [parcoursId, extension] of Object.entries(parcoursV2)) {
    const chemin = ['v2', 'parcours', parcoursId];
    if (!possede(parcours, parcoursId)) {
      ajouterErreur(erreurs, chemin, 'est une extension orpheline');
    }
    refuserChampsInconnus(extension, CHAMPS_V2_PARCOURS, chemin, erreurs, 'V2');
    for (const champ of ['title', 'subtitle']) {
      validerTexte(extension?.[champ], sousChemin(chemin, champ), erreurs);
    }
    if (extension?.meta !== undefined) {
      const cheminMeta = sousChemin(chemin, 'meta');
      if (!estObjet(extension.meta)) {
        ajouterErreur(erreurs, cheminMeta, 'doit être un objet');
      } else {
        refuserChampsInconnus(
          extension.meta,
          new Set(['accroche']),
          cheminMeta,
          erreurs,
          'V2',
        );
        validerTexte(
          extension.meta.accroche,
          sousChemin(cheminMeta, 'accroche'),
          erreurs,
        );
      }
    }
  }

  return erreurs;
}

/* La vue publique est une liste blanche : ajouter un champ aux sources ne doit
   jamais suffire à l’envoyer dans le bundle. Chaque sous-objet est donc projeté
   explicitement, traductions comprises. */
function sansIndefinis(objet) {
  return Object.fromEntries(Object.entries(objet)
    .filter(([, valeur]) => valeur !== undefined));
}

function projeterMetaParcours(meta) {
  if (meta === undefined) return undefined;
  return sansIndefinis({
    accroche: meta.accroche,
    image: meta.image,
  });
}

function projeterTraductionsParcours(i18n) {
  if (i18n === undefined) return undefined;
  return Object.fromEntries(Object.entries(i18n).map(([langue, traduction]) => [
    langue,
    sansIndefinis({
      title: traduction.title,
      subtitle: traduction.subtitle,
      theme: traduction.theme,
      meta: traduction.meta === undefined
        ? undefined
        : sansIndefinis({ accroche: traduction.meta.accroche }),
    }),
  ]));
}

function projeterConclusion(conclusion) {
  if (conclusion === undefined) return undefined;
  return sansIndefinis({ texte: conclusion.texte });
}

function projeterTraductionsConclusion(i18nConclusion) {
  if (i18nConclusion === undefined) return undefined;
  return Object.fromEntries(Object.entries(i18nConclusion).map(([langue, traduction]) => [
    langue,
    sansIndefinis({ texte: traduction.texte }),
  ]));
}

function projeterParcours(definition, extension = {}) {
  return sansIndefinis({
    id: definition.id,
    title: definition.title,
    subtitle: definition.subtitle,
    theme: definition.theme,
    notionsCles: definition.notionsCles,
    meta: projeterMetaParcours(definition.meta),
    i18n: projeterTraductionsParcours(definition.i18n),
    chapitres: definition.chapitres,
    conclusion: projeterConclusion(extension.conclusion),
    i18nConclusion: projeterTraductionsConclusion(extension.i18nConclusion),
  });
}

function projeterTransition(transition) {
  if (transition === undefined) return undefined;
  return sansIndefinis({ texte: transition.texte });
}

function projeterTraductionsRecommandation(i18n) {
  if (i18n === undefined) return undefined;
  return Object.fromEntries(Object.entries(i18n).map(([langue, traduction]) => [
    langue,
    sansIndefinis({
      titre: traduction.titre,
      theme: traduction.theme,
    }),
  ]));
}

function projeterRecommandation(recommandation) {
  return sansIndefinis({
    titre: recommandation.titre,
    theme: recommandation.theme,
    nbVideos: recommandation.nbVideos,
    image: recommandation.image,
    i18n: projeterTraductionsRecommandation(recommandation.i18n),
  });
}

function projeterTraductionsChapitre(base, extension) {
  if (base === undefined && extension === undefined) return undefined;
  const langues = new Set([...Object.keys(base || {}), ...Object.keys(extension || {})]);
  return Object.fromEntries([...langues].map((langue) => {
    const commun = base?.[langue] || {};
    const specifique = extension?.[langue] || {};
    return [langue, sansIndefinis({
      question: commun.question,
      accroche: commun.accroche,
      intro: specifique.intro,
      transition: projeterTransition(specifique.transition),
    })];
  }));
}

function projeterTraductionsVideo(base, extension) {
  if (base === undefined && extension === undefined) return undefined;
  const langues = new Set([...Object.keys(base || {}), ...Object.keys(extension || {})]);
  return Object.fromEntries([...langues].map((langue) => {
    const commun = base?.[langue] || {};
    const specifique = extension?.[langue] || {};
    return [langue, sansIndefinis({
      titre: commun.titre,
      contextAvant: commun.contextAvant,
      description: commun.description,
      bonneRaison: commun.bonneRaison,
      titreContextuel: specifique.titreContextuel,
      sousTitre: specifique.sousTitre,
      serie: specifique.serie,
    })];
  }));
}

function projeterVideo(commun, extension = {}) {
  return sansIndefinis({
    id: commun.id,
    titre: commun.titre,
    type: commun.type,
    duree: commun.duree,
    programId: commun.programId,
    image: commun.image,
    url: commun.url,
    disponible: commun.disponible,
    contextAvant: commun.contextAvant,
    description: commun.description,
    bonneRaison: commun.bonneRaison,
    i18n: projeterTraductionsVideo(commun.i18n, extension.i18n),
    titreContextuel: extension.titreContextuel,
    sousTitre: extension.sousTitre,
    serie: extension.serie,
  });
}

function projeterChapitre(commun, extension, extensionsVideos) {
  return sansIndefinis({
    question: commun.question,
    accroche: commun.accroche,
    couleur: commun.couleur,
    accentCouleur: commun.accentCouleur,
    heroImage: commun.heroImage,
    modulesRecommandes: commun.modulesRecommandes?.map(projeterRecommandation),
    videos: commun.videos.map((video) => projeterVideo(video, extensionsVideos[video.id])),
    i18n: projeterTraductionsChapitre(commun.i18n, extension.i18n),
    intro: extension.intro,
    transition: projeterTransition(extension.transition),
  });
}

function filtrerDictionnaire(dictionnaireSource, ids) {
  return Object.fromEntries(Object.entries(dictionnaireSource || {})
    .filter(([id]) => ids.has(id))
    .map(([id, valeur]) => [id, structuredClone(valeur)]));
}

/** Construit l’unique vue destinée au bundle public. */
export function construireContenuPublic(sources) {
  const erreurs = validerContenuEditorial(sources);
  if (erreurs.length > 0) {
    throw new Error(
      `Contenu éditorial invalide :\n- ${erreurs.map(formaterErreurEditoriale).join('\n- ')}`,
    );
  }

  const idsParcours = Object.keys(sources.parcours)
    .filter((id) => sources.parcours[id].statut === 'publie');
  const idsChapitres = new Set(idsParcours.flatMap((id) => sources.parcours[id].chapitres));
  const idsVideos = new Set([...idsChapitres]
    .flatMap((id) => sources.chapitres[id].videos.map((video) => video.id)));

  const parcours = Object.fromEntries(idsParcours.map((id) => [
    id,
    projeterParcours(sources.parcours[id], sources.v1.parcours[id]),
  ]));

  const chapitres = Object.fromEntries([...idsChapitres].map((id) => {
    const commun = sources.chapitres[id];
    const extension = sources.v1.chapitres[id] || {};
    return [id, projeterChapitre(commun, extension, sources.v1.videos)];
  }));

  const v2 = {
    schema: 1,
    parcours: filtrerDictionnaire(sources.v2.parcours, new Set(idsParcours)),
    chapitres: filtrerDictionnaire(sources.v2.chapitres, idsChapitres),
    videos: filtrerDictionnaire(sources.v2.videos, idsVideos),
  };

  const bientot = Object.values(sources.parcours)
    .filter(({ id, statut }) => statut !== 'publie' && id.startsWith('demo-'))
    .slice(0, NOMBRE_CARTES_BIENTOT)
    .map((definition) => ({
      id: definition.id,
      title: definition.title,
      image: definition.meta?.image || '',
    }));

  return structuredClone({ parcours, chapitres, v2, bientot });
}

/**
 * champs-editoriaux.js — les champs éditoriaux, déclarés une seule fois pour les deux
 * consommateurs : les formulaires du back-office, et les emplacements « à renseigner »
 * du front.
 *
 * **Pourquoi ici et pas dans `backoffice/`.** Le front doit pouvoir nommer un champ
 * manquant avec le libellé exact que l'éditeur verra. Or `backoffice/js/store.js` importe
 * déjà `domaine/contenu-editorial.js` : la direction de dépendance autorisée est
 * back-office → `domaine/`, jamais l'inverse. Les déclarations vivent donc dans le
 * domaine, et `backoffice/js/champs.js` les ré-exporte — sa surface d'import ne change
 * pas d'un caractère.
 *
 * Deux tables auraient dérivé au premier renommage, exactement comme les deux panneaux de
 * formulaire avaient dérivé avant d'être mutualisés.
 *
 * **Un seul libellé, en français.** Les intitulés avaient d'abord été traduits eux aussi,
 * et le formulaire allemand devenait plus difficile à lire : on ne reconnaissait plus d'un
 * onglet à l'autre le champ qu'on était en train de remplir. Le back-office est en
 * français ; c'est le contenu qui est bilingue.
 *
 * Les champs STRUCTURELS ne sont pas ici : image, durée, type, identifiant de programme,
 * ordre des chapitres. Ils ne se traduisent pas et ne se signalent pas.
 */

export const CHAMPS_CHAPITRE = [
  { cle: 'question', type: 'texte',
    label: 'Question posée par le chapitre (son titre)',
    placeholder: 'Aux origines de l’univers',
    aide: 'C’est ce qui s’affiche comme titre du chapitre dans le parcours.' },
  { cle: 'accroche', type: 'texte',
    label: 'Accroche courte',
    placeholder: 'Comment tout a commencé.' },
];

/** Champs propres au chapitre dans l'expérience V1. */
export const CHAMPS_V1_CHAPITRE = [
  { cle: 'intro', type: 'paragraphes',
    label: 'Introduction du chapitre' },
];

export const CHAMPS_V1_TRANSITION = [
  { cle: 'texte', type: 'long',
    label: 'Transition de fin de chapitre' },
];

/** Champs propres à une vidéo dans l'expérience V1. */
export const CHAMPS_V1_VIDEO = [
  { cle: 'titreContextuel', type: 'texte', label: 'Titre contextuel' },
  { cle: 'serie', type: 'texte', label: 'Nom de la série' },
  { cle: 'sousTitre', type: 'texte', label: 'Sous-titre' },
];

/** Éditorial du chapitre propre à l'expérience V2. */
export const CHAMPS_V2_CHAPITRE = [
  { cle: 'presentation', type: 'long',
    label: 'Présentation du chapitre',
    placeholder: 'Les traces laissées par le passé permettent de remonter aux origines.',
    aide: 'Relie les programmes et situe leur apport commun dans le parcours. Deux phrases '
      + 'maximum, sans les résumer ni annoncer un acquis.' },
  { cle: 'acquis', type: 'notions',
    label: 'Les notions du chapitre (une par vidéo)',
    placeholder: 'La phrase d’acquis, telle qu’elle s’affiche au verso de la carte',
    aide: 'La question, la vidéo et le timecode ne servent qu’à la carte : sans eux, '
      + 'la phrase seule reste valable.' },
];

export const CHAMPS_VIDEO = [
  { cle: 'titre', type: 'texte', label: 'Titre' },
  { cle: 'description', type: 'long', label: 'Description',
    condition: 'Sert de synopsis sur la page programme. Laissée vide, c’est le texte de '
      + 'contexte qui prend sa place.' },
  { cle: 'contextAvant', type: 'long',
    label: 'Texte de contexte, affiché avant lecture',
    condition: 'Devient aussi le synopsis de la page programme quand la description est vide.' },
  { cle: 'bonneRaison', type: 'long',
    label: 'Bonne raison de voir cette vidéo',
    aide: 'Texte commun affiché par la V1 et la V2 quand il est renseigné.' },
];

/** Éditorial de la vidéo propre à l'expérience V2. */
export const CHAMPS_V2_VIDEO = [
  { cle: 'place', type: 'texte',
    label: 'Sa place dans le chapitre (une phrase de repère)',
    nonAffiche: true,
    aide: 'Ce texte n’est pas affiché actuellement : la maquette de février 2026 a retiré '
      + 'la phrase de situation de la page chapitre. Il reste modifiable, et cela peut évoluer.' },
  { cle: 'moments', type: 'moments',
    label: 'Les moments forts',
    aide: 'Pour chaque moment : timecode, titre court, puis une phrase de contextualisation '
      + 'de 160 caractères maximum qui complète le titre sans le répéter.' },
  { cle: 'retenir', type: 'paragraphes',
    label: 'Ce qu’il faut en retenir' },
  { cle: 'resume', type: 'texte',
    label: 'En une phrase — ce que la vidéo laisse',
    placeholder: 'Rien n’oblige une vie extraterrestre à être humanoïde',
    nonAffiche: true,
    aide: 'Ce texte n’est pas affiché actuellement : au bilan de fin de chapitre, les cartes '
      + 'de notions ont pris la place de sa ligne. Il reste modifiable, et cela peut évoluer.' },
  { cle: 'pont', type: 'long',
    label: 'Transition vers la vidéo suivante' },
];

/**
 * La phrase des champs facultatifs, écrite une seule fois pour les deux qui la portent.
 *
 * Les trois copies avaient déjà divergé, et toutes annonçaient qu'aucun repère n'apparaîtrait.
 * Ce n'est plus vrai depuis le 24 août 2026 : la bannière du parcours porte un repère
 * « à renseigner » sur ses trois textes, celui-ci compris, et ce repère mène au champ.
 * Facultatif veut donc dire « la page se tient sans », pas « personne ne verra qu'il manque ».
 */
const FACULTATIF = 'Facultatif : la page se tient sans. Vide, elle affiche à sa place un '
  + 'repère « à renseigner » qui ramène ici.';

export const CHAMPS_PARCOURS = [
  { cle: 'title', type: 'texte', label: 'Titre' },
  { cle: 'subtitle', type: 'texte', label: 'Sous-titre',
    condition: FACULTATIF },
  /* Ces aides ne redisent plus OÙ le champ s'affiche : `AFFICHAGES` le dit, et un test le
     confronte à la source. Elles gardent ce qu'aucune liste d'écrans ne dira — le rôle du
     texte, et ce qui le distingue de son voisin. */
  { cle: 'theme', type: 'texte', label: 'Thématique' },
];

/** Ces deux-là vivent dans `meta`, pas à la racine du parcours. */
export const CHAMPS_PARCOURS_META = [
  { cle: 'accroche', type: 'long', label: 'Accroche longue',
    aide: 'Le paragraphe qui présente le parcours. Sur les cartes, il sert de description ; '
      + 'en page de parcours, il vient sous le sous-titre.',
    condition: FACULTATIF },
];

/** La seule donnée de parcours encore servie exclusivement par la V1. */
export const CHAMPS_V1_CONCLUSION = [
  { cle: 'texte', type: 'paragraphes', label: 'Texte de conclusion du parcours' },
];

/** Les clés d'une liste de champs, pour les compteurs. */
export const CLES = (liste) => liste.map((c) => c.cle);

/* `nonAffiche: true` marque un champ qu'**aucun écran ne rend aujourd'hui**. Le champ reste
   saisissable — la maquette peut le reprendre — mais l'éditeur doit le savoir avant d'y
   passer du temps. Le marqueur n'est pas décoratif : un test refuse qu'un écran V2 lise un
   champ ainsi marqué, donc rendre le champ à l'écran oblige à retirer le marqueur.

   Ces tables ne sont **pas** le schéma du contenu. `domaine/contenu-editorial.js` tient ses
   propres listes de clés acceptées, sous des noms voisins, et c'est voulu : le schéma dit ce
   que le JSON accepte, ces tables disent ce que l'éditeur voit. Retirer un champ d'un
   formulaire ne doit pas rendre illégal le contenu déjà écrit. Un test garde le seul sens de
   dérive qui nuit : un champ proposé ici que le schéma refuserait. */


/* ─────────────── Nommer et atteindre un champ ─────────────── */

/**
 * Les entités adressables, telles que le front les nomme. Le nom est court parce qu'il
 * voyage dans les appels de composants ; la liste est ici pour qu'il n'y en ait qu'une.
 */
export const PAR_ENTITE = Object.freeze({
  chapitre: CHAMPS_CHAPITRE,
  v1Chapitre: CHAMPS_V1_CHAPITRE,
  v1Transition: CHAMPS_V1_TRANSITION,
  v1Video: CHAMPS_V1_VIDEO,
  v2Chapitre: CHAMPS_V2_CHAPITRE,
  video: CHAMPS_VIDEO,
  v2Video: CHAMPS_V2_VIDEO,
  parcours: CHAMPS_PARCOURS,
  parcoursMeta: CHAMPS_PARCOURS_META,
  v1Conclusion: CHAMPS_V1_CONCLUSION,
});

/**
 * Le libellé d'un champ, tel que l'éditeur le verra dans le formulaire — ou `null` si le
 * champ n'existe pas. Un `null` plutôt qu'une exception : un emplacement qui ne sait pas
 * nommer son champ vaut mieux qu'un écran cassé.
 */
export function libelleDuChamp(entite, cle) {
  return PAR_ENTITE[entite]?.find((champ) => champ.cle === cle)?.label ?? null;
}

/* ─────────────── Où chaque champ s'affiche ─────────────── */

/**
 * Les dossiers où vivent les écrans et composants susceptibles d'afficher un contenu **en
 * Version 2**. Les dossiers `v1/` en sont exclus volontairement : une liste vide signifie
 * « la Version 1 seule l'affiche », et les y inclure effacerait cette distinction.
 *
 * Le périmètre a été trop étroit deux fois, et chaque fois la table a menti par omission :
 *
 *  · sans `screens/`, elle affirmait que le titre d'un parcours ne s'affichait pas au
 *    catalogue ;
 *  · sans `components/`, `data/` ni `experiences/v2/`, elle ignorait `ParcoursCard` — que
 *    le catalogue et l'accueil montent, donc l'endroit le plus visible du produit. Elle
 *    déclarait du coup l'accroche longue « affichée par la Version 1 seulement », alors
 *    qu'elle est la description de chaque carte de parcours.
 *
 * Déclaré ici pour que le test et le script de relevé lisent le même périmètre.
 */
export const DOSSIERS_ECRANS = Object.freeze([
  'src/screens/', 'src/screens/v2/',
  'src/components/', 'src/components/v2/',
  'src/data/', 'src/experiences/v2/',
]);

/**
 * Les écrans et composants de la Version 2, nommés comme un éditeur les voit.
 *
 * C'est la seule partie qui ne se déduit pas : le nom d'un fichier React ne dit pas à
 * quelle page il correspond pour quelqu'un qui écrit. Tout le reste — quel champ va où —
 * est vérifié contre la source par `champs-editoriaux.test.js`.
 */
const NOMS_ECRANS = Object.freeze({
  AtomMap: 'carte des atomes',
  AutresParcours: 'cartes « Autres parcours »',
  CarteChapitre: 'cartes de l’itinéraire',
  CarteNotion: 'cartes de notions',
  CarteParcoursReprise: 'carte de reprise',
  CatalogueScreen: 'catalogue',
  ChapterPageScreen: 'page du chapitre',
  CompletionNudge: 'invitation à terminer',
  EmailPreviewScreen: 'aperçu de l’e-mail de relance',
  EspacePersoScreen: 'espace personnel',
  FinParcoursScreen: 'bilan de fin de parcours',
  HomeScreen: 'accueil',
  MiniRoadmap: 'mini-itinéraire',
  ParcoursCard: 'cartes de parcours (catalogue, accueil)',
  ParcoursHubScreen: 'page du parcours',
  ParcoursPanel: 'panneau du parcours',
  ProgrammeScreen: 'page programme',
  ReengagementBanner: 'bandeau de relance',
  ReengagementModal: 'fenêtre de relance',
  ReengagementWelcomeScreen: 'écran de retour',
  annuaire: 'annuaire des écrans',
  curiosite: 'panneau « Votre curiosité »',
});

/**
 * Les écrans de la Version 2 qui rendent chaque champ.
 *
 * Deux tiers des champs ne disaient pas où ils s'affichaient, et un éditeur ne pouvait
 * donc pas savoir ce que sa saisie allait changer. Écrire la réponse dans chaque aide
 * l'aurait fait dériver au premier remaniement de maquette : cette table est **contrôlée
 * contre la source**, avec les motifs de lecture que le test employait déjà pour refuser
 * qu'un écran lise un champ marqué non affiché.
 *
 * Une liste vide n'est pas un oubli, et le test le vérifie aussi. Elle signifie soit
 * « la Version 1 seule l'affiche » — c'est le cas des deux accroches, dont la bannière du
 * hub montre le sous-titre à leur place — soit, avec le marqueur `nonAffiche`, « aucun
 * écran ne l'affiche ».
 */
const AFFICHAGES = Object.freeze({
  'chapitre.question': ['AtomMap', 'CarteChapitre', 'ChapterPageScreen', 'CompletionNudge', 'EmailPreviewScreen', 'HomeScreen', 'MiniRoadmap', 'ParcoursCard', 'ParcoursPanel', 'ProgrammeScreen', 'ReengagementBanner', 'ReengagementModal', 'ReengagementWelcomeScreen', 'annuaire'],
  'chapitre.accroche': [],
  'v1Chapitre.intro': [],
  'v1Transition.texte': [],
  'v1Video.titreContextuel': [],
  'v1Video.serie': [],
  'v1Video.sousTitre': [],
  'v2Chapitre.presentation': ['AtomMap', 'CarteChapitre', 'ParcoursPanel'],
  'v2Chapitre.acquis': ['ChapterPageScreen', 'FinParcoursScreen'],
  'video.titre': ['AtomMap', 'CarteNotion', 'ChapterPageScreen', 'CompletionNudge', 'EmailPreviewScreen', 'EspacePersoScreen', 'MiniRoadmap', 'ParcoursCard', 'ParcoursPanel', 'ProgrammeScreen', 'ReengagementBanner', 'ReengagementModal', 'ReengagementWelcomeScreen'],
  'video.description': ['ProgrammeScreen'],
  'video.contextAvant': ['ProgrammeScreen'],
  'video.bonneRaison': ['AtomMap', 'ChapterPageScreen'],
  'v2Video.place': [],
  'v2Video.moments': ['ChapterPageScreen', 'ProgrammeScreen'],
  'v2Video.retenir': ['ChapterPageScreen'],
  'v2Video.resume': [],
  'v2Video.pont': ['AtomMap', 'ChapterPageScreen'],
  'parcours.title': ['AtomMap', 'AutresParcours', 'CatalogueScreen', 'ChapterPageScreen', 'FinParcoursScreen', 'HomeScreen', 'ParcoursCard', 'ParcoursHubScreen', 'ProgrammeScreen', 'ReengagementWelcomeScreen', 'annuaire', 'curiosite'],
  'parcours.subtitle': ['CarteParcoursReprise', 'ParcoursHubScreen'],
  'parcours.theme': ['AutresParcours', 'CarteParcoursReprise', 'ChapterPageScreen', 'ParcoursHubScreen', 'ProgrammeScreen', 'curiosite'],
  'parcoursMeta.accroche': ['ParcoursCard', 'ParcoursHubScreen'],
  'v1Conclusion.texte': [],
});

/* Trois entités rangent leur champ dans un objet, et c'est ce parent que la source nomme :
   `module.transition?.texte`, `parcours.conclusion?.texte`, `tField(p, 'meta.accroche')`.
   Chercher « texte » ou « accroche » seul n'aurait rien trouvé — ou trop : sans le parent,
   `meta.accroche` passait pour l'accroche du chapitre, qui porte la même clé. */
const PARENT_DANS_LE_CONTENU = Object.freeze({
  v1Transition: 'transition',
  v1Conclusion: 'conclusion',
  parcoursMeta: 'meta',
});

/**
 * Les motifs qui prouvent qu'un écran lit un champ.
 *
 * Volontairement stricts, et partagés entre la table et ses tests : un motif large
 * ferait passer `.title` de n'importe quel objet pour une lecture du titre de parcours,
 * et la carte donnée à l'éditeur serait fausse dans le sens le plus trompeur — celui qui
 * promet un affichage.
 */
/* Les seuls porteurs que le code emploie pour un contenu éditorial. Une liste fermée, et
   c'est elle qui distingue une preuve d'une coïncidence : `\.title` seul aurait fait passer
   n'importe quel objet pour un parcours. */
const PORTEURS = [
  'p', 'parcours', 'currentParcours', 'module', 'mod', 'ch', 'chapitre', 'video', 'v',
  'ed', 'edChapitre', 'item',
];

/* ⚠️ Limite connue et assumée : deux entités peuvent porter la même clé, et la source les
   lit parfois par le même accesseur. `question` est à la fois la question commune du
   chapitre et celle de l'itinéraire (extension V2) ; leurs listes coïncident donc, et
   l'union est ce qui se prouve. Un champ n'apparaît jamais comme affiché alors qu'il ne
   l'est pas — l'erreur possible est d'en montrer un de trop dans la liste voisine, jamais
   d'en promettre un qui n'existe pas. */

/**
 * La source privée de ses commentaires : **une mention n'est pas un affichage**.
 *
 * La bannière du hub explique en commentaire pourquoi elle n'emploie *pas* `meta.accroche`
 * — et c'est cette phrase qui la faisait compter comme un écran qui l'affiche. Le contraire
 * exact de ce que la table doit dire.
 *
 * Le garde sur `//` évite de couper une adresse : `https://…` n'ouvre pas un commentaire.
 */
export function sansCommentaires(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function motifsDeLecture(cle, entite) {
  const parent = PARENT_DANS_LE_CONTENU[entite];
  /* Avec un parent, les deux formes que la source emploie, et elles seules : l'accès direct
     et le chemin pointé passé à l'accesseur de traduction. */
  if (parent) {
    return [
      new RegExp(`\\b${parent}\\??\\.${cle}\\b`),
      new RegExp(`tField\\([^)]*['"\`]${parent}\\.${cle}['"\`]`),
    ];
  }
  return [
    new RegExp(`tField\\([^)]*['"\`]${cle}['"\`]`),
    new RegExp(`champ="${cle}"`),
    new RegExp(`\\b(?:${PORTEURS.join('|')})\\??\\.${cle}\\b`),
  ];
}

/**
 * Le même constat, côté Version 1, où la lecture est un accès direct : la construction
 * publique y fusionne l'extension dans l'objet commun, d'où `video.titreContextuel` et
 * `module.intro` plutôt qu'un accesseur nommé.
 *
 * Le motif est **plus large**, et c'est assumé : il ne sert pas à dresser une carte mais à
 * répondre à une seule question — « quelque chose en Version 1 lit-il ce champ ? ». Un
 * faux positif y affaiblirait un garde-fou, là où il aurait promis un affichage inexistant
 * dans la carte de la Version 2.
 */
export function motifsDeLectureV1(cle, entite) {
  const parent = PARENT_DANS_LE_CONTENU[entite];
  return [new RegExp(`\\b${parent ? `${parent}\\??\\.` : ''}${cle}\\b`)];
}

/** La table brute, pour le test qui la confronte à la source. */
export function affichagesDeclares() {
  return AFFICHAGES;
}

/**
 * Les clés d'une entité qu'il vaut la peine d'écrire et de traduire : celles qu'au moins
 * un écran de la Version 2 affiche.
 *
 * **Décision du 18 août 2026 : le contenu nouveau n'est plus écrit ni traduit pour la
 * Version 1**, gelée côté conception comme côté éditorial. Vingt-huit des quarante
 * chapitres n'avaient déjà aucun contenu V1 — la pratique avait tranché avant la décision.
 *
 * Les compteurs de langue et l'écran des traductions passent donc par ici. Ils annonçaient
 * 314 champs à traduire dont 45 pour la V1 seule et 52 sans emplacement : près d'un tiers
 * d'un retard que personne ne verrait jamais.
 *
 * Une seule règle, et elle se déduit de la table vérifiée : un champ compte s'il s'affiche.
 * Elle écarte du même coup les champs marqués `nonAffiche`, dont la liste est vide.
 */
export function clesAffichees(entite) {
  return (PAR_ENTITE[entite] || [])
    .filter((champ) => (AFFICHAGES[`${entite}.${champ.cle}`] || []).length > 0)
    .map((champ) => champ.cle);
}

/**
 * Où l'éditeur verra ce champ, dit en une ligne — ou `null` s'il n'y a rien à dire.
 *
 * `nonAffiche` a déjà sa marque sur le libellé : on ne la répète pas ici.
 */
/**
 * Les replis d'affichage : quand un champ vide en laisse un autre prendre sa place.
 *
 * Ce sont les règles qui surprennent, parce qu'elles rendent un champ invisible sans qu'il
 * soit vide — la description d'une vidéo cède la place au contexte qui la précède. Elles
 * sont donc **prouvées contre la source** par un test, là où les autres conditions restent
 * des phrases déclarées.
 *
 * Le repli du titre de parcours a disparu le 25 août 2026 avec `teaserTitle` : c'était le
 * plus déroutant des deux, et le supprimer valait mieux que l'expliquer une fois de plus.
 */
const REPLIS = Object.freeze([
  Object.freeze({ champ: 'video.description', defaut: 'video.contextAvant' }),
]);

export function replisDeclares() {
  return REPLIS;
}

/**
 * La règle conditionnelle d'un champ, dite à l'éditeur — ou `null` s'il n'y en a pas.
 *
 * « Où ce champ s'affiche » ne suffisait pas : il s'affiche *sous condition*, et la
 * condition la plus déroutante est le repli. Un éditeur qui écrit un titre accrocheur fait
 * disparaître le titre des cartes, sans que rien ne le lui dise.
 */
export function conditionDuChamp(entite, cle) {
  return PAR_ENTITE[entite]?.find((champ) => champ.cle === cle)?.condition ?? null;
}

/** Tous les endroits où ce champ s'affiche, nommés pour un éditeur. */
export function ecransQuiAffichent(entite, cle) {
  return (AFFICHAGES[`${entite}.${cle}`] || []).map((nom) => NOMS_ECRANS[nom]).filter(Boolean);
}

/* Un titre de parcours s'affiche à treize endroits. Les nommer tous sous le champ donne une
   ligne qu'on ne lit pas : la ligne en cite quelques-uns et compte le reste, l'infobulle
   porte la liste entière. */
const ECRANS_CITES = 4;

export function ouSaffiche(entite, cle) {
  const ecrans = AFFICHAGES[`${entite}.${cle}`];
  if (!ecrans) return null;
  const declaration = PAR_ENTITE[entite]?.find((champ) => champ.cle === cle);
  if (declaration?.nonAffiche) return null;
  if (!ecrans.length) return 'Affiché par la Version 1 seulement.';

  const noms = ecransQuiAffichent(entite, cle);
  if (noms.length <= ECRANS_CITES) return `Affiché : ${noms.join(' · ')}.`;
  const reste = noms.length - ECRANS_CITES;
  return `Affiché à ${noms.length} endroits : ${noms.slice(0, ECRANS_CITES).join(' · ')} `
    + `et ${reste} autre${reste > 1 ? 's' : ''}.`;
}

/**
 * L'adresse de back-office qui vise un champ précis :
 *
 *     #<fiche>/<id>[/video/<videoId>][/champ/<cle>]
 *
 * Les segments optionnels sont indépendants, et le routeur ignore ceux qui ne résolvent
 * rien — une adresse périmée ouvre la fiche plutôt que de casser.
 *
 * Rend `null` sans fiche ni identifiant : mieux vaut pas de lien qu'un lien qui ne mène
 * nulle part.
 */
export function adresseDeSaisie({ fiche, id, video, champ } = {}) {
  if (!fiche || !id) return null;
  const segments = [fiche, encodeURIComponent(id)];
  if (video) segments.push('video', encodeURIComponent(video));
  if (champ) segments.push('champ', encodeURIComponent(champ));
  return `#${segments.join('/')}`;
}

/**
 * ecran-parcours.js — liste des parcours, et fiche d'un parcours.
 *
 * Deuxième temps du travail éditorial : les chapitres existent déjà, on les
 * assemble. La fiche a donc deux zones — l'assemblage, et les méta du parcours.
 *
 * Rien de ce qui se déduit des chapitres n'est saisissable : nombre de chapitres,
 * nombre de vidéos et durée totale se recalculent à chaque modification de
 * l'assemblage. Une valeur saisie à la main finirait par mentir.
 */

import {
  store, modifie, parcoursUtilisant, creerParcours, supprimerParcours, parcoursParRecence,
  chapitresParRecence, rattacherChapitre, detacherChapitre, deplacerChapitre, titreDuParcours,
} from './store.js';
import {
  h, vider, message, ongletsLangue, manquantsParcours, rendreTraduisibles, choixImage,
  listeFiltrable, texteLocalise, champNombre, lienPrototype,
} from './ui.js';

// Le compte de ce qui reste à écrire dans une langue, et le texte où chercher un
// chapitre : la même règle que dans l'écran chapitre, donc le même code.
import {
  comptesLangue, creerChapitreNomme, foinChapitre, leverProvisoire,
} from './ecran-chapitre.js';
import {
  CHAMPS_PARCOURS, CHAMPS_PARCOURS_META, CHAMPS_V1_CONCLUSION, clesAffichees,
} from './champs.js';
import { dureeVideos } from '../../react-app-desktop/src/utils/duree.js';
import {
  formaterErreurEditoriale,
  validerContenuEditorial,
} from '../../react-app-desktop/src/domaine/contenu-editorial.js';

/** Les vidéos de tous les chapitres rattachés, dans l'ordre. */
function videosDuParcours(p) {
  return (p.chapitres || []).flatMap((cid) => store.chapitres[cid]?.videos || []);
}

/* ═══════════════════════════ Liste ═══════════════════════════ */

export function listeParcours(aller) {
  // Du plus récent au plus ancien, comme les chapitres : le parcours qu'on vient de
  // créer est celui qu'on veut rouvrir.
  const ids = parcoursParRecence();

  const rangee = (pid) => {
    const p = store.parcours[pid];
    const nbCh = (p.chapitres || []).length;
    const videos = videosDuParcours(p);
    const publie = p.statut === 'publie';
    return h('li.bo-rangee', {},
      h('span.bo-pastille' + (publie ? '.is-publie' : ''), {},
        publie ? 'publié' : 'brouillon'),
      h('div.bo-rangee-corps', {},
        h('p.bo-rangee-titre', {},
          texteLocalise(p, 'title') || h('em', {}, 'sans titre')),
        h('p.bo-rangee-meta', {},
          [
            `${nbCh} chapitre${nbCh > 1 ? 's' : ''}`,
            `${videos.length} vidéo${videos.length > 1 ? 's' : ''}`,
            dureeVideos(videos),
          ].filter(Boolean).join(' · '),
        ),
      ),
      h('div.bo-rangee-actions', {},
        h('button.bo-btn', { type: 'button', onclick: () => aller(`parcours/${pid}`) }, 'Modifier'),
        h('button.bo-btn.bo-btn--danger', {
          type: 'button',
          onclick: () => demanderSuppression(pid, () => aller('parcours')),
        }, 'Supprimer'),
      ),
    );
  };

  const publies = ids.filter((id) => store.parcours[id].statut === 'publie');

  return h('section.bo-ecran', {},
    h('header.bo-ecran-tete', {},
      h('div', {},
        h('h1.bo-titre', {}, 'Parcours'),
        h('p.bo-sous-titre', {},
          `${ids.length} parcours, dont ${publies.length} marqué${publies.length > 1 ? 's' : ''} `
          + `comme publié${publies.length > 1 ? 's' : ''}.`),
      ),
      h('button.bo-btn.bo-btn--primaire', {
        type: 'button',
        onclick: () => aller(`parcours/${creerParcours()}`),
      }, 'Créer un parcours'),
    ),
    ids.length
      ? h('ul.bo-liste-rangees', {}, ids.map(rangee))
      : message('Aucun parcours pour l’instant.', 'info'),
  );
}

/** Supprimer un parcours publié mérite un avertissement de plus. */
function demanderSuppression(pid, apres) {
  const p = store.parcours[pid];
  let texte = `Supprimer définitivement « ${titreDuParcours(p, pid)} » ?`;
  if (p.statut === 'publie') {
    texte += '\n\n⚠️ Ce parcours est marqué PUBLIÉ : ce changement sera pris en '
      + 'compte dans le prototype à la prochaine synchronisation.';
  }
  const nbCh = (p.chapitres || []).length;
  if (nbCh) {
    texte += `\n\nSes ${nbCh} chapitre${nbCh > 1 ? 's' : ''} ne sont PAS supprimés : `
      + 'ils retournent dans la réserve et restent réutilisables.';
  }
  if (window.confirm(texte)) {
    supprimerParcours(pid);
    apres();
  }
}

/* ═══════════════════════════ Fiche ═══════════════════════════ */

/** Les intitulés de la fiche, en français dans les deux onglets (voir champs.js). */
const L = {
  infos: 'Informations du parcours',
  image: 'Image de couverture',
  chapitres: 'Les chapitres de ce parcours',
  dansCeParcours: 'Dans ce parcours',
  disponibles: 'Chapitres disponibles',
};

/** La règle des deux langues, dite dans les deux panneaux : elle joue des deux côtés. */
const AIDE_DEUX_LANGUES = 'Un champ laissé vide dans une langue affiche le texte de '
  + 'l’autre. On peut donc écrire ce parcours en allemand d’abord et le traduire ensuite.';

export function ficheParcours(pid, aller) {
  const p = store.parcours[pid];
  if (!p) return message(`Parcours « ${pid} » introuvable.`, 'erreur');
  p.chapitres = p.chapitres || [];

  /* Le titre de la page suit la saisie, dans l'une ou l'autre langue : monter un
     parcours en allemand et le voir rester « Nouveau parcours » donnerait
     l'impression que rien n'a été pris. */
  const titre = h('h1.bo-titre');
  const majTitre = () => {
    vider(titre);
    titre.append(texteLocalise(p, 'title') || 'Nouveau parcours');
  };
  majTitre();

  const zoneRepere = h('div.bo-repere');
  const majReperes = () => {
    vider(zoneRepere);
    zoneRepere.append(...reperesCalcules(p));
    const controles = etatDePublication(pid);
    if (controles) zoneRepere.append(controles);
  };
  majReperes();

  /* `let` : le constructeur du panneau est appelé pendant l'appel à `ongletsLangue`,
     donc avant que la variable ne soit affectée. */
  let onglets;
  const contexte = {
    majReperes, majTitre, majCompteurs: () => onglets?.majCompteurs?.(), aller,
  };
  onglets = ongletsLangue({
    compteur: (langue) => comptesParcours(pid, langue),
    construire: (langue) => panneauParcours(pid, langue, contexte),
  });

  return h('section.bo-ecran', {},
    h('header.bo-ecran-tete', {},
      h('div', {},
        h('button.bo-btn-lien', { type: 'button', onclick: () => aller('parcours') },
          '‹ Tous les parcours'),
        titre,
        zoneRepere,
      ),
      h('div.bo-ecran-tete-actions', {},
        // Sur un brouillon la page n'est pas en ligne : `lienPrototype` rend alors `null`.
        p.statut === 'publie' ? lienPrototype({ parcours: pid }) : null,
        basculeStatut(p, pid, () => aller(`parcours/${pid}`)),
      ),
    ),
    onglets,
  );
}

/**
 * Le formulaire du parcours, dans une langue.
 *
 * **Une seule fonction pour les deux onglets.** L'onglet allemand ne montrait
 * auparavant qu'une liste de chapitres en lecture seule : on ne pouvait pas monter un
 * parcours en partant de l'allemand, alors que c'est précisément ce que demande
 * l'équipe éditoriale. L'assemblage — glisser-déposer, ordre, rattachement — est donc
 * là dans les deux langues, et agit sur les mêmes données : un chapitre rattaché
 * depuis l'allemand est rattaché, point.
 */
function panneauParcours(pid, langue, ctx) {
  const p = store.parcours[pid];

  /* Les champs encore remplis d'un texte d'attente. Le repère disparaît dès qu'un éditeur
     écrit par-dessus, comme sur la fiche chapitre.

     Déclaré **ici** et non dans `ficheParcours` : les deux sont des fonctions sœurs, et
     `panneauParcours` n'est appelée par sa voisine qu'à travers `ongletsLangue`. Un `const`
     de l'une n'est donc pas visible depuis l'autre, et la fiche entière levait un
     `ReferenceError` au montage du premier onglet. `p.provisoire` reste la source : chaque
     onglet reconstruit son ensemble, et `leverProvisoire` écrit dans la donnée. */
  const provisoires = new Set(p.provisoire || []);

  const zoneAssemblage = h('div.bo-assemblage');
  /* Les images proposées en couverture, et le compte de notions déjà écrites, viennent
     des chapitres rattachés : rattacher un chapitre doit les mettre à jour tout de
     suite, sans passer par un enregistrement. */
  let galerieImage = null;
  let champNotions = null;
  const redessiner = () => {
    vider(zoneAssemblage);
    zoneAssemblage.append(...assemblage(pid, langue, redessiner, ctx));
    galerieImage?.rafraichir();
    champNotions?.rafraichir();
    // Le nombre de chapitres, la durée, les contrôles de publication et le compte de
    // ce qui reste à traduire dépendent tous de l'assemblage.
    ctx.majReperes();
    ctx.majCompteurs();
  };

  /* Le titre de la page et le compte de l'onglet se recalculent à la frappe :
     ce sont les seuls retours qui disent que la saisie a été prise. */
  const apresSaisie = (cle, langueSaisie) => () => {
    // Une saisie française remplace le texte d'attente : le repère tombe.
    if (langueSaisie !== 'de') {
      leverProvisoire(p, cle);
      provisoires.delete(cle);
    }
    if (cle === 'title') ctx.majTitre();
    ctx.majCompteurs();
  };
  const apresSpecifique = () => () => ctx.majCompteurs();

  /* L'assemblage d'abord, les textes ensuite.
     Cet écran est le deuxième temps du travail éditorial : les chapitres existent déjà,
     on les assemble. L'assemblage arrivait pourtant après 1 340 px de formulaire, donc
     après un défilement, alors que c'est le sujet de la fiche. */
  const blocs = [
    h('div.bo-bloc', {},
      h('h2.bo-bloc-titre', {}, L.chapitres),
      h('p.bo-bloc-aide', {},
        'Glissez un chapitre d’une colonne à l’autre, ou servez-vous des flèches. '
        + 'L’ordre à gauche est celui du parcours, et il donne leur numéro aux chapitres. '
        + 'Les textes d’un chapitre se traduisent dans sa fiche — un chapitre peut '
        + 'servir dans plusieurs parcours.'),
      zoneAssemblage,
    ),

    h('div.bo-bloc', {},
      h('h2.bo-bloc-titre', {}, L.infos),
      h('p.bo-bloc-aide', {}, AIDE_DEUX_LANGUES),
      ...rendreTraduisibles(CHAMPS_PARCOURS, p, langue,
        { entite: 'parcours', provisoires, apres: apresSaisie }),
      /* La traduction de `meta` vit dans `p.i18n.de.meta`, et non dans
         `p.meta.i18n.de` : la cible et le repère sont donc dits explicitement. */
      ...rendreTraduisibles(CHAMPS_PARCOURS_META, metaDe(p), langue, {
        entite: 'parcoursMeta',
        cible: langue === 'de' ? metaAllemand(p) : metaDe(p),
        autre: langue === 'de' ? metaDe(p) : p.i18n?.de?.meta,
        apres: apresSaisie,
      }),
      /* Hors du circuit de traduction : un compte de notions est le même dans les
         deux langues, comme l'image du parcours.

         Le champ reste saisi, et c'est voulu : la maquette présente ce compte comme un
         engagement éditorial, pas comme un décompte technique (voir `ReperesParcours`).
         Mais l'éditeur devait le trouver seul, en ouvrant les fiches des chapitres
         rattachés. Le nombre réellement écrit est donc dit sous le champ : reste à le
         confirmer, ou à en choisir un autre. */
      (champNotions = champNombre({
        label: 'Nombre de notions clés',
        objet: p, cle: 'notionsCles',
        placeholder: String(notionsEcrites(p) || 9),
        provisoire: provisoires.has('notionsCles'),
        // Fonction : le compte change dès qu'on rattache ou détache un chapitre.
        aide: () => aideNotions(p),
        onApres: apresSaisie('notionsCles', langue),
      })),
      (galerieImage = choixImage({
        label: L.image,
        objet: metaDe(p), cle: 'image',
        // Fonction : la liste change dès qu'on rattache ou détache un chapitre.
        propositions: () => imagesDisponibles(p, langue),
        aide: 'Proposées : les images des chapitres rattachés et de leurs vidéos.',
      })),
    ),

    blocConclusionV1(pid, langue, apresSpecifique),
  ];

  const racine = h('div.bo-formulaire-parcours', {}, ...blocs);
  redessiner();
  return [racine];
}

/** Combien de notions les chapitres rattachés portent réellement. */
function notionsEcrites(p) {
  return (p.chapitres || []).reduce(
    (n, cid) => n + (store.experiences.v2.chapitres[cid]?.acquis?.length || 0),
    0,
  );
}

function aideNotions(p) {
  const ecrites = notionsEcrites(p);
  const compte = ecrites
    ? `${ecrites} notion${ecrites > 1 ? 's' : ''} ${ecrites > 1 ? 'sont écrites' : 'est écrite'} `
      + 'dans les chapitres rattachés.'
    : 'Aucune notion n’est encore écrite dans les chapitres rattachés.';
  return `${compte} Affiché en repère de la page parcours et de la page programme. `
    + 'Laissé vide, le repère n’apparaît pas.';
}

/**
 * La conclusion, seule donnée du parcours propre à la Version 1.
 *
 * Elle vivait derrière un sélecteur à deux boutons, en bas d'un écran de 4 600 px, dont
 * l'autre côté affichait « Aucun champ propre au parcours ». Deux boutons pour choisir
 * entre un champ et rien : le sélecteur garde son sens sur la fiche chapitre, où les deux
 * versions ont réellement des champs, mais pas ici. Le champ est donc simplement là, et
 * son titre dit à quoi il sert.
 */
function blocConclusionV1(pid, langue, apres) {
  const extensions = store.experiences.v1.parcours;
  const extension = extensions[pid] || (extensions[pid] = {});
  extension.conclusion = extension.conclusion || {};

  const conclusionAllemande = () => {
    extension.i18nConclusion = extension.i18nConclusion || {};
    extension.i18nConclusion.de = extension.i18nConclusion.de || {};
    return extension.i18nConclusion.de;
  };

  return h('details.bo-bloc.bo-bloc--replie', {},
    h('summary.bo-bloc-titre', {}, 'Conclusion du parcours — Version 1 seulement'),
    h('p.bo-bloc-aide', {},
      'Affichée par la Version 1 seulement, le scroll continu. Le contenu nouveau n’est '
      + 'plus écrit ni traduit pour elle. La Version 2 n’a aucun champ propre au parcours : '
      + 'les informations ci-dessus la servent.'),
    ...rendreTraduisibles(CHAMPS_V1_CONCLUSION, extension.conclusion, langue, {
      entite: 'v1Conclusion',
      cible: langue === 'de' ? conclusionAllemande() : extension.conclusion,
      autre: langue === 'de' ? extension.conclusion : extension.i18nConclusion?.de,
      apres,
    }),
  );
}

/**
 * Ce qui manque au parcours lui-même dans une langue.
 *
 * Seulement les champs qu'un écran affiche, et **pas** la conclusion V1 : le contenu
 * nouveau n'est plus écrit ni traduit pour la Version 1, et un compteur qui l'inclut
 * annonce un travail qui ne se verra pas.
 */
function comptesParcours(pid, langue) {
  return manquantsParcours(
    store.parcours[pid],
    langue,
    clesAffichees('parcours'),
    clesAffichees('parcoursMeta'),
  );
}

/** `meta` n'existe pas sur un parcours neuf. */
function metaDe(p) {
  p.meta = p.meta || {};
  return p.meta;
}

function metaAllemand(p) {
  p.i18n = p.i18n || {};
  p.i18n.de = p.i18n.de || {};
  p.i18n.de.meta = p.i18n.de.meta || {};
  return p.i18n.de.meta;
}

/** Images candidates pour la couverture : celles des chapitres et de leurs vidéos. */
function imagesDisponibles(p, langue) {
  const vues = new Set();
  const out = [];
  (p.chapitres || []).forEach((cid) => {
    const ch = store.chapitres[cid];
    if (!ch) return;
    if (ch.heroImage && !vues.has(ch.heroImage)) {
      vues.add(ch.heroImage);
      out.push({ image: ch.heroImage, titre: texteLocalise(ch, 'question', langue) || cid });
    }
    (ch.videos || []).forEach((v) => {
      if (v.image && !vues.has(v.image)) {
        vues.add(v.image);
        out.push({ image: v.image, titre: texteLocalise(v, 'titre', langue) || v.programId });
      }
    });
  });
  return out;
}

/* ─────────────── Statut et repères calculés ─────────────── */

/**
 * Le libellé d'un groupe de bloquants, au pluriel du compte.
 *
 * La **nature** du défaut vient du validateur, qui est du domaine ; la façon de le dire à
 * l'éditeur appartient à cet écran. Une nature sans entrée ici n'est pas regroupée : elle
 * garde sa phrase, ce qui est le bon repli — jamais une ligne muette.
 */
const LIBELLES_GROUPES = Object.freeze({
  'video-programid-vide': (n) => `${n} vidéos sans identifiant de programme ARTE`,
  'video-programid-invalide': (n) => `${n} vidéos à l’identifiant de programme ARTE invalide`,
  'video-titre-vide': (n) => `${n} vidéos sans titre français`,
  'video-image-vide': (n) => `${n} vidéos sans image`,
  'chapitre-question-vide': (n) => `${n} chapitres sans question française`,
});

/**
 * Regroupe les bloquants qui se répètent, en gardant l'ordre de leur première apparition.
 *
 * Les huit parcours de démonstration n'ont que des vidéos réduites à un identifiant : le
 * contrôle en tirait trente phrases sur une seule fiche, trois par vidéo. Un mur de rouge
 * permanent noie tout, y compris le bloquant isolé d'un parcours qu'on veut publier.
 *
 * **Un groupe d'une seule cible garde sa phrase.** « 1 vidéo sans titre français » en dirait
 * moins que la phrase qui nomme la vidéo — le regroupement ne se déclenche donc que là où il
 * y a effectivement de la répétition.
 */
function regrouperBloquants(erreurs) {
  const groupes = [];
  const parNature = new Map();

  for (const { nature, phrase } of erreurs) {
    const libelle = nature && LIBELLES_GROUPES[nature];
    if (!libelle) {
      groupes.push({ resume: phrase, phrases: [] });
      continue;
    }
    if (!parNature.has(nature)) {
      const groupe = { nature, phrases: [] };
      parNature.set(nature, groupe);
      groupes.push(groupe);
    }
    parNature.get(nature).phrases.push(phrase);
  }

  return groupes.map((groupe) => {
    if (!groupe.nature) return groupe;
    const { nature, phrases } = groupe;
    if (phrases.length === 1) return { resume: phrases[0], phrases: [] };
    return { resume: LIBELLES_GROUPES[nature](phrases.length), phrases };
  });
}

/**
 * Ce qui empêche ou déconseille la publication.
 *
 * Publier était une bascule aveugle : un parcours sans chapitre était destiné à la
 * prochaine mise en ligne, et rien ne rappelait les textes encore provisoires —
 * alors que c'est précisément le moment de les relire.
 *
 * Les bloquants sont ce qui casserait l'affichage ; les avertissements laissent
 * publier, ils informent.
 *
 * `bloquants` porte les phrases une par une — c'est ce que l'alerte de publication liste.
 * `groupesBloquants` porte les mêmes, regroupées par nature pour l'affichage permanent de la
 * fiche. Une seule source, deux formes : elles ne peuvent pas dériver.
 */
export function controlerAvantPublication(pid) {
  const p = store.parcours[pid];
  const avertissements = [];
  const candidat = { ...p, statut: 'publie' };
  const erreurs = validerContenuEditorial({
    chapitres: store.chapitres,
    parcours: { ...store.parcours, [pid]: candidat },
    v1: store.experiences.v1,
    v2: store.experiences.v2,
  })
    // Le reste du contenu est validé à l'enregistrement. Ici, on explique
    // seulement ce que la publication demandée vient de rendre bloquant.
    .filter(({ chemin }) => chemin[0] === 'parcours' && chemin[1] === pid)
    .map((erreur) => ({
      nature: erreur.nature,
      phrase: formaterErreurEditoriale({ ...erreur, chemin: erreur.chemin.slice(2) }),
    }));

  const bloquants = erreurs.map(({ phrase }) => phrase);
  const groupesBloquants = regrouperBloquants(erreurs);

  const refs = p.chapitres || [];
  if (!p.meta?.image) avertissements.push('pas d’image de couverture');
  if (!p.meta?.accroche) avertissements.push('pas d’accroche');

  /* Les textes provisoires : c'est le moment de les relire, pas après.
     Le parcours compte ses propres champs. Ils portent le repère « provisoire » dans le
     formulaire juste en dessous, et l'avertissement ne les voyait pas : il ne parcourait
     que les chapitres et les vidéos.

     La phrase mélangeait deux unités — « 2 du parcours » comptait des champs, « 3 chapitre(s) »
     comptait des chapitres — et ne se lisait donc pas. Un seul compte partout : des textes, et
     l'endroit où ils sont.

     Elle dit aussi d'où ils viennent, ce que « provisoire » laissait deviner : ces textes sont
     pré-générés par l'IA, personne ne les a écrits. C'est ça qui justifie de les relire avant
     de publier, et le badge du formulaire porte les mêmes mots. */
  const provisoiresParcours = (p.provisoire || []).length;
  let provisoiresVideos = 0;
  let videosConcernees = 0;
  let provisoiresChapitres = 0;
  let chapitresConcernes = 0;
  refs.forEach((cid) => {
    const duChapitre = store.experiences.v2.chapitres[cid]?.provisoire?.length || 0;
    if (duChapitre) {
      provisoiresChapitres += duChapitre;
      chapitresConcernes += 1;
    }
    (store.chapitres[cid]?.videos || []).forEach((v) => {
      const deLaVideo = store.experiences.v2.videos[v.id]?.provisoire?.length || 0;
      if (deLaVideo) {
        provisoiresVideos += deLaVideo;
        videosConcernees += 1;
      }
    });
  });
  if (provisoiresParcours || provisoiresVideos || provisoiresChapitres) {
    const parts = [];
    if (provisoiresParcours) parts.push(`${provisoiresParcours} sur le parcours`);
    if (provisoiresChapitres) {
      parts.push(`${provisoiresChapitres} dans ${chapitresConcernes} `
        + `chapitre${chapitresConcernes > 1 ? 's' : ''}`);
    }
    if (provisoiresVideos) {
      parts.push(`${provisoiresVideos} dans ${videosConcernees} `
        + `vidéo${videosConcernees > 1 ? 's' : ''}`);
    }
    avertissements.push(`textes pré-générés par l’IA, à relire : ${parts.join(', ')}`);
  }

  /* Le même compte que celui porté par l'onglet Deutsch, et pour la même raison : un
     avertissement qui annonce moins que le compteur laisse publier ce que l'éditeur voit
     manquer. Il ne regardait que les deux titres et l'accroche, laissant passer un
     sous-titre ou une thématique non traduits, tous deux affichés.

     L'accroche allemande vit dans `p.i18n.de.meta`, et non dans `p.meta.i18n.de` :
     cherchée au mauvais endroit, elle était déclarée manquante sur un parcours pourtant
     traduit de bout en bout. Un seul endroit connaît ce chemin, `manquantsParcours`. */
  const sansAllemand = comptesParcours(pid, 'de');
  if (sansAllemand) {
    avertissements.push(
      `${sansAllemand} champ${sansAllemand > 1 ? 's' : ''} sans version allemande`);
  }

  return { bloquants, groupesBloquants, avertissements };
}

function basculeStatut(p, pid, redessiner) {
  const publie = p.statut === 'publie';

  function publier() {
    const { bloquants, avertissements } = controlerAvantPublication(pid);

    if (bloquants.length) {
      window.alert(
        'Ce parcours ne peut pas être publié en l’état :\n\n'
        + bloquants.map((x) => `• ${x}`).join('\n')
        + '\n\nCorrigez cela puis réessayez.',
      );
      return;
    }

    let texte = 'Publier ce parcours ?\n\nIl deviendra visible dans le prototype à la '
      + 'prochaine synchronisation.';
    if (avertissements.length) {
      texte += '\n\nÀ savoir :\n' + avertissements.map((x) => `• ${x}`).join('\n');
    }
    if (!window.confirm(texte)) return;

    p.statut = 'publie';
    modifie();
    redessiner();
  }

  function depublier() {
    if (!window.confirm(
      'Dépublier ce parcours ?\n\nIl disparaîtra du prototype à la prochaine '
      + 'synchronisation. Son contenu est conservé.')) return;
    p.statut = 'brouillon';
    modifie();
    redessiner();
  }

  return h('div.bo-statut', {},
    h('span.bo-pastille' + (publie ? '.is-publie' : ''), {},
      publie ? 'publié' : 'brouillon'),
    h('button.bo-btn', { type: 'button', onclick: publie ? depublier : publier },
      publie ? 'Dépublier' : 'Publier'),
  );
}

/**
 * Le même contrôle, affiché en permanence : on voit ce qui manque sans cliquer.
 *
 * Les bloquants répétés tiennent sur une ligne comptée, dont le détail se déplie. Trente
 * lignes rouges permanentes noyaient tout, y compris le bloquant isolé d'un parcours qu'on
 * veut réellement publier.
 */
function ligneBloquante({ resume, phrases }) {
  const contenu = [
    h('span.bo-controle-marque', {}, '✕'), resume, ' — empêche la publication',
  ];
  if (!phrases.length) return h('p.bo-controle.bo-controle--bloquant', {}, ...contenu);

  /* `details` plutôt qu'un bouton : le pliage est nativement au clavier, et l'état ouvert
     survit au redessin du bloc puisque le navigateur le porte.

     Les classes vont sur le `summary` lui-même, et non sur un paragraphe à l'intérieur : le
     modèle de contenu de `summary` n'accepte pas de `<p>`. */
  return h('details.bo-controle-groupe', {},
    h('summary.bo-controle.bo-controle--bloquant', {}, ...contenu),
    h('ul.bo-controle-detail', {},
      ...phrases.map((phrase) => h('li', {}, phrase)),
    ),
  );
}

function etatDePublication(pid) {
  const { groupesBloquants, avertissements } = controlerAvantPublication(pid);
  if (!groupesBloquants.length && !avertissements.length) return null;
  return h('div.bo-controles', {},
    ...groupesBloquants.map(ligneBloquante),
    ...avertissements.map((x) => h('p.bo-controle', {},
      h('span.bo-controle-marque', {}, '!'), x)),
  );
}

/** Ce qui se déduit des chapitres, et ne se saisit donc jamais. */
function reperesCalcules(p) {
  const videos = videosDuParcours(p);
  const nbCh = (p.chapitres || []).length;
  if (!nbCh) return [h('p.bo-sous-titre', {}, 'Aucun chapitre rattaché pour l’instant.')];
  return [h('p.bo-sous-titre', {},
    `${nbCh} chapitre${nbCh > 1 ? 's' : ''} · ${videos.length} vidéo${videos.length > 1 ? 's' : ''}`
    + `${dureeVideos(videos) ? ` · ${dureeVideos(videos)}` : ''} `,
    h('span.bo-calcule', { title: 'Calculé depuis les chapitres, non saisissable' }, 'calculé'),
  )];
}

/* ─────────────── Assemblage ─────────────── */

function assemblage(pid, langue, redessiner, ctx) {
  const p = store.parcours[pid];
  const rattaches = p.chapitres.filter((cid) => store.chapitres[cid]);
  const perdus = p.chapitres.filter((cid) => !store.chapitres[cid]);
  // Du plus récent au plus ancien, comme la liste des chapitres et pour la même
  // raison : le chapitre qu'on vient de créer est celui qu'on vient rattacher, il
  // n'a rien à faire derrière quarante chapitres migrés.
  const reserve = chapitresParRecence().filter((cid) => !p.chapitres.includes(cid));
  /* Les chapitres qu'aucun parcours n'emploie : la réserve au sens propre.
     La colonne les mélangeait aux chapitres d'autres parcours, et comme tous les
     chapitres du dépôt sont rattachés quelque part, elle affichait trente-cinq cartes
     dont aucune n'était disponible, soit 53 % de la hauteur de la fiche. Le filtre, lui,
     cherche dans toute la réserve : c'est par là qu'on va chercher un chapitre précis. */
  const libres = reserve.filter((cid) => !parcoursUtilisant(cid).length);
  const ailleurs = reserve.length - libres.length;

  /* Glisser-déposer : `dataTransfer` porte l'identifiant du chapitre et sa
     provenance. Les flèches font la même chose au clavier — le glisser-déposer
     seul serait inaccessible. */
  const carte = (cid, provenance, index) => {
    const ch = store.chapitres[cid];
    const autres = parcoursUtilisant(cid).filter((x) => x.id !== pid);

    /* Le même fait — « ce chapitre sert ailleurs » — ne se dit pas pareil selon la
       colonne. Rattaché ici ET ailleurs : c'est un partage, et le modifier touche
       plusieurs parcours. Encore en réserve : c'est juste une provenance. */
    const marque = !autres.length ? null
      : provenance === 'parcours'
        ? h('span.bo-partage', {
          title: `Partagé avec : ${autres.map((x) => x.titre).join(', ')}. `
            + 'Le modifier touche aussi ces parcours.',
        }, `partagé (${autres.length})`)
        : h('span.bo-provenance', {
          title: autres.map((x) => x.titre).join(', '),
        }, autres.length === 1 ? `déjà dans ${autres[0].titre}` : `dans ${autres.length} parcours`);

    /* Ce qui reste à écrire dans la langue affichée. L'ancien onglet allemand disait
       « traduit / à traduire » sur une liste morte ; l'information vaut mieux que
       cela — elle vit sur la carte, dans les deux langues, et se met à jour. */
    const aEcrire = comptesLangue(cid, langue);

    const el = h('li.bo-carte-chapitre', { draggable: 'true', 'data-cid': cid },
      provenance === 'parcours' && h('span.bo-carte-num', {}, String(index + 1).padStart(2, '0')),
      h('div.bo-carte-corps', {},
        h('p.bo-carte-titre', {},
          texteLocalise(ch, 'question', langue) || h('em', {}, 'sans titre')),
        h('p.bo-carte-meta', {},
          `${(ch.videos || []).length} vidéo${(ch.videos || []).length > 1 ? 's' : ''}`,
          dureeVideos(ch.videos) ? ` · ${dureeVideos(ch.videos)}` : '',
          marque,
          aEcrire ? h('span.bo-a-ecrire', {
            title: langue === 'de'
              ? 'Champs remplis en français mais encore vides en allemand'
              : 'Champs remplis en allemand mais encore vides en français',
          }, `${aEcrire} à ${langue === 'de' ? 'traduire' : 'écrire'}`) : null,
        ),
      ),
      h('div.bo-carte-actions', {},
        provenance === 'parcours' ? [
          h('button.bo-btn-icone', {
            type: 'button', title: 'Monter', disabled: index === 0,
            onclick: () => { deplacerChapitre(pid, index, -1); redessiner(); },
          }, '↑'),
          h('button.bo-btn-icone', {
            type: 'button', title: 'Descendre', disabled: index === rattaches.length - 1,
            onclick: () => { deplacerChapitre(pid, index, +1); redessiner(); },
          }, '↓'),
          h('button.bo-btn-icone', {
            type: 'button', title: 'Retirer du parcours (le chapitre est conservé)',
            onclick: () => { detacherChapitre(pid, cid); redessiner(); },
          }, '→'),
        ] : h('button.bo-btn-icone', {
          type: 'button', title: 'Rattacher à ce parcours',
          onclick: () => { rattacherChapitre(pid, cid); redessiner(); },
        }, '←'),
      ),
    );

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ cid, provenance }));
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('is-tire');
    });
    el.addEventListener('dragend', () => el.classList.remove('is-tire'));
    return el;
  };

  /**
   * Une colonne qui accepte les dépôts. `filtre` n'est posé que sur la réserve, `pied`
   * que sur le parcours.
   *
   * Elle reçoit sa liste déjà construite : celle de la réserve est remplie par son
   * filtre, qui doit pouvoir la redessiner sans reconstruire la colonne, sinon le champ
   * perd le focus à chaque frappe. D'où `nombre`, dit à part et non déduit de la liste :
   * une colonne vide contient une ligne, celle qui explique qu'elle est vide, et son
   * compte affichait donc « 1 ».
   */
  const colonne = ({
    titre, aide, liste, nombre, surDepot, filtre = null, pied = null,
  }) => {
    liste.addEventListener('dragover', (e) => {
      e.preventDefault();
      liste.classList.add('is-survol');
    });
    liste.addEventListener('dragleave', () => liste.classList.remove('is-survol'));
    liste.addEventListener('drop', (e) => {
      e.preventDefault();
      liste.classList.remove('is-survol');
      try {
        const { cid, provenance } = JSON.parse(e.dataTransfer.getData('text/plain'));
        // Position de dépôt : la carte sous le curseur, sinon la fin.
        const cible = e.target.closest?.('.bo-carte-chapitre');
        surDepot(cid, provenance, cible?.dataset.cid);
        redessiner();
      } catch {
        // Dépôt venu d'ailleurs : on ne fait rien plutôt que de risquer une bêtise.
      }
    });
    return h('div.bo-colonne', {},
      h('p.bo-colonne-titre', {}, titre, h('span.bo-colonne-compte', {}, nombre)),
      h('p.bo-colonne-aide', {}, aide),
      filtre,
      liste,
      pied,
    );
  };

  const blocs = [];

  if (perdus.length) {
    blocs.push(message(
      `${perdus.length} chapitre(s) référencé(s) mais introuvable(s) : ${perdus.join(', ')}. `
      + 'Ils sont ignorés à l’affichage ; retirez-les pour nettoyer.', 'erreur'));
  }

  const listeReserve = h('ul.bo-colonne-liste');
  blocs.push(h('div.bo-deux-colonnes', {},
    colonne({
      titre: L.dansCeParcours,
      aide: 'Dans l’ordre de lecture.',
      liste: h('ul.bo-colonne-liste', {}, rattaches.length
        ? rattaches.map((cid, i) => carte(cid, 'parcours', i))
        : [h('li.bo-colonne-vide', {}, 'Déposez des chapitres ici.')]),
      nombre: rattaches.length,
      surDepot: (cid, provenance, avant) => {
        if (provenance === 'reserve') rattacherChapitre(pid, cid, avant);
        else deplacerChapitre(pid, store.parcours[pid].chapitres.indexOf(cid), 0, avant);
      },
      /* Créer un chapitre, puis le rattacher, demandait trois écrans : la liste des
         chapitres, la fiche du chapitre neuf, puis le retour ici pour le glisser. Or
         c'est le geste courant, aucun chapitre du dépôt n'étant orphelin. Le bouton fait
         les deux et ouvre la fiche, là où il reste à écrire. */
      pied: h('button.bo-btn-lien.bo-colonne-pied', {
        type: 'button',
        onclick: () => {
          const cid = creerChapitreNomme({ publie: p.statut === 'publie' });
          if (!cid) return;
          rattacherChapitre(pid, cid);
          ctx.aller(`chapitre/${cid}`);
        },
      }, '+ Ajouter un chapitre à ce parcours'),
    }),
    colonne({
      titre: L.disponibles,
      aide: ailleurs
        ? `Les chapitres qu’aucun parcours n’emploie. Les ${ailleurs} autres appartiennent `
          + 'déjà à un parcours : cherchez-les au filtre pour en réemployer un.'
        : 'Les chapitres qu’aucun parcours n’emploie.',
      liste: listeReserve,
      // Le compte dit ce que la colonne montre, donc les chapitres libres.
      nombre: libres.length,
      surDepot: (cid, provenance) => {
        if (provenance === 'parcours') detacherChapitre(pid, cid);
      },
      /* La colonne montre les chapitres libres, et le filtre cherche dans **toute** la
         réserve : à quarante chapitres tous rattachés ailleurs, la liste complète était un
         mur qu'on ne lit pas, mais il faut pouvoir aller y reprendre un chapitre précis,
         sciemment. Le filtre remplit et redessine `listeReserve` sans toucher à la colonne,
         pour ne pas perdre le focus du champ à chaque frappe. */
      filtre: listeFiltrable({
        placeholder: `Chercher parmi les ${reserve.length} autres chapitres…`,
        liste: listeReserve,
        ids: reserve,
        sansTerme: libres,
        foin: (cid) => foinChapitre(store.chapitres[cid]),
        rendre: (cid) => carte(cid, 'reserve'),
        /* Trois situations, trois phrases : rien de libre mais des chapitres à reprendre,
           rien de libre et rien à reprendre, ou un filtre sans résultat. */
        vide: () => h('li.bo-colonne-vide', {}, ailleurs
          ? `Aucun chapitre libre. Les ${ailleurs} autres appartiennent déjà à un parcours : `
            + 'cherchez-en un au filtre, ou créez un chapitre.'
          : 'Tous les chapitres sont rattachés.'),
        aucun: 'Aucun chapitre ne correspond.',
      }),
    }),
  ));

  return blocs;
}

/**
 * ecran-chapitre.js — liste des chapitres, et fiche d'un chapitre.
 *
 * C'est l'écran principal du back-office, parce que c'est la première action de
 * l'équipe éditoriale : on crée un chapitre, on y ajoute des vidéos, on écrit les
 * textes de contexte. Le rattachement à un parcours vient après, ailleurs.
 *
 * Le cœur de l'écran est l'ajout d'une vidéo : un seul champ, l'identifiant de
 * programme ARTE. Tout ce qu'arte.tv sait dire est récupéré (titre, durée, image,
 * genre, description, disponibilité) ; ne reste à écrire que le contextuel.
 */

import {
  store, modifie, creerChapitre, supprimerChapitre, deplacerVideo, supprimerVideo,
  parcoursUtilisant, estManuel, marquerManuel, chapitresParRecence, obstacleSuppression,
  positionDans,
} from './store.js';
import { recupererVideo, identifiantValide, identifiantDepuisTitre } from './arte.js';
import {
  CHAMPS_CHAPITRE, CHAMPS_VIDEO, CHAMPS_V1_CHAPITRE, CHAMPS_V1_TRANSITION,
  CHAMPS_V1_VIDEO, CHAMPS_V2_CHAPITRE, CHAMPS_V2_VIDEO, clesAffichees,
} from './champs.js';
import {
  h, vider, champ, message, de,
  ongletsLangue, manquantsEnAllemand, manquantsEnFrancais, rendreAvecReplis,
  rendreTraduisibles, choixImage, listeFiltrable, texteLocalise, lienPrototype,
} from './ui.js';
// Importé depuis l'application : les durées se calculent exactement de la même
// façon dans le back-office et dans le prototype, sinon les deux divergeraient.
import { dureeVideos } from '../../react-app-desktop/src/utils/duree.js';

/* ═══════════════════════════ Liste ═══════════════════════════ */

export function listeChapitres(aller) {
  // Du plus récent au plus ancien : le chapitre qu'on vient de créer est celui
  // qu'on veut rouvrir, il n'a rien à faire au bout d'une liste de quarante.
  const ids = chapitresParRecence();
  const rangee = (cid) => {
    const ch = store.chapitres[cid];
    const utilise = parcoursUtilisant(cid);
    const bloque = obstacleSuppression(cid);
    const nb = (ch.videos || []).length;
    return h('li.bo-rangee', {},
      h('div.bo-rangee-corps', {},
        // Un chapitre écrit en allemand seul a un titre : c'est celui-là qu'il faut
        // montrer, sinon il apparaît « sans titre » et devient introuvable.
        h('p.bo-rangee-titre', {}, texteLocalise(ch, 'question') || h('em', {}, 'sans titre')),
        h('p.bo-rangee-meta', {},
          `${nb} vidéo${nb > 1 ? 's' : ''}`,
          dureeVideos(ch.videos) ? ` · ${dureeVideos(ch.videos)}` : '',
          ' · ',
          // Les parcours marqués publiés se distinguent : c'est ce qui rend ce
          // chapitre intouchable, autant le montrer là où on lit son rattachement.
          utilise.length
            ? utilise.map((p, i) => h(
              p.publie ? 'span.bo-rattache.bo-rattache--publie' : 'span.bo-rattache',
              p.publie ? { title: 'parcours marqué publié : destiné à la publication' } : {},
              `${i ? ', ' : ''}${p.titre}${p.publie ? ' (marqué publié)' : ''}`,
            ))
            : h('span.bo-orphelin', {}, 'non rattaché'),
        ),
      ),
      h('div.bo-rangee-actions', {},
        h('button.bo-btn', { type: 'button', onclick: () => aller(`chapitre/${cid}`) }, 'Modifier'),
        /* Le bouton reste **cliquable** même quand la suppression est refusée, et c'est
           le clic qui explique. Désactivé, il rendait inatteignable l'alerte qui nomme les
           deux gestes débloquants — et comme les chapitres des parcours publiés sont en
           tête de liste, les huit premières lignes avaient un bouton grisé sans raison
           visible : de quoi conclure qu'aucun chapitre ne se supprime. */
        h('button.bo-btn.bo-btn--danger', {
          type: 'button',
          title: bloque
            ? `Utilisé par un parcours marqué publié (${bloque.parcours.map((p) => p.titre).join(', ')}).`
              + ' Retirez-le du parcours, ou dépubliez le parcours.'
            : null,
          onclick: () => demanderSuppression(cid, () => aller('chapitres')),
        }, 'Supprimer'),
      ),
    );
  };

  return h('section.bo-ecran', {},
    h('header.bo-ecran-tete', {},
      h('div', {},
        h('h1.bo-titre', {}, 'Chapitres'),
        h('p.bo-sous-titre', {},
          `${ids.length} chapitre${ids.length > 1 ? 's' : ''}, du plus récent au plus `
          + 'ancien — on les crée ici, on les relie à un parcours ensuite.'),
      ),
      h('button.bo-btn.bo-btn--primaire', {
        type: 'button',
        onclick: () => {
          const cid = creerChapitreNomme();
          if (cid) aller(`chapitre/${cid}`);
        },
      }, 'Créer un chapitre'),
    ),
    ...(ids.length ? filtrable(ids, rangee) : [message('Aucun chapitre pour l’instant.', 'info')]),
  );
}

/**
 * Demande la question du chapitre avant de le créer, et rend l'identifiant qu'il portera —
 * ou `null` si l'on renonce.
 *
 * Le bouton créait un chapitre sans nom, dont l'identifiant restait `nouveau-chapitre`.
 * Cet identifiant est **définitif** : c'est lui qui indexe les textes de synthèse. Aucun
 * chapitre n'ayant jamais été créé depuis l'outil, les quarante venant de la migration,
 * ce chemin est le premier à en figer — laisser s'installer `nouveau-chapitre-2`,
 * `nouveau-chapitre-3` serait une dette immédiate.
 *
 * `avertissementPublie` dit la conséquence avant le geste : sur un parcours publié, un
 * chapitre sans vidéo empêche la republication, et on le découvrait en rouge après coup.
 */
export function creerChapitreNomme({ publie = false } = {}) {
  const invite = 'Question posée par ce chapitre. Elle lui donne son titre, et son '
    + 'identifiant définitif — celui auquel ses textes de synthèse seront rattachés.'
    + (publie
      ? '\n\n⚠️ Ce parcours est publié : il ne pourra pas être republié tant que ce '
        + 'chapitre n’a pas de question et au moins une vidéo.'
      : '');

  const saisie = window.prompt(invite, '');
  if (saisie === null) return null;
  const question = saisie.trim();
  if (!question) {
    window.alert(
      'Il faut une question pour créer le chapitre : son identifiant en découle, et il ne '
      + 'se renomme pas ensuite.',
    );
    return null;
  }
  return creerChapitre(question);
}

/**
 * Ce dans quoi le filtre cherche, **les deux langues confondues** : titre, accroche
 * et titres de vidéos, en français comme en allemand. Chercher le titre allemand
 * qu'on a sous les yeux et ne rien trouver serait déroutant.
 */
export function foinChapitre(ch) {
  if (!ch) return '';
  const trad = ch.i18n?.de || {};
  return [
    ch.question, ch.accroche, trad.question, trad.accroche,
    ...(ch.videos || []).flatMap((v) => [v.titre, v.i18n?.de?.titre]),
  ].filter(Boolean).join(' ');
}

/**
 * La liste, filtrable au texte. Même besoin que dans l'écran parcours : à quarante
 * chapitres, retrouver le bon à l'œil devient long. On cherche dans le titre,
 * l'accroche et les titres de vidéos — c'est souvent par une vidéo qu'on se
 * souvient d'un chapitre.
 */
function filtrable(ids, rangee) {
  const liste = h('ul.bo-liste-rangees');
  const filtre = listeFiltrable({
    placeholder: 'Filtrer par titre, accroche ou vidéo…',
    liste,
    ids,
    foin: (cid) => foinChapitre(store.chapitres[cid]),
    rendre: rangee,
    vide: 'Aucun chapitre pour l’instant.',
    aucun: 'Aucun chapitre ne correspond.',
  });
  return [filtre, liste];
}

/** Suppression : le message dit exactement ce qui va disparaître. */
function demanderSuppression(cid, apres) {
  const ch = store.chapitres[cid];
  const nb = (ch.videos || []).length;
  const utilise = parcoursUtilisant(cid);

  /* Un chapitre destiné à la publication ne se supprime pas d'un clic : il
     disparaîtrait à la prochaine synchronisation, en amputant un parcours marqué
     publié. On refuse, et on dit les deux gestes qui débloquent — parce qu'un refus
     sans issue laisse chercher. */
  const bloque = obstacleSuppression(cid);
  if (bloque) {
    const noms = bloque.parcours.map((p) => `« ${p.titre} »`).join(', ');
    window.alert(
      `« ${texteLocalise(ch, 'question') || 'Ce chapitre'} » ne peut pas être supprimé.\n\n`
      + `Il est utilisé par ${bloque.parcours.length > 1
        ? 'des parcours marqués publiés' : 'un parcours marqué publié'}`
      + ` : ${noms}. Le supprimer le retirerait de la prochaine publication du prototype.\n\n`
      + 'Deux façons de procéder :\n'
      + '  · retirer le chapitre de ce parcours, puis le supprimer ;\n'
      + '  · ou dépublier le parcours, si c\u2019est lui qui doit disparaître.',
    );
    return;
  }

  let texte = `Supprimer définitivement « ${texteLocalise(ch, 'question') || 'ce chapitre'} » ?`;
  if (nb) texte += `\n\nCe chapitre et ses ${nb} vidéo${nb > 1 ? 's' : ''} seront supprimés.`;
  if (utilise.length) {
    texte += `\n\n⚠️ Il est utilisé par ${utilise.length} parcours `
      + `(${utilise.map((p) => p.titre).join(', ')}) : il en disparaîtra aussi.`;
  }
  if (window.confirm(texte)) {
    supprimerChapitre(cid);
    apres();
  }
}

/* ═══════════════════════════ Fiche ═══════════════════════════ */

/**
 * Les intitulés de la fiche.
 *
 * **En français dans les deux onglets.** Ils avaient d'abord été traduits, et le
 * formulaire allemand en devenait moins lisible : on ne reconnaissait plus d'un
 * onglet à l'autre le champ qu'on remplissait. Le back-office est en français ; c'est
 * le contenu qui est bilingue.
 */
const L = {
  chapitre: 'Le chapitre',
  image: 'Image du chapitre',
  videos: 'Vidéos du chapitre',
  recupere: 'Récupéré depuis arte.tv',
  video: 'Vidéo',
};

/** La règle des deux langues, dite dans les deux panneaux : elle joue des deux côtés. */
const AIDE_DEUX_LANGUES = 'Un champ laissé vide dans une langue affiche le texte de '
  + 'l’autre. On peut donc écrire ce chapitre en allemand d’abord et le traduire ensuite.';

function extensionV1Chapitre(cid) {
  const chapitres = store.experiences.v1.chapitres;
  return chapitres[cid] || (chapitres[cid] = {});
}

function extensionV2Chapitre(cid) {
  const chapitres = store.experiences.v2.chapitres;
  return chapitres[cid] || (chapitres[cid] = {});
}

/** Une saisie française remplace le texte généré : le repère n'a plus lieu d'être. */
export function leverProvisoire(extension, cle) {
  if (!extension?.provisoire?.includes(cle)) return;
  extension.provisoire = extension.provisoire.filter((champ) => champ !== cle);
  if (!extension.provisoire.length) delete extension.provisoire;
}

/**
 * Où ce chapitre se trouve, et le lien pour y aller.
 *
 * La fiche disait « Utilisé par : *titre du parcours* » en texte mort. Deux choses y
 * manquaient, et ce sont celles dont l'éditeur a besoin : le **rang**, que le prototype
 * affiche en tête de page (« CHAPITRE 01 »), et un moyen d'atteindre le parcours. La
 * navigation entre les deux écrans n'allait que dans un sens.
 *
 * Le partage n'est signalé que s'il a lieu. Aucun chapitre du dépôt n'est employé par
 * plus d'un parcours : en faire le cadre par défaut ferait porter à l'éditeur un modèle
 * plus compliqué que son travail.
 */
export function placeDuChapitre(cid, utilise, aller) {
  if (!utilise.length) {
    return h('p.bo-sous-titre', {}, 'Pas encore rattaché à un parcours');
  }

  const parts = utilise.flatMap((p, i) => {
    const rang = positionDans(p.id, cid);
    return [
      i ? ' · ' : '',
      rang ? `Chapitre ${String(rang).padStart(2, '0')} de ` : 'Dans ',
      h('button.bo-btn-lien', {
        type: 'button',
        onclick: () => aller(`parcours/${p.id}`),
      }, p.titre),
    ];
  });

  if (utilise.length > 1) {
    parts.push(h('span.bo-partage', {
      title: 'Ce chapitre sert dans plusieurs parcours : le modifier les touche tous.',
    }, `partagé (${utilise.length})`));
  }

  return h('p.bo-sous-titre', {}, ...parts);
}

export function ficheChapitre(cid, aller, cible = {}) {
  const ch = store.chapitres[cid];
  if (!ch) return message(`Chapitre « ${cid} » introuvable.`, 'erreur');

  const utilise = parcoursUtilisant(cid);

  /* Le pli des vidéos vit ici, hors des panneaux : il survit ainsi au redessin de la
     liste et au changement de langue. On continue à travailler sur la vidéo qu'on
     avait ouverte, ce qui est tout l'intérêt d'un formulaire identique — basculer de
     langue ne doit pas faire perdre sa place.

     Une adresse qui vise une vidéo la déplie d'emblée : ses champs ne sont construits
     qu'à l'ouverture, donc sans cela il n'y aurait rien à mettre en évidence. Un
     identifiant qui ne correspond à aucune vidéo n'ouvre rien et ne gêne rien. */
  const depliees = new Set(cible.video ? [cible.video] : []);

  /* Le titre de la page suit la saisie, dans l'une ou l'autre langue : écrire le
     titre allemand d'un chapitre neuf et le voir rester « Nouveau chapitre » donne
     l'impression que rien n'a été pris. Repli réciproque, comme partout ailleurs. */
  const titre = h('h1.bo-titre');
  const majTitre = () => {
    vider(titre);
    titre.append(texteLocalise(ch, 'question') || 'Nouveau chapitre');
  };
  majTitre();

  /* `let` et non `const` : le constructeur du panneau est appelé pendant l'appel à
     `ongletsLangue`, donc avant que la variable ne soit affectée. */
  let onglets;
  const contexte = {
    depliees,
    majTitre,
    majCompteurs: () => onglets?.majCompteurs?.(),
  };
  onglets = ongletsLangue({
    compteur: (langue) => comptesLangue(cid, langue),
    construire: (langue) => panneauChapitre(cid, langue, contexte),
  });

  /* Un chapitre n'a pas de page à lui en ligne : il en a une par parcours qui l'emploie,
     et à son rang dans ce parcours. On vise donc le premier parcours publié qui le
     contient — et rien s'il n'y en a pas, la page n'existant alors pas encore. */
  const publiant = utilise.find((x) => x.publie);

  return h('section.bo-ecran', {},
    h('header.bo-ecran-tete', {},
      h('div', {},
        h('button.bo-btn-lien', { type: 'button', onclick: () => aller('chapitres') },
          '‹ Tous les chapitres'),
        titre,
        placeDuChapitre(cid, utilise, aller),
      ),
      h('div.bo-ecran-tete-actions', {},
        publiant
          ? lienPrototype({ parcours: publiant.id, chapitre: positionDans(publiant.id, cid) })
          : null,
      ),
    ),
    onglets,
  );
}

/**
 * Le formulaire du chapitre, dans une langue.
 *
 * **Une seule fonction pour les deux onglets** : c'est ce qui rend les deux
 * formulaires identiques par construction, plutôt que par vigilance. L'onglet
 * allemand ne portait auparavant que des traductions — ni ajout de vidéo, ni ordre,
 * ni image — et l'on ne pouvait donc pas créer un chapitre en partant de l'allemand.
 *
 * La langue ne décide que d'une chose : où les textes traduisibles sont écrits (à la
 * racine de l'objet, ou dans son `i18n.de`). Tout le reste — les vidéos, leur ordre,
 * leur identifiant de programme, l'image — est structurel : mêmes commandes, mêmes
 * données. Une vidéo ajoutée en allemand est donc là en français, et inversement.
 */
function panneauChapitre(cid, langue, ctx) {
  const ch = store.chapitres[cid];
  const v1 = extensionV1Chapitre(cid);
  const v2 = extensionV2Chapitre(cid);
  const provisoiresV2 = new Set(v2.provisoire || []);

  const zoneVideos = h('div.bo-videos');
  /* La galerie d'images du chapitre puise dans les vidéos : elle doit se rafraîchir
     quand la liste bouge, sans passer par un enregistrement. Déclarée avant le
     redessin qui l'utilise, d'où le `let`. */
  let galerieImage = null;
  const redessinerVideos = () => {
    vider(zoneVideos);
    zoneVideos.append(...blocVideos(cid, langue, redessinerVideos, ctx));
    galerieImage?.rafraichir();
    // Une vidéo en plus, c'est des champs en plus à traduire : le compte change.
    ctx.majCompteurs();
  };

  /* Le compte de l'onglet se recalcule à la frappe : c'est le seul retour qui dise
     « ce champ-là est traduit ». L'attendre au prochain changement d'onglet le
     rendrait faux à l'écran une bonne partie du temps. */
  const apresCommun = (cle) => () => {
    if (cle === 'question') ctx.majTitre();
    ctx.majCompteurs();
  };
  const apresSpecifique = () => () => ctx.majCompteurs();
  const apresV2 = (cle, langueSaisie) => () => {
    if (langueSaisie === 'fr') {
      leverProvisoire(v2, cle);
      provisoiresV2.delete(cle);
    }
    ctx.majCompteurs();
  };

  const blocs = [
    h('div.bo-bloc', {},
      h('h2.bo-bloc-titre', {}, L.chapitre),
      h('p.bo-bloc-aide', {}, AIDE_DEUX_LANGUES),
      ...rendreTraduisibles(CHAMPS_CHAPITRE, ch, langue,
        { entite: 'chapitre', apres: apresCommun }),
      (galerieImage = choixImage({
        label: L.image,
        objet: ch, cle: 'heroImage',
        // Fonction et non tableau : la liste est relue à chaque rafraîchissement.
        propositions: () => (ch.videos || [])
          .filter((v) => v.image)
          .map((v) => ({ image: v.image, titre: texteLocalise(v, 'titre', langue) })),
        aide: 'Par défaut, l’image d’une des vidéos du chapitre.',
      })),
      // Pas de couleur d'accent : elle est la même partout. La valeur reste
      // dans les données, elle n'a simplement plus à être saisie.
    ),

    blocChapitreV2(v2, langue, provisoiresV2, apresV2, ch),
    blocChapitreV1(v1, langue, apresSpecifique),

    h('div.bo-bloc', {},
      h('h2.bo-bloc-titre', {}, L.videos),
      ajoutVideo(cid, redessinerVideos),
      zoneVideos,
    ),
  ];

  const racine = h('div.bo-formulaire-parcours', {}, ...blocs);
  redessinerVideos();
  return [racine];
}

/**
 * Les textes propres à la Version 1, derrière un dépli.
 *
 * Décision du 18 août 2026 : le contenu nouveau n'est plus écrit ni traduit pour la
 * Version 1. Elle occupait pourtant la moitié d'un sélecteur, à égalité avec la version
 * principale — et vingt-huit chapitres sur quarante n'avaient déjà aucun contenu V1. Le
 * dépli dit ce que la pratique faisait déjà, sans rien rendre inaccessible : corriger une
 * régression reste possible.
 */
function blocChapitreV1(extension, langue, apres) {
  extension.transition = extension.transition || {};
  const transitionAllemande = () => {
    extension.i18n = extension.i18n || {};
    extension.i18n.de = extension.i18n.de || {};
    extension.i18n.de.transition = extension.i18n.de.transition || {};
    return extension.i18n.de.transition;
  };
  const transitionDe = extension.i18n?.de?.transition;

  return h('details.bo-bloc.bo-bloc--replie', {},
    h('summary.bo-bloc-titre', {}, 'Version 1 — lecture en scroll continu'),
    h('p.bo-bloc-aide', {},
      'Ces textes ne changent que la Version 1, la proposition d’origine. Le contenu '
      + 'nouveau n’est plus écrit ni traduit pour elle : n’y écrivez que pour corriger.'),
    ...rendreTraduisibles(CHAMPS_V1_CHAPITRE, extension, langue, { entite: 'v1Chapitre', apres }),
    ...rendreTraduisibles(CHAMPS_V1_TRANSITION, extension.transition, langue, {
      entite: 'v1Transition',
      cible: langue === 'de' ? transitionAllemande() : extension.transition,
      autre: langue === 'de' ? extension.transition : transitionDe,
      apres,
    }),
  );
}

/** Formulaire V2 du chapitre, sans mélange avec le commun ou la V1. */
function blocChapitreV2(extension, langue, provisoires, apres, chapitre) {
  return h('div.bo-bloc', {},
    h('h2.bo-bloc-titre', {}, 'Version 2 — synthèse du chapitre'),
    h('p.bo-bloc-aide', {},
      'La version principale, page par page. Affiché dans l’itinéraire et en fin de chapitre.'),
    ...rendreTraduisibles(CHAMPS_V2_CHAPITRE, extension, langue, {
      entite: 'v2Chapitre',
      provisoires,
      apres,
      // Fonction et non tableau : on peut ajouter une vidéo sans quitter l'écran.
      videos: () => (chapitre.videos || [])
        .map((v) => ({ id: v.id, titre: texteLocalise(v, 'titre', langue) })),
    }),
  );
}

/**
 * Ce qui manque à un chapitre dans une langue, réparti par famille : ses méta, ses vidéos
 * et son éditorial V2.
 *
 * L'onglet de la fiche n'en veut que la somme, l'écran des traductions le détail. Le même
 * parcours des vidéos et des extensions y était écrit deux fois, et il décide de ce qu'on
 * croit avoir à traduire : une seule version.
 *
 * **Seulement ce qu'un écran de la Version 2 affiche**, `clesAffichees` s'en chargeant, et
 * donc rien de la Version 1. Le compte incluait les champs V1 et ceux qu'aucun écran ne
 * rend : sur l'ensemble du contenu, il annonçait 314 champs à traduire dont 97 que
 * personne ne lirait. Un retard surestimé d'un tiers ne se hiérarchise pas.
 */
export function relevePourChapitre(cid, langue) {
  const releve = { chapitre: 0, videos: 0, v2: 0 };
  const ch = store.chapitres[cid];
  if (!ch) return releve;

  const manque = langue === 'de' ? manquantsEnAllemand : manquantsEnFrancais;
  const v2 = store.experiences.v2.chapitres[cid] || {};
  releve.chapitre = manque(ch, clesAffichees('chapitre'));
  releve.v2 = manque(v2, clesAffichees('v2Chapitre'));
  (ch.videos || []).forEach((v) => {
    const v2Video = store.experiences.v2.videos[v.id] || {};
    releve.videos += manque(v, clesAffichees('video'));
    releve.v2 += manque(v2Video, clesAffichees('v2Video'));
  });
  return releve;
}

/** Le total du relevé : c'est ce nombre que porte l'onglet de langue. */
export function comptesLangue(cid, langue) {
  const releve = relevePourChapitre(cid, langue);
  return releve.chapitre + releve.videos + releve.v2;
}

/* ─────────────────── Ajout d'une vidéo ─────────────────── */

function ajoutVideo(cid, redessiner) {
  const saisie = h('input.bo-input.bo-input--id', {
    type: 'text', placeholder: '113185-000-A',
  });
  const etat = h('div.bo-ajout-etat');
  const bouton = h('button.bo-btn.bo-btn--primaire', { type: 'button' }, 'Récupérer');

  async function ajouter() {
    const id = saisie.value.trim().toUpperCase();
    vider(etat);
    if (!identifiantValide(id)) {
      etat.append(message('Identifiant attendu sous la forme 113185-000-A.', 'erreur'));
      return;
    }
    const ch = store.chapitres[cid];
    if ((ch.videos || []).some((v) => v.programId === id)) {
      etat.append(message('Cette vidéo est déjà dans le chapitre.', 'erreur'));
      return;
    }

    bouton.disabled = true;
    bouton.textContent = 'Récupération…';
    try {
      const infos = await recupererVideo(id);
      const video = {
        id: identifiantUnique(identifiantDepuisTitre(infos.titre, id)),
        programId: infos.programId,
        titre: infos.titre,
        type: infos.type,
        duree: infos.duree,
        image: infos.image,
        url: infos.url,
        disponible: infos.disponible,
        contextAvant: infos.contextAvant,
        description: infos.description,
      };
      /* L'allemand dans le même geste : c'est le même appel dans l'autre langue, et
         arte.tv connaît déjà le titre et le résumé allemands de la vidéo. Les faire
         retaper à l'équipe éditoriale n'aurait aucun sens. Meilleur effort : une
         vidéo sans version allemande chez arte n'empêche pas l'ajout. */
      const allemand = await recupererAllemand(id);
      if (allemand) video.i18n = { de: allemand };

      ch.videos = ch.videos || [];
      ch.videos.push(video);
      modifie();
      saisie.value = '';
      etat.append(message(
        `« ${infos.titre} » ajoutée${infos.collection ? ` — ${infos.collection}` : ''}.`
        + (allemand
          ? ` Version allemande récupérée : « ${allemand.titre} ».`
          : ' Pas de version allemande chez arte.tv — à écrire à la main.')
        + ' Reste à écrire la bonne raison de la voir et les textes de synthèse.',
        'succes',
      ));
      redessiner();
    } catch (e) {
      etat.append(message(`Récupération impossible : ${e.message}. `
        + 'Vous pouvez ajouter la vidéo à la main puis compléter les champs.', 'erreur'));
      etat.append(h('button.bo-btn-lien', {
        type: 'button',
        onclick: () => {
          const ch2 = store.chapitres[cid];
          ch2.videos = ch2.videos || [];
          ch2.videos.push({
            id: identifiantUnique(id.toLowerCase()), programId: id, titre: '', type: '',
            duree: '', image: '', url: `https://www.arte.tv/fr/videos/${id}/`,
            disponible: true, contextAvant: '', description: '',
          });
          modifie();
          vider(etat);
          redessiner();
        },
      }, 'Ajouter quand même, sans les métadonnées'));
    } finally {
      bouton.disabled = false;
      bouton.textContent = 'Récupérer';
    }
  }

  bouton.addEventListener('click', ajouter);
  saisie.addEventListener('keydown', (e) => { if (e.key === 'Enter') ajouter(); });

  return h('div.bo-ajout', {},
    h('label.bo-champ', {},
      h('span.bo-label', {}, 'Ajouter une vidéo par son identifiant de programme ARTE'),
      h('div.bo-ajout-ligne', {}, saisie, bouton),
      h('span.bo-aide', {},
        'Titre, durée, image, genre, description et disponibilité sont récupérés '
        + 'automatiquement depuis arte.tv.'),
    ),
    etat,
  );
}

/**
 * La version allemande d'une vidéo chez arte.tv, ou `null`.
 *
 * Meilleur effort assumé : toutes les vidéos n'ont pas de page allemande, et un
 * échec ici ne doit pas empêcher l'ajout. On ne garde que ce qui se traduit.
 */
async function recupererAllemand(programId) {
  try {
    const de = await recupererVideo(programId, 'de');
    const garde = {};
    for (const cle of CLES_ARTE.de) if (de[cle]) garde[cle] = de[cle];
    return Object.keys(garde).length ? garde : null;
  } catch {
    return null;
  }
}

/** Un identifiant de vidéo ne doit pas collisionner : les textes y sont indexés. */
function identifiantUnique(base) {
  const pris = new Set(
    Object.values(store.chapitres).flatMap((c) => (c.videos || []).map((v) => v.id)),
  );
  let id = base || 'video';
  let n = 2;
  while (pris.has(id)) id = `${base}-${n++}`;
  return id;
}

/* ─────────────────── Une vidéo dépliable ─────────────────── */

function blocVideos(cid, langue, redessiner, ctx) {
  const videos = store.chapitres[cid].videos || [];
  if (!videos.length) {
    return [message('Aucune vidéo. Commencez par coller un identifiant de programme ci-dessus.', 'info')];
  }
  return videos.map((v, i) => uneVideo(cid, v, i, videos.length, langue, redessiner, ctx));
}

function uneVideo(cid, v, i, total, langue, redessiner, ctx) {
  const videosV1 = store.experiences.v1.videos;
  const v1 = videosV1[v.id] || (videosV1[v.id] = {});
  const videosV2 = store.experiences.v2.videos;
  const v2 = videosV2[v.id] || (videosV2[v.id] = {});
  const provisoires = new Set(v2.provisoire || []);
  const details = h('div.bo-video-details');
  // Le pli est gardé par la fiche, pas par ce bloc : une vidéo ouverte reste ouverte
  // après un ajout, une réorganisation, et surtout après un changement de langue.
  let ouvert = ctx.depliees.has(v.id);

  /* L'état de la récupération arte.tv vit HORS des champs : rafraîchir réécrit les
     champs (sans quoi les valeurs récupérées ne s'afficheraient pas), et le message
     de confirmation disparaîtrait avant d'avoir été lu. Le même élément est réinséré
     avec son contenu. */
  const etatArte = h('div.bo-ajout-etat');
  const redessinerChamps = () => {
    vider(details);
    details.append(...champsVideo({
      v, v1, v2, provisoires, rafraichirEntete, langue, ctx, etatArte, redessinerChamps,
    }));
  };
  const remplir = () => {
    if (!details.childElementCount) redessinerChamps();
  };
  const basculer = () => {
    ouvert = !ouvert;
    if (ouvert) ctx.depliees.add(v.id);
    else ctx.depliees.delete(v.id);
    details.classList.toggle('is-ouvert', ouvert);
    if (ouvert) remplir();
  };

  // Vignette, titre et repères, redessinés seuls. Rafraîchir depuis arte.tv doit
  // mettre l'en-tête à jour SANS reconstruire la liste : sinon le panneau ouvert se
  // referme et le message de confirmation disparaît avant d'avoir été lu.
  const vignette = h('img.bo-video-vignette', { src: v.image || '', alt: '', loading: 'lazy' });
  const titre = h('p.bo-video-titre');
  const meta = h('p.bo-video-meta');

  function rafraichirEntete() {
    vignette.src = v.image || '';
    vignette.style.display = v.image ? '' : 'none';
    vider(titre);
    titre.append(texteLocalise(v, 'titre', langue) || h('em', {}, 'sans titre'));
    vider(meta);
    meta.append(
      [v.programId, v.duree, v.type].filter(Boolean).join(' · '),
      ...[
        v.disponible === false && h('span.bo-indispo', {}, 'indisponible'),
        provisoires.size > 0 && h('span.bo-provisoire', {
          title: 'Textes pré-générés par l’IA, à relire.',
        }, `${provisoires.size} texte${provisoires.size > 1 ? 's' : ''} pré-généré`
          + `${provisoires.size > 1 ? 's' : ''}`),
      ].filter(Boolean),
    );
  }
  rafraichirEntete();
  if (ouvert) {
    details.classList.add('is-ouvert');
    remplir();
  }

  /* `data-video` porte l'ancre du lien profond : c'est ce qui permet de chercher un champ
     dans **cette** vidéo et non dans la première du chapitre qui porte la même clé. */
  return h('article.bo-video', { 'data-video': v.id },
    h('div.bo-video-tete', {},
      h('span.bo-video-rang', {}, `${L.video} ${i + 1}`),
      vignette,
      h('div.bo-video-resume', { onclick: basculer }, titre, meta),
      h('div.bo-video-actions', {},
        h('button.bo-btn-icone', {
          type: 'button', title: 'Monter', disabled: i === 0,
          onclick: () => { deplacerVideo(cid, i, -1); redessiner(); },
        }, '↑'),
        h('button.bo-btn-icone', {
          type: 'button', title: 'Descendre', disabled: i === total - 1,
          onclick: () => { deplacerVideo(cid, i, +1); redessiner(); },
        }, '↓'),
        h('button.bo-btn-icone', {
          type: 'button', title: ouvert ? 'Replier' : 'Déplier', onclick: basculer,
        }, '⌄'),
        h('button.bo-btn-icone.bo-btn-icone--danger', {
          type: 'button', title: 'Retirer du chapitre',
          onclick: () => {
            const nom = texteLocalise(v, 'titre', langue) || v.programId;
            if (window.confirm(`Retirer « ${nom} » du chapitre ?`)) {
              supprimerVideo(cid, i);
              redessiner();
            }
          },
        }, '×'),
      ),
    ),
    details,
  );
}

/**
 * Les champs qu'une récupération arte.tv peut remplir, selon la langue.
 *
 * En français, tout : c'est le pivot, et le structurel n'existe qu'une fois. En
 * allemand, **seulement ce qui se traduit** — arte.tv/de affiche la même vidéo, mais
 * sa durée est écrite autrement (« 27 Min. ») et l'écraser abîmerait la fiche.
 */
const CLES_ARTE = {
  fr: ['titre', 'duree', 'type', 'image', 'url', 'description', 'contextAvant'],
  de: ['titre', 'description', 'contextAvant'],
};

/**
 * Le chemin qui retient qu'un champ a été saisi à la main, langue comprise.
 *
 * Une seule fonction pour les deux côtés — celui qui note la saisie et celui qui
 * épargne le champ à la récupération suivante. La disponibilité l'écrivait à la
 * main de son côté, et pas de la même façon : elle était donc réécrite par
 * arte.tv malgré la promesse affichée au-dessus d'elle.
 */
export function cheminVideo(v, cle, langue) {
  return langue === 'de' ? `video:${v.id}.de.${cle}` : `video:${v.id}.${cle}`;
}

/**
 * Récupère à nouveau les métadonnées, en épargnant tout ce qui a été saisi à la
 * main. Utile parce qu'arte.tv bouge : une durée se corrige, une vidéo sort du
 * catalogue. C'est aussi ce qui donne son sens à la promesse « une valeur saisie à
 * la main n'est jamais écrasée ».
 *
 * Dans l'onglet allemand, c'est **arte.tv/de** qui est interrogé et la traduction qui
 * est remplie : le titre et le résumé allemands d'une vidéo existent déjà chez arte,
 * il serait absurde de les faire retaper.
 */
async function rafraichirVideo(v, etat, langue = 'fr') {
  vider(etat);
  etat.append(message('Récupération…', 'info'));
  try {
    const infos = await recupererVideo(v.programId, langue);
    const cible = langue === 'de' ? de(v) : v;
    const repris = [];
    const epargnes = [];
    for (const cle of CLES_ARTE[langue]) {
      if (estManuel(cheminVideo(v, cle, langue))) { epargnes.push(cle); continue; }
      if (!infos[cle]) continue;
      if (cible[cle] !== infos[cle]) { cible[cle] = infos[cle]; repris.push(cle); }
    }
    // La disponibilité ne dépend pas de la langue : une seule valeur, côté pivot.
    if (langue === 'fr'
      && !estManuel(cheminVideo(v, 'disponible', 'fr')) && v.disponible !== infos.disponible) {
      v.disponible = infos.disponible;
      repris.push('disponibilité');
    }
    modifie();
    vider(etat);
    const ou = langue === 'de' ? ' (version allemande)' : '';
    etat.append(message(
      (repris.length
        ? `Mis à jour${ou} : ${repris.join(', ')}.`
        : `Rien de nouveau chez arte.tv${ou}.`)
      + (epargnes.length ? ` Conservé tel quel (saisi à la main) : ${epargnes.join(', ')}.` : ''),
      repris.length ? 'succes' : 'info',
    ));
    return true;
  } catch (e) {
    vider(etat);
    etat.append(message(`Récupération impossible : ${e.message}`, 'erreur'));
    return false;
  }
}

/**
 * Les champs d'une vidéo, dans la langue du panneau.
 *
 * Le partage est net : **titre, description et textes de contexte se traduisent** —
 * ils sont donc rendus depuis les déclarations, dans la langue affichée. **Durée,
 * type, identifiant de programme, image et disponibilité sont structurels** — mêmes
 * champs et mêmes données dans les deux onglets, parce qu'une durée ne se traduit
 * pas. Les modifier depuis l'onglet allemand est donc sans danger, et visible en
 * français aussitôt : c'est la même valeur.
 */
export function champsVideo({
  v, v1, v2, provisoires, rafraichirEntete, langue, ctx, etatArte, redessinerChamps,
}) {
  // Appelé avec la langue par `rendreTraduisibles`, sans elle pour les champs
  // structurels — qui n'ont qu'une version, côté pivot.
  const chemin = (cle, l) => cheminVideo(v, cle, l || 'fr');
  const unSeul = (cle) => CHAMPS_VIDEO.filter((c) => c.cle === cle);
  const champsCommuns = champsVideoCommuns();
  // Le titre vit avec les valeurs venues d'arte.tv, mais il se traduit : il est donc
  // rendu depuis la déclaration comme les autres textes, sans quitter sa place.
  const apresSaisie = () => () => ctx.majCompteurs();
  const apresV2 = (cle, langueSaisie) => () => {
    if (langueSaisie === 'fr') {
      leverProvisoire(v2, cle);
      provisoires.delete(cle);
      rafraichirEntete();
    }
    ctx.majCompteurs();
  };
  const [champTitre] = rendreTraduisibles(unSeul('titre'), v, langue, {
    entite: 'video',
    chemin,
    apres: () => () => { rafraichirEntete(); ctx.majCompteurs(); },
  });
  const [champDescription] = rendreTraduisibles(unSeul('description'), v, langue,
    { entite: 'video', chemin, apres: apresSaisie });

  return [
    h('div.bo-video-section', {},
      h('div.bo-video-section-tete', {},
        h('h3.bo-video-section-titre', {}, L.recupere),
        h('button.bo-btn', {
          type: 'button',
          onclick: async (e) => {
            e.target.disabled = true;
            const ok = await rafraichirVideo(v, etatArte, langue);
            if (ok) {
              rafraichirEntete();
              ctx.majCompteurs();
              /* Les champs sont réécrits : sans cela, les valeurs récupérées
                 resteraient invisibles dans des champs affichant l'ancienne saisie —
                 ce qui donnait l'impression que le bouton n'avait rien fait. Le
                 message de confirmation survit, il vit hors de cette zone. */
              redessinerChamps();
            } else {
              e.target.disabled = false;
            }
          },
        }, langue === 'de' ? 'Rafraîchir depuis arte.tv (allemand)' : 'Rafraîchir depuis arte.tv'),
      ),
      h('p.bo-bloc-aide', {},
        langue === 'de'
          ? 'Interroge arte.tv/de et remplit le titre, la description et le contexte '
            + 'en allemand. Une valeur saisie ici ne sera jamais réécrite.'
          : 'Modifiable : une valeur saisie ici ne sera jamais réécrite par une '
            + 'récupération ultérieure.'),
      etatArte,
      h('div.bo-grille-2', {},
        champTitre,
        champ({ label: 'Durée affichée', objet: v, cle: 'duree', chemin: chemin('duree'),
          placeholder: '27 min', onApres: rafraichirEntete }),
        champ({ label: 'Type de contenu', objet: v, cle: 'type', chemin: chemin('type'),
          placeholder: 'documentaire' }),
        champ({ label: 'Identifiant de programme', objet: v, cle: 'programId',
          aide: 'C’est lui qui charge le player.' }),
      ),
      champ({ label: 'Image (URL)', objet: v, cle: 'image', chemin: chemin('image') }),
      champDescription,
      bascule({
        label: 'Disponible sur arte.tv',
        objet: v,
        cle: 'disponible',
        chemin: chemin('disponible'),
      }),
      h('p.bo-bloc-aide', {},
        'Identifiant interne : ', h('code', {}, v.id),
        ' — fixé à la création, les textes de synthèse y sont indexés.'),
    ),

    h('div.bo-video-section', {},
      h('h3.bo-video-section-titre', {}, 'Commun aux deux versions'),
      /* Rendus depuis les mêmes déclarations dans les deux langues : c'est ce qui
         garantit que les deux onglets offrent les mêmes champs. Le texte de l'autre
         langue apparaît en repère sous chacun, pour traduire sans changer d'onglet. */
      ...rendreTraduisibles(champsCommuns, v, langue,
        { entite: 'video', chemin, apres: apresSaisie }),
    ),

    /* `summary` et non `h3` : c'est le premier `summary` qu'un `details` montre comme
       étiquette toujours visible. Avec un `h3`, le titre passait dans le contenu replié et
       le navigateur affichait sa propre étiquette — un triangle nu marqué « Détails »,
       sans qu'on sache de quoi. La règle `.bo-video-section--replie > summary` du style
       ne visait donc rien. */
    h('details.bo-video-section.bo-video-section--replie', {},
      h('summary.bo-video-section-titre', {}, 'Version 1'),
      ...rendreTraduisibles(CHAMPS_V1_VIDEO, v1, langue,
        { entite: 'v1Video', apres: apresSaisie }),
    ),

    h('div.bo-video-section', {},
      h('h3.bo-video-section-titre', {}, 'Version 2 — textes de synthèse'),
      ...rendreAvecReplis(CHAMPS_V2_VIDEO, v2, langue, {
        entite: 'v2Video',
        provisoires,
        apres: apresV2,
      }),
    ),
  ];
}

/** Les champs communs placés dans leur section, hors métadonnées arte.tv. */
export function champsVideoCommuns() {
  return CHAMPS_VIDEO.filter(({ cle }) => !['titre', 'description'].includes(cle));
}

/**
 * Une case à cocher qui retient, comme un champ, qu'elle a été posée à la main.
 *
 * Le chemin enregistré était la seule clé (« disponible ») là où la récupération
 * arte.tv interroge « video:<id>.disponible » : la case était donc réécrite au
 * rafraîchissement suivant, contre la promesse affichée au-dessus d'elle.
 */
function bascule({ label, objet, cle, chemin }) {
  const saisie = h('input', { type: 'checkbox' });
  saisie.checked = objet[cle] !== false;
  saisie.addEventListener('change', () => {
    objet[cle] = saisie.checked;
    if (chemin) marquerManuel(chemin);
    modifie();
  });
  return h('label.bo-bascule', {}, saisie, h('span', {}, label));
}

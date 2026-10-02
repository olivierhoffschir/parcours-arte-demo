/**
 * ui.js — fabrique d'éléments et champs de formulaire réutilisables.
 *
 * Pas de framework : l'outil est temporaire et une page sans étape de build se
 * déploie et se débogue directement. Ces quelques aides suffisent à ne pas répéter
 * la même plomberie dans chaque écran.
 *
 * Aucune insertion de HTML nulle part : tout texte passe par `createTextNode`.
 * L'outil est servi sur une page publique et garde un jeton d'accès en mémoire du
 * navigateur — une balise venue d'un champ de contenu pourrait sinon le voler.
 */

import { conditionDuChamp, ecransQuiAffichent, ouSaffiche } from './champs.js';
import { adresseDuPrototype } from './route.js';
import {
  langueActive, marquerManuel, modifie, poserLangueActive,
} from './store.js';
import {
  CHAMPS_PARCOURS, CHAMPS_PARCOURS_META, CHAMPS_V1_CHAPITRE,
  CHAMPS_V1_CONCLUSION, CHAMPS_V1_TRANSITION, CLES,
} from './champs.js';
import { normaliser } from './texte.js';
import {
  obtenirValeurLocalisee,
  valeurEditorialeRemplie,
} from '../../react-app-desktop/src/domaine/contenu-editorial.js';

/**
 * Deux marques peuvent accompagner un libellé, et elles ne disent pas la même chose :
 *
 *  · `provisoire` — le texte est là, mais pré-généré par l'IA au lieu d'être rédigé, donc à
 *    relire. Elle tombe dès qu'on écrit par-dessus. La clé de donnée reste `provisoire` :
 *    c'est le nom du schéma, que le contenu déjà écrit emploie. La marque dit ce que l'éditeur
 *    a besoin de savoir, qui n'est pas « ce texte est temporaire » mais « personne ne l'a
 *    écrit » ;
 *  · `nonAffiche` — aucun écran ne rend ce champ aujourd'hui. Elle ne tombe pas en
 *    écrivant : c'est une propriété du champ, pas de sa valeur. Elle évite qu'on passe du
 *    temps sur un texte que personne ne verra, sans pour autant l'interdire — la maquette
 *    peut le reprendre.
 */
function libelleChamp(label, provisoire, nonAffiche = false) {
  const marque = provisoire
    ? h('span.bo-provisoire', {
      title: 'Texte pré-généré par l’IA, à relire. Le repère tombe dès qu’on écrit par-dessus.',
    }, 'pré-généré')
    : null;
  const marqueAffichage = nonAffiche
    ? h('span.bo-non-affiche', {
      title: 'Aucun écran ne rend ce champ aujourd’hui. Il reste modifiable, cela peut évoluer.',
    }, 'non affiché')
    : null;
  return {
    element: h('span.bo-label', {}, label, marque, marqueAffichage),
    leverProvisoire: () => marque?.remove(),
  };
}

/** Crée un élément. `h('p.classe', {}, 'texte')` */
export function h(selecteur, attrs = {}, ...enfants) {
  const [balise, ...classes] = selecteur.split('.');
  const el = document.createElement(balise || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'onclick' || k === 'oninput' || k === 'onchange' || k === 'onkeydown') {
      el.addEventListener(k.slice(2), v);
    } else {
      el.setAttribute(k, v === true ? '' : v);
    }
  }
  enfants.flat().forEach((c) => {
    if (c == null || c === false) return;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
}

export function vider(el) {
  while (el.firstChild) el.firstChild.remove();
}

/**
 * Champ de texte lié à un objet.
 *
 * `chemin` identifie le champ de façon stable (« video:xxx.titre ») : il sert à
 * retenir que l'utilisateur l'a saisi à la main, pour qu'une récupération arte.tv
 * ultérieure ne l'écrase pas.
 */
export function champ({
  label, objet, cle, chemin, multiligne = false, placeholder = '',
  aide = '', provisoire = false, nonAffiche = false, onApres,
}) {
  const valeur = objet?.[cle] ?? '';
  const libelle = libelleChamp(label, provisoire, nonAffiche);
  const saisie = multiligne
    ? h('textarea.bo-input', { rows: 3, placeholder })
    : h('input.bo-input', { type: 'text', placeholder });
  saisie.value = valeur;
  saisie.addEventListener('input', () => {
    objet[cle] = saisie.value;
    if (chemin) marquerManuel(chemin);
    onApres?.(saisie.value);
    libelle.leverProvisoire();
    modifie();
  });

  return h('label.bo-champ', { 'data-champ': cle },
    libelle.element,
    saisie,
    aide && h('span.bo-aide', {}, aide),
  );
}

/** Liste de textes courts (les acquis, les points à retenir). */
/* Pas exporté : son seul appelant est `rendreTraduisibles`, plus bas. */
function champListe({
  label, objet, cle, placeholder = '', aide = '', provisoire = false, nonAffiche = false, onApres,
}) {
  if (!Array.isArray(objet[cle])) objet[cle] = objet[cle] ? [objet[cle]] : [];
  const liste = objet[cle];
  const conteneur = h('div.bo-liste');
  const libelle = libelleChamp(label, provisoire, nonAffiche);

  function redessiner() {
    vider(conteneur);
    liste.forEach((valeur, i) => {
      const ta = h('textarea.bo-input', { rows: 2, placeholder });
      ta.value = valeur ?? '';
      ta.addEventListener('input', () => {
        liste[i] = ta.value;
        onApres?.(liste);
        libelle.leverProvisoire();
        modifie();
      });
      conteneur.append(h('div.bo-liste-ligne', {},
        h('span.bo-liste-rang', {}, i + 1),
        ta,
        h('button.bo-btn-icone', {
          type: 'button', title: 'Supprimer cette ligne',
          onclick: () => {
            liste.splice(i, 1);
            onApres?.(liste);
            libelle.leverProvisoire();
            modifie();
            redessiner();
          },
        }, '×'),
      ));
    });
    conteneur.append(h('button.bo-btn-lien', {
      type: 'button',
      onclick: () => { liste.push(''); modifie(); redessiner(); },
    }, '+ Ajouter une ligne'));
  }
  redessiner();

  return h('div.bo-champ', { 'data-champ': cle },
    libelle.element,
    conteneur,
    // Le repère de l'autre langue : traduire une liste sans l'original sous les
    // yeux obligerait à basculer d'onglet à chaque ligne.
    aide && h('span.bo-aide', {}, aide),
  );
}

/**
 * Un nombre saisi, hors du circuit de traduction : un compte est le même dans les
 * deux langues.
 *
 * Vidé ou mal saisi, le champ **retire** la clé de l'objet au lieu d'y écrire `0`.
 * Un zéro laissé par mégarde s'afficherait comme une valeur voulue, alors que
 * l'absence se masque.
 *
 * `aide` accepte une fonction, comme les propositions de `choixImage` : le repère qui dit
 * combien de notions sont déjà écrites dépend des chapitres rattachés, et cette liste
 * change pendant qu'on est sur la page. L'élément porte donc `rafraichir()`, que l'écran
 * appelle quand son assemblage bouge — sans quoi le repère mentirait jusqu'au prochain
 * chargement.
 */
export function champNombre({
  label, objet, cle, placeholder = '', aide = '', provisoire = false, nonAffiche = false, onApres,
}) {
  const libelle = libelleChamp(label, provisoire, nonAffiche);
  const saisie = h('input.bo-input.bo-input--nombre', {
    type: 'number', min: '0', step: '1', placeholder,
  });
  saisie.value = typeof objet?.[cle] === 'number' ? String(objet[cle]) : '';
  saisie.addEventListener('input', () => {
    const nombre = Number.parseInt(saisie.value, 10);
    if (Number.isFinite(nombre) && nombre >= 0) objet[cle] = nombre;
    else delete objet[cle];
    onApres?.(objet[cle]);
    libelle.leverProvisoire();
    modifie();
  });

  const texteAide = () => (typeof aide === 'function' ? aide() : aide);
  const zoneAide = h('span.bo-aide');
  const dessinerAide = () => {
    vider(zoneAide);
    const texte = texteAide();
    if (texte) zoneAide.append(texte);
  };
  dessinerAide();

  const element = h('label.bo-champ', { 'data-champ': cle },
    libelle.element,
    saisie,
    zoneAide,
  );
  element.rafraichir = dessinerAide;
  return element;
}

/**
 * Les notions d'un chapitre : la phrase d'acquis, et ce que la carte demande en plus.
 *
 * Une notion s'écrit d'abord en phrase, et le reste tant qu'elle n'a rien de plus à
 * dire — c'est ce qui permet de migrer chapitre par chapitre sans transformer d'un
 * coup tout le contenu en objets à trois champs vides. Dès qu'une question, une
 * vidéo ou un timecode est saisi, la ligne devient l'objet que la carte attend ;
 * effacer les trois la ramène à sa phrase.
 *
 * `videos` est une fonction : la liste est relue à chaque frappe, car on peut
 * ajouter une vidéo au chapitre sans quitter le formulaire.
 */
export function champNotions({
  label, objet, cle, placeholder = '', aide = '', provisoire = false, nonAffiche = false,
  videos = () => [], onApres,
}) {
  if (!Array.isArray(objet[cle])) objet[cle] = objet[cle] ? [objet[cle]] : [];
  const liste = objet[cle];
  const conteneur = h('div.bo-liste');
  const libelle = libelleChamp(label, provisoire, nonAffiche);

  function lire(valeur) {
    if (typeof valeur === 'string') return { reponse: valeur };
    return valeur && typeof valeur === 'object' ? valeur : { reponse: '' };
  }

  /* Une carte n'est écrite que si sa **phrase d'acquis** est là, en plus d'un des trois
     champs de carte. Le domaine refuse une notion sans `reponse` (`validerAcquis`), et
     `enregistrer()` refuse alors d'écrire les **quatre fichiers** : commencer par taper la
     question, ce que l'ordre des champs invite à faire, bloquait donc tout enregistrement
     sur une erreur nommant `…acquis.0.reponse`, impossible à relier à la ligne du
     formulaire. Tant que la phrase manque, la ligne reste une phrase vide — que
     `nettoyerValeursVides` retire — et un repère sous la ligne dit ce qu'elle attend. */
  function estIncomplete(notion) {
    return ['question', 'videoId', 'timecode'].some((champ) => (notion[champ] || '').trim())
      && !(notion.reponse || '').trim();
  }

  function ecrire(i, notion, direIncomplete) {
    const aUneCarte = ['question', 'videoId', 'timecode']
      .some((champ) => (notion[champ] || '').trim());
    liste[i] = aUneCarte && (notion.reponse || '').trim()
      ? Object.fromEntries(['question', 'reponse', 'videoId', 'timecode']
        .filter((champ) => (notion[champ] || '').trim())
        .map((champ) => [champ, notion[champ]]))
      : notion.reponse;
    direIncomplete?.();
    onApres?.(liste);
    libelle.leverProvisoire();
    modifie();
  }

  function redessiner() {
    vider(conteneur);
    liste.forEach((valeur, i) => {
      const notion = lire(valeur);
      const repere = h('span.bo-aide.bo-notion-incomplete');
      const direIncomplete = () => {
        vider(repere);
        if (estIncomplete(notion)) {
          repere.append('La phrase d’acquis est le verso de la carte : sans elle, cette '
            + 'notion n’est pas enregistrée.');
        }
      };
      const maj = () => ecrire(i, notion, direIncomplete);
      direIncomplete();

      const question = h('input.bo-input.bo-notion-question', {
        type: 'text', placeholder: 'Question ou formule d’appel, au recto de la carte',
      });
      question.value = notion.question ?? '';
      question.addEventListener('input', () => {
        notion.question = question.value;
        maj();
      });

      const reponse = h('textarea.bo-input.bo-notion-reponse', { rows: 2, placeholder });
      reponse.value = notion.reponse ?? '';
      reponse.addEventListener('input', () => {
        notion.reponse = reponse.value;
        maj();
      });

      const video = h('select.bo-input.bo-notion-video');
      video.append(h('option', { value: '' }, '— aucune vidéo associée —'));
      videos().forEach((v) => video.append(h('option', { value: v.id }, v.titre || v.id)));
      video.value = notion.videoId ?? '';
      video.addEventListener('change', () => {
        notion.videoId = video.value;
        maj();
      });

      const timecode = h('input.bo-input.bo-input--temps.bo-notion-timecode', {
        type: 'text', placeholder: '12:40',
      });
      timecode.value = notion.timecode ?? '';
      timecode.addEventListener('input', () => {
        notion.timecode = timecode.value;
        maj();
      });

      conteneur.append(h('div.bo-notion', {},
        h('span.bo-liste-rang', {}, i + 1),
        question,
        reponse,
        h('div.bo-notion-source', {}, video, timecode),
        h('button.bo-btn-icone', {
          type: 'button', title: 'Supprimer cette notion',
          onclick: () => {
            liste.splice(i, 1);
            onApres?.(liste);
            libelle.leverProvisoire();
            modifie();
            redessiner();
          },
        }, '×'),
        repere,
      ));
    });
    conteneur.append(h('button.bo-btn-lien', {
      type: 'button',
      onclick: () => { liste.push(''); modifie(); redessiner(); },
    }, '+ Ajouter une notion'));
  }
  redessiner();

  return h('div.bo-champ', { 'data-champ': cle },
    libelle.element,
    conteneur,
    aide && h('span.bo-aide', {}, aide),
  );
}

/**
 * Un seul champ pour un texte stocké en paragraphes.
 *
 * `retenir` est un tableau parce que le prototype en fait autant de paragraphes.
 * Le présenter comme une liste de zones de saisie donnait deux boîtes là où
 * l'éditeur n'écrit qu'un texte : on saisit donc dans une seule zone, et les
 * paragraphes se séparent par une ligne vide, comme partout ailleurs.
 */
function champParagraphes({
  label, objet, cle, placeholder = '', aide = '', provisoire = false, nonAffiche = false, onApres,
}) {
  const libelle = libelleChamp(label, provisoire, nonAffiche);
  const valeur = Array.isArray(objet[cle])
    ? objet[cle].filter(Boolean).join('\n\n')
    : (objet[cle] || '');
  const saisie = h('textarea.bo-input', { rows: 6, placeholder });
  saisie.value = valeur;
  saisie.addEventListener('input', () => {
    objet[cle] = saisie.value
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    onApres?.(objet[cle]);
    libelle.leverProvisoire();
    modifie();
  });
  return h('label.bo-champ', { 'data-champ': cle },
    libelle.element,
    saisie,
    h('span.bo-aide', {},
      ['Une ligne vide sépare deux paragraphes.', aide].filter(Boolean).join(' — ')),
  );
}

/** Liste d'horodatages : [ « 03:12 », « titre », « contextualisation facultative » ]. */
function champMoments({
  label, objet, cle, aide = '', provisoire = false, nonAffiche = false, onApres,
}) {
  if (!Array.isArray(objet[cle])) objet[cle] = [];
  const liste = objet[cle];
  const conteneur = h('div.bo-liste');
  const libelle = libelleChamp(label, provisoire, nonAffiche);

  function redessiner() {
    vider(conteneur);
    liste.forEach((moment, i) => {
      const paire = Array.isArray(moment) ? moment : ['', String(moment ?? '')];
      const t = h('input.bo-input.bo-input--temps', { type: 'text', placeholder: '03:12' });
      t.value = paire[0] ?? '';
      const d = h('input.bo-input', { type: 'text', placeholder: 'Titre court du passage' });
      d.value = paire[1] ?? '';
      const c = h('input.bo-input.bo-moment-contexte', {
        type: 'text',
        maxlength: 160,
        placeholder: 'Pourquoi ce passage compte, en une phrase',
      });
      c.value = paire[2] ?? '';
      const maj = () => {
        liste[i] = [t.value, d.value, c.value];
        onApres?.(liste);
        libelle.leverProvisoire();
        modifie();
      };
      t.addEventListener('input', maj);
      d.addEventListener('input', maj);
      c.addEventListener('input', maj);
      conteneur.append(h('div.bo-liste-ligne.bo-moment-ligne', {}, t, d, c,
        h('button.bo-btn-icone', {
          type: 'button', title: 'Supprimer ce moment',
          onclick: () => {
            liste.splice(i, 1);
            onApres?.(liste);
            libelle.leverProvisoire();
            modifie();
            redessiner();
          },
        }, '×'),
      ));
    });
    conteneur.append(h('button.bo-btn-lien', {
      type: 'button',
      onclick: () => { liste.push(['', '', '']); modifie(); redessiner(); },
    }, '+ Ajouter un moment'));
  }
  redessiner();

  return h('div.bo-champ', { 'data-champ': cle },
    libelle.element,
    conteneur,
    aide && h('span.bo-aide', {}, aide),
  );
}

/* ─────────────────── La langue de travail ─────────────────── */

/**
 * Onglets de langue : **le même formulaire**, dans une langue ou dans l'autre.
 *
 * Les deux panneaux étaient construits séparément, et l'allemand n'y portait que
 * des traductions : ni l'ajout d'une vidéo, ni l'ordre des chapitres, ni l'image.
 * On ne pouvait donc pas créer un parcours en partant de l'allemand — ce que
 * demande l'équipe éditoriale.
 *
 * D'où ce renversement : `construire(langue)` est appelé pour la langue affichée,
 * et une seule fois — un seul panneau existe à la fois. Le formulaire est le même
 * par construction, et il n'y a jamais deux copies d'un champ structurel à tenir
 * synchronisées. Basculer reconstruit, donc une vidéo ajoutée en allemand est là
 * en français à la seconde d'après, et inversement.
 *
 * Ce qu'il faut préserver au passage, la reconstruction ne le rendant pas
 * gratuitement : la position de défilement, et le pli des vidéos ouvertes (à la
 * charge de l'appelant, qui garde l'ensemble des identifiants dépliés).
 */
export function ongletsLangue({ construire, compteur }) {
  const onglets = h('div.bo-onglets');
  const corps = h('div.bo-onglets-corps');

  const boutons = {};
  const compteurs = {};
  let actif = langueActive();

  /* Chaque onglet porte le compte de ce qui lui manque : un parcours peut être
     écrit en allemand d'abord, l'onglet français a donc aussi son retard à dire. */
  const titres = {
    fr: 'Champs remplis en allemand mais encore vides en français',
    de: 'Champs remplis en français mais encore vides en allemand',
  };

  function majCompteurs() {
    if (!compteur) return;
    ['fr', 'de'].forEach((langue) => {
      const n = compteur(langue);
      vider(compteurs[langue]);
      if (n) compteurs[langue].append(String(n));
      compteurs[langue].classList.toggle('is-vide', !n);
    });
  }

  function dessiner() {
    vider(corps);
    corps.append(h('div.bo-panneau.is-actif', {
      'data-langue': actif, role: 'tabpanel',
    }, construire(actif)));
    majCompteurs();
  }

  function activer(langue) {
    if (langue === actif) return;
    // La reconstruction change la hauteur du panneau : sans cela, la page saute.
    const y = window.scrollY;
    actif = langue;
    poserLangueActive(langue);
    Object.entries(boutons).forEach(([l, b]) => {
      b.classList.toggle('is-actif', l === langue);
      b.setAttribute('aria-selected', String(l === langue));
    });
    dessiner();
    window.scrollTo({ top: y });
  }

  [['fr', 'Français'], ['de', 'Deutsch']].forEach(([langue, libelle]) => {
    const b = h('button.bo-onglet' + (langue === actif ? '.is-actif' : ''), {
      type: 'button', role: 'tab', 'aria-selected': String(langue === actif),
      onclick: () => activer(langue),
    }, libelle);
    compteurs[langue] = h('span.bo-onglet-compteur.is-vide', { title: titres[langue] });
    b.append(compteurs[langue]);
    boutons[langue] = b;
    onglets.append(b);
  });

  dessiner();

  const element = h('div.bo-onglets-bloc', {}, onglets, corps);
  /* Porté par l'élément : l'appelant l'insère directement comme enfant dans h(),
     un objet romprait la composition. `majCompteurs` sert après une modification
     de structure — ajouter une vidéo ajoute des champs à traduire. */
  element.majCompteurs = majCompteurs;
  return element;
}

/**
 * La valeur d'un champ dans la langue voulue, avec repli sur l'autre.
 *
 * La règle appartient au domaine, celle-là même que sert le prototype
 * (`getLocalized` dans `src/i18n.js`) : le français est le pivot, mais un contenu
 * écrit en allemand seul s'affiche plutôt qu'un blanc. Sans quoi un chapitre créé en
 * allemand apparaîtrait « sans titre » dans les listes du back-office, et serait
 * introuvable au filtre. Elle était recopiée ici, avec l'allemand écrit en dur alors
 * que le domaine balaie toutes les traductions : deux règles à tenir d'accord pour
 * une seule question.
 */
export function texteLocalise(objet, cle, langue = langueActive()) {
  return obtenirValeurLocalisee(objet, cle, langue);
}

/**
 * Accès au dictionnaire allemand d'un objet, créé à la demande.
 * On évite de semer des `i18n: { de: {} }` vides dans le contenu.
 */
export function de(objet) {
  objet.i18n = objet.i18n || {};
  objet.i18n.de = objet.i18n.de || {};
  return objet.i18n.de;
}

/**
 * Rend une liste de champs traduisibles dans une langue donnée.
 *
 * Les deux panneaux d'un formulaire étaient écrits deux fois à la main, et c'est
 * ainsi que l'allemand a dérivé : cinq champs face à vingt du côté français.
 * Déclarer les champs une fois et les rendre depuis cette déclaration rend la
 * dérive impossible — ajouter un champ l'ajoute dans les deux langues.
 *
 * Le français écrit à la racine de l'objet, l'allemand dans `i18n.de`. En allemand,
 * le texte français apparaît sous le champ : traduire sans l'original sous les yeux
 * obligerait à faire des allers-retours entre les onglets.
 */
export function rendreTraduisibles(champs, objet, langue, options = {}) {
  const {
    provisoires = new Set(), chemin, apres, cible: cibleForcee, autre: autreForce,
    videos, entite,
  } = options;
  /* `cible` dit où écrire. Par défaut l'objet lui-même en français, son `i18n.de`
     en allemand — mais la traduction de `meta.accroche` d'un parcours vit dans
     `p.i18n.de.meta`, pas dans `p.meta.i18n.de`. D'où la possibilité de l'imposer. */
  const cible = cibleForcee || (langue === 'fr' ? objet : de(objet));
  /* `autre` est l'autre langue, montrée en repère sous le champ : traduire sans
     l'original sous les yeux obligerait à faire des allers-retours entre onglets.
     Le repère va dans les deux sens, un contenu pouvant naître en allemand. */
  const autre = autreForce !== undefined
    ? (autreForce || {})
    : (langue === 'fr' ? (objet.i18n?.de || {}) : objet);

  return champs.map((c) => {
    // Le repère ne s'affiche que s'il a quelque chose à dire : « DE : — » répété
    // sous chaque champ français serait du bruit, il y a 757 champs à traduire.
    const repere = apercu(autre[c.cle]);
    const commun = {
      // Le même libellé français dans les deux onglets : on reconnaît ainsi le champ
      // qu'on remplit d'une langue à l'autre. Seul le contenu est bilingue.
      label: c.label,
      objet: cible,
      cle: c.cle,
      provisoire: langue === 'fr' && provisoires.has(c.cle),
      /* Le marqueur vaut dans les deux langues : un champ qu'aucun écran ne rend ne se
         rend pas davantage en allemand. */
      nonAffiche: c.nonAffiche === true,
      aide: [
        langue === 'fr' ? (c.aide || '') : '',
        repere ? `${langue === 'fr' ? 'DE' : 'FR'} : ${repere}` : '',
      ].filter(Boolean).join(' — '),
      placeholder: langue === 'fr' ? (c.placeholder || '') : '',
    };
    /* Le suivi de saisie manuelle vaut dans les deux langues : arte.tv/de peut
       réécrire une traduction comme arte.tv/fr peut réécrire l'original. C'est à
       l'appelant de donner un chemin distinct par langue. */
    if (chemin) commun.chemin = chemin(c.cle, langue);
    if (apres) commun.onApres = apres(c.cle, langue);

    let rendu;
    if (c.type === 'paragraphes') rendu = champParagraphes(commun);
    else if (c.type === 'liste') rendu = champListe(commun);
    else if (c.type === 'notions') rendu = champNotions({ ...commun, videos });
    else if (c.type === 'moments') rendu = champMoments(commun);
    else rendu = champ({ ...commun, multiligne: c.type === 'long' });

    /* Où l'éditeur verra ce champ. Posé ici, après le constructeur, et non passé à chacun
       des cinq : la ligne est la même partout, et elle vaut dans les deux langues — la
       Version 2 rend un champ allemand aux mêmes endroits que son pivot. */
    const ou = entite && ouSaffiche(entite, c.cle);
    if (ou) {
      const tous = ecransQuiAffichent(entite, c.cle);
      rendu.append(h('span.bo-affichage', {
        // La ligne cite les premiers endroits ; l'infobulle porte la liste entière.
        title: tous.length ? tous.join('\n') : null,
      }, ou));
    }
    /* Et la condition, quand l'affichage en a une. Dire OÙ un champ s'affiche ne suffit
       pas s'il ne s'affiche que sous condition : écrire un titre accrocheur fait
       disparaître le titre des cartes, et rien ne le disait. */
    const condition = entite && conditionDuChamp(entite, c.cle);
    if (condition) rendu.append(h('span.bo-condition', {}, condition));
    return rendu;
  });
}

/**
 * Les mêmes champs, mais ceux qu'aucun écran ne rend passent derrière un dépli.
 *
 * Deux champs de vidéo sont dans ce cas (`place`, `resume`), soit deux lignes sur douze
 * répétées à chaque vidéo — trente-quatre champs sur un parcours de dix-sept vidéos, pour
 * un texte que personne ne lira. Ils restent saisissables, et déjà écrits sur cinquante-deux
 * vidéos : les masquer serait cacher ce travail, les laisser au même rang le ferait
 * continuer.
 *
 * Le repli se déduit du marqueur, donc un champ qui perd son emplacement demain descend ici
 * sans qu'on y pense — et un champ qui en retrouve un remonte.
 */
export function rendreAvecReplis(champs, objet, langue, options = {}) {
  const affiches = champs.filter((c) => !c.nonAffiche);
  const sansEmplacement = champs.filter((c) => c.nonAffiche);
  const rendus = rendreTraduisibles(affiches, objet, langue, options);
  if (!sansEmplacement.length) return rendus;

  const n = sansEmplacement.length;
  return [
    ...rendus,
    h('details.bo-repli.bo-repli--sans-emplacement', {},
      h('summary', {}, `${n} champ${n > 1 ? 's' : ''} qu’aucun écran n’affiche aujourd’hui`),
      ...rendreTraduisibles(sansEmplacement, objet, langue, options),
    ),
  ];
}

/**
 * Un aperçu lisible d'une valeur, tableau ou texte, pour l'aide sous un champ.
 * Chaîne vide quand il n'y a rien à montrer : l'appelant n'affiche alors pas de
 * repère du tout, plutôt qu'un tiret sous chacun des centaines de champs.
 */
function apercu(v) {
  if (!valeurEditorialeRemplie(v)) return '';
  if (Array.isArray(v)) {
    const premier = apercuElement(v[0]);
    return v.length > 1 ? `${tronquer(premier)} (+${v.length - 1})` : tronquer(premier);
  }
  return tronquer(String(v));
}

/* Une notion se lit par sa phrase, pas par son JSON : le repère de l'autre langue
   sert à traduire, et « {"question":… } » n'aide personne à le faire. */
function apercuElement(valeur) {
  if (typeof valeur === 'string') return valeur;
  if (valeur && typeof valeur === 'object' && typeof valeur.reponse === 'string') {
    return valeur.reponse;
  }
  return JSON.stringify(valeur);
}

function tronquer(t, n = 110) {
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * Combien de champs manquent en FRANÇAIS alors qu'ils existent en allemand.
 *
 * Le symétrique de `manquantsEnAllemand` : un parcours peut être écrit en allemand
 * puis traduit, et l'onglet français doit alors dire ce qu'il lui reste à recevoir.
 */
export function manquantsEnFrancais(objet, cles, traduction) {
  const trad = traduction || objet.i18n?.de || {};
  return cles.filter((c) => {
    const source = trad[c];
    if (!valeurEditorialeRemplie(source)) return false; // rien à traduire dans ce sens
    const cible = objet[c];
    return !valeurEditorialeRemplie(cible);
  }).length;
}

/** Combien de champs attendus manquent encore en allemand. */
export function manquantsEnAllemand(objet, cles, traduction) {
  const trad = traduction || objet.i18n?.de || {};
  return cles.filter((c) => {
    const source = objet[c];
    if (!valeurEditorialeRemplie(source)) return false; // rien à traduire
    const t = trad[c];
    return !valeurEditorialeRemplie(t);
  }).length;
}

/** Le compteur du sens demandé, pour ne pas répéter le choix à chaque appel. */
function compteur(langue) {
  return langue === 'de' ? manquantsEnAllemand : manquantsEnFrancais;
}

/**
 * Ce qui manque au parcours lui-même : ses champs racine et son accroche.
 *
 * ⚠️ La traduction de `meta` vit dans `p.i18n.de.meta`, et non dans `p.meta.i18n.de`.
 * Le compteur des onglets le savait, le contrôle de publication l'avait oublié et
 * annonçait « 1 champ sans version allemande » sur un parcours entièrement traduit.
 * Un seul endroit le sait désormais. `cles` et `clesMeta` permettent d'en viser moins,
 * sans redire où vivent les traductions : le contrôle de publication ne regarde que les
 * titres, et les compteurs ne comptent que les champs qu'un écran affiche.
 */
export function manquantsParcours(
  p,
  langue,
  cles = CLES(CHAMPS_PARCOURS),
  clesMeta = CLES(CHAMPS_PARCOURS_META),
) {
  const manque = compteur(langue);
  return manque(p, cles)
    + manque(p.meta || {}, clesMeta, p.i18n?.de?.meta);
}

/** Ce qui manque à la conclusion V1 d'un parcours, dont la traduction a sa clé à elle. */
export function manquantsConclusionV1(extension, langue) {
  return compteur(langue)(
    extension.conclusion || {},
    CLES(CHAMPS_V1_CONCLUSION),
    extension.i18nConclusion?.de,
  );
}

/** Ce qui manque à l'extension V1 d'un chapitre, transition comprise. */
export function manquantsChapitreV1(extension, langue) {
  const manque = compteur(langue);
  return manque(extension, CLES(CHAMPS_V1_CHAPITRE))
    + manque(
      extension.transition || {},
      CLES(CHAMPS_V1_TRANSITION),
      extension.i18n?.de?.transition,
    );
}

/**
 * Choix de l'image d'un chapitre parmi celles de ses vidéos.
 *
 * Les vignettes viennent déjà d'arte.tv : autant les proposer plutôt que de faire
 * chercher une URL ailleurs. Le champ libre reste, pour une image qui ne serait
 * pas celle d'une vidéo.
 */
export function choixImage({ label, objet, cle, propositions = [], aide = '' }) {
  /* `propositions` accepte une fonction, et pas seulement un tableau : les images
     proposées viennent des vidéos du chapitre — ou des chapitres du parcours — et
     cette liste change pendant qu'on est sur la page. Un tableau évalué une fois à
     la construction obligeait à enregistrer et à revenir pour voir apparaître
     l'image de la vidéo qu'on venait d'ajouter. L'élément rendu porte donc
     `rafraichir()`, que l'écran appelle quand sa liste bouge. */
  const listeProposee = () => (typeof propositions === 'function' ? propositions() : propositions);
  const galerie = h('div.bo-galerie');
  const apercu = h('div.bo-image-choisie');
  const champUrl = h('input.bo-input', { type: 'text', placeholder: 'https://…' });
  champUrl.value = objet[cle] || '';

  function poser(url) {
    objet[cle] = url;
    champUrl.value = url;
    modifie();
    dessiner();
  }

  /**
   * L'image retenue, seule et toujours visible.
   *
   * La galerie entière restait dépliée : dix-huit vignettes et 364 px permanents pour
   * une image qu'on choisit une fois. Ce qui compte au quotidien est de voir laquelle
   * est posée ; en changer est le geste rare, et il est derrière le dépli.
   */
  function dessinerApercu() {
    vider(apercu);
    const courante = objet[cle] || '';
    if (!courante) {
      apercu.append(h('p.bo-aide', {}, 'Aucune image choisie.'));
      return;
    }
    const source = listeProposee().find((p) => p.image === courante);
    apercu.append(
      h('img.bo-image-choisie-vignette', { src: courante, alt: '', loading: 'lazy' }),
      h('span.bo-image-choisie-legende', {}, source?.titre || 'image libre'),
    );
  }

  function dessinerGalerie() {
    vider(galerie);
    const courante = objet[cle] || '';
    const proposees = listeProposee();

    if (!proposees.length) {
      galerie.append(h('p.bo-aide', {},
        'Ajoutez des vidéos au chapitre : leurs images seront proposées ici.'));
    }

    proposees.forEach((p) => {
      const choisie = p.image === courante;
      galerie.append(h('button.bo-vignette' + (choisie ? '.is-choisie' : ''), {
        type: 'button',
        title: p.titre || p.image,
        'aria-pressed': String(choisie),
        onclick: () => poser(choisie ? '' : p.image),
      },
      h('img', { src: p.image, alt: '', loading: 'lazy' }),
      h('span.bo-vignette-legende', {}, p.titre || '—'),
      choisie && h('span.bo-vignette-marque', {}, '✓'),
      ));
    });

    // Une image venue d'ailleurs : on la montre, pour qu'on sache ce qui est posé.
    if (courante && !proposees.some((p) => p.image === courante)) {
      galerie.append(h('div.bo-vignette.is-choisie.is-externe', {},
        h('img', { src: courante, alt: '', loading: 'lazy' }),
        h('span.bo-vignette-legende', {}, 'image libre'),
        h('span.bo-vignette-marque', {}, '✓'),
      ));
    }
  }

  function dessiner() {
    dessinerApercu();
    dessinerGalerie();
  }
  dessiner();

  champUrl.addEventListener('input', () => {
    objet[cle] = champUrl.value;
    modifie();
    dessiner();
  });

  const element = h('div.bo-champ', {},
    h('span.bo-label', {}, label),
    apercu,
    h('details.bo-repli', {},
      h('summary', {}, 'choisir une autre image'),
      galerie,
      champUrl,
      aide && h('span.bo-aide', {}, aide),
    ),
  );
  /* Porté par l'élément plutôt que retourné à part : l'appelant l'insère
     directement comme enfant dans h(), et un objet romprait tous les appels. */
  element.rafraichir = dessiner;
  return element;
}

/** Bandeau de message, du plus discret au plus alarmant. */
export function message(texte, ton = 'info') {
  return h(`div.bo-message.bo-message--${ton}`, {}, texte);
}

/**
 * Le lien vers la page du prototype qui rend ce contenu, ou `null`.
 *
 * Il n'y avait aucun moyen de voir un texte en place : savoir ce qu'il donne demandait de
 * publier, donc de deviner d'ici là.
 *
 * ⚠️ Ce lien ouvre la **dernière version publiée**, pas la saisie en cours : le prototype
 * est reconstruit à la synchronisation, et il n'affiche que le contenu publié. L'infobulle
 * le dit, parce qu'un lien qui montre autre chose que ce qu'on attend serait pire que pas
 * de lien du tout. C'est aussi pourquoi il ne s'affiche pas sur un brouillon — cette page
 * n'existe pas encore en ligne.
 */
export function lienPrototype({ parcours, chapitre } = {}) {
  const adresse = adresseDuPrototype({ parcours, chapitre });
  if (!adresse) return null;
  return h('a.bo-lien-prototype', {
    href: adresse,
    target: '_blank',
    rel: 'noreferrer',
    title: 'Ouvre cette page telle qu’elle est actuellement en ligne. Vos modifications '
      + 'n’y apparaîtront qu’après enregistrement, puis synchronisation.',
  }, 'voir en ligne ↗');
}

/**
 * Champ de filtre au-dessus d'une liste, qu'il remplit et redessine lui-même.
 *
 * Avec quarante chapitres, retrouver le bon à l'œil devient long. Le filtre agit
 * à la frappe et annonce ce qu'il a gardé, pour qu'une liste vide ne passe pas
 * pour une liste cassée.
 *
 * Les trois écrans en avaient chacun leur version, et elles ont dérivé : celle des
 * traductions comparait un terme dont les accents étaient retirés à un texte qui
 * gardait les siens, si bien que chercher « energie » n'y trouvait pas « Énergie ».
 * La comparaison est faite ici, une fois, des deux côtés.
 *
 * `sansTerme` permet de **montrer moins que ce qu'on cherche** : la réserve de la fiche
 * parcours n'affiche d'emblée que les chapitres libres, alors que le filtre porte sur
 * toute la réserve. Par défaut les deux ensembles se confondent.
 *
 * `vide` et `aucun` acceptent une fonction quand le message dépend de l'état — « aucun
 * chapitre libre » et « rien ne correspond » ne disent pas la même chose à l'éditeur.
 */
export function listeFiltrable({
  placeholder = 'Filtrer…', liste, ids, sansTerme = ids, foin, rendre,
  vide = 'Rien à afficher.', aucun = 'Aucun résultat.',
}) {
  const saisie = h('input.bo-input.bo-input--filtre', { type: 'search', placeholder });
  const compte = h('span.bo-filtre-compte');
  const dire = (quoi) => (typeof quoi === 'function' ? quoi() : h('li.bo-colonne-vide', {}, quoi));

  function appliquer() {
    const terme = normaliser(saisie.value).trim();
    const gardes = terme
      ? ids.filter((id) => normaliser(foin(id)).includes(terme))
      : sansTerme;
    vider(liste);
    if (!gardes.length) liste.append(dire(terme ? aucun : vide));
    else gardes.forEach((id) => liste.append(rendre(id)));
    vider(compte);
    if (terme) compte.append(`${gardes.length} sur ${ids.length}`);
  }
  appliquer();

  saisie.addEventListener('input', appliquer);
  // Échap vide le filtre : le réflexe attendu d'un champ de recherche.
  saisie.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { saisie.value = ''; appliquer(); }
  });

  return h('div.bo-filtre', {}, saisie, compte);
}

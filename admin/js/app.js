/**
 * app.js — routeur et coquille du back-office.
 *
 * Cinq écrans : les listes de parcours, de chapitres et de traductions, et les deux fiches.
 * La route vit dans le fragment d'URL (`#chapitre/mon-chapitre`), ce qui rend chaque fiche
 * partageable et le retour navigateur naturel, sans serveur. Sa lecture est dans
 * `route.js`, qui porte aussi l'écran d'arrivée.
 */

import {
  charger, surChangement, aDesModifications, appliquerBrouillon, oublierBrouillon,
  peutEnregistrer, resumeDesModifications, sauverBrouillonMaintenant,
} from './store.js';
import { listeChapitres, ficheChapitre } from './ecran-chapitre.js';
import { lireRoute, ongletDe } from './route.js';
import { listeParcours, ficheParcours } from './ecran-parcours.js';
import { listeTraductions } from './ecran-traductions.js';
import { h, vider, message } from './ui.js';
import { barreAcces, ecranConnexion } from './acces.js';
import { barreActions } from './barre-actions.js';
import { chargerConfigLocale, aUnJeton } from './github.js';

const vue = document.getElementById('bo-vue');
const etatBandeau = document.getElementById('bo-etat');

/** L'onglet de navigation courant, pour qu'on sache où on est. La règle est dans `route.js`. */
function marquerNav(cible) {
  const onglet = ongletDe(cible);
  document.querySelectorAll('.bo-nav a').forEach((a) => {
    a.classList.toggle('is-actif', a.getAttribute('href').replace('#', '') === onglet);
  });
}

/* La route sous sa forme brute, pour savoir si `aller` doit redessiner ou changer le hash.
   Le repli suit celui de `lireRoute` : les deux répondraient sinon différemment à une adresse
   vide, et « aller là où l'on est déjà » ne redessinerait pas. */
function routeCourante() {
  return location.hash.replace(/^#/, '') || lireRoute('').ecran;
}

function aller(r) {
  if (routeCourante() === r) dessiner();
  else location.hash = r;
}

/**
 * Amène le champ visé sous les yeux et le met en évidence.
 *
 * Appelé après le rendu, et **silencieux** quand la cible n'existe pas : un lien vieilli
 * doit ouvrir la fiche, pas casser la page. C'est la contrepartie de l'extension d'adresse
 * — sans cette tolérance, chaque renommage de champ aurait laissé des liens mortels.
 */
function mettreEnEvidence({ video, champ }) {
  if (!champ) return;
  const portee = video
    ? vue.querySelector(`[data-video="${CSS.escape(video)}"]`) || vue
    : vue;
  const cible = portee.querySelector(`[data-champ="${CSS.escape(champ)}"]`);
  if (!cible) return;

  cible.classList.add('is-vise');
  cible.scrollIntoView({ block: 'center', behavior: 'smooth' });
  /* Le focus va à la saisie et non au conteneur : on arrive prêt à écrire, ce qui est
     tout l'objet du lien. */
  cible.querySelector('.bo-input')?.focus();
}

function dessiner() {
  const cible = lireRoute(location.hash);
  vider(vue);
  if (cible.ecran === 'chapitre') {
    vue.append(ficheChapitre(cible.id, aller, cible));
  } else if (cible.ecran === 'parcours' && cible.id) {
    /* La fiche parcours n'a pas de vidéos à déplier : la mise en évidence suffit, elle
       cherche dans toute la vue. */
    vue.append(ficheParcours(cible.id, aller));
  } else if (cible.ecran === 'chapitres') {
    vue.append(listeChapitres(aller));
  } else if (cible.ecran === 'traductions') {
    vue.append(listeTraductions(aller));
  } else {
    /* La liste des parcours est l'écran d'arrivée : c'est donc elle qui reçoit aussi les
       adresses que `lireRoute` n'a pas comprises. */
    vue.append(listeParcours(aller));
  }
  marquerNav(cible);
  window.scrollTo({ top: 0 });
  mettreEnEvidence(cible);
}

const barre = barreActions();

/* La barre d'accès ne dépend que du jeton, qui ne change pas sans rechargement :
   la reconstruire à chaque frappe était du travail pur perdu. Elle est fabriquée
   une fois, au démarrage, puis simplement réinsérée. */
let acces = null;

/** Bandeau d'en-tête : d'où vient le contenu, et si on peut écrire. */
function dessinerEtat() {
  vider(etatBandeau);
  const resume = resumeDesModifications();
  etatBandeau.append(resume
    ? h('span.bo-etat-actif', {}, `Modifié : ${resume}`)
    : h('span.bo-etat-calme', {}, 'Aucune modification en attente'));
  if (acces) etatBandeau.append(acces);
  barre.dessiner();
}

/** Un brouillon plus récent que le fichier : on demande, on n'impose pas. */
function proposerBrouillon(b) {
  const quand = new Date(b.date).toLocaleString('fr-FR');
  const conflit = b.conflits?.length > 0;
  const bandeau = h('div.bo-message.bo-message--info.bo-reprise', {},
    h('span', {}, conflit
      ? `Un brouillon du ${quand} a été retrouvé, mais sa version de départ ne correspond pas `
        + `au dépôt actuel `
        + `(${b.conflits.join(', ')}). Vous pouvez le consulter et copier vos textes ; `
        + 'son enregistrement sera refusé pour ne rien écraser.'
      : `Des modifications non enregistrées datant du ${quand} ont été retrouvées.`),
    h('div.bo-reprise-actions', {},
      h('button.bo-btn.bo-btn--primaire', {
        type: 'button',
        onclick: () => { appliquerBrouillon(b); bandeau.remove(); dessiner(); },
      }, conflit ? 'Consulter le brouillon' : 'Les reprendre'),
      h('button.bo-btn', {
        type: 'button',
        onclick: () => { oublierBrouillon(); bandeau.remove(); },
      }, 'Repartir du fichier'),
    ),
  );
  vue.before(bandeau);
}

async function demarrer() {
  // Avant tout : un jeton peut être fourni par config.local.js, ce qui change la
  // façon de lire le contenu (API plutôt que fichiers locaux).
  await chargerConfigLocale();

  // Un coffre déployé ? Alors l'entrée se fait par identifiant et phrase de passe,
  // et l'éditeur n'a jamais le jeton entre les mains. On ne demande rien si un
  // jeton est déjà là par un autre chemin (config locale, ou saisie précédente).
  if (!aUnJeton()) {
    document.body.classList.add('is-connexion');
    const ouvert = await ecranConnexion(vue);
    document.body.classList.remove('is-connexion');
    if (ouvert) vider(vue);
  }
  try {
    const { brouillon } = await charger();
    acces = barreAcces(() => window.location.reload());
    dessiner();
    dessinerEtat();
    if (!peutEnregistrer()) {
      const bandeau = h('div.bo-message.bo-message--info.bo-reprise', {},
        h('span', {}, 'Consultation seule : le contenu vient des fichiers locaux et rien '
          + 'ne peut être enregistré sur le dépôt.'),
        h('div.bo-reprise-actions', {},
          h('button.bo-btn', {
            type: 'button',
            onclick: () => document.querySelector('.bo-acces .bo-btn-lien')?.click(),
          }, 'Saisir le jeton d’accès')),
      );
      vue.before(bandeau);
    }
    if (brouillon) proposerBrouillon(brouillon);
  } catch (e) {
    /* Sur le site public, aucune copie du contenu n'est déposée à côté de l'outil —
       elle exposerait les brouillons. Sans jeton, il n'y a donc rien à lire, et
       c'est un état normal : il faut le dire comme tel, pas comme une panne. */
    const sansJeton = !aUnJeton();
    vue.append(message(
      sansJeton
        ? 'Saisissez le jeton d’accès pour charger les parcours et les chapitres.'
        : `Impossible de lire le contenu : ${e.message}.`,
      sansJeton ? 'info' : 'erreur',
    ));
    if (sansJeton) {
      vue.append(h('p.bo-bloc-aide', {},
        'L’outil ne conserve aucune copie du contenu : tout est lu et écrit '
        + 'directement sur le dépôt, ce qui évite d’exposer les parcours en brouillon.'));
    }
    vue.append(barreAcces(() => window.location.reload()));
    return;
  }
  document.body.append(barre.element);
  // L'état de mise en ligne se lit une fois au démarrage : la barre doit pouvoir
  // annoncer « pas encore en ligne » avant même la première saisie.
  barre.rafraichirSynchro();
  surChangement(dessinerEtat);
  window.addEventListener('hashchange', dessiner);

  // Un rechargement en pleine saisie ne doit pas surprendre. Le brouillon est écrit
  // avec un léger report : on le force ici, sinon la dernière demi-seconde de saisie
  // partirait avec l'onglet.
  window.addEventListener('beforeunload', (e) => {
    if (!aDesModifications()) return;
    sauverBrouillonMaintenant();
    e.preventDefault();
    e.returnValue = '';
  });
}

demarrer();

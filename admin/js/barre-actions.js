/**
 * barre-actions.js — la barre flottante du bas, et elle seule.
 *
 * Deux choses différentes doivent être dites à l'éditeur, et elles se suivent :
 *
 *   1. « ce que vous venez de saisir n'est pas enregistré »  → Enregistrer
 *   2. « ce qui est enregistré n'est pas encore en ligne »   → Synchroniser
 *
 * Le second état vivait dans un bloc au milieu de l'écran Parcours, où personne ne
 * pensait à aller le chercher : rien ne signalait, depuis une fiche chapitre, qu'il
 * restait une action à faire pour que le travail se voie. Les deux états partagent
 * donc désormais une seule barre, toujours visible, qui annonce l'action suivante.
 *
 * Une barre plutôt que deux : deux bandeaux empilés en bas d'écran obligeraient à
 * choisir entre deux boutons de même poids, alors que l'ordre est imposé — on
 * enregistre avant de publier. Quand les deux sont vrais, « Enregistrer » est le
 * bouton et l'attente de mise en ligne n'est qu'une mention.
 *
 * L'état de synchronisation coûte deux appels à GitHub : il est donc lu au
 * démarrage, puis seulement après un enregistrement ou une publication — jamais au
 * redessin, qui suit chaque frappe.
 */

import {
  store, aDesModifications, chapitresModifies, parcoursModifies, experienceModifiee,
  enregistrer, peutEnregistrer, resumeDesModifications,
} from './store.js';
import { CODE_CONTENU_PERIME, lireJeton } from './github.js';
import { etatSynchro, lancerSynchro, suivreSynchro } from './synchro.js';
import { h, vider } from './ui.js';

const PROTOTYPE = 'https://olivierhoffschir.github.io/parcours-arte-demo/';

export function doitProposerRechargement(erreur) {
  return erreur?.code === CODE_CONTENU_PERIME;
}

function dateLisible(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function barreActions() {
  const zone = h('div.bo-barre');
  const etat = h('div.bo-barre-etat');
  const actions = h('div.bo-barre-actions');

  /* L'état lu sur GitHub. `null` = pas encore lu ; on ne prétend alors rien. */
  let synchro = null;
  /* Le compte rendu de la dernière action. Il doit survivre au redessin que
     déclenche l'action elle-même : sitôt enregistré, il n'y a plus de modification
     en attente, donc la barre voudrait disparaître — et emporterait la
     confirmation avec elle. */
  let compteRendu = null;
  let publicationEnCours = false;
  let relanceBloquee = false;

  /* ─────────────── ce qui a changé, en français ─────────────── */

  /** Message de commit lisible dans l'historique du dépôt. */
  function messageCommit() {
    const ch = chapitresModifies();
    const pa = parcoursModifies();
    const quoi = [];
    if (ch.length) quoi.push(ch.length === 1 ? `chapitre ${ch[0]}` : `${ch.length} chapitres`);
    if (pa.length) quoi.push(pa.length === 1 ? `parcours ${pa[0]}` : `${pa.length} parcours`);
    if (experienceModifiee('v1')) quoi.push('expérience V1');
    if (experienceModifiee('v2')) quoi.push('expérience V2');
    return `content: ${quoi.join(', ')}`;
  }

  /** Y a-t-il du contenu enregistré qui n'est pas encore en ligne ? */
  function attendPublication() {
    if (!synchro?.possible) return false;
    // `enAttente` à null = comparaison impossible : on ne prétend pas savoir.
    return !!synchro.jamaisPublie || synchro.enAttente > 0;
  }

  /* ─────────────── lecture de l'état de synchronisation ─────────────── */

  /**
   * Relit l'état sur GitHub. Appelée au démarrage et après chaque action, jamais
   * au redessin : deux appels d'API à chaque frappe seraient absurdes.
   */
  async function rafraichirSynchro() {
    if (!lireJeton()) { synchro = null; dessiner(); return; }
    try {
      synchro = await etatSynchro();
    } catch {
      // Pas de quoi alarmer : l'outil reste utilisable, on n'affiche simplement
      // aucune promesse sur l'état de la mise en ligne.
      synchro = null;
    }
    dessiner();
  }

  /* ─────────────── enregistrer ─────────────── */

  const boutonEnregistrer = h('button.bo-btn.bo-btn--primaire', { type: 'button' }, 'Enregistrer');

  async function sauver() {
    boutonEnregistrer.disabled = true;
    boutonEnregistrer.textContent = 'Enregistrement…';
    compteRendu = null;
    vider(etat);
    etat.append(h('span.bo-barre-encours', {}, 'écriture sur le dépôt…'));
    try {
      const { ecrits } = await enregistrer(messageCommit());
      compteRendu = {
        ton: 'ok',
        texte: `Enregistré sur le dépôt — ${ecrits.map((e) => `${e.nom}.json`).join(', ')}`
          + `${ecrits[0]?.commit ? ` (commit ${ecrits[0].commit})` : ''}.`,
      };
    } catch (e) {
      compteRendu = {
        ton: 'erreur',
        texte: `Échec : ${e.message}. Rien n’est perdu, vos champs restent remplis.`,
        recharger: doitProposerRechargement(e),
      };
    } finally {
      boutonEnregistrer.disabled = false;
      boutonEnregistrer.textContent = 'Enregistrer';
      dessiner();
      // L'enregistrement vient de créer une modification en attente de mise en
      // ligne : c'est le moment de relire l'état, pour que la barre enchaîne
      // d'elle-même sur « Synchroniser » sans qu'on recharge la page.
      rafraichirSynchro();
    }
  }
  boutonEnregistrer.addEventListener('click', sauver);

  /* ─────────────── synchroniser ─────────────── */

  const boutonSynchro = h('button.bo-btn.bo-btn--primaire', { type: 'button' },
    'Synchroniser les modifications');

  async function synchroniser() {
    if (!window.confirm(
      'Mettre le prototype en ligne ?\n\nToutes les modifications enregistrées depuis '
      + 'la dernière synchronisation deviendront visibles. Les parcours en brouillon '
      + 'restent invisibles.')) return;

    publicationEnCours = true;
    compteRendu = null;
    // Avant le premier dessin : sans cela la barre garde l'état précédent sous un
    // bouton « Publication… », jusqu'à ce que GitHub réponde.
    progression('demande de publication envoyée…');
    dessiner();

    try {
      const runId = await lancerSynchro();
      if (runId === null) {
        relanceBloquee = true;
        compteRendu = {
          ton: 'note',
          texte: 'GitHub n’a pas confirmé la demande. La publication a peut-être démarré ; '
            + 'attendez quelques minutes et rechargez avant de réessayer.',
        };
        return;
      }
      progression('demande reçue, GitHub construit le site…');

      const fin = await suivreSynchro({
        runId,
        surEtat: ({ texte, url }) => progression(texte, url),
      });

      if (!fin) {
        relanceBloquee = true;
        compteRendu = {
          ton: 'note',
          texte: 'Le suivi s’arrête ici, mais la publication continue peut-être. '
            + 'Rechargez dans quelques minutes pour voir où elle en est.',
        };
      } else if (fin.reussi) {
        compteRendu = {
          ton: 'ok',
          texte: `En ligne — ${dateLisible(fin.fin)}. Comptez une minute avant que la `
            + 'nouvelle version soit servie.',
          lien: { url: PROTOTYPE, texte: 'ouvrir le prototype' },
        };
      } else {
        compteRendu = {
          ton: 'erreur',
          texte: `Échec de la publication (${fin.conclusion}). Le contenu enregistré est `
            + 'intact, vous pouvez réessayer.',
          lien: { url: fin.url, texte: 'voir le journal d’exécution' },
        };
      }
    } catch (e) {
      compteRendu = { ton: 'erreur', texte: `Échec : ${e.message}.` };
    } finally {
      publicationEnCours = false;
      dessiner();
      rafraichirSynchro();
    }
  }
  boutonSynchro.addEventListener('click', synchroniser);

  /** Pendant la publication, la barre ne montre que là où on en est. */
  function progression(texte, url) {
    vider(etat);
    etat.append(h('span.bo-barre-encours', {}, texte));
    if (url) etat.append(lien(url, 'voir le journal d’exécution'));
  }

  function lien(url, texte) {
    return h('a.bo-btn-lien', { href: url, target: '_blank', rel: 'noreferrer' }, texte);
  }

  /* ─────────────── dessin ─────────────── */

  function dessiner() {
    const modifie = aDesModifications();
    const aPublier = attendPublication();
    const visible = modifie || aPublier || publicationEnCours || !!compteRendu;

    zone.classList.toggle('is-visible', visible);
    zone.classList.toggle('bo-barre--publie', !modifie && aPublier && !publicationEnCours);
    vider(zone);
    if (!visible) return;

    if (publicationEnCours) {
      // `etat` est alimenté par progression() ; on ne le réécrit pas ici.
      boutonSynchro.disabled = true;
      boutonSynchro.textContent = 'Publication…';
      vider(actions);
      actions.append(boutonSynchro);
      zone.append(etat, actions);
      return;
    }
    boutonSynchro.disabled = false;
    boutonSynchro.textContent = 'Synchroniser les modifications';

    vider(etat);
    vider(actions);

    if (compteRendu) {
      etat.append(h(`span.bo-barre-${compteRendu.ton === 'note' ? 'note' : compteRendu.ton}`, {},
        compteRendu.texte));
      if (compteRendu.lien) etat.append(lien(compteRendu.lien.url, compteRendu.lien.texte));
      if (compteRendu.recharger) {
        etat.append(h('button.bo-btn-lien', {
          type: 'button', onclick: () => window.location.reload(),
        }, 'recharger pour repartir du dépôt'));
      }
    }

    /* Premier temps : il y a des saisies à enregistrer. C'est l'action du moment,
       même si une mise en ligne attend aussi — on ne publie pas ce qu'on n'a pas
       encore écrit. L'attente de publication devient alors une simple mention. */
    if (modifie) {
      etat.append(h('span.bo-barre-quoi', {}, `Non enregistré : ${resumeDesModifications()}`));
      if (!peutEnregistrer()) {
        etat.append(h('span.bo-barre-note', {},
          store.source === 'local'
            ? 'consultation seule — saisissez le jeton d’accès pour enregistrer'
            : 'enregistrement indisponible'));
      } else if (aPublier) {
        etat.append(h('span.bo-barre-apres', {},
          'et une mise en ligne reste à faire ensuite'));
      }
      boutonEnregistrer.disabled = !peutEnregistrer();
      actions.append(boutonEnregistrer);
      zone.append(etat, actions);
      return;
    }

    /* Second temps : tout est enregistré, mais le prototype n'a pas été reconstruit.
       C'est ce qui n'était visible que sur l'écran Parcours. */
    if (aPublier) {
      if (synchro.jamaisPublie) {
        etat.append(h('span.bo-barre-quoi', {},
          'Le prototype n’a jamais été mis en ligne depuis cet outil.'));
      } else {
        const n = synchro.enAttente;
        etat.append(h('span.bo-barre-quoi', {},
          `${n} fichier${n > 1 ? 's' : ''} enregistré${n > 1 ? 's' : ''} `
          + `${n > 1 ? 'ne sont' : 'n’est'} pas encore en ligne`));
        if (synchro.fichiers?.length) {
          etat.append(h('span.bo-barre-note-grise', {}, `(${synchro.fichiers.join(', ')})`));
        }
        if (synchro.date) {
          etat.append(h('span.bo-barre-note-grise', {},
            `dernière mise en ligne : ${dateLisible(synchro.date)}`));
        }
      }
      if (!relanceBloquee) actions.append(boutonSynchro);
      zone.append(etat, actions);
      return;
    }

    /* Plus rien à faire : il ne reste que le compte rendu, qu'on laisse fermer. */
    actions.append(h('button.bo-btn-icone', {
      type: 'button', title: 'Fermer',
      onclick: () => { compteRendu = null; dessiner(); },
    }, '×'));
    zone.append(etat, actions);
  }

  return { element: zone, dessiner, rafraichirSynchro };
}

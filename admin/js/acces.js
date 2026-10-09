/**
 * acces.js — l'entrée dans l'outil : coffre chiffré, ou saisie du jeton.
 *
 * Un seul jeton, partagé par l'équipe éditoriale : pas de comptes individuels à ce
 * stade. Sans jeton, l'outil reste consultable mais rien ne peut être enregistré,
 * et le dire clairement vaut mieux que de laisser découvrir l'échec au moment de
 * sauvegarder.
 *
 * Le jeton est vérifié à la saisie, y compris son droit d'écriture : un jeton en
 * lecture seule passerait sinon tous les écrans sans broncher et n'échouerait qu'à
 * la première sauvegarde.
 */

import { peutEnregistrer } from './store.js';
import {
  lireJeton, poserJeton, verifierJeton, sourceJeton, poserJetonCoffre,
} from './github.js';
import { DEPOT } from './sources-contenu.js';
import { coffrePresent, ouvrir, indication } from './coffre.js';
import { h, vider, message } from './ui.js';

/* ───────────────────────── barre d'accès ───────────────────────── */

export function barreAcces(surJetonChange) {
  const zone = h('div.bo-acces');

  function dessiner() {
    vider(zone);
    if (peutEnregistrer()) {
      /* Pas de bouton « oublier le jeton » : il n'a de sens que pour un jeton
         collé à la main, alors que l'entrée normale passe par le coffre — dont le
         jeton ne vit qu'en mémoire, et disparaît en fermant l'onglet. Le proposer
         quand même donnait une action dangereuse (repasser en consultation seule
         au milieu d'une saisie) pour un besoin qui n'existe pas. */
      zone.append(
        h('span.bo-acces-ok', { title: `${DEPOT.proprietaire}/${DEPOT.nom} · ${DEPOT.branche}` },
          'écriture autorisée'),
        sourceJeton() === 'fichier'
          ? h('span.bo-acces-source', { title: 'backoffice/config.local.js' }, 'via config.local.js')
          : null,
      );
    } else {
      zone.append(
        h('span.bo-acces-lecture', {}, 'consultation seule'),
        h('button.bo-btn-lien', { type: 'button', onclick: () => ouvrirSaisie(surJetonChange) },
          'saisir le jeton d’accès'),
      );
    }
  }
  dessiner();
  return zone;
}

/** Boîte de saisie du jeton, avec vérification avant d'accepter. */
function ouvrirSaisie(surJetonChange) {
  const saisie = h('input.bo-input', {
    type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: 'false',
  });
  saisie.value = lireJeton();
  const etat = h('div.bo-ajout-etat');
  const valider = h('button.bo-btn.bo-btn--primaire', { type: 'button' }, 'Vérifier et enregistrer');

  const fenetre = h('div.bo-modale', {},
    h('div.bo-modale-corps', {},
      h('h2.bo-modale-titre', {}, 'Jeton d’accès'),
      h('p.bo-modale-texte', {},
        'Un jeton unique, partagé par l’équipe. Il autorise l’écriture du contenu sur ',
        h('code', {}, `${DEPOT.proprietaire}/${DEPOT.nom}`),
        '. Attendu : un jeton à portée limitée (« fine-grained ») sur ce seul dépôt, avec ',
        h('strong', {}, 'Contents : read and write'),
        ' et ', h('strong', {}, 'Actions : read and write'),
        ' — le second servira au bouton de synchronisation.'),
      h('label.bo-champ', {}, h('span.bo-label', {}, 'Jeton'), saisie),
      h('p.bo-aide', {},
        'Conservé dans ce navigateur uniquement. Sur un poste partagé, pensez à '
        + 'l’oublier en partant.'),
      etat,
      h('div.bo-modale-actions', {},
        h('button.bo-btn', { type: 'button', onclick: () => fenetre.remove() }, 'Annuler'),
        valider,
      ),
    ),
  );

  async function soumettre() {
    vider(etat);
    valider.disabled = true;
    valider.textContent = 'Vérification…';
    const res = await verifierJeton(saisie.value);
    valider.disabled = false;
    valider.textContent = 'Vérifier et enregistrer';
    if (!res.ok) {
      etat.append(message(`Jeton refusé : ${res.raison}.`, 'erreur'));
      return;
    }
    poserJeton(saisie.value);
    fenetre.remove();
    surJetonChange();
  }

  valider.addEventListener('click', soumettre);
  saisie.addEventListener('keydown', (e) => { if (e.key === 'Enter') soumettre(); });
  fenetre.addEventListener('click', (e) => { if (e.target === fenetre) fenetre.remove(); });
  document.body.append(fenetre);
  saisie.focus();
  return fenetre;
}

/* ───────────────────────── porte d'entrée ───────────────────────── */

/**
 * Écran de connexion, quand un coffre est déployé.
 *
 * C'est la porte d'entrée normale du site public : l'éditeur saisit un
 * identifiant et une phrase de passe, qui déchiffrent le jeton dans son
 * navigateur. Il n'a donc jamais le jeton entre les mains.
 *
 * Retourne `true` si l'ouverture a réussi.
 */
export async function ecranConnexion(conteneur) {
  if (!await coffrePresent()) return false;

  return new Promise((resoudre) => {
    const ident = h('input.bo-input', {
      type: 'text', autocomplete: 'username', spellcheck: 'false',
      placeholder: indication() || 'identifiant',
    });
    const phrase = h('input.bo-input', {
      type: 'password', autocomplete: 'current-password',
    });
    const etat = h('div.bo-ajout-etat');
    const valider = h('button.bo-btn.bo-btn--primaire', { type: 'button' }, 'Entrer');

    async function tenter() {
      vider(etat);
      if (!ident.value.trim() || !phrase.value) {
        etat.append(message('Renseignez les deux champs.', 'erreur'));
        return;
      }
      valider.disabled = true;
      valider.textContent = 'Ouverture…';
      // Le déchiffrement prend une seconde : 600 000 tours, c'est le prix qui rend
      // une attaque hors ligne coûteuse. Autant le dire plutôt que de figer.
      try {
        const jeton = await ouvrir(ident.value.trim(), phrase.value);
        poserJetonCoffre(jeton);
        // La phrase ne survit pas à la fonction ; le jeton reste en mémoire seule.
        phrase.value = '';
        resoudre(true);
      } catch (e) {
        etat.append(message(`${e.message}.`, 'erreur'));
        valider.disabled = false;
        valider.textContent = 'Entrer';
        phrase.select();
      }
    }

    valider.addEventListener('click', tenter);
    [ident, phrase].forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tenter();
    }));

    conteneur.append(h('div.bo-connexion', {},
      h('div.bo-connexion-corps', {},
        h('h1.bo-connexion-titre', {}, 'Back-office éditorial'),
        h('p.bo-connexion-texte', {},
          'Parcours ARTE — accès réservé à l’équipe éditoriale.'),
        h('label.bo-champ', {}, h('span.bo-label', {}, 'Identifiant'), ident),
        h('label.bo-champ', {}, h('span.bo-label', {}, 'Phrase de passe'), phrase),
        etat,
        valider,
        h('p.bo-aide', {},
          'Rien n’est conservé : fermer l’onglet vous déconnecte.'),
      ),
    ));
    ident.focus();
  });
}

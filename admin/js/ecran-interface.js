/**
 * ecran-interface.js — les textes d'interface, modifiables sans commit.
 *
 * Navigation, boutons, titres de section, messages récurrents : une soixantaine de textes
 * du prototype vivaient en dur dans le code source de l'application (`react-app-desktop/
 * src/i18n.js`), à côté d'environ sept cents autres purement techniques (compteurs,
 * libellés d'accessibilité). Corriger un seul de ces mots demandait un commit. Cet écran
 * rend éditables les seuls textes reconnus comme de la rédaction — la liste a été choisie
 * à la main, avec Olivier, le 13 octobre 2026 ; les autres restent dans le code.
 *
 * Une clé, deux langues : pas de fiche par clé, juste une liste filtrable — il n'y a rien
 * d'autre à montrer qu'un texte et sa traduction. Les onglets FR/DE sont ceux déjà
 * partagés par les fiches parcours et chapitre (`ongletsLangue`), pour la même raison
 * qu'ailleurs : traduire sans l'original sous les yeux obligerait à des allers-retours.
 */

import { store } from './store.js';
import {
  h, champ, ongletsLangue, listeFiltrable, message,
} from './ui.js';

const AUTRE = { fr: 'de', de: 'fr' };
const NOM = { fr: 'FR', de: 'DE' };

/** Ce dans quoi le filtre cherche : la clé elle-même, et les deux langues. */
function foinTexte(cle) {
  const entree = store.interface[cle];
  return [cle, entree.fr, entree.de].filter(Boolean).join(' ');
}

/** Une ligne : la clé pour libellé, le texte de la langue active, l'autre langue en aide. */
function ligneTexte(cle, langue) {
  const entree = store.interface[cle];
  const repere = entree[AUTRE[langue]];
  return h('li.bo-rangee.bo-interface-ligne', {},
    champ({
      label: cle,
      objet: entree,
      cle: langue,
      multiligne: true,
      aide: repere ? `${NOM[AUTRE[langue]]} : ${repere}` : '',
    }));
}

/**
 * La liste filtrable, entièrement reconstruite à chaque bascule de langue — mais pas le
 * terme filtré : `ongletsLangue` reconstruit tout à chaque bascule (c'est voulu, un
 * chapitre ajouté en allemand doit apparaître aussitôt côté français), et un terme perdu
 * à chaque bascule contredirait justement ce que cet écran promet : trouver un texte vite.
 * `termeCourant` vit donc hors de cette fonction, à la charge de l'appelant — même
 * principe que la position de défilement pour les fiches chapitre et parcours.
 */
function panneauInterface(langue, termeCourant) {
  const ids = Object.keys(store.interface).sort();
  const liste = h('ul.bo-liste-rangees');
  const filtre = listeFiltrable({
    placeholder: 'Filtrer par clé ou par texte…',
    liste,
    ids,
    foin: foinTexte,
    rendre: (cle) => ligneTexte(cle, langue),
    vide: 'Aucun texte d’interface.',
    aucun: 'Aucun texte ne correspond.',
    valeurInitiale: termeCourant.valeur,
    onTerme: (valeur) => { termeCourant.valeur = valeur; },
  });
  return h('div', {}, filtre, liste);
}

export function listeInterface() {
  const ids = Object.keys(store.interface);
  const termeCourant = { valeur: '' };
  const onglets = ongletsLangue({
    construire: (langue) => panneauInterface(langue, termeCourant),
  });

  return h('section.bo-ecran', {},
    h('header.bo-ecran-tete', {},
      h('div', {},
        h('h1.bo-titre', {}, 'Textes d’interface'),
        h('p.bo-sous-titre', {},
          'Les libellés, titres et messages du prototype — modifiables ici, sans commit. '
          + 'Une variable entre accolades, comme {titre}, doit rester identique dans les '
          + 'deux langues : l’enregistrement la contrôle.'),
      ),
    ),
    ids.length ? onglets : message('Aucun texte d’interface pour l’instant.', 'info'),
  );
}

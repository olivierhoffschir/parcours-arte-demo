/**
 * ecran-traductions.js — où en est-on dans les deux langues.
 *
 * Sans vue d'ensemble, on ne peut pas savoir ce qui reste à traduire : il faudrait
 * ouvrir les quarante et une fiches une à une. Cet écran compte, parcours par
 * parcours, ce qui manque dans chaque langue — méta, chapitres, vidéos, textes
 * éditoriaux — et mène directement à la fiche concernée.
 *
 * Il ne connaît aucun champ par lui-même : le relevé d'un chapitre est celui de sa
 * fiche, et le relevé d'un parcours celui de ses onglets. Ajouter un champ
 * traduisible le fait apparaître ici sans y toucher.
 *
 * ⚠️ Ce que le prototype affiche ne dit PAS ce qui est traduit : le front se replie
 * sur l'autre langue quand un champ est vide, ce qui est le bon comportement pour un
 * lecteur mais masque le travail restant. C'est précisément ce que cet écran montre.
 */

import { store, parcoursParRecence, titreDuParcours } from './store.js';
import { relevePourChapitre } from './ecran-chapitre.js';
import { clesAffichees } from './champs.js';
import {
  h, message, listeFiltrable, manquantsParcours, texteLocalise,
} from './ui.js';

function somme(detail) {
  return detail.meta + detail.chapitres + detail.videos + detail.v2;
}

/** Le relevé d'une liste de chapitres : les totaux par famille, et le détail par fiche. */
function releverChapitres(ids, langue) {
  const detail = { meta: 0, chapitres: 0, videos: 0, v2: 0 };
  const chapitres = [];
  ids.forEach((cid) => {
    const ch = store.chapitres[cid];
    if (!ch) return;
    const releve = relevePourChapitre(cid, langue);
    detail.chapitres += releve.chapitre;
    detail.videos += releve.videos;
    detail.v2 += releve.v2;
    const total = releve.chapitre + releve.videos + releve.v2;
    if (total) {
      chapitres.push({
        cid,
        // Un chapitre écrit en allemand d'abord a un titre : le montrer sous son
        // identifiant, sur l'écran des traductions, serait le comble.
        titre: texteLocalise(ch, 'question', langue) || cid,
        ...releve,
      });
    }
  });
  return { detail, chapitres };
}

/** Ce qui manque au parcours lui-même, hors chapitres : ses méta, et rien de la V1. */
function manquantsDuParcoursSeul(pid, langue) {
  return manquantsParcours(
    store.parcours[pid],
    langue,
    clesAffichees('parcours'),
    clesAffichees('parcoursMeta'),
  );
}

/**
 * Le relevé d'un parcours dans une langue : combien manque, et où.
 *
 * **Seulement ce qu'un écran de la Version 2 affiche.** L'écran comptait aussi les champs
 * de la Version 1 et ceux qu'aucun écran ne rend : sur l'ensemble du contenu, 45 et 52
 * champs sur 314, soit près d'un tiers d'un retard que personne ne lirait. Le contenu
 * nouveau n'est plus écrit ni traduit pour la Version 1 (décision du 18 août 2026), et un
 * relevé qui l'inclut ne se hiérarchise pas.
 *
 * Les chapitres partagés sont comptés une fois par parcours qui les emploie — c'est
 * voulu : traduire un chapitre partagé sert aux deux, et l'éditeur doit voir le
 * travail depuis chacun des deux parcours.
 */
function relever(pid, langue) {
  const p = store.parcours[pid];
  const { detail, chapitres } = releverChapitres(p.chapitres || [], langue);
  detail.meta = manquantsDuParcoursSeul(pid, langue);
  return { total: somme(detail), detail, chapitres };
}

/** Les chapitres qu'aucun parcours n'emploie. */
function chapitresNonRattaches() {
  const rattaches = new Set(
    Object.values(store.parcours).flatMap((p) => p.chapitres || []),
  );
  return Object.keys(store.chapitres).filter((cid) => !rattaches.has(cid));
}

function releverOrphelins(langue) {
  const { detail, chapitres } = releverChapitres(chapitresNonRattaches(), langue);
  return { total: somme(detail), detail, chapitres };
}

/**
 * Le total annoncé en tête, où chaque chapitre ne compte qu'UNE fois.
 *
 * Il additionnait les relevés par parcours. Or ceux-ci répètent volontairement un
 * chapitre partagé dans chacun de ses parcours : le total était donc gonflé d'autant,
 * et il passait en même temps à côté des chapitres qu'aucun parcours n'emploie —
 * invisibles ici alors que l'écran promet de dire ce qui reste à écrire.
 */
function total(langue) {
  const parcours = parcoursParRecence()
    .reduce((n, pid) => n + manquantsDuParcoursSeul(pid, langue), 0);
  return parcours + somme(releverChapitres(Object.keys(store.chapitres), langue).detail);
}

function pastille(n, langue) {
  if (!n) return h('span.bo-trad-ok', {}, 'complet');
  return h('span.bo-trad-manque', {
    title: langue === 'de' ? 'Champs à traduire en allemand' : 'Champs à écrire en français',
  }, `${n} à ${langue === 'de' ? 'traduire' : 'écrire'}`);
}

/**
 * Le nom de chaque famille de champs, dit **une fois**.
 *
 * La ligne du parcours et celle de chaque chapitre les nommaient séparément, et les trois
 * noms avaient divergé : « en titres de chapitre » contre « en titre », « en fiches vidéo »
 * contre « en vidéos », et « en textes de synthèse » contre « en V2 » — ce dernier nommant
 * une famille par son numéro de version, ce que cet outil a justement cessé de faire.
 * Deux lignes voisines du même écran donnaient donc deux noms à la même chose.
 */
const FAMILLES = Object.freeze({
  meta: 'en méta du parcours',
  chapitres: 'en titres de chapitre',
  videos: 'en fiches vidéo',
  v2: 'en textes de synthèse',
});

/** « 3 en titres de chapitre · 1 en fiches vidéo », pour les familles non nulles. */
function ligneDetail(detail) {
  return Object.entries(FAMILLES)
    .filter(([famille]) => detail[famille])
    .map(([famille, nom]) => `${detail[famille]} ${nom}`)
    .join(' · ');
}

/** Une carte de relevé, qu'elle porte sur un parcours ou sur la réserve non rattachée. */
function carteReleve({ titre, statut, de, fr, aller }) {
  const corps = [
    h('div.bo-trad-tete', {},
      h('div', {},
        titre,
        h('p.bo-trad-statut', {}, statut),
      ),
      h('div.bo-trad-pastilles', {},
        h('span.bo-trad-langue', {}, 'DE'), pastille(de.total, 'de'),
        h('span.bo-trad-langue', {}, 'FR'), pastille(fr.total, 'fr'),
      ),
    ),
  ];

  [['Allemand', de, 'de'], ['Français', fr, 'fr']].forEach(([libelle, releve]) => {
    if (!releve.total) return;
    corps.push(h('div.bo-trad-bloc', {},
      h('p.bo-trad-bloc-titre', {}, `${libelle} — ${releve.total} champ${releve.total > 1 ? 's' : ''}`),
      h('p.bo-trad-bloc-detail', {}, ligneDetail(releve.detail)),
      h('ul.bo-trad-chapitres', {}, releve.chapitres.map((c) => h('li', {},
        h('button.bo-btn-lien', {
          type: 'button',
          onclick: () => aller(`chapitre/${c.cid}`),
        }, c.titre),
        /* Les mêmes noms que la ligne du parcours juste au-dessus : `relevePourChapitre`
           rend `chapitre` au singulier là où le total rend `chapitres`. */
        h('span.bo-trad-chapitre-detail', {}, ligneDetail({
          chapitres: c.chapitre, videos: c.videos, v2: c.v2,
        })),
      ))),
    ));
  });

  if (!de.total && !fr.total) {
    corps.push(h('p.bo-trad-bloc-detail', {}, 'Rien à traduire : les deux langues sont complètes.'));
  }

  return h('li.bo-rangee.bo-trad-carte', {}, ...corps);
}

/** Ce dans quoi le filtre cherche : le titre du parcours, dans les deux langues. */
function foinParcours(pid) {
  const p = store.parcours[pid];
  return [p.title, p.i18n?.de?.title].filter(Boolean).join(' ');
}

export function listeTraductions(aller) {
  const ids = parcoursParRecence();

  const carte = (pid) => {
    const p = store.parcours[pid];
    const nb = (p.chapitres || []).length;
    return carteReleve({
      titre: h('button.bo-btn-lien.bo-trad-titre', {
        type: 'button',
        onclick: () => aller(`parcours/${pid}`),
      }, titreDuParcours(p, pid)),
      statut: `${p.statut === 'publie' ? 'publié' : 'brouillon'} · `
        + `${nb} chapitre${nb > 1 ? 's' : ''}`,
      de: relever(pid, 'de'),
      fr: relever(pid, 'fr'),
      aller,
    });
  };

  const liste = h('ul.bo-liste-rangees');
  const filtre = listeFiltrable({
    placeholder: 'Filtrer par titre de parcours…',
    liste,
    ids,
    foin: foinParcours,
    rendre: carte,
    vide: 'Aucun parcours pour l’instant.',
    aucun: 'Aucun parcours ne correspond.',
  });

  /* Les chapitres qu'aucun parcours n'emploie ne sont dans aucune carte, et leur
     travail restant serait invisible ici. Ils ne sont montrés que s'il y en a. */
  const orphelins = chapitresNonRattaches();
  const orphelinsDe = releverOrphelins('de');
  const orphelinsFr = releverOrphelins('fr');
  const carteOrphelins = orphelins.length && (orphelinsDe.total || orphelinsFr.total)
    ? h('ul.bo-liste-rangees', {}, carteReleve({
      titre: h('p.bo-trad-titre', {}, 'Chapitres non rattachés'),
      statut: `hors parcours · ${orphelins.length} chapitre${orphelins.length > 1 ? 's' : ''}`,
      de: orphelinsDe,
      fr: orphelinsFr,
      aller,
    }))
    : null;

  return h('section.bo-ecran', {},
    h('header.bo-ecran-tete', {},
      h('div', {},
        h('h1.bo-titre', {}, 'Traductions'),
        h('p.bo-sous-titre', {},
          'Ce qui reste à écrire dans chaque langue. Le prototype, lui, se replie sur '
          + 'l’autre langue quand un champ est vide : ce qui s’affiche ne dit donc pas '
          + 'ce qui est traduit.'),
      ),
      h('div.bo-trad-totaux', {},
        h('div.bo-trad-total', {},
          h('span.bo-trad-total-val', {}, total('de')),
          h('span.bo-trad-total-lbl', {}, 'à traduire en allemand'),
        ),
        h('div.bo-trad-total', {},
          h('span.bo-trad-total-val', {}, total('fr')),
          h('span.bo-trad-total-lbl', {}, 'à écrire en français'),
        ),
      ),
    ),
    ids.length ? filtre : message('Aucun parcours pour l’instant.', 'info'),
    ids.length ? liste : null,
    carteOrphelins,
  );
}

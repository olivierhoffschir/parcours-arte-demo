/**
 * texte.js — normalisation et fabrication d'identifiants lisibles.
 *
 * La même recette était écrite trois fois : dans le filtre des listes, dans la
 * création d'un chapitre et dans l'identifiant interne d'une vidéo. Trois copies
 * d'une règle qui décide de ce qu'on retrouve au filtre et de ce à quoi les textes
 * de synthèse sont indexés, donc trois occasions de diverger sans qu'un test le voie.
 */

/** Insensible aux accents et à la casse : on cherche « energie », on trouve « énergie ». */
export function normaliser(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Un identifiant lisible tiré d'un texte libre, ou chaîne vide s'il n'en reste rien.
 *
 * Le repli appartient à l'appelant : un chapitre neuf et une vidéo sans titre ne se
 * rabattent pas sur la même chose. La longueur aussi, parce qu'elle est déjà inscrite
 * dans les identifiants du dépôt et qu'en changer les ferait tous bouger.
 */
export function identifiantLisible(texte, longueur) {
  return normaliser(texte)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, longueur);
}

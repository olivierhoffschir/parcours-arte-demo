/**
 * derivation.js — la recette de dérivation de clé, partagée.
 *
 * Ce module est importé PAR LES DEUX CÔTÉS : le navigateur qui déchiffre
 * (coffre.js) et l'outil Node qui chiffre (scripts/chiffrer-jeton.mjs). C'est
 * volontaire, et ce n'est pas de la cosmétique.
 *
 * Ces deux moitiés avaient d'abord chacune leur copie de la recette. Un simple
 * caractère invisible a suffi à les faire diverger — un octet nul s'était glissé
 * là où je croyais avoir mis une espace, dans le séparateur entre l'identifiant et
 * la phrase de passe. Résultat : le chiffrement réussissait, le déchiffrement
 * échouait, et l'outil accusait la phrase de passe de l'éditeur.
 *
 * Une seule définition, donc, et un séparateur écrit par son code plutôt que par
 * un caractère qu'on ne voit pas.
 */

/** Séparateur entre identifiant et phrase, écrit sans ambiguïté. */
const SEPARATEUR = String.fromCharCode(0x1f);   // « unit separator », jamais tapé

/** Paramètres de dérivation. Les tours sont aussi inscrits dans le coffre. */
export const TOURS_PAR_DEFAUT = 600000;
const HACHAGE = 'SHA-256';

/** La matière première de la clé : identifiant et phrase, séparés sans ambiguïté. */
function materiel(identifiant, phrase) {
  return new TextEncoder().encode(
    `${String(identifiant).trim()}${SEPARATEUR}${String(phrase)}`,
  );
}

/**
 * Dérive la clé AES-GCM. `usages` diffère selon le côté — ['encrypt'] pour
 * l'outil, ['decrypt'] pour le navigateur — mais la clé produite est la même.
 */
export async function deriverCle(sousCrypto, identifiant, phrase, sel, tours, usages) {
  const matiere = await sousCrypto.importKey(
    'raw', materiel(identifiant, phrase), 'PBKDF2', false, ['deriveKey'],
  );
  return sousCrypto.deriveKey(
    { name: 'PBKDF2', salt: sel, iterations: tours || TOURS_PAR_DEFAUT, hash: HACHAGE },
    matiere,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

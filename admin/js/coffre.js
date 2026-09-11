/**
 * coffre.js — le jeton d'accès, chiffré par une phrase de passe.
 *
 * Le fichier déployé ne contient que du chiffré : `curl` sur le site public ne
 * rend rien d'exploitable, et la protection anti-secret de GitHub ne se déclenche
 * pas puisqu'aucun jeton n'y apparaît en clair.
 *
 * ⚠️ LIMITE À CONNAÎTRE, elle est structurelle et ne disparaîtra pas :
 * le chiffré est public, et le restera dans l'historique du dépôt. Un attaquant
 * peut donc l'essayer hors ligne, sans limite de tentatives et sans qu'on le voie.
 * La seule chose qui tient, c'est la longueur de la phrase de passe. D'où
 * PBKDF2 à 600 000 tours — qui rend chaque essai coûteux — et le refus, côté
 * outil de chiffrement, d'une phrase trop courte.
 *
 * Le jeton déchiffré ne va QUE en mémoire : il n'est jamais écrit dans le
 * navigateur. Fermer l'onglet le perd, et il faut ressaisir la phrase — c'est le
 * comportement voulu pour un poste partagé.
 *
 * La recette de dérivation vit dans derivation.js, partagée avec l'outil de
 * chiffrement : c'est ce qui garantit que les deux côtés ne divergent pas.
 */

import { deriverCle } from './derivation.js';

const FICHIER = './jeton-chiffre.json';

function versOctets(b64) {
  return Uint8Array.from(atob(String(b64).replace(/\s/g, '')), (c) => c.charCodeAt(0));
}

let coffre = null;

/** Le coffre existe-t-il sur ce déploiement ? */
export async function coffrePresent() {
  if (coffre !== null) return !!coffre;
  try {
    const r = await fetch(FICHIER, { cache: 'no-store' });
    if (!r.ok) { coffre = false; return false; }
    const c = await r.json();
    coffre = (c.sel && c.iv && c.chiffre) ? c : false;
  } catch {
    coffre = false;
  }
  return !!coffre;
}

/**
 * Tente d'ouvrir le coffre. Retourne le jeton, ou lève une erreur.
 *
 * AES-GCM authentifie le message : une mauvaise phrase fait échouer le
 * déchiffrement lui-même, il n'y a rien à comparer à la main.
 *
 * Les deux causes d'échec sont distinguées. Tout imputer à la phrase de passe
 * enverrait l'éditeur la ressaisir indéfiniment alors que le problème est
 * ailleurs — c'est ce qui a masqué un vrai défaut pendant la mise au point.
 */
export async function ouvrir(identifiant, phrase) {
  if (!await coffrePresent()) throw new Error('aucun coffre sur ce déploiement');

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'ce navigateur ne fournit pas les fonctions de déchiffrement '
      + '(page servie en http ailleurs que sur localhost ?)',
    );
  }

  let cle;
  try {
    // Les tours viennent du coffre : un fichier fabriqué avec d'autres réglages
    // s'ouvre quand même, au lieu d'échouer sans raison visible.
    cle = await deriverCle(
      crypto.subtle, identifiant, phrase, versOctets(coffre.sel), coffre.tours, ['decrypt'],
    );
  } catch (e) {
    throw new Error(`déchiffrement impossible sur ce navigateur : ${e.name}`);
  }

  let clair;
  try {
    clair = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: versOctets(coffre.iv) },
      cle,
      versOctets(coffre.chiffre),
    );
  } catch {
    // Là, et là seulement, c'est bien la phrase ou l'identifiant.
    throw new Error('identifiant ou phrase de passe incorrects');
  }

  const jeton = new TextDecoder().decode(clair).trim();
  if (!jeton) throw new Error('le coffre est vide');
  return jeton;
}

/** Indication libre laissée à la création, pour se rappeler quel identifiant. */
export function indication() {
  return coffre?.indication || '';
}

/**
 * champs.js — les champs traduisibles, ré-exportés depuis le domaine.
 *
 * Les deux panneaux de chaque formulaire étaient écrits deux fois à la main, et c'est
 * ainsi que l'allemand a dérivé : cinq champs face à vingt du côté français. Une seule
 * déclaration, rendue dans les deux langues par `rendreTraduisibles`, rend la dérive
 * impossible — ajouter un champ l'ajoute partout, y compris dans l'écran de suivi des
 * traductions.
 *
 * Depuis le 17 août 2026, cette déclaration unique vit dans
 * `react-app-desktop/src/domaine/champs-editoriaux.js`, parce que le **front** en a besoin
 * lui aussi : ses emplacements « à renseigner » nomment le champ manquant avec le libellé
 * exact que l'éditeur verra ici. Le back-office importe déjà `domaine/contenu-editorial.js`,
 * donc la direction autorisée est back-office → `domaine/` ; l'inverse franchirait la
 * frontière du site public.
 *
 * Ce fichier ne garde qu'un rôle : laisser la surface d'import du back-office inchangée.
 */

export {
  CHAMPS_CHAPITRE,
  CHAMPS_V1_CHAPITRE,
  CHAMPS_V1_TRANSITION,
  CHAMPS_V1_VIDEO,
  CHAMPS_V2_CHAPITRE,
  CHAMPS_VIDEO,
  CHAMPS_V2_VIDEO,
  CHAMPS_PARCOURS,
  CHAMPS_PARCOURS_META,
  CHAMPS_V1_CONCLUSION,
  CLES,
  // Où chaque champ s'affiche dans le prototype, contrôlé contre la source par un test.
  ouSaffiche,
  ecransQuiAffichent,
  // La règle conditionnelle : un champ vide en laisse parfois un autre prendre sa place.
  conditionDuChamp,
  /* Ce qui vaut d'être écrit et traduit : les champs qu'un écran de la Version 2 rend.
     La Version 1 n'est plus alimentée en contenu nouveau. */
  clesAffichees,
} from '../../react-app-desktop/src/domaine/champs-editoriaux.js';

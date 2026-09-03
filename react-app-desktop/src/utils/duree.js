/**
 * duree.js — durées cumulées, calculées depuis les vidéos.
 *
 * Une durée de parcours ou de chapitre ne se saisit jamais : elle se déduit des
 * vidéos qu'il contient. Le back-office éditorial affiche ces valeurs en lecture
 * seule et se sert des mêmes fonctions, d'où leur extraction ici — elles étaient
 * dupliquées à l'identique dans `ParcoursHubScreen` et `ChapterPageScreen`.
 *
 * Les durées sont stockées en texte libre (« 27 min », « 1 h 49 ») parce qu'elles
 * viennent d'arte.tv sous cette forme (`durationLabel`) : d'où l'analyse par
 * expression régulière plutôt qu'un simple nombre.
 */

/** Minutes contenues dans un libellé de durée. « 1 h 49 » → 109, « 27 min » → 27. */
export function minutesDuLibelle(libelle) {
  const s = String(libelle || '');
  const h = s.match(/(\d+)\s*h/);
  const mn = s.match(/(\d+)\s*min/);
  // « 1 h 49 » : les minutes suivent le h sans unité, on les rattrape.
  const hSuivi = s.match(/(\d+)\s*h\s*(\d+)/);
  return (h ? parseInt(h[1], 10) * 60 : 0)
    + (mn ? parseInt(mn[1], 10) : (hSuivi ? parseInt(hSuivi[2], 10) : 0));
}

/** Formate un total de minutes. 109 → « 1 h 49 », 27 → « 27 min ». */
export function libelleDeMinutes(mins) {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return h ? `${h} h ${String(r).padStart(2, '0')}` : `${r} min`;
}

/** Durée cumulée d'une liste de vidéos. */
export function dureeVideos(videos) {
  return libelleDeMinutes(
    (videos || []).reduce((total, v) => total + minutesDuLibelle(v.duree), 0),
  );
}

/** Durée d'un chapitre. */
export function dureeChapitre(chapitre) {
  return dureeVideos(chapitre?.videos);
}

/** Durée d'un parcours, tous chapitres confondus. */
export function dureeParcours(parcours) {
  return dureeVideos((parcours?.modules || []).flatMap((m) => m.videos || []));
}

/** Nombre de vidéos d'un parcours — l'autre valeur qui ne se saisit pas. */
export function nombreVideos(parcours) {
  return (parcours?.modules || []).reduce((n, m) => n + (m.videos?.length || 0), 0);
}

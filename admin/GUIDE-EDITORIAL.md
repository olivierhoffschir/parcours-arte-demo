# Guide éditorial V2

## Rôle du guide

Ce guide définit la fonction, le ton et la qualité attendue des textes de la V2. Il s'adresse aux
équipes éditoriales, aux prestataires et aux outils de génération.

Trois sources se complètent :

1. ce guide fixe les règles éditoriales ;
2. [`champs-editoriaux.js`](../react-app-desktop/src/domaine/champs-editoriaux.js) définit les
   champs présentés dans le back-office et leur rôle dans l'interface ;
3. [`contenu-editorial.js`](../react-app-desktop/src/domaine/contenu-editorial.js) définit les
   formats acceptés.

Le schéma fait foi pour le format. La vidéo, son transcript, les métadonnées ARTE et les sources
validées font foi pour les informations. Les identifiants, images, durées, types de programme et
états de disponibilité ne sont jamais inventés.

## Objectif éditorial

Un parcours n'est pas une playlist commentée. Ses textes doivent former un récit que l'on comprend
sans lancer les vidéos, tout en donnant envie de les regarder. À chaque étape, on doit savoir d'où
l'on vient, où l'on se trouve et pourquoi cette vidéo mérite d'être vue ici.

Le texte révèle l'intérêt de la vidéo, pas son déroulé ni sa résolution. Un champ ne reprend pas le
même synopsis dans une autre longueur : il ajoute une information utile à l'endroit où il apparaît.

## Règles communes

### Rester fidèle aux sources

- Vérifier les faits, noms, nombres, citations et timecodes.
- Ne jamais combler un manque par une invention plausible.
- Distinguer ce qui est observé, interprété, supposé ou encore inconnu.
- Dater et attribuer un fait d'actualité lorsque son contexte est nécessaire.
- Laisser un champ vide ou signaler le manque si les sources ne permettent pas de le rédiger.

### Écrire simplement

- Une phrase porte une idée principale.
- Le sujet et le verbe sont identifiables dès la première lecture.
- Le mot courant est préféré au terme savant quand il dit la même chose.
- Les verbes concrets sont préférés aux formulations abstraites.
- Les listes de concepts et les subordonnées en cascade sont évitées.
- Les tirets cadratins et demi-cadratins ne sont pas utilisés.

Écrire simplement ne signifie pas simplifier le fond. Le texte conserve la nuance, les causes et
les contrastes utiles. Une idée générale n'est gardée que si la phrase montre par quel fait, quel
choix ou quelle conséquence elle devient visible. L'analyse ne doit donc être ni une suite de faits
ni une formule abstraite détachée de ce que montre la vidéo.

Les phrases doivent aussi s'enchaîner naturellement à l'oral. Éviter les conclusions plaquées, les
reprises vagues et les changements de niveau brusques entre un détail concret et une grande idée.
Une phrase plus courte est préférable quand elle rend le raisonnement plus net, mais elle ne doit
pas casser le lien avec la précédente.

La profondeur vient d'une tension formulée avec précision, pas d'un vocabulaire plus intense. Le
verbe doit nommer l'effet réel : diviser, isoler, déplacer ou contraindre si c'est bien ce que les
sources montrent, plutôt que de se rabattre sur un verbe générique comme « interroger » ou
« déranger ». À l'inverse, ne pas amplifier une conséquence pour donner artificiellement du poids
à la phrase.

Une conclusion générale n'apporte rien si elle pourrait suivre presque n'importe quelle œuvre. La
relier à un mécanisme propre au sujet : une attente sociale qui devient une pression, une décision
de mise en scène qui change notre regard ou une contradiction qui oblige à reconsidérer un
personnage. Cette précision permet de prendre de la hauteur sans tomber dans le lieu commun.

Dans les textes éditoriaux, éviter les deux-points lorsqu'ils servent seulement à annoncer une
explication ou une conclusion. Une phrase autonome ou un enchaînement plus direct est souvent plus
fluide. À la relecture, supprimer aussi les répétitions proches qui n'ajoutent aucun sens.

Un nom propre n'est donné que s'il aide à comprendre. À sa première apparition, un nom peu connu
est accompagné de sa nature ou de son rôle : « la sonde Lucy », « l'astéroïde Bennu », « les
astéroïdes troyens, qui partagent l'orbite de Jupiter ». Pour un personnage, commencer par sa
situation ou sa fonction ; ajouter son nom seulement s'il sera utile ensuite.

Un terme spécialisé indispensable est expliqué en quelques mots au moment où il apparaît. Cette
explication doit éclairer le récit, pas ouvrir une parenthèse encyclopédique. Ne pas enchaîner deux
noms ou deux notions nouvelles dans la même phrase.

Nommer correctement l'objet : un documentaire reste un documentaire, un épisode reste un épisode,
une mission reste une mission. Employer « film » seulement lorsque c'est exact.

### Donner une raison précise de regarder

L'intérêt vient d'un enjeu, d'une tension, d'une méthode, d'un accès rare, d'un point de vue ou
d'une conséquence concrète. Le sujet seul ne suffit pas : le texte doit dire ce que son traitement
apporte de singulier.

Une formulation accessible ne doit pas devenir banale. Pour prendre de la hauteur, relier un
élément précis à ce qu'il change dans la compréhension de l'œuvre ou du sujet. Cette relation donne
de la profondeur sans recourir à un vocabulaire savant ou à une formule solennelle.

Éviter les superlatifs invérifiables, le suspense artificiel et les invitations automatiques comme
« plongez », « embarquez » ou « découvrez ». Éviter aussi d'ouvrir plusieurs sections par « Le
documentaire ». Partir plutôt de l'enjeu, de l'indice, du geste ou du conflit qui fait avancer
le récit. Si une phrase peut accompagner plusieurs vidéos sans être modifiée, elle est trop
générique.

### Rendre les champs complémentaires

Une même idée n'est pas développée dans plusieurs champs. Une reprise brève peut assurer le lien ou
rendre un texte compréhensible seul ; sinon, l'idée reste dans le champ où elle est la plus utile.

Chaque texte reste compréhensible sans avoir vu la vidéo et complète les textes qui l'entourent.

Hors champ structurel prévu à cet effet, éviter d'inscrire dans le texte un nombre de vidéos, de
chapitres ou de notions susceptible de changer. Le lien éditorial doit rester juste si la sélection
évolue.

### Garder le bon ton

Le ton est direct, précis, curieux et accessible. Il peut être vivant sans devenir publicitaire.
Il respecte les personnes filmées, ne parle pas à la place du public et n'impose pas une émotion.

## Sources nécessaires

Avant de rédiger, réunir autant que possible :

- le titre officiel, le synopsis et les métadonnées ARTE ;
- le transcript complet avec ses timecodes ;
- la position de la vidéo dans le chapitre ;
- les vidéos qui la précèdent et la suivent ;
- le titre, la présentation et les acquis du chapitre ;
- le titre, le sous-titre et l'accroche du parcours ;
- les autres champs déjà validés ;
- la langue demandée et, pour une traduction, le texte source.

## Fonction des champs

### Parcours

| Champ | Clé | Fonction |
| --- | --- | --- |
| Titre | `title` | Nommer clairement le sujet. |
| Sous-titre | `subtitle` | Préciser l'angle sans répéter le titre. |
| Thématique | `theme` | Classer le parcours avec un libellé stable. |
| Accroche | `meta.accroche` | Présenter les enjeux et relier les chapitres sans les énumérer. |
| Notions clés | `notionsCles` | Indiquer un nombre confirmé par les notions réellement proposées. |

Le titre, le sous-titre et l'accroche se rédigent après avoir lu tous les chapitres. Le titre donne
le sujet et une tension, pas une invitation générique. Le sous-titre précise l'angle. L'accroche
relie les grands enjeux sans énumérer les chapitres ni résumer leurs acquis.

Le titre ne compte pas sur l'image, la rubrique ou le contexte de l'interface pour faire comprendre
son sujet. Si l'objet du parcours pourrait rester ambigu, il le nomme explicitement, par exemple
une série, une mission ou un genre. Éviter ensuite les répétitions inutiles entre le titre, le
sous-titre et l'accroche, sans sacrifier cette clarté.

Un titre peut être évocateur, mais son idée principale doit être comprise immédiatement, sans code
culturel ni explication éditoriale. Une formule littéraire ou très générale n'est gardée que si elle
nomme réellement l'angle du parcours.

### Chapitre

| Champ | Clé | Fonction |
| --- | --- | --- |
| Titre | `question` dans le chapitre commun | Identifier cette étape du parcours. |
| Présentation | `presentation` dans l'extension V2 | Relier les programmes et situer leur apport commun. |
| Acquis | `acquis` | Fixer une idée durable par vidéo, dans l'ordre du chapitre. |

Le titre nomme l'étape. La présentation dit ce qui relie ses programmes et ce que cette étape
apporte au parcours. Elle tient en deux phrases maximum, sans énumérer ni résumer les programmes et
sans annoncer ce que le public « saura ».

Chaque vidéo donne une carte, dans le même ordre que le chapitre. Son recto peut poser une question,
affirmer un fait surprenant ou formuler une tension ; il n'est pas obligé de prendre une forme
interrogative. Son verso donne une idée que l'on a réellement apprise, découverte ou éprouvée dans
la vidéo. Il nomme un mécanisme, un contraste ou une conséquence précise plutôt qu'un thème général.

Une carte doit rester désirable hors de son chapitre : courte, autonome, assez singulière pour être
gardée ou partagée. Elle ne résume pas une vidéo et ne prend pas le ton d'une leçon. Éviter les
formules qui pourraient convenir à n'importe quel sujet, comme « nous invite à réfléchir »,
« questionne notre rapport » ou « révèle toute la complexité ». L'envie de retrouver d'autres
cartes vient de la force et de la variété des idées, jamais d'une rareté, d'un score ou d'une série
à compléter.

#### Le recto : une surprise que l'on comprend immédiatement

Le recto doit surprendre sans exagérer. Il peut corriger une intuition, révéler une contradiction,
rapprocher deux réalités que l'on croyait séparées ou faire surgir une image mentale. Sa force vient
de ce déplacement précis, pas d'un vocabulaire spectaculaire.

Le sujet, le fait surprenant et son enjeu doivent être identifiables à la première lecture. Le recto
ne raconte pas nécessairement tout le mécanisme, mais il donne assez de contexte pour que la
question soulevée soit claire. Une métaphore n'est gardée que si elle éclaire immédiatement le fait.
Si elle doit être traduite avant d'être comprise, elle masque l'idée au lieu de la renforcer.

Ne pas utiliser le mystère comme raccourci. Un pronom sans antécédent, un événement non présenté,
un nom propre peu connu ou une formule comme « ce qui change tout » ne constituent pas une accroche.
Un nom ou un chiffre ne rend la carte mémorable que s'il fait comprendre l'enjeu. Sinon, présenter
l'objet par sa nature, son action ou sa conséquence.

Un recto marquant reste simple à dire à voix haute. Il privilégie une opposition nette, un fait
contre-intuitif ou une conséquence concrète. Il évite le slogan, la devinette, la question vague et
la promesse abstraite. Une formule seulement élégante, sans découverte précise derrière elle, est à
réécrire.

#### Le verso : du fait à l'idée durable

Le verso est susceptible d'être partagé sans son recto. Il doit donc se comprendre seul. Il nomme à
nouveau l'objet si nécessaire et n'ouvre pas par « cela », « ces fragments », « leur mouvement » ou
toute autre reprise dont l'antécédent manquerait hors de la carte. Répéter un mot utile vaut mieux
que perdre le lecteur.

Le verso suit généralement trois mouvements : un fait concret, le mécanisme qui l'explique, puis
ce que ce mécanisme change dans notre compréhension. Cette progression peut tenir en deux, trois ou
quatre phrases courtes. Elle n'est pas une structure à remplir mécaniquement : chaque phrase doit
faire avancer le raisonnement.

La causalité ne reste jamais implicite. Lorsqu'un dispositif permet d'anticiper un danger, le texte
relie le dispositif à ce qu'il rend visible, puis cette observation au danger concerné. Lorsqu'un
indice conduit à une hypothèse, il explique ce que l'on observe, pourquoi l'explication habituelle
ne suffit pas et ce que les scientifiques en déduisent. Si un maillon manque, le lecteur retient une
affirmation mais ne connaît pas la découverte.

La dernière phrase prend de la hauteur sans quitter le sujet. Elle reformule la conséquence, le
paradoxe ou le changement d'échelle rendu possible par les phrases précédentes. Une chute poétique
mais banale, une morale générale ou une promesse comme « ouvrir la voie » est supprimée si elle
pourrait conclure une autre carte.

#### Une synthèse, pas un inventaire

Une carte n'a pas à être exhaustive par rapport à la vidéo. Elle choisit l'idée la plus forte et ne
garde que les faits nécessaires pour la comprendre. Empiler les noms, les chiffres, les étapes et
les conséquences rend souvent le texte descriptif sans le rendre plus juste.

L'exhaustivité utile est celle du raisonnement : aucun lien essentiel ne manque entre le fait de
départ et sa portée. Un détail technique ou un nombre est conservé s'il déclenche la compréhension,
pas pour prouver que toute la vidéo a été couverte. Si plusieurs informations sont importantes mais
ne servent pas la même idée, elles appartiennent à d'autres champs de la vidéo.

#### Tests rapides d'une carte

- **Compréhension :** sans le titre du programme ni son image, le recto est compris en une lecture.
- **Envie :** le recto promet une découverte précise, pas seulement un sujet ou une ambiance.
- **Autonomie :** lu seul, le verso ne contient ni reprise vague ni nom que le public doit déjà
  connaître.
- **Causalité :** le lien entre le fait, son mécanisme et sa conséquence peut être reformulé avec
  « parce que » puis « donc ».
- **Mémoire :** après lecture, l'idée peut être redite en une phrase simple sans reprendre le texte
  mot à mot.
- **Portée :** la dernière phrase ne pourrait pas être déplacée sous une autre carte.
- **Justesse :** chaque mot fort, chaque image et chaque niveau de certitude restent soutenus par la
  source.

Avant d'écrire une carte, relire les moments, les éléments « à retenir » et la raison éditoriale de
la vidéo. L'accroche doit naître de ce matériau et ne pas pouvoir être transférée telle quelle à une
autre œuvre. Pour une fiction ou un sujet sensible, respecter le point de vue choisi par l'œuvre :
ne pas transformer un traumatisme, une vulnérabilité ou une personne en formule provocatrice.

Lus à la suite, les titres et les présentations doivent former une progression naturelle. Chaque
chapitre part du point atteint ou ouvre une nouvelle dimension du sujet, sans répéter la bannière,
le chapitre précédent ou les acquis. Une formulation interrogative n'est utilisée que si elle vient
naturellement du sujet, jamais comme une forme imposée.

Si un acquis renvoie à une vidéo ou à un timecode, la référence doit appartenir au même chapitre et
pointer vers le passage qui explique réellement l'idée.

### Vidéo

| Champ | Clé | Fonction |
| --- | --- | --- |
| Titre | `titre` | Identifier le programme avec son titre officiel. |
| Description | `description` | Dire de quoi parle la vidéo de façon autonome et factuelle. |
| Contexte | `contextAvant` | Présenter factuellement la vidéo. Sert de synopsis lorsque la description est absente. |
| Encart blanc | `bonneRaison` | Montrer ce qui rend cette vidéo singulière et pourquoi elle a sa place dans ce chapitre. |
| Place (non affichée actuellement) | `place` | Indiquer son rôle dans le chapitre. |
| La vidéo en bref | `retenir` | Donner deux ou trois clés pour entrer dans la vidéo et en comprendre la démarche ou le point de vue. |
| Moments forts | `moments` | Proposer trois portes d'entrée timecodées qui forment une progression. |
| Résumé (non affiché actuellement) | `resume` | Condenser en une phrase l'idée la plus durable. |
| Transition | `pont` | Expliquer pourquoi la vidéo suivante prolonge le parcours. |

La description officielle peut être reprise depuis arte.tv. Elle n'est pas réécrite uniquement
pour uniformiser le ton.

Les champs `place` et `resume` ne sont pas affichés actuellement. Ils documentent respectivement la
fonction de la vidéo dans le chapitre et son idée principale, mais ne sont pas prioritaires tant
qu'ils ne sont pas utilisés dans l'interface.

Le contexte renseigne sur la vidéo ; l'encart blanc explique son intérêt dans le chapitre.

## Encart blanc et « La vidéo en bref »

L'encart blanc prépare la lecture. En une ou deux phrases, il montre ce qui rend la vidéo
singulière et pourquoi elle a sa place dans ce chapitre. Il peut la relier à la précédente lorsque
ce lien éclaire réellement la progression. Pour la première vidéo, il indique plutôt comment elle
ouvre le chapitre. Il ne raconte ni le déroulé ni la résolution.

Lorsque la vidéo est un épisode, l'encart ne réduit pas l'intérêt de la série à l'intrigue de cet
épisode. Il nomme une singularité qui traverse l'œuvre, puis fait comprendre pourquoi l'extrait
choisi permet de l'observer. Une créatrice, un créateur ou une récompense ne sont mentionnés que si
cette information éclaire un choix artistique, une position d'auteur ou la réception de l'œuvre.

« La vidéo en bref » donne deux ou trois clés concrètes : les indices à repérer, la méthode
employée, la distinction utile ou le point de vue adopté. Utile avant comme après le visionnage,
elle aide à comprendre la démarche sans résumer la vidéo ni révéler sa conclusion.

Cette section n'est ni un synopsis ni un glossaire. Une définition isolée, même juste, ne suffit
pas : il faut dire à quoi elle sert dans cette vidéo. Par exemple, définir « organique » n'a
d'intérêt que si l'on explique ce que la recherche de matière carbonée permet d'interroger.

Les clés se partagent le travail. L'une peut partir d'un geste ou d'une scène de l'épisode, une
autre montrer ce que ce choix installe à l'échelle de l'œuvre, une autre encore en dégager la portée
humaine, sociale ou historique. Elles ne doivent pas toutes revenir au même personnage, au même
passage ou à la même conclusion. Dans une œuvre chorale, elles rendent perceptible ce que la
présence de plusieurs trajectoires apporte au propos.

Test de complémentarité :

- sans l'encart, la raison pour laquelle la vidéo a sa place dans le chapitre doit manquer ;
- sans « La vidéo en bref », une clé de lecture concrète doit manquer ;
- si les deux pertes sont identiques, les sections se répètent.

## Moments forts

Une vidéo possède exactement trois moments forts. Chacun contient :

1. un timecode exact ;
2. un titre court ;
3. une phrase qui explique pourquoi le passage compte.

L'ensemble suit une progression simple :

1. le premier passage présente un enjeu, une scène ou une observation ;
2. le suivant apporte une preuve, une difficulté, une contradiction ou une tension ;
3. le dernier montre ce que l'on peut ensuite comprendre ou explorer.

Les trois rôles doivent être distincts. Si les moments peuvent être intervertis sans changer la
lecture, la progression est à revoir.

Le timecode pointe vers le début réel du passage annoncé. Le titre nomme un fait, une scène, une
découverte ou un enjeu concret, généralement en cinq à douze mots.

Le titre peut signaler qu'un basculement a lieu sans en livrer la nature. Il donne assez de repères
pour susciter l'intérêt, mais préserve la découverte lorsque le passage repose sur une révélation.

Le titre et la contextualisation ne remplissent pas la même fonction. Le titre nomme simplement
l'action, la décision ou le conflit ; la phrase explique sa portée. Un titre qui tente déjà de
contenir la cause, l'interprétation et la conséquence devient vite lourd. Une forme brève ou une
citation exacte convient si elle reste claire sans le texte placé dessous.

La contextualisation tient en une phrase de 160 caractères maximum, espaces compris. Elle complète
le titre, relie le passage au fil de la vidéo et ne se limite pas à décrire l'image. Elle part d'un
élément concret du passage pour faire comprendre son enjeu, sans raconter la suite.

À l'échelle des trois moments, les contextualisations peuvent montrer comment une scène installe un
trait durable de l'œuvre. Elles restent cependant ancrées dans le passage choisi : la portée
générale prolonge le fait observé, elle ne le remplace pas.

## Transitions

Une transition fait comprendre pourquoi la vidéo suivante arrive après la précédente.

Elle part d'un élément laissé par la vidéo précédente et montre comment la suivante le prolonge, le
traite autrement ou en révèle une limite. Ce lien peut reposer sur un indice, une conséquence, une
contradiction, un changement de méthode ou d'échelle. La phrase doit faire comprendre ce que la
prochaine vidéo permettra d'explorer que la précédente laissait en suspens.

Ce lien doit aussi donner une raison concrète de regarder la suite. Il ouvre un nouvel enjeu, un
autre point de vue ou une autre manière de raconter, sans détailler l'intrigue de la prochaine
vidéo.

Éviter « après X, passons à Y » et toute phrase qui se contente d'annoncer le synopsis suivant. Si
la transition reste valable en remplaçant la prochaine vidéo par une autre, elle est trop plate.
Un nom propre nouveau est évité ou présenté immédiatement par sa nature et son rôle.

Pour la dernière vidéo, la transition referme le chapitre en revenant à son angle ou à la promesse
du parcours. Elle formule ce que le rapprochement des œuvres permet de comprendre, sans annoncer
explicitement un bilan, un récapitulatif ou un « point » à venir.

Cette conclusion cherche le principe commun rendu visible par le rapprochement, pas un inventaire
de ce que chaque programme a montré. Elle répond à la promesse du parcours sans adopter le ton
scolaire d'une démonstration achevée.

## Adapter l'écriture au contenu

### Séries et fictions

Les textes présentent ce qui rend l'œuvre intéressante et son point de vue, pas seulement l'action
d'une scène ou d'un épisode. Ils décrivent son univers et le conflit qui l'anime, puis ce que
l'œuvre va continuer à explorer.

La hauteur d'analyse ne vient pas d'un vocabulaire conceptuel. Elle naît du lien entre un choix de
récit et ce qu'il fait comprendre des personnages, de leurs relations, de la société ou de
l'époque. Ce lien doit rester formulé avec des mots courants et s'appuyer sur un élément précis de
l'œuvre.

Lorsqu'une vidéo est un épisode de série, les textes distinguent ce qui appartient à cet épisode de
ce qu'il installe ou prolonge à l'échelle de la saison. « La vidéo en bref » doit éclairer ces deux
niveaux sans résumer toute la saison. Un détail déjà traité dans les moments forts n'y est repris
que s'il aide à comprendre l'ensemble.

Cette double échelle vaut pour tous les champs. L'épisode fournit l'entrée concrète ; la saison ou
la série donne la perspective. Le texte ne prête pas à un passage isolé toute la portée de l'œuvre
et ne survole pas l'ensemble au point d'oublier la vidéo réellement proposée.

Pour une série culte, très reconnue ou primée, la réputation n'est jamais l'argument principal. Le
texte nomme ce que l'œuvre a changé, la signature que l'on reconnaît ou le regard qu'elle a rendu
possible. Il explique pourquoi elle reste singulière au lieu d'affirmer seulement qu'elle est
incontournable.

Dans une série chorale, les personnages ne sont pas réduits à une liste de situations. Le texte
montre ce que leurs trajectoires font apparaître lorsqu'elles sont rapprochées : une contradiction,
les limites d'un modèle ou plusieurs manières d'affronter la même pression.

Un personnage est d'abord présenté par son rôle ou sa situation. Son nom n'est ajouté que s'il aide
à suivre le propos. Ne jamais poser plusieurs noms de personnages sans avoir donné au public une
raison de les retenir.

Ne pas révéler le coupable, la résolution d'une enquête, l'issue d'une relation, la conséquence
finale d'un retournement, une mort ou une révélation encore inconnue à ce moment du récit. Le texte
peut faire sentir un basculement sans dire en quoi il consiste.

Pour une fiction inspirée de faits réels, préserver la dignité des personnes et préférer le point
de vue ou le travail d'enquête à l'accroche sensationnaliste.

### Sciences et astronomie

Les textes montrent comment les scientifiques avancent : ce qu'ils cherchent, les indices ou la
méthode qu'ils utilisent, puis ce qu'ils peuvent affirmer et ce qu'ils ignorent encore. Ils situent
toujours la vidéo dans la progression du parcours.

Ils donnent avant tout les clés qui permettent de comprendre. Ils expliquent pourquoi l'expérience,
l'observation ou le dispositif compte à ce moment du parcours : ce qu'il rend visible, ce qu'il
permet de tester ou la limite qu'il rencontre. Ils ne racontent ni ses étapes ni son résultat exact.

Une observation, une simulation, une expérience et une hypothèse n'apportent pas le même niveau de
preuve. Le texte précise ce que chacune permet d'établir et ce qui reste incertain.

Les missions, instruments, objets célestes et termes scientifiques sont brièvement présentés par
leur nature et leur rôle. Une définition générale n'est conservée que si elle éclaire directement
l'enquête de la vidéo.

### Actualité, histoire et société

Situer les faits dans le temps et attribuer les chiffres ou affirmations sensibles. Distinguer le
fait établi, le témoignage, l'analyse et l'hypothèse.

Présenter les personnes par leur rôle dans le sujet. Pour un conflit ou une controverse, nommer le
point de vue adopté et éviter de transformer une position en vérité neutre.

## Traduction

Traduire le sens, la fonction du champ et le niveau de preuve, pas la syntaxe mot à mot.

Conserver les noms officiels, vérifier leur forme dans la langue cible et adapter les références
culturelles seulement si elles deviennent incompréhensibles. Ne pas ajouter d'information absente
du texte source.

Après traduction, relire les champs dans leur ordre d'affichage. Leur complémentarité et leur
progression doivent rester naturelles.

## Méthode de rédaction et de validation

1. Vérifier les sources et les données structurelles.
2. Lire le parcours, le chapitre et les vidéos voisines avant de rédiger un champ.
3. Formuler pour chaque vidéo ce qu'elle seule apporte au chapitre.
4. Attribuer une idée distincte à chaque champ avant de rédiger.
5. Rédiger dans l'ordre du parcours, puis supprimer les redites et les détails qui dévoilent trop.
6. Lire à la suite l'encart blanc, « La vidéo en bref », les moments forts et la transition.
7. Relire le résultat à voix haute et dans l'interface si possible.

Le texte est prêt lorsque :

- chaque information est sourcée et son niveau de certitude est juste ;
- chaque nom ou terme nécessaire est compris dès sa première apparition ;
- chaque champ remplit sa fonction sans paraphraser le précédent ;
- l'encart blanc dit d'où l'on vient, où l'on en est et ce que la vidéo apporte ;
- « La vidéo en bref » donne des clés pour comprendre la méthode ou le point de vue de la vidéo ;
- la transition part d'un élément précis de la vidéo précédente et mène réellement à la suivante ;
- les trois moments forts sont exacts, distincts et progressifs ;
- on peut expliquer pourquoi voir cette vidéo sans raconter ce qui s'y passe ;
- le texte donne envie sans slogan, surpromesse ni spoiler ;
- la simplicité de la forme ne réduit ni la nuance ni la profondeur de l'analyse ;
- une conclusion générale est reliée à un mécanisme propre à l'œuvre plutôt qu'à un lieu commun ;
- le verbe employé mesure justement la force du conflit ou de la conséquence ;
- dans une œuvre chorale, les clés ne se concentrent pas toutes sur le même personnage ;
- les titres de moments forts préservent les révélations qu'ils annoncent ;
- le titre d'un moment nomme le passage et sa contextualisation en explique la portée ;
- pour un épisode de série, le texte relie l'extrait à l'ensemble sans confondre les deux niveaux ;
- la dernière transition referme le chapitre sans annoncer scolairement son bilan ;
- le parcours reste compréhensible en lisant seulement ses titres et ses textes.

## Maintenir ce guide

Ajouter une règle seulement si elle change une décision éditoriale. Modifier la règle existante au
lieu d'en créer une variante ailleurs. Laisser les contraintes de format au schéma et les exemples
de contenu dans les fichiers de contenu.

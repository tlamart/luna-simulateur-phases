# Luna — Les phases de la Lune

Site éducatif en français, sans dépendance, API, backend ou téléchargement de ressources. Les quatre fichiers peuvent être déplacés ensemble et utilisés hors connexion.

## Lancer le site

Ouvrir `index.html` dans un navigateur moderne. Aucune installation ni compilation n’est nécessaire. Facultativement, dans ce dossier : `python3 -m http.server 8000`, puis ouvrir `http://localhost:8000`.

## Utilisation

Sept onglets organisent le site : Simulateur, Les 8 phases, Comprendre, Éclipses, Lever & coucher, Marées et Quiz. Les flèches gauche/droite et Début/Fin naviguent entre les onglets ; Tab permet d’entrer dans le panneau. Les liens directs (`#eclipses`, `#marees`, etc.) et l’historique du navigateur sélectionnent le panneau correspondant. La position lunaire et le quiz sont conservés ; quitter le simulateur met sa lecture en pause. Choisir une vignette de phase ouvre le simulateur à la position correspondante.

- Observer simultanément l’orbite et le disque vu depuis la Terre.
- Déplacer le curseur, cliquer sur l’orbite ou sélectionner une des huit phases.
- Lecture / Pause : à ×1, une lunaison dure environ 59 secondes ; vitesses ×2 et ×5 disponibles. Les boutons ±1 j bouclent en fin de cycle. Réinitialiser revient au jour 0, à ×1 et en mode Observer.
- Explorer : cliquer et faire glisser autour de la Terre, à la souris ou au tactile. Les déplacements restent sur l’orbite circulaire afin de conserver une lunaison cohérente.
- Clavier : Tab pour naviguer ; flèches sur le curseur ou l’orbite ; sur l’orbite, Maj + flèche = 0,1 jour, Page précédente/suivante = ±3 jours, Début/Fin = limites du cycle.
- Quiz : huit questions (deux par thème : phases, éclipses, horaires et marées), écran de départ, progression, correction immédiate expliquée, score par thème et récapitulatif de toutes les réponses. Les boutons du bilan ouvrent le cours correspondant ; revenir au quiz conserve le bilan. Recommencer réinitialise toutes les réponses. Aucun chronomètre, compte ou stockage persistant ; actualiser la page efface la progression.
- Des sections pédagogiques complètent la simulation : éclipses solaires (totale, partielle, annulaire, hybride) et lunaires (pénombrale, partielle, totale), puis évolution des heures de lever, de passage au méridien et de coucher selon les huit phases. Les schémas d’alignement sont non proportionnels ; les horaires sont des repères idéalisés en heure solaire locale, sans calcul pour une date ou un lieu. Le retard moyen de 50 minutes concerne le retour au méridien ; les levers et couchers ont des décalages variables.

- L’onglet Marées explique la gravité différentielle, les rôles lunaire et solaire, les vives-eaux et mortes-eaux, les régimes locaux et les effets sur l’estran, les courants et les activités côtières. Le modèle à deux renflements est une illustration des forces ; aucun horaire, coefficient ou niveau de marée réel n’est calculé.

La lecture ne démarre jamais automatiquement. Une activation de la préférence de réduction des mouvements ou le passage en arrière-plan met la simulation en pause. Même avec cette préférence, le bouton Lecture reste disponible sur demande explicite. Les mouvements décoratifs et le défilement fluide sont désactivés.

## Architecture

- `index.html` : structure sémantique, SVG orbital et contenu pédagogique.
- `style.css` : thème, grilles responsives, états de focus et réduction des mouvements.
- `script.js` : calculs purs dans `Lunar`, rendu sphérique dans `MoonRenderer`, puis interface et quiz indépendants.

## Géométrie et conventions

La direction du Soleil est fixe à gauche dans un repère lié à la direction Terre–Soleil. Le jour 0 est une nouvelle Lune arbitraire. Avec `θ = 2π × jour / 29,53`, la position SVG est `x = 420 − 145 cos θ`, `y = 205 + 145 sin θ`. La révolution est antihoraire vue depuis le nord du plan orbital. Ce tour dans le repère solaire représente **le cycle synodique**, pas une révolution sidérale dans un repère inertiel.

L’élongation `α = acos(cos θ)` est l’angle non orienté Soleil–Terre–Lune, de 0° à 180°. L’angle de phase au niveau de la Lune vaut approximativement `π − α`, car le Soleil est considéré très éloigné. La fraction éclairée du disque visible est `k = (1 − cos α) / 2` : 0 % à la nouvelle Lune, 50 % aux quartiers, 100 % à la pleine Lune. Il s’agit d’une fraction d’aire projetée du disque, pas d’une mesure de luminosité.

Chaque pixel du disque représente une normale de sphère `(x, y, √(1−x²−y²))`. Un produit scalaire avec la direction solaire `(sin θ, 0, −cos θ)` détermine son éclairage. Le terminateur et le disque évoluent donc continûment à toutes les positions, indépendamment des huit vignettes. Convention d’un observateur de l’hémisphère Nord, nord en haut : croissance à droite, décroissance à gauche. L’orientation réellement observée dépend aussi de la latitude, de l’heure et de la position dans le ciel.

Les huit noms servent de repères : le nom le plus proche est affiché dans une tranche de 1/8 de cycle ; le jour exact et le pourcentage restent continus. Par exemple, « Pleine Lune » peut s’afficher près du milieu du cycle alors que le pourcentage n’est pas encore exactement 100 %. Les positions de référence sont 0 ; 3,69 ; 7,38 ; 11,07 ; 14,77 ; 18,46 ; 22,15 ; 25,84 jours.

## Simplifications scientifiques

- Soleil éloigné : rayons parallèles, moitié du globe lunaire toujours éclairée ; aucune ombre terrestre ne sert à produire les phases.
- Orbite circulaire, vitesse synodique constante, plan orbital représenté à plat. L’inclinaison réelle d’environ 5,1°, l’excentricité, les perturbations et les éclipses ne sont pas simulées. Les rayons dessinés indiquent une direction ; ils ne constituent pas un calcul des ombres.
- Tailles et distances non à l’échelle ; le Soleil est un symbole placé à gauche.
- Lunaison moyenne de 29,53 jours, distincte de la période sidérale de 27,32 jours. Aucune date réelle ni prédiction astronomique.
- Texture procédurale illustrative, sans carte réelle des mers et cratères. Face nocturne très faiblement visible pour la lisibilité : ce n’est pas un modèle photométrique de la lumière cendrée. Le relief, la libration et la rotation de surface ne sont pas simulés ; une même texture reste orientée vers l’observateur terrestre.
- La Terre schématique est éclairée par la gauche. Sa rotation et son orbite solaire ne sont pas animées.

## Vérifications

Contrôle syntaxique réussi avec `node --check script.js`. Une vérification Node avec DOM simulé a passé 1 071 assertions : huit phases dans l’ordre, fractions théoriques, inversion position/jour, aire effectivement éclairée dans les pixels du Canvas (tolérance de 1,5 point de pourcentage), orientation droite/gauche, continuité de boucle, 1 000 positions orbitales, synchronisation des commandes, lecture/pause, pas clavier et quiz complet avec redémarrage.

Limite de validation : le navigateur Chromium de l’environnement de création ne peut pas démarrer à cause des restrictions du sandbox. Aucun contrôle visuel ou tactile réel n’a donc été effectué. Les styles prévoient des mises en page pour mobile, tablette et ordinateur. À vérifier dans votre navigateur : glissement tactile, navigation clavier, lisibilité et absence de débordement sur écran étroit, rendu des SVG/Canvas et console sans erreur. Les tests avec DOM simulé ne remplacent pas ces vérifications.

La navigation en onglets a été vérifiée avec 40 assertions en DOM simulé : sélection exclusive, focus, flèches, Début/Fin, historique, liens directs, pause et conservation du jour lunaire. Les sept panneaux, leurs associations ARIA, les ancres HTML et la syntaxe JavaScript ont aussi été contrôlés. La limite de vérification visuelle indiquée ci-dessus demeure.

Le quiz refait a été vérifié avec 283 assertions en DOM simulé : parcours sans faute, entièrement faux et mixte, score, correction, protection contre les réponses répétées ou invalides, progression, bilan par thème, liens vers les cours et redémarrage. Les 40 assertions de navigation en onglets passent également après cette modification.

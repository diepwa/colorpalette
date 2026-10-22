# Brief MVP : testeur d'harmonies de couleurs à partir d'images (peinture de figurines)

> Pour Claude Code. À placer à la racine du repo (BRIEF.md), puis demander : « Lis BRIEF.md, propose un plan par jalons, attends mon feu vert avant de coder. »

## 1. Contexte

L'utilisateur peint des figurines (Warhammer, bustes miniatures...) et manque souvent d'inspiration au démarrage d'un projet. Idée : donner une image à l'app, voir les couleurs qui s'y trouvent (hex) et voir comment elles s'organisent selon les harmonies de la théorie des couleurs (complémentaire, split-complémentaire, triadique, tétradique, analogue...).

Des apps proches existent (Palette Forge, GreyForge, impcat, Brushrage, Citadel Colour), mais aucune ne fait « image → palette → lecture par harmonie ». Ce MVP sert à **tester si cette idée est utile en pratique** avant d'investir dans une app complète.

## 2. Objectif du MVP

Un outil web minimal, usage perso, où :
1. j'upload une image manuellement ;
2. l'app extrait ses couleurs dominantes (hex) ;
3. je choisis une couleur de base et l'app me montre les harmonies générées ;
4. l'app analyse l'image et me dit de quelle harmonie elle se rapproche le plus.

### Ce que le MVP doit permettre d'apprendre
- Les hex extraits sont-ils fidèles à ce que je perçois dans l'image ?
- Les harmonies générées sont-elles utilisables pour planifier un schéma de peinture ?
- L'analyse (« cette image est plutôt un split-complémentaire ») est-elle pertinente ou bruitée ?
- La roue RJB (peintres) est-elle plus parlante que la roue RVB (numérique) ?

## 3. Périmètre

### Inclus
- Upload manuel d'images (glisser-déposer + sélecteur de fichier ; jpg, png, webp).
- Extraction de palette (hex).
- Roue chromatique interactive + harmonies générées.
- Analyse d'harmonie de l'image.
- Copie des hex, export PNG d'une carte palette.
- Traitement 100 % côté navigateur : aucune image n'est envoyée à un serveur.

### Exclus (v2, voir annexe)
- Moodboards multi-images, recherche via Unsplash / Pexels / Pixabay / musées.
- Correspondance avec des pots de peinture réels.
- Prévisualisation sur photo de figurine.
- Comptes, cloud, partage, monétisation.
- Persistance : pas obligatoire (état en mémoire ; l'export PNG/JSON suffit).

## 4. Fonctionnalités et critères d'acceptation

### F1. Upload
- Une image à la fois suffit (remplacer l'image courante). Plusieurs images en simultané : bonus non prioritaire.
- Redimensionner en interne (ex. 400 à 800 px de grand côté) avant analyse pour rester rapide.
- Critère : image affichée en moins d'une seconde, palette en moins d'une seconde sur une photo de 12 Mpx.

### F2. Extraction de palette
- Extraire 5 à 8 couleurs dominantes avec leur **proportion** dans l'image.
- Algorithme conseillé : quantification (k-means ou median cut) dans l'espace perceptuel **OKLab**, fusion des couleurs trop proches.
- Pour chaque couleur afficher : échantillon, **hex**, valeurs OKLCH (L, C, h) et proportion. Ces valeurs servent au test des « hexa ».
- Pipette : cliquer sur l'image pour épingler n'importe quelle couleur à la main.
- Clic sur une couleur = en faire la couleur de base (F3). Clic sur l'hex = copier.
- Critère : les couleurs dominantes affichées correspondent à ce qu'on voit à l'œil sur au moins 3 images de test variées (figurine peinte, tableau, photo de paysage).

### F3. Harmonies générées à partir d'une couleur de base
Pour la teinte de base h, calculer les teintes cibles ; garder la luminosité et la saturation de la base par défaut, avec la possibilité de les ajuster.

| Harmonie | Décalages de teinte par rapport à la base |
|---|---|
| Complémentaire | 0°, 180° |
| Split-complémentaire | 0°, 150°, 210° |
| Triadique | 0°, 120°, 240° |
| Tétradique (rectangle) | 0°, 60°, 180°, 240° |
| Carré (variante) | 0°, 90°, 180°, 270° |
| Analogue | 0°, +30°, −30° (largeur réglable) |
| Monochrome (bonus) | même teinte, luminosité/saturation variables |

- Affichage : la roue avec les points reliés (comme les schémas classiques) + les échantillons correspondants avec hex.
- Les 5 schémas de référence de l'utilisateur sont : complémentaire, split-complémentaire, triadique, tétradique, analogue.
- Critère : changer la couleur de base ou l'harmonie met à jour roue et échantillons instantanément.

### F4. Deux roues : RJB et RVB
- **Roue RVB/numérique** : rotation directe de la teinte (le complémentaire du rouge est le cyan).
- **Roue RJB (rouge-jaune-bleu)** : celle des peintres (le complémentaire du rouge est le vert, du bleu l'orange, du jaune le violet). À implémenter par une **table de correspondance de teintes** (remap entre teinte OKLCH et angle RJB, avec interpolation), pas par une simple rotation.
- Bascule dans l'UI ; **RJB par défaut**.
- Critère de validation : rouge↔vert, bleu↔orange, jaune↔violet vérifiés en test unitaire.

### F5. Analyse d'harmonie de l'image
Objectif : dire de quelle harmonie la palette de l'image se rapproche le plus, et quelles couleurs sortent du schéma.

Principe conseillé (à affiner par Claude Code) :
- Ignorer les couleurs très peu saturées (gris, quasi-noirs, quasi-blancs) : leur teinte n'est pas fiable. Seuil de chroma OKLCH réglable.
- Pondérer chaque couleur par proportion × chroma.
- Pour chaque type d'harmonie, tester toutes les rotations du gabarit (par pas de 1° à 5°) et mesurer l'écart angulaire entre chaque couleur de l'image et la teinte cible la plus proche, avec une **tolérance** (ex. ±15°, réglable).
- Attention au biais : un gabarit à 4 points colle plus facilement qu'un gabarit à 2 points. Il faut donc aussi mesurer la **couverture** (chaque teinte du gabarit est-elle réellement présente dans l'image ?) et pénaliser les gabarits plus « larges ». Définir un score qui évite que le tétradique gagne toujours.
- Sortie : classement des harmonies avec un score, la rotation optimale (teinte de référence), et les couleurs de l'image « hors schéma ».
- Afficher les couleurs de l'image **sur la roue** (points dimensionnés selon la proportion), avec le gabarit gagnant superposé.
- Rester honnête : afficher que c'est une approximation, une image réelle n'est presque jamais une harmonie parfaite.
- Critère : sur une image construite artificiellement (ex. deux aplats complémentaires), l'analyse retourne bien « complémentaire » avec un score élevé ; sur une image quasi monochrome, elle retourne « monochrome/analogue ».

### F6. Export
- Copier un hex ou toute la palette en un clic.
- Carte palette en PNG (échantillons + hex + harmonie choisie).
- Option : export JSON de la palette et de l'analyse (utile pour comparer des résultats pendant les tests).

## 5. Spécifications du moteur de couleur

- Espace de travail : OKLab / OKLCH (rotations de teinte et distances perceptuelles plus cohérentes qu'en HSL).
- Les conversions sRGB ↔ OKLCH doivent gérer le **gamut** : une couleur générée hors sRGB est ramenée dans la gamme (réduction de chroma), jamais tronquée canal par canal.
- Distance angulaire de teinte : circulaire (min(|a−b|, 360−|a−b|)).
- Ce module doit être **indépendant de l'UI** et couvert par des tests unitaires : conversions, extraction (sur images synthétiques), harmonies, remap RJB, score d'analyse.

## 6. Stack suggérée (à challenger)

- Vite + React + TypeScript.
- Bibliothèque de couleur : culori ou colorjs.io pour OKLab/OKLCH.
- Extraction : implémentation maison k-means/median cut dans OKLab, ou bibliothèque si elle supporte l'espace perceptuel.
- Canvas pour lire les pixels ; Web Worker si le calcul bloque l'UI.
- SVG pour la roue chromatique.
- Tests : Vitest.
- Thème sombre neutre par défaut (les couleurs ressortent mieux sur un fond neutre).
- PWA : pas nécessaire pour le MVP.

## 7. UX

- Une seule page : image à gauche (avec pipette), palette extraite en dessous, roue + harmonies à droite, analyse en bas ou dans un onglet.
- Fond neutre autour des échantillons pour ne pas biaiser la perception.
- Toujours afficher le hex à côté de chaque couleur (la couleur ne doit jamais être la seule information).
- Interface en français ; chaînes de texte centralisées pour une i18n ultérieure.

## 8. Plan de livraison proposé

1. **Jalon 1 : moteur de couleur + tests** (conversions, extraction, harmonies, remap RJB).
2. **Jalon 2 : upload + palette** (F1, F2) pour valider les hex.
3. **Jalon 3 : roue + harmonies générées** (F3, F4).
4. **Jalon 4 : analyse d'harmonie** (F5), jalon le plus incertain : peut être coupé ou itéré sans bloquer le reste.
5. **Jalon 5 : exports** (F6).

## 9. Protocole de test par l'utilisateur

Tester avec une dizaine d'images : figurines déjà peintes, illustrations de référence, tableaux, photos. Pour chacune, noter :
- Les hex extraits sont-ils fidèles ? (oui / non / partiellement)
- L'harmonie suggérée par l'analyse est-elle pertinente ?
- Les harmonies générées donnent-elles des idées de schéma de peinture exploitables ?
- Roue RJB ou RVB : laquelle est la plus naturelle ?

Ces retours décideront de la suite (v2).

## 10. Risques et points de vigilance

- **Extraction** : les images photo contiennent beaucoup de nuances proches ; si la palette paraît terne ou redondante, ajuster le nombre de clusters et le seuil de fusion.
- **Analyse** : risque de score trompeur (voir F5, biais du nombre de points). C'est la partie à valider avec soin.
- **Roue RJB** : n'a pas de standard unique ; documenter la table de correspondance choisie et la rendre modifiable.
- **Gamut** : éviter les couleurs générées hors sRGB qui s'afficheraient faussées.

## Annexe : roadmap v2 (déjà étudiée, à ne pas implémenter dans le MVP)

- **Moodboards** : plusieurs images placées librement sur un canvas, palette agrégée du board, projets de peinture avec palettes sauvegardées (IndexedDB, local-first, PWA).
- **Recherche d'images par API** (recherche faite le 22/10/2026) :
  - Unsplash : clé gratuite, 50 requêtes/h en mode demo ; attribution et hotlinking obligatoires, appel de l'endpoint de tracking au moment de l'utilisation de la photo.
  - Pexels : 200 requêtes/h et 20 000/mois ; crédit du photographe et lien visible vers Pexels.
  - Pixabay : 100 requêtes/60 s ; cache de 24 h obligatoire.
  - The Met (plus de 492 000 images du domaine public, CC0) et Art Institute of Chicago (CC0 pour les œuvres du domaine public) : sans clé.
  - Clés saisies par l'utilisateur dans des réglages, cache et debounce, couche d'abstraction `ImageProvider`.
  - Risque à tester en premier : lecture des pixels d'images distantes bloquée par CORS.
- **Pots de peinture réels** : correspondance hex → pot le plus proche (Citadel, Vallejo, Army Painter...), inventaire personnel.
- **Prévisualisation** des couleurs sur une photo de figurine.

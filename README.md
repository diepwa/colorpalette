# Testeur d'harmonies de couleurs

Outil web perso pour peintres de figurines : on importe une image, on prélève des couleurs à la pipette (avec une loupe) et on les range dans des catégories qu'on nomme soi-même (visage, vêtements…). Au verso de la carte, une roue RVB de saturation (teinte autour, gris au centre, couleur pure au bord) place ces couleurs, même les gris colorés. Les images et leurs catégories s'enregistrent dans le navigateur et s'exportent en texte, PNG ou JSON. Tout est traité dans le navigateur, aucune image n'est envoyée à un serveur.

Depuis le 24/10, la palette automatique n'est plus affichée : le moteur d'extraction (`src/engine/extract.ts`) reste disponible mais l'app ne l'utilise plus. Les harmonies et compositions ne sont plus affichées non plus ; `harmonies.ts` et `analysis.ts` restent dans le moteur. Sur la roue, le rayon vaut √(chroma / chroma maximal de la teinte), pour étaler les couleurs peu saturées.

Le cahier des charges est dans [BRIEF.md](BRIEF.md).

## Lancer en local

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests du moteur (Vitest)
npm run build   # vérification TypeScript + build de production
```

## Firestore (bibliothèque en ligne)

Sans configuration, les images enregistrées restent dans le navigateur (IndexedDB). Avec Firebase, un bouton « Connexion » (email et mot de passe) apparaît : une fois connecté, les images enregistrées vont dans Firestore et se retrouvent sur tous tes appareils. Les images déjà enregistrées dans le navigateur sont transférées dans le compte à la première connexion.

1. Dans la [console Firebase](https://console.firebase.google.com), créer un projet (Google Analytics inutile).
2. *Build > Firestore Database > Créer une base de données*, en mode production, région `eur3` ou `europe-west`.
3. Onglet *Règles* de Firestore : coller le contenu de [`firestore.rules`](firestore.rules) et publier. Chaque utilisateur ne lit et n'écrit que ses propres images.
4. *Build > Authentication > Commencer*, activer le fournisseur *Adresse e-mail/Mot de passe*, puis créer son compte dans l'onglet *Utilisateurs* (l'app ne propose pas l'inscription).
5. *Paramètres du projet > Vos applications > Web (</>)* : enregistrer une app, puis copier `apiKey`, `authDomain`, `projectId` et `appId` dans un fichier `.env.local` à partir de [`.env.example`](.env.example).
6. Relancer `npm run dev`.

Les images sont stockées dans le document Firestore lui-même (JPEG réduit sous 800 Ko, la limite d'un document étant 1 Mio) : pas besoin de Cloud Storage, le plan gratuit Spark suffit. Chemin : `users/{uid}/images/{id}`.

## Organisation

- `src/engine/` : moteur de couleur, indépendant de l'UI, testé avec Vitest.
  - `color.ts` : conversions sRGB ↔ OKLab/OKLCH, mise en gamut par réduction de chroma, distance de teinte circulaire.
  - `extract.ts` : extraction de palette par k-means dans OKLab (graine fixe, résultats reproductibles), fusion des nuances proches, détection d'accents, pipette.
  - `wheel.ts` + `rybTable.json` : roues RJB et RVB. La roue RJB est une table de correspondance modifiable (angle RJB → teinte OKLCH, interpolation linéaire).
  - `harmonies.ts` : complémentaire, split-complémentaire, triadique, tétradique, carré, analogue, monochrome.
  - `analysis.ts` : score d'harmonie d'une palette (voir ci-dessous).
- `src/lib/cards.ts` : couleurs prélevées et catégories (ajout, déplacement, suppression, regroupement).
- `src/lib/loadImage.ts` : chargement de l'image (réduite à 1600 px pour la pipette) et conversion d'un point de l'écran en pixel.
- `src/lib/store.ts` : enregistrement local (IndexedDB) derrière l'interface `ImageStore`.
- `src/lib/firestoreStore.ts`, `firebase.ts`, `useAccount.ts` : la même interface sur Firestore, et la connexion par email. Firebase n'est chargé que s'il est configuré. Les enregistrements de la première version sont repris dans des catégories « Palette auto » et « Épinglées ».
- `src/lib/wheel.ts` : place d'une couleur sur la roue de saturation et dessin du disque.
- `src/lib/export.ts` : exports par catégorie, sans serveur : texte (presse-papiers), carte PNG avec les repères de prélèvement, JSON.
- `src/i18n/fr.ts` : chaînes de l'interface.

## Table RJB (non utilisée par l'app)

Depuis le 22/10, l'app utilise uniquement la roue RVB. La roue RJB reste disponible dans le moteur (`wheel: 'ryb'`).

| Couleur | Angle RJB | Teinte OKLCH |
| --- | --- | --- |
| Rouge | 0° | 29° |
| Orange | 60° | 53° |
| Jaune | 120° | 110° |
| Vert | 180° | 142° |
| Bleu | 240° | 264° |
| Violet | 300° | 305° |

Il n'existe pas de standard unique pour la roue RJB : modifier `src/engine/rybTable.json` pour ajuster. Les tests vérifient rouge↔vert, bleu↔orange et jaune↔violet.

## Accents

Le k-means compte des pixels : une petite tache vive (une jupe rouge dans un champ vert, un néon) disparaît. Après les couleurs dominantes, le moteur cherche donc les pixels saturés (chroma ≥ 0,1) et éloignés de toutes les dominantes (distance OKLab ≥ 0,15). S'ils forment au moins 0,03 % de l'image, ils sont regroupés en 3 accents au plus, marqués `accent` dans la palette.

Dans l'analyse, un accent compte au moins pour 10 % de la surface chromatique, car il attire l'œil bien plus que sa surface ne le dit.

## Score d'analyse

Pour chaque harmonie et chaque rotation du gabarit (pas de 1°) :

1. Les couleurs dont le chroma OKLCH est sous le seuil (0,04) sont ignorées. Poids = proportion × chroma, normalisé.
2. Ajustement = Σ poids × max(0, 1 − d / tolérance), d étant la distance à la teinte cible la plus proche (tolérance 15°).
3. b = n × tolérance / 360 : l'ajustement qu'obtiendraient des teintes au hasard avec un gabarit à n points.
4. Couverture = part des teintes cibles qui reçoivent au moins 5 % du poids.
5. score = max(0, (ajustement − b) / (1 − b)) × couverture.

À moins de 0,05 d'écart, l'harmonie la plus simple passe devant. Si moins de 10 % de l'image est chromatique, le verdict est marqué non fiable. C'est une approximation : une image réelle n'est presque jamais une harmonie parfaite.

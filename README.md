# Testeur d'harmonies de couleurs

Outil web perso pour peintres de figurines : on charge une image, l'app en extrait les couleurs dominantes (hex, OKLCH), génère des harmonies à partir d'une couleur de base sur la roue RVB et indique de quelle harmonie l'image se rapproche. Tout est traité dans le navigateur, aucune image n'est envoyée à un serveur.

Le cahier des charges est dans [BRIEF.md](BRIEF.md).

## Lancer en local

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests du moteur (Vitest)
npm run build   # vérification TypeScript + build de production
```

## Organisation

- `src/engine/` : moteur de couleur, indépendant de l'UI, testé avec Vitest.
  - `color.ts` : conversions sRGB ↔ OKLab/OKLCH, mise en gamut par réduction de chroma, distance de teinte circulaire.
  - `extract.ts` : extraction de palette par k-means dans OKLab (graine fixe, résultats reproductibles), fusion des nuances proches, détection d'accents, pipette.
  - `wheel.ts` + `rybTable.json` : roues RJB et RVB. La roue RJB est une table de correspondance modifiable (angle RJB → teinte OKLCH, interpolation linéaire).
  - `harmonies.ts` : complémentaire, split-complémentaire, triadique, tétradique, carré, analogue, monochrome.
  - `analysis.ts` : score d'harmonie d'une palette (voir ci-dessous).
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

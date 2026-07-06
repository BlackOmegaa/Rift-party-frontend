# Où ajouter de la data Rift Party

Objectif V1 : les composants restent jouables, mais les contenus sont faciles à enrichir.

## Champions / images
- `frontend/src/app/shared/lol-assets.ts`
  - `CHAMPION_OPTIONS` : liste utilisée par les combobox.
  - Les URLs Data Dragon sont générées ici.

## Draft Battle
- `backend/src/draft/data/champions.data.ts`
  - Ajoute des champions, rôles, coûts, tags et ccScore.
  - C'est la base principale du Draft Battle.
- `backend/src/draft/engines/draft-scoring.engine.ts`
  - Règles de synergie / malus / scoring.

## Guess The Champion
- `frontend/src/app/mini-games/guess-champion/guess-champion.component.ts`
  - Constante `ROUNDS` en haut du fichier.
  - Format : `{ answer, title, hints }`.

## TikTok Ranking
- `frontend/src/app/mini-games/tiktok-ranking/tiktok-ranking.component.ts`
  - Constante `ROUNDS` en haut du fichier.
  - Format : `{ question, premium, options: [10 champions] }`.
- Plus tard avec BDD : sauvegarder toutes les `tiktok:submit` dans une table pour calculer les vraies stats communautaires.

## Turret Tank
- `frontend/src/app/mini-games/turret-tank/turret-tank.component.ts`
  - Constante `SCENARIOS`.
  - Format : champion, level, hp, armor, items, answer, note.

## Fusion Champions
- `frontend/src/app/mini-games/fusion-champions/fusion-champions.component.ts`
  - Constante `FUSIONS`.
  - Format : `{ a, b, fakeName, vibe }`.

## Who's Inting
- `frontend/src/app/mini-games/whos-inting/whos-inting.component.ts`
  - Constante `CASES`.
  - Format : titre, lignes de scoreboard, coupable, raison.

## Undercover Champion
- `backend/src/undercover/data/undercover-pairs.data.ts`
  - Constante `UNDERCOVER_PAIRS`.
  - Format : `{ normal, undercover }`. Tire au hasard une paire par manche ;
    ajoute simplement une ligne pour enrichir le pool.

## BDD future recommandée
Il n'y a pas encore de vraie base de données dans cette V1 : les rooms sont en mémoire côté NestJS.
À ajouter ensuite : PostgreSQL + Prisma.
Tables prioritaires : users, rooms, matches, rounds, tiktok_votes, tiktok_global_stats.

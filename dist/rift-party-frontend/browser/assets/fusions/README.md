# Images de fusion — Fusion Champions

Une image par fusion, servie en **WebP** (optimisé pour le web).

## Workflow

1. Génère l'image de la fusion, dépose-la ici en `.png` avec le nom exact
   `fusion-<champion1>-<champion2>.png` (minuscules, sans espace/apostrophe/accent,
   ex. `fusion-ahri-evelynn.png`, `fusion-kaisa-vayne.png`, `fusion-xinzhao-jarvaniv.png`).
2. Lance la conversion : elle redimensionne (max 1280px), encode en WebP (~130 Ko)
   et supprime le PNG lourd. Puis régénère `fusion-data.ts` (le mode ne propose
   que les fusions dont l'image WebP est présente).

Ne PAS committer de PNG lourds ici : seuls les `.webp` optimisés restent.
Le mode n'affiche que les fusions dont l'image est présente : tu peux en déposer
10 pour tester, puis compléter au fur et à mesure.

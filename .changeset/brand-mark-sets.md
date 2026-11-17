---
# multiple-changesets: the brand asset rename and the editable-tag fix are separate stories for separate packages
'@dxos/brand': minor
'@dxos/plugin-presenter': patch
---

The brand assets carry one set per mark, under one name. `icons/<mark>.svg` is the themeable shape the `dx--` sprite is built from, `icons/{black,white}/<mark>.svg` are the colour-locked copies an `<img>` or a packaged sprite needs, `backgrounds/<mark>-{center,left,right}.svg` place it, and `backgrounds/cards/<mark>-{1,2}x.svg` crop it to a card. The `icon-` and `bg-` prefixes are gone — the folder already says which it is.

The two renamed marks take their current names: KUBE is EDGE and DXNS is SAGE, in the asset names and in the `EDGE` and `SAGE` icon components. `PLEX` and `TILE` icon components are added, so all eight marks have one; DXOS joins the others as `backgrounds/dxos-center.svg` and gains its card crops. `logotypes/dxos-horizontal-block.svg` was a typo for `black`.

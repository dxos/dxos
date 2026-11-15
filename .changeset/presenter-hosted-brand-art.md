---
'@dxos/plugin-presenter': patch
'@dxos/brand': patch
---

Each suite background now ships in its own mark's colour. Five of the seven carried another topic's — ECHO's art was TILE's red — which is why every consumer rewrote the `color` attribute before drawing them; only the two redrawn most recently were right. The presenter's layout story reads them from `assets.dxos.org/brand/backgrounds`, which mirrors this package, rather than inlining them as data URIs, so a redrawn mark reaches the slide without a code change and the story's markdown stays legible.

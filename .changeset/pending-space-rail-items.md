---
'@dxos/lit-ui': patch
'@dxos/plugin-file-system': patch
'@dxos/plugin-mobile': patch
'@dxos/plugin-navtree': minor
'@dxos/plugin-space': minor
---

Render avatar fallbacks whose emoji rely on a variation selector (☀️, ⚙️, ♻️ …) instead of a coloured circle with no symbol. Spaces that are listed but not yet open now hold a place in the sidebar rail, and the account corner holds a plain circle while the client initialises.

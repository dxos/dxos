---
'@dxos/types': minor
'@dxos/plugin-magazine': minor
---

Magazine feed sync now runs in dev builds without a hidden toggle, curation tolerates the `null` fields agents emit instead of discarding the run, and re-curating no longer duplicates posts or exceeds the magazine's keep bound. Outlines gain a read-only presentation mode, promotion into an embedding object's task set, and a convert action that is disabled once an item is already a link; projects own an outline from creation and expose their artifacts as a navtree branch. A surface whose plugin is still loading no longer flashes an unrelated catch-all surface first. Removes the unused `DevFlag` helpers from `@dxos/util` and the `height`/`padding` options from the outliner menu.

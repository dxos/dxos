---
'@dxos/plugin-space': patch
'@dxos/react-ui': patch
---

Peers viewing the same object show up again. Each plank header shows an avatar for every other member viewing it, the navtree glyph counts them, and a space's row counts the peers viewing the space itself. Avatars keep one order for a given set of peers. Their rings match the attention glyph: accent for a peer attending the object, neutral gray for one who only has it open. Leaving a workspace clears your presence on what it showed. The avatar `current` status now rings with `--color-accent-bg` instead of `--color-focus`.

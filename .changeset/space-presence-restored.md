---
'@dxos/plugin-space': patch
'@dxos/react-ui': patch
---

Peers viewing the same object show up again: each plank header shows an avatar for every other member viewing it, and the navtree glyph counts them. Avatars keep one order for a given set of peers, and their rings match the attention glyph: accent for a peer attending the object, neutral gray for one who only has it open. The avatar `current` status now rings with `--color-accent-bg` instead of `--color-focus`.

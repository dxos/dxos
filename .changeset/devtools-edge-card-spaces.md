---
'@dxos/devtools': minor
'@dxos/plugin-devtools': patch
---

The devtools EDGE card hides spaces deleted on this device, sorts rows by label, labels unnamed spaces by tag, shows each space's EDGE document count, and explains each EDGE issue in plain words on its warning icon. `EdgeCard`'s `spaceNames` prop is replaced by `spaces` (`Record<string, EdgeCardSpace>`, name and tag per space id).

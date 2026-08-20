---
'@dxos/plugin-deck': minor
'@dxos/app-toolkit': minor
---

plugin-deck now renders mobile natively, projecting the active deck as a navigation stack with a
companion drawer; plugin-simple-layout is retired and the layout mode it reported as `'simple'` is
now `'mobile'`. `Card` with `fullWidth` tracks its container instead of holding a minimum width.

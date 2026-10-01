---
'@dxos/react-ui-menu': minor
---

New `@dxos/react-ui-menu/next` entry: `ActionToolbar` and `ActionMenu` render the same action graph and `MenuBuilder`
model on Next Toolbar and Menu parts, with the current props, and the entry re-exports the shared hooks, builder and
types, so a call site moves to Next by changing its import path.

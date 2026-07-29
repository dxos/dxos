---
'@dxos/plugin-connector': patch
'@dxos/react-ui': patch
---

Supporting changes for the new plugin-blogger / plugin-typefully feature:

- **@dxos/plugin-connector**: expose `Connection` types via a new `./types` export subpath so provider plugins can consume the connection contract without pulling the full package barrel.
- **@dxos/react-ui**: `Card.Root` now accepts and forwards `onKeyDown`, enabling keyboard-interactive cards (Enter/Space activation) without a cast.

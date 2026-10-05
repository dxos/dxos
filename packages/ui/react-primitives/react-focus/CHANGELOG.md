# @dxos/react-focus

## 0.12.0

### Patch Changes

- 8cb5553: Fix the shortcuts list showing stale scopes: `useActiveHotkeys` selected only the command map, whose identity survives a scope change, so it kept rendering whichever surface was attended when it last re-rendered. Scope holder counts are now keyed by store, and `keySymbols` keeps the boundary of a sequence binding (`g > h`) rather than rendering it as `GH`.
- 07531e0: Graph action key bindings in navtree register under their parent node's scope, so per-object shortcuts such as presenter's `shift+meta+p` fire when that object is attended. Before, the scope repeated every path prefix and never became active. A graph update no longer re-registers bindings whose hotkey and label are unchanged. The shared hotkey store allows the same hotkey on several commands without warning, because Zag's conflict check ignores scopes. Navtree's keyboard module is excluded from node and workerd, where there is no `document`.
- Updated dependencies [967b130]
- Updated dependencies [9d2466a]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
  - @dxos/util@0.12.0

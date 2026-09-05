# @dxos/react-focus

## 0.12.0

### Patch Changes

- 8cb5553: Fix the shortcuts list showing stale scopes: `useActiveHotkeys` selected only the command map, whose identity survives a scope change, so it kept rendering whichever surface was attended when it last re-rendered. Scope holder counts are now keyed by store, and `keySymbols` keeps the boundary of a sequence binding (`g > h`) rather than rendering it as `GH`.
- Updated dependencies [e8088ea]
  - @dxos/util@0.12.0

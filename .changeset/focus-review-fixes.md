---
'@dxos/react-focus': patch
---

Fix the shortcuts list showing stale scopes: `useActiveHotkeys` selected only the command map, whose identity survives a scope change, so it kept rendering whichever surface was attended when it last re-rendered. Scope holder counts are now keyed by store, and `keySymbols` keeps the boundary of a sequence binding (`g > h`) rather than rendering it as `GH`.

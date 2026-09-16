---
'@dxos/react-focus': patch
---

Navtree key bindings only register or unregister the ids that changed on a graph update. Before, every debounced graph change re-registered all of them, and the hotkey store's conflict scan made that quadratic. `@dxos/react-focus/store` adds `reconcileHotkeys` for callers that sync a registration set.

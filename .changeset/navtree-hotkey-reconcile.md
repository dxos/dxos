---
'@dxos/react-focus': patch
---

Navtree key bindings skip re-registering a binding whose hotkey and label are unchanged. Before, every debounced graph change re-registered all of them. The shared hotkey store now allows the same hotkey on several commands without warning, because Zag's conflict check ignores scopes and per-object bindings warned against each other quadratically.

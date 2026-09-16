---
'@dxos/react-focus': patch
---

Graph action key bindings in navtree register under their parent node's scope, so per-object shortcuts such as presenter's `shift+meta+p` fire when that object is attended. Before, the scope repeated every path prefix and never became active. A graph update no longer re-registers bindings whose hotkey and label are unchanged. The shared hotkey store allows the same hotkey on several commands without warning, because Zag's conflict check ignores scopes. Navtree's keyboard module is excluded from node and workerd, where there is no `document`.

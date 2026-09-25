---
'@dxos/echo': patch
---

Live queries that follow relations or parent/child links reuse one read of the loaded objects across a query run's traversal steps, instead of rescanning every loaded object at each step.

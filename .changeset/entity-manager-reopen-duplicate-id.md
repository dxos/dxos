---
'@dxos/echo-client': patch
---

Reopening a database no longer throws `invariant violation [!this._objects.has(id)]`. Closing the entity manager left object cores and the space root doc handle in place, so the next open re-created a core for every inline object over the surviving ones — blocking the space from opening.

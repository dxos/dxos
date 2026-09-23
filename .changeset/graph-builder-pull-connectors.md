---
'@dxos/graph': patch
---

A graph builder no longer recomputes a connector inside the change that invalidated it. The invalidation marks the connector dirty, and the next flush reads it within the frame budget, so a burst of changes before a flush costs one read per connector. A connector that throws, or produces an id containing the path separator, is now logged and skipped at flush time instead of throwing from the call that expanded the relation.

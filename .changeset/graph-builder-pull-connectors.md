---
'@dxos/graph': patch
---

A graph builder no longer recomputes a connector inside the change that invalidated it. The invalidation marks the connector dirty, and the next flush reads it within the frame budget, so a burst of changes before a flush costs one read per connector. A connector node whose id contains the path separator is logged and dropped at flush time, and its siblings are kept; a throwing extension is logged and contributes nothing until another input re-runs the relation. Both used to throw from the call that expanded the relation. A store's `node(id)` atom must now cut off at the node's value with nothing subscribed to it.

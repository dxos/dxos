---
'@dxos/graph': patch
---

A graph builder marks a connector dirty when its inputs change and reads it once on the next flush, within the frame budget, so a burst of changes no longer recomputes connectors inside the change events. A connector node with an invalid id, or an extension that throws, is now logged and dropped at flush time rather than throwing from the expansion. Re-expanding a relation that `release` tore down now removes outputs its connector no longer produces. A store's `node(id)` atom must cut off unchanged values with nothing subscribed to it.

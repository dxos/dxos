---
'@dxos/app-graph': patch
---

Restore the per-child reactive dependency in `Graph.connections`.

Reading connections through the model's neighbourhood view dropped the dependency on each child's own
atom, so a child changing did not always invalidate its parent's connections. The view depends on the
child atoms again, with an equality cutoff on the resolved list so an unchanged re-read stays silent.

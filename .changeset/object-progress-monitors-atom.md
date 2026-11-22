---
'@dxos/app-toolkit': patch
---

`ProgressRegistry` gains `objectMonitorsAtom(uri)`, a per-object selector that notifies only when that object's own monitors change. `useObjectProgressMonitors` reads it, so a progress update no longer re-renders every navtree row's attention glyph.

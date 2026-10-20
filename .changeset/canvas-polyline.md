---
'@dxos/react-ui-canvas': minor
---

Add a polyline shape and drawing tool (Y): each click places a vertex, Enter or a double-click ends the line open, and clicking the first vertex closes it into a filled shape; `params.closed` toggles it afterwards. A shape type can draw its frame without a fill (`NodeDef.filled`) and create itself from drawn points (`NodeDef.createFromPoints`), and the tools panel lists the polygon before the cloud.

---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
---

`Canvas.About` and `AboutInspector` are removed; the Views panel's rows carry the counts. Deleting an Object with its instances (`removeComposite`) also deletes, in the same undo step, the records only those instances pointed at, and Ungroup brings an Object's animation tracks back out onto the new nodes, placed and sized as the Instance drew them. The floating inspector panel is one scrolling list again; only the docked panel splits Properties from the other sections. In plugin-canvas, `CanvasOperation.ImportTldraw` takes `snap` (true by default), aligning the imported shapes' positions and sizes to the canvas grid. A tldraw frame now becomes a labelled outline rectangle on a frames layer under its shapes, which stay in the same View (tldraw has no nested scenes), so arrows into the frame stay bound. A plain (non-smart) line bound to a node without a port now points at the node's centre and stops at its outline; smart lines still attach at ports.

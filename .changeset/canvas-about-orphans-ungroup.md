---
'@dxos/react-ui-canvas': minor
---

`Canvas.About` and `AboutInspector` are removed; the Views panel's rows carry the counts. Deleting an Object with its instances (`removeComposite`) also deletes, in the same undo step, the records only those instances pointed at, and Ungroup brings an Object's animation tracks back out onto the new nodes, placed and sized as the Instance drew them.

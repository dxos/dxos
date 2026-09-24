---
'@dxos/echo': patch
---

Objects filed at the root of a space that had no root collection yet now show up in queries. `ContainerModel.add` created that root collection without persisting it. Filed objects then pointed at a parent that did not exist in the space, and queries dropped them.

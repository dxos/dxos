---
'@dxos/echo': patch
---

A live query no longer raises an unhandled rejection when an object in the working set has a deleted document; the object is left out of the results instead.

---
'@dxos/echo-client': patch
---

Don't add an object core to the working set for a linked document that settles without the object body. Such a core answered with an undefined entity structure, crashing any query relation traversal (which scans every loaded core) with `TypeError: Cannot read properties of undefined (reading 'system')`. The core is now created when the body actually lands, via the document's change event.

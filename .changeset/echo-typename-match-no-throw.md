---
'@dxos/echo': patch
---

Queries no longer pay an exception per candidate object. `EID.tryParse` and `DXN.tryMake` validate
their input instead of catching a throw, and a type filter short-circuits when the two typenames are
already identical, so matching a filter against the working set stops allocating an `Error` (and its
stack) for every object it rejects.

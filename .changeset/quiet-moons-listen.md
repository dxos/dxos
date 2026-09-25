---
'@dxos/echo-client': patch
---

Writing to an object whose type is not registered in the current runtime no longer throws `Schema not found in schema registry`. Such an object — one written before its type's version bump, or replicated from a peer carrying a type this runtime lacks — was readable, but assigning a property or inserting into an array failed; those writes now skip validation instead, as they already did for untyped objects.

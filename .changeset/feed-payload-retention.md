---
'@dxos/echo': patch
---

Reduce memory retained per feed-backed object: reconciliation now compares a digest of an object's canonical JSON rather than retaining the JSON itself, and reactive index queries release each result's serialized document once it has been hydrated. A tab with a large feed open no longer holds several copies of every item's payload.

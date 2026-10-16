---
'@dxos/echo-protocol': patch
---

`QueryAST.visit` matches each node with a matcher built once rather than a `Match.value` pipeline built per call, which allocated every clause and its predicate on every node: ~45 KB per walk of a six-node query, against 312 B now. The client walks every live query three times on each result update; in Composer that was ~67 MiB of allocation in the first five minutes after boot.

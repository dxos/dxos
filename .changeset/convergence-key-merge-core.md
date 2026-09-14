---
'@dxos/echo': minor
---

Objects can declare a `meta.convergenceKey` — a caller-supplied domain identity, unique within a space — so that state initialized independently by several peers converges on one object instead of accumulating duplicates. Assign it inside an update callback (`Entity.update(x, (x) => { Entity.getMeta(x).convergenceKey = '…' })`); there is no other new API. Duplicates sharing a key are merged automatically in the worker as they replicate in: the smallest-id object survives with each field taken from the smallest-id duplicate that defines it, the others become redirects (`system.mergedInto`) that references still resolve through, later edits to a merged-away copy are folded into the survivor, and references to the losers are repointed at the survivor via the reverse-reference index. Convergence is eventual — a query racing a merge can briefly return both copies — and merging applies to objects only, not relations or types.

---
'@dxos/echo-protocol': minor
'@dxos/echo-client': minor
'@dxos/index-core': minor
'@dxos/echo-host': minor
'@dxos/echo': minor
---

Entities can declare a `meta.naturalKey`: a caller-supplied domain identity, unique within a space, so that state initialized independently by several peers converges instead of accumulating duplicates. The id stays a surrogate — system-minted and random — and the natural key sits alongside it, distinct from `meta.key`/`meta.version`, which record the registry entry an instance was created from (provenance, not identity). The key is an opaque string; callers that need generations encode them in it (`com.example.seed@2`), which yields distinct entities because the strings differ.

The new `Merge` module carries the deterministic core: `selectWinner` (the minimum id), `groupByNaturalKey` / `findDuplicates`, and `merge`, which computes the merged state over the whole candidate set at once — for each field, the value from the smallest-id candidate that defines it. That is deliberately not a pairwise fold, which would not be associative and would let different application orders diverge. `resolveRedirect` follows the `system.mergedInto` written on a merged-away entity, transitively and without trusting the data: an edge that fails to decrease the id ends the chain, so cycles and forward references terminate.

The winner records `system.mergedFrom`, the ids of everything folded into it — the reverse edge of `mergedInto`, stored rather than derived because finding it the other way means scanning for entities that point here, which no index supports. It is transitively closed, so a collapsing chain carries absorbed ids forward, and `getMergedFrom` exposes it. Losers are tombstoned rather than erased, so every recorded id still resolves.

`db.mergeDuplicates()` applies all of this against a space: it merges each group of duplicates, writing per field rather than replacing the object (a replace would rewrite every field, so a concurrent edit to a property the merge never touched would lose the last-write-wins race), records `system.mergedInto` and the loser's heads, tombstones the loser, and repoints references at the survivor. Losers keep replicating rather than being erased, so a reference that was never rewritten still reaches the winner. `foldLateEdits` handles the peer that was offline during the merge and kept editing its own copy: it asks automerge which data fields moved since the recorded heads and carries exactly those across, then advances the watermark.

Merging is automatic, and it runs in the worker: every indexing batch reports the natural keys it saw, a point lookup on the new `objectMeta.naturalKey` column finds collisions, and the merge executes against the raw automerge documents — once per device, at the moment a duplicate replicates in, with no client, query, or scan involved. The merge's own writes re-index the tombstones, which removes losers from query results everywhere; the client query path additionally drops entities already carrying a redirect, read-only, to cover the moment between the redirect replicating and the local index catching up. The guarantee is eventual (about one indexing cycle): a query racing the merge can briefly return both copies before settling. `db.mergeDuplicates()` remains as an explicit call that also repoints references.

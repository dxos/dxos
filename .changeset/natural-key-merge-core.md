---
'@dxos/echo-protocol': minor
'@dxos/echo-client': minor
'@dxos/echo': minor
---

Entities can declare a `meta.naturalKey`: a caller-supplied domain identity, unique within a space, so that state initialized independently by several peers converges instead of accumulating duplicates. The id stays a surrogate — system-minted and random — and the natural key sits alongside it, distinct from `meta.key`/`meta.version`, which record the registry entry an instance was created from (provenance, not identity). The key is an opaque string; callers that need generations encode them in it (`com.example.seed@2`), which yields distinct entities because the strings differ.

The new `Merge` module carries the deterministic core: `selectWinner` (the minimum id), `groupByNaturalKey` / `findDuplicates`, and `merge`, which computes the merged state over the whole candidate set at once — for each field, the value from the smallest-id candidate that defines it. That is deliberately not a pairwise fold, which would not be associative and would let different application orders diverge. `resolveRedirect` follows the `system.mergedInto` written on a merged-away entity, transitively and without trusting the data: an edge that fails to decrease the id ends the chain, so cycles and forward references terminate.

The winner records `system.mergedFrom`, the ids of everything folded into it — the reverse edge of `mergedInto`, stored rather than derived because finding it the other way means scanning for entities that point here, which no index supports. It is transitively closed, so a collapsing chain carries absorbed ids forward, and `getMergedFrom` exposes it. Losers are tombstoned rather than erased, so every recorded id still resolves.

`db.mergeDuplicates()` applies all of this against a space: it merges each group of duplicates, writing per field rather than replacing the object (a replace would rewrite every field, so a concurrent edit to a property the merge never touched would lose the last-write-wins race), records `system.mergedInto` and the loser's heads, tombstones the loser, and repoints references at the survivor. Losers keep replicating rather than being erased, so a reference that was never rewritten still reaches the winner. `foldLateEdits` handles the peer that was offline during the merge and kept editing its own copy: it asks automerge which data fields moved since the recorded heads and carries exactly those across, then advances the watermark.

Merging is not yet automatic — `db.mergeDuplicates()` is an explicit call. Running it on space open was tried and reverted: detection has no way to ask which entities declare a natural key, so it scans, hydrating the whole space into the working set on every open. The trigger will instead be a step inside query evaluation, which collapses duplicates in the already-materialized working set before results are returned, so a caller never observes two.

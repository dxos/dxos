---
'@dxos/app-toolkit': minor
---

Fix planks restoring to Not Found — and being erased from the URL — on a cold reload.

`NavigationTargetLoader.load` now returns `'exists' | 'absent' | 'unknown'` instead of a boolean. The URL restore skips its retry only for a pair a store positively disconfirmed; an unreachable edge, a space list that has not arrived, or an id that does not parse now read as `unknown` and keep the retry. Previously every uncertainty collapsed to `false`, which revoked the retry — and on a cold reload the graph is always still building, so the plank fell to Not Found, was dropped from the URL on the next sync (a Not Found sentinel has no URL representation), and was gone for good on the following reload.

Loader authors must widen their return type; `'exists'`/`'absent'` correspond to the old `true`/`false`, and anything the loader could not determine should be `'unknown'`.

A URL pair's id `+`-joins every node-id segment after its binding's path, and which segment holds the object id is extension-specific — `<objectId>+<view>` for a mailbox's filter views, `<typeSlug>+<objectId>` for a database object. Resolution now asks about every ULID-shaped segment rather than assuming the last one, so mailbox views (`sent`, `drafts`, `all-mail`, `subscriptions`) resolve on reload instead of 404ing.

New `GraphPath.tryGetEidCandidates` backs the existence check for paths whose object id is interior; `GraphPath.tryGetEid` is unchanged and still strictly terminal, so plank dedup keeps treating two views of one object as two planks. New `NotFound.createEdgeExistenceProbe` is the fallible form of `createEdgeExistenceChecker`, for callers that must tell an empty query from a failed one.

A URL restore no longer collapses an unresolved plank to the not-found sentinel. It keeps the node id the pair resolved _toward_ (`PathResolution` now reports the candidate it attempted), records the plank in the new ephemeral `unresolved` state, and renders the not-found article in place — so the plank heals into the real object the moment its node lands, instead of being replaced by a different object that discards which one was asked for.

The deck also refuses to write a URL that has lost a plank. `representNode` reads live graph provenance, which a plank loses whenever its node is out of the graph, so the outbound sync now falls back to each plank's last known representation and skips the write entirely if any plank is still unrepresentable. Previously the pair was silently dropped and `replaceState`d over the URL it was restoring from, which is what turned a transient miss into permanent loss: the next reload restored the shortened URL and the plank was gone.

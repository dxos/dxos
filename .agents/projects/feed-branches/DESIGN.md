# Feed branches & ancestry — DESIGN

Successor to [`feed-soft-fork`](../feed-soft-fork/DESIGN.md) (PR
[#12387](https://github.com/dxos/dxos/pull/12387), merged 2026-07-30), which
shipped the per-item lineage primitive: `Feed.PARENT_KEY`, `getParent` /
`setParent`, `Feed.history` (then `resolveBranch`), and `Feed.append`'s
`{ parent }` option. This project picks up two items from that backlog —
explicit active-branch head, and `Scope.feed(uri, { branch })` query-plan
push-down — and adds the position/cursor split and merge ancestry.

## Goals

1. Named branches within a feed, `main` being the default view.
2. Append to a specific branch.
3. Query from a specific branch.
4. Ancestry where branches fork **and merge**.
5. Reset to an earlier item — everything between it and the tip becomes
   unreachable.
6. Do this without making feed queries O(feed length) in documents loaded.

## Background: why the current walk cannot back a query

`Feed.history` (`packages/core/echo/echo/src/Feed.ts:385`) walks lineage
backwards in memory over an already-materialized, position-sorted array. Its
default step is `cursor -= 1` — the predecessor **in feed order**. Two
consequences:

1. The caller must load every candidate item before the walk can start, so
   history cannot be pushed into the index.
2. Feed order is neither total nor stable until replication completes, so
   history is replication-dependent: the same feed yields different histories at
   different replication states.

Concretely: a peer holds `[… Y(11), Z(12), X(null)]` — X is an unacked local
append, sorted last. X is acked at position 10 and moves *before* Y and Z,
changing its own implicit parent and Y's. Positions are assigned server-side as
`MAX(position) + 1` at receive time (`FeedStore.append`), while the ack
round-trips asynchronously, so this is reachable in normal operation.

## Key finding: the block layer already carries immutable lineage

`blocks` (`packages/core/echo/feed/src/migrations/0001_init.sql`) stores per
block:

| column                        | meaning                                    | assigned         | mutable        |
| ----------------------------- | ------------------------------------------ | ---------------- | -------------- |
| `insertionId`                 | local autoincrement — local receive order   | local, at insert | no             |
| `sequence` + `actorId`        | Lamport timestamp; UNIQUE per feed          | local, at append | no             |
| `prevSequence` + `prevActorId`| causal predecessor — the tip this peer saw  | local, at append | no             |
| `position`                    | global total order                          | server, later    | yes (null → N) |

`sequence` is a feed-wide Lamport counter (`MAX(sequence) + 1` over the whole
feed, `FeedStore.appendLocal` steps 2–3), so concurrent writers legitimately
collide on `sequence` and are disambiguated by `actorId` — hence the
`(feedPrivateId, sequence, actorId)` unique index.

**`prevSequence` / `prevActorId` is already an immutable, causally-correct
predecessor pointer, recorded automatically at append time.** It is exactly the
"stamp an explicit parent on every append" that would make lineage independent
of feed order — and it already exists. It is simply not surfaced above the block
layer: `EchoFeedCodec` injects only `position` on decode
(`packages/core/echo/echo-protocol/src/echo-feed-codec.ts:33`).

If implicit continuation resolves against `prev` instead of against position
order, lineage becomes immutable and replication-independent, and feed order
demotes to presentation only. That is the load-bearing idea for this project.

Caveat: a live feed object's `Obj.update` re-appends as a **new block with a new
`prev`**, so block-level and object-level lineage diverge for mutated objects.
Clean for append-only items; needs a decision for mutable ones (open question 4).

## Part 1 — separate position from cursor

`getPosition` and `getCursor` read the **same** meta key:

```ts
getPosition: internal.getKeys(item, KEY_QUEUE_POSITION).at(0)?.id → Number(...)   // Feed.ts:326
getCursor:   internal.getKeys(item, KEY_QUEUE_POSITION).at(0)?.id → Cursor.make() // Feed.ts:336
```

So `Cursor` is only the string view of `position`, and both are absent together
for an unacked local block. Any compound sort key of the form
`(hasPosition, position | cursor)` is therefore degenerate — the fallback never
fires. They are different concepts and become two annotations (not meta keys):

- **`Feed.PositionAnnotation: number`** — global order, server-assigned, absent
  until acked. Drives display order and the stable positioned prefix.
- **`Feed.ItemCursorAnnotation: Cursor`** — resume token, `START` sentinel or an
  insertion id, present immediately on append. Deliberately *not* named
  `CursorAnnotation`: that name is taken (`Feed.ts:95`) by a **reader
  checkpoint** — the cursor a reader has consumed up to, stored on the reader
  object. These are different things and must not share a name. That existing
  annotation is also what makes open question 1 sharp: it lives on a replicated
  object, so a local-only cursor value is silently wrong on another peer.

`KEY_QUEUE_POSITION` is stripped on encode and injected on decode, so it is not
durable feed content: this is a codec + index change, not a migration of stored
blocks. `EntityMetaIndex` receives it as `object.queuePosition` from the caller,
so the index side is a rename.

### Sort key

```
(hasPosition, position, sequence, actorId)
```

`hasPosition` leading makes SQLite's NULL-first ordering irrelevant and matches
`getPosition`'s `+Infinity` convention — today the index order and the in-memory
order contradict each other at both ends of the feed. `(sequence, actorId)` is a
deterministic tiebreaker for the unpositioned tail that is consistent *across
peers*, unlike a local autoincrement.

This makes every snapshot totally and deterministically ordered. It does **not**
make order stable over time — see the migration case above. That is fine once
lineage no longer depends on order.

### Index

`objectMeta.queuePosition` is rewritten wholesale on every re-append
(`EntityMetaIndex.update`, UPDATE branch), so it records "last touched", not
"inserted". A stable insertion position is fill-once:

```sql
firstQueuePosition = COALESCE(firstQueuePosition, ${position ?? null})
```

Correct for both transitions: null → acked position, and re-append → keep first.

## Part 2 — branches & ancestry (WIP)

### Model

- **Branch tag** — an annotation on items, append-only. Head of branch B is the
  latest item tagged B in feed order. Preferred over a mutable `branches` map on
  `Feed.Feed`, which would be a multi-writer conflict point.
- **`main` is the absence of a tag**, so existing feeds are already on `main`.
- **Lineage** — `PARENT_KEY` carries *explicit* parents only. `@meta.keys` is an
  array and `readParent` already does `.at(0)`, so N parents are representable
  today; merge support is an API relaxation, not a storage change.
- **Reset** to item X — append the next item with explicit parent X (a soft
  fork). Everything between X and the old tip becomes unreachable but stays in
  the log. Already the semantics of `history()`; `Feed.rewindFrom` (`Feed.ts:64`)
  is the existing staging field for a decided-but-unwritten reset.

### Traversal

Branches are expected to be shallow and the common path is "query the current
branch", so traverse in JS and make feed-order paging fast:

1. Head lookup — latest item tagged B by the sort key above; one index seek.
2. Page backwards from the head in feed order over
   `(queueId, hasPosition, position, sequence, actorId)`, metadata only.
3. Walk lineage in JS over the page; fetch another page only if the walk runs off
   the start of it.

Forks are sparse, so history is a small union of contiguous position intervals
punctuated by jumps. Intervals are also the right cache shape under partial
replication: an interval absorbs late-arriving items in its range without going
stale, where a materialized id list would.

### Filter semantics

Today lineage resolves over exactly the array passed in, so a filtered-out parent
reads as `shallow` (`Feed.ts:376`). Resolving lineage over the **unfiltered** feed
and applying the filter afterwards is both more correct — history should not
change shape because you filtered by type — and what makes the index path
tractable. It is a behavior change and needs a test pinning the new behavior.

## Open questions

1. **Cursor backing** — local `insertionId` (correct for "resume where I left
   off", but not portable across peers) or Lamport `(sequence, actorId)`
   (portable and immutable, but not a dense counter)? `CursorAnnotation` is
   stored on *replicated* objects today, which makes a local-only cursor value
   silently wrong on another peer. **Blocks Part 1.**
2. Surface block `prev` through `EchoFeedCodec` to make implicit continuation
   immutable? (Recommended — unblocks Part 2.)
3. Merge semantics — real multi-parent nodes, or deterministic last-writer-wins
   among siblings on display order?
4. Object-level vs block-level lineage for mutated (re-appended) objects.
5. Filter-relative vs feed-absolute lineage resolution (see above).

## Conformance

`packages/core/echo/echo/src/Feed.test.ts` is the existing behavioral spec — 17
pure tests from `feed-soft-fork`. Any index-backed path is held to it, except
where a listed decision deliberately changes semantics; each such change needs a
test pinning the new behavior and a note here.

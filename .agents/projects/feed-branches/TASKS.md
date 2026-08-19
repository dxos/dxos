# Feed branches & ancestry — TASKS

Design: [DESIGN.md](./DESIGN.md). Branch `dm/feed-graph`.
Predecessor: [`feed-soft-fork`](../feed-soft-fork/TASKS.md) (PR
[#12387](https://github.com/dxos/dxos/pull/12387), merged) — this project takes
over its "explicit active-branch head" and "`Scope.feed` branch push-down"
backlog items.

## Phase 0 — decisions

Blocking questions from DESIGN.md "Open questions". Only the first blocks Phase 1.

- [ ] **Cursor backing** — local `insertionId` vs Lamport `(sequence, actorId)`;
      resolve what a replicated `CursorAnnotation` means under the local option.
      **Blocks Phase 1.**
- [ ] Surface block `prev` through `EchoFeedCodec`? Blocks Phase 2.
- [ ] Merge semantics — multi-parent nodes vs last-writer-wins among siblings.
- [ ] Object-level vs block-level lineage for re-appended (mutated) objects.
- [ ] Filter-relative vs feed-absolute lineage resolution.

## Phase 1 — separate position from cursor

The bug: `getPosition` and `getCursor` read the same meta key
(`KEY_QUEUE_POSITION`), so `Cursor` is only the string view of `position` and
both are absent together for an unacked block. Any `(hasPosition, position |
cursor)` sort key is degenerate.

- [ ] **`Feed.PositionAnnotation: number`** — replaces the position read of
      `KEY_QUEUE_POSITION`; absent until the block is acked.
- [ ] **`Feed.ItemCursorAnnotation: Cursor`** — backed by the insertion id
      chosen in Phase 0; present immediately on append. Named to avoid colliding
      with the existing `CursorAnnotation` (`Feed.ts:95`), which is a *reader
      checkpoint* stored on the reader object, not an item property.
- [ ] `EchoFeedCodec` — inject both on decode, strip both on encode
      (`echo-feed-codec.ts:33`). Not a data migration: the key is not durable
      feed content.
- [ ] `EntityMetaIndex` — rename `queuePosition` plumbing to match, and add
      `firstQueuePosition` filled once via
      `COALESCE(firstQueuePosition, ${position ?? null})` so it survives
      re-append.
- [ ] Migration for the new column + the
      `(queueId, hasPosition, position, sequence, actorId)` index.
- [ ] Sort-key helper shared by the SQL and in-memory paths, so index order and
      `getPosition`'s `+Infinity` convention stop contradicting each other.
- [ ] Tests: unacked → acked transition preserves `firstQueuePosition`;
      re-append does not move it; SQL and in-memory orders agree at both ends of
      the feed.

## Phase 2 — branches

- [ ] `Feed.BranchAnnotation` — append-only branch tag on items; `main` is the
      absence of a tag.
- [ ] `Feed.append(feed, items, { branch })` — parents to the branch head and
      tags the appended item.
- [ ] `Scope.feed(uri, { branch })` + `QueryAST.FeedScope.branch`.
- [ ] Branch head lookup — latest item tagged B by the Phase 1 sort key.
- [ ] `Feed.branches(items)` — enumerate leaves (inherited from feed-soft-fork
      backlog; drives a "N other versions" affordance).

## Phase 3 — ancestry

- [ ] Relax `readParent` / `setParent` to N parents (storage already allows it —
      `@meta.keys` is an array, `readParent` does `.at(0)`).
- [ ] Merge nodes in `Feed.history` per the Phase 0 decision.
- [ ] Reset — confirm `Feed.rewindFrom` (`Feed.ts:64`) staging covers "reset to
      item X"; everything between X and the tip becomes unreachable.
- [ ] Cycle/corruption guard for the DAG walk (the current strict-decrease check
      at `Feed.ts:420` is both cycle guard and termination proof; it does not
      survive a DAG unchanged).

## Phase 4 — query push-down

- [ ] Paged feed-order scan over the Phase 1 index, metadata only.
- [ ] JS lineage walk over the page, fetching another page only when the walk
      runs off its start.
- [ ] Interval-based reachability cache + invalidation on
      `hasPosition` flipping and on a fork landing inside a live interval.
- [ ] Hold the index-backed path to `Feed.test.ts`, with new tests pinning any
      deliberately changed semantics.

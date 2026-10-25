# Feeds: branches, threads and conversations

Status: requirements agreed with Rich (2026-10-25); review of the trajectory design (dxos/dxos#13782) and a
counter-proposal for discussion with Dima. Nothing here is built.

This document merges the existing feed design work. The sources it draws on are kept beside it in
[`feeds/`](./feeds), each with its full rationale:

| Source                                                       | What it decided                                                                         | State                       |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------- |
| [soft-fork.md](./feeds/soft-fork.md)                         | Rewind inside one feed through per-item lineage in `@meta` (`Feed.PARENT_KEY`).         | Built (#12387)              |
| [live-objects.md](./feeds/live-objects.md)                   | Feed items are live objects; an update re-appends the whole object; scaling roadmap.    | Built (#12235); roadmap     |
| [agent-feed-messages.md](./feeds/agent-feed-messages.md)     | An agent's queue and alarms live in its feed as annotated records.                      | Built; superseded by #13782 |
| [private-threads.md](./feeds/private-threads.md)             | Four designs for hidden agent threads; recommends a child feed per thread.              | Analysis only               |
| [thread-channel-merge.md](./feeds/thread-channel-merge.md)   | `Thread` and `Channel` are one concept; recommends one conversation type.               | Analysis only               |
| `plugin-review/docs/COMMENT-FEEDS.md`                        | Comment threads on a feed the thread owns; the assistant answers through a hidden chat. | Stage 1 in #14206           |
| `compute/trajectory` README and `LIGHT-THREADS.mdl` (#13782) | Chat feeds become a log of `Trajectory.Event`s; threads are ids on events.              | Open PR                     |

## Principle

Comments, AI chats and message threads are the same thing: an ordered branch of messages from several
participants, some of whom may be agents. What differs is the container object that points at the branch:

| Container      | Adds                                    |
| -------------- | --------------------------------------- |
| Comment thread | an anchor on a subject; a status        |
| Chat           | a model, instructions, tasks            |
| Channel        | an external backend (Bluesky, email, …) |

So storage needs one model, and the containers stay thin. This matches the conclusion of
[thread-channel-merge.md](./feeds/thread-channel-merge.md) one level down: that document merges the
container types; this one gives them a common store.

## Requirements

### Model

1. **Feed.** A feed is one logical append log of ECHO objects, usually `Message`, plus whatever records its
   users need (bindings, turn markers, alarms).
2. **Branch tree.** A feed is a tree of branches. Each branch has a parent branch and a fixed fork point.
   Reading a branch gives its ancestors' items up to the fork point, then its own. Branches are
   lightweight: they need **no additional objects in the ECHO graph**. The `Feed` object may hold a map or
   index of its branches, but the feed is self-contained.
3. **Rewrite.** An item can be upserted by id, atomically: a reader sees the old version or the new one,
   never both and never neither. Used for editing a message, a reply replacing its pending line, and
   streaming partial output.
4. **Logical removal.** A branch can be removed from reads, indexes and sync; its items stay in the log
   until retention drops them.
5. **Rewind.** Resuming from an earlier item creates a branch at that point and removes the old one (4). It
   is not a separate mechanism.

### Read, index and sync

6. **Index a subset.** All branches, or a chosen subset, are indexed. A query can be scoped to a set of
   branches and a time range, newest first, with the limit applied after the branch filter.
7. **Changed heads.** Each branch has a head. One cheap call answers "which heads changed since cursor C",
   without scanning items. Triggers use it.
8. **Partial sync.** A client syncs all branches or a subset; one branch with its ancestors up to the fork
   point, without the rest of the tree.
9. **Two orders.** Readers can use both orders: the EDGE position, which converges across peers, and local
   order, which never changes under a reader so a cached fold stays valid.

### Uses

10. AI chat, comments and messaging all run on this model.

### Cross-cutting

11. **Hidden by construction.** A default read covers one branch, so a private branch never reaches a reader
    that did not ask for it.
12. **Several writers.** Concurrent appends are never misattributed; a turn's view is fixed when it starts;
    an item that arrives late is detectable.
13. **Cost.** Many branches per subject and many subjects; creating a branch costs about one record.
14. **Retention.** Each branch can have its own trim policy; trimming a branch never trims its ancestors.
15. **Permissions.** The design does not rule out a branch with a narrower audience than its parent, though
    nothing builds it yet.

Open: whether a branch can **merge** back into its parent (light threads and subagents do), or whether a
child only posts a result item to the parent and closes.

## What exists

### Feed and blocks

A `Feed` is an ECHO object; its items are stored as blocks in the feed store
(`packages/core/echo/feed/src/feed-store.ts`). A block carries `actorId`, `sequence`, `prevActorId`,
`prevSequence`, a timestamp and the encrypted payload. EDGE alone assigns `position`, from one counter per
space and namespace, so positions compare across the feeds of a space. Locally, each block also has an
`insertionId`, which #13782 exposes as local order (`Filter.feedCursor({ order: 'local' })`,
`Feed.getLocalCursor`).

- **Upsert.** `Obj.update` on a feed item re-appends the whole object under its id; the index keeps the
  latest block per id. Concurrent writers are last-flush-wins per object
  ([live-objects.md](./feeds/live-objects.md), roadmap stage 3 adds write versioning).
- **Delete.** `Feed.remove` appends a tombstone; the index merges it onto the previous snapshot.
- **Options.** `Feed.indexing` (on or off, no partial mode) and `Feed.retention` (`maxLength`, `maxAge`)
  are per feed (#14199, `SPEC.mdl` F-7).
- **Sync.** A client pulls the whole feed (live-objects.md, stage 2 plans a bounded tail).

### Soft fork (per-item lineage)

An item may name the item it continues from (`Feed.PARENT_KEY` in `@meta`); `Feed.history` walks back from
the head and drops what a fork abandoned. `Feed.rewindFrom` carries a pending rewind. Its design
([soft-fork.md](./feeds/soft-fork.md)) rejected three alternatives that bear on this document:

- **Lineage on the block**: two writers already fork the block chain, so a block parent cannot tell a
  deliberate fork from a race; and it is a wire, SQL and EDGE change.
- **Sidecar fork markers** (a `Fork` item that captures everything after it): a writer that has not seen
  the marker is misattributed to the branch.
- **Branch state on the `Feed` object**: the object (Automerge) and the blocks replicate on different
  paths, so a fork could become visible before or after the items it describes.

It deferred listing branches, a stored head per branch, and branch filtering inside queries (a `limit`
truncates before `history` resolves).

### Hard fork (`SessionLink`)

`ForkChat` creates a new feed whose first record points at a message in the source feed;
`SessionStore.reifyHistory` prepends the source up to it. The cutoff is fixed, it orders by `created`, and
only the first link counts.

### Private threads (analysis)

[private-threads.md](./feeds/private-threads.md) compared tagging items in one feed (A), a child feed per
thread (B), a hidden chat per thread (C) and real branches in one feed (D). It recommended B because A
leaks by default and D needs an indexed branch column, which the index lacks: annotations are
post-filters, so filtering a feed by tag scans it.

### Comments (stage 1, #14206)

`Thread` 0.3.0 owns a feed of `Message`s; the comment agent runs a hidden `Chat` on the same feed. The
comment UI hides the agent's synthetic prompts and tool traffic by filtering on visible blocks, which is
design A's failure mode in miniature.

### Trajectory (#13782)

Chat feeds become an append-only log of immutable `Trajectory.Event`s:

- Every event has `thread` (the id of the `threadOpen` or `turnBegin` that opened its thread; absent for
  main), `prev` (the writer's head of that thread), `sender`, `created` and a tagged `payload`.
- `threadOpen { mode: fork | fresh | light, from: { feed?, thread?, event } }` opens a thread; `threadMerge`,
  `threadClose` and `threadWait` end, close or join it. A turn is a thread too. `fork` continues another
  feed up to a fixed event; `rewind` discards main from an event.
- Reducers fold the feed in local order into the views the UI, the agent and the prompt need; folded state
  is checkpointed in SQLite.
- New chat feeds are created with indexing off.

## Review of the trajectory design

Against the requirements:

| Req | Trajectory                                                                                        | Verdict |
| --- | ------------------------------------------------------------------------------------------------- | ------- |
| 1   | Items are `Trajectory.Event`s with content as a payload, not arbitrary ECHO objects.              | Gap     |
| 2   | Threads are ids on events; no extra objects; nested; fixed origin (`from.event`).                 | Meets   |
| 3   | Events are immutable; an edit or a replaced pending line is a new event the reducer interprets.   | Partial |
| 4   | `threadClose { status: cancelled }`.                                                              | Meets   |
| 5   | `rewind` discards main from an event; threads cannot be rewound.                                  | Partial |
| 6   | Chat feeds are not indexed at all; the thread id is in the payload, which no index can filter by. | Gap     |
| 7   | A checkpoint head per trajectory and reducer, not per thread.                                     | Gap     |
| 8   | The feed is the sync unit; one thread cannot be synced alone.                                     | Gap     |
| 9   | Local order for folds; EDGE position still available.                                             | Meets   |
| 10  | Agent chat only; comments and channels hold `Message`s.                                           | Gap     |
| 11  | `TrajectoryStore` is the only reader, and it filters by thread; a fold sees every thread.         | Partial |
| 12  | `prev`, `from.event`, `PromptState.stale`, first-consume-wins.                                    | Meets   |
| 13  | One event per thread opener.                                                                      | Meets   |
| 14  | Retention is per feed.                                                                            | Gap     |
| 15  | Per feed.                                                                                         | Gap     |

The concurrency model (12) and the cost model (2, 13) are the strongest parts and should be kept. The gaps
share one cause: **branching lives in `@dxos/trajectory`, inside the event payload, so ECHO cannot see
it.** The index cannot filter by thread, sync cannot select a thread, retention cannot target one, and only
agent chats can use it.

## Proposal: branches in the feed layer

Lift the trajectory's thread fields out of the payload into the feed layer, so every feed has them and any
ECHO object can sit in a branch. Trajectory keeps its event vocabulary and reducers, and gets indexing,
partial sync and per-branch policy from ECHO.

1. **Branch membership on the item.** Two keys in item `@meta`, next to `PARENT_KEY`:
   - `org.dxos.key.feed-branch`: the branch id, which is the id of the branch's first item; absent means
     the root branch.
   - `org.dxos.key.feed-fork`, on a branch's first item only: the parent branch and the fork item.

   Membership is stated by every item, as soft fork's lineage is, so a writer that has not seen a fork is
   never misattributed, and the truth replicates with the blocks it describes. No new ECHO objects.

2. **Branch policy on the `Feed` object.** `Feed.branches: Record<BranchId, { removed?, indexing?, retention?,
name? }>`, extending the per-feed options of #14199. It holds policy only, never membership or heads, so
   the ordering concern from soft-fork.md does not apply: a policy that arrives before or after an item
   changes how the item is treated, not which branch it is in.
3. **Index by branch.** The indexer stores the branch id in a column on feed items (an `echo-sqlite`
   migration) and honours per-branch `indexing`. `Scope.feed(uri, { branches, after, before })` pushes the
   branch and time filters into SQL, so `limit` applies after them. Newest first is an `orderBy`.
4. **Heads.** The index keeps the head of each `(feed, branch)` as a position and a local cursor.
   `Feed.heads(feed, { since })` returns the branches whose heads moved, for triggers and for reducers
   deciding what to refold.
5. **Partial sync.** EDGE must select blocks by branch without decrypting them, so the branch id rides on
   the block as well as in `@meta`. This is the one wire change, and the main cost of the proposal; until it
   lands, sync stays per feed and requirement 8 is unmet.
6. **Rewind is a branch.** Rewinding to item X opens a branch forked at X's predecessor and sets the old
   branch `removed`. `PARENT_KEY` and `rewindFrom` keep working for old feeds and can retire later.
7. **Upsert stays a whole-object re-append**, atomic per object. A multi-object change is one batched
   append.
8. **Containers point at a branch.** A comment thread, a chat or a channel holds `{ feed, branch }`. A
   subject's comments are branches of one feed; the comment agent's turns are branches of the comment
   thread's branch, so the thread shows only what people wrote and the agent's final reply.
9. **Trajectory on top.** A trajectory thread is a feed branch; `thread` and `prev` move from the event into
   `@meta`; `threadMerge`, `threadWait` and turn semantics stay trajectory events. Reducers read one branch
   and its ancestors instead of filtering the whole feed.

## Questions for Dima

1. Are thread ids in the payload deliberate (they keep ECHO unchanged), or would moving them to `@meta`
   lose something the reducers rely on?
2. Indexing is off for chat feeds because nothing read them through the index. With a branch column and
   push-down, would you index chat feeds again, or keep them unindexed and index only comment and channel
   branches?
3. Is a block-level branch id (5) acceptable as a wire change, given that soft fork rejected block-level
   lineage for different reasons (a lineage edge on blocks conflated races with forks; a branch id does
   not)?
4. Should merge be a feed-layer concept, or stay a trajectory event?
5. Can `Message` sit directly in a trajectory feed, or must content always be wrapped in an event? Comments
   and channels need `Message` objects that other code reads, edits and indexes.

# Feed soft fork — DESIGN

Branch `claude/feed-soft-fork-94c32e`.

Lets a reader of a `Feed` revert to an earlier item and continue from there, so
the feed presents `M1, M2, M3, M5` after forking from `M3` — without copying
anything into a new feed (that is the existing **hard fork**, see
[Prior art](#prior-art)).

## Goals

- **Soft fork**: continue a feed from an earlier item; abandoned items stay in
  the log but drop out of the resolved view.
- **Generic**: the mechanism lives in the feed layer, not in chat. Any feed —
  mailbox, transcript, commerce results, traces — can use it.
- **No new item schemas**: feed items are arbitrary ECHO objects (`Message`,
  `Event`, `Result`, transcript blocks) that we do not own and cannot extend.
- **No protocol change**: no change to the replicated `Block` wire format, the
  `blocks` SQL table, `space-archive`, or the position-assigning edge server.
- **Multi-writer safe**: a writer who has not observed a fork must not be
  silently misattributed to a branch.
- **Inert by default**: the ~15 existing feed consumers behave exactly as today.

## Non-goals

- Branch **switching** (going back to an abandoned branch and making it live
  again). Designed for; not built — see [Deferred](#deferred).
- Enumerating sibling branches for a "N other versions" affordance. Same.
- Wiring the assistant chat UI. Same.
- Retention/compaction of abandoned items. Owned by `feed-live-objects`.

## Model

Each feed item may carry an **explicit lineage parent**: the id of the item it
continues from. An item with no explicit parent continues from _the previous
item in append order_ — which is what every feed does today, so absence of the
key reproduces current behaviour exactly.

```
append order:  M1  M2  M3  M4  M5(M3)
resolved:      M1  M2  M3      M5
```

Then appending `M6(M4)`:

```
append order:  M1  M2  M3  M4  M5(M3)  M6(M4)
resolved:      M1  M2  M3  M4          M6
```

`M6` is now the tip, so `M6`'s branch is live and `M5` drops out. Nothing was
deleted; both branches remain in the log.

### Resolution is linear-with-cuts, not a DAG walk

Start at the tip and walk backwards. At each item: if it has an explicit
parent, **jump** to that item (discarding everything appended in between);
otherwise **step** to the previous item in append order. Reverse the result.

This is why the default needs no leaf enumeration and no branch registry: under
latest-wins the tip simply _is_ the last item in append order. The full DAG is
only needed to enumerate siblings, which is deferred.

### Append order, not wall clock

The walk orders by append position, not `created`. Positions are assigned by the
server and unpositioned local blocks sort last, so a fork you just wrote is
immediately the tip on your own device, and peers converge once positions land.
Timestamps across peers are not trustworthy.

Note that most consumers today re-sort by `created` after querying (e.g.
[`SessionLoader`](../../../packages/core/compute/assistant/src/session/SessionLoader.ts)).
Callers must pass items **in append order** to the resolver; sorting by
`created` first would corrupt the walk.

## Key design decisions

### Lineage lives in item `@meta`, as a foreign key

`EntityMeta` has a generic `keys: ForeignKey[]` slot
([`meta.ts`](../../../packages/core/echo/echo/src/internal/common/types/meta.ts))
that is serialized into the block payload as `@meta` and therefore replicates
with the item and is immutable per block. Precedent: `KEY_QUEUE_POSITION` is
injected into exactly this slot
([`echo-feed-codec.ts`](../../../packages/core/echo/echo-protocol/src/echo-feed-codec.ts)).

Source string: `org.dxos.key.feed-parent`. A foreign key rather than a
`meta.annotations` entry — foreign keys are already the "identity pointer" slot
and survive the whole-object re-append that backs `Obj.update`.

### Rejected: lineage on the block

`Block` already carries `prevActorId`/`prevSequence`, so a parent pointer looks
free. It is not:

1. `sequence` is `max(sequence in feed) + 1` **per feed, not per actor**
   ([`feed-store.ts`](../../../packages/core/echo/feed/src/feed-store.ts)), and
   the unique index is `(feedPrivateId, sequence, actorId)`. Two concurrent
   writers therefore **already fork the block chain**, and the read path ignores
   it. A block parent pointer cannot distinguish a deliberate fork from a
   concurrent append, so an explicit intent marker is needed either way — block
   lineage saves nothing.
2. One logical item is **N blocks** (`Obj.update` re-appends the whole object
   under the same id). A block edge would mean both "version supersedes" and
   "conversation follows", and the walk would have to disentangle them.
   Worse, "fork from M3" names an _object id_, which maps to several blocks.
3. `position` is deliberately non-canonical — `stripQueuePosition` removes it
   before comparison. Blocks are not stable domain handles; objects are.
4. Cost: `Block` is replicated wire format plus SQL columns plus
   `space-archive` plus `spaces-service` plus the edge server. And every feed
   that is a _set_ rather than a chain would pay for a graph walk it never uses.

### Rejected: sidecar fork-marker objects

Appending a `Feed.Fork { from: M3 }` object and treating everything positionally
after it as part of the branch **misattributes any concurrent writer** who was
unaware of the fork. Per-item parents avoid this: an unaware writer appends with
no explicit parent and honestly linearizes onto the read order; a deliberate
fork states its parent. Both outcomes are resolvable after the fact.

### Rejected: branch metadata on the `Feed` object

`Feed.Feed` is the one schema here we do own, but it is Automerge state
replicated on a _different_ path than the blocks, so a fork could become visible
before or after the items it describes. There is no way to order the two.

### Resolution is an explicit pure function, not transparent in `Feed.query`

Feeds have **two** read paths: `FeedHandle` polls and dedupes client-side, but a
feed query with `orderBy`/`limit` routes through the host indexer
([`index-query-source-provider.ts`](../../../packages/core/echo/echo-client/src/client/index-query-source-provider.ts),
[`ordered-feed-query.test.ts`](../../../packages/core/echo/echo-client/src/query/ordered-feed-query.test.ts)).
`limit` is applied **server-side**. Filtering branches transparently inside
`Feed.query` would therefore truncate first and filter second — `limit(20)`
would return fewer than 20 items and a chain with holes in it.

So resolution is `Feed.resolveBranch(items)`: a pure function over an
already-materialized, already-deduped list. It behaves identically on both read
paths, needs no query-plan surgery, leaves all existing consumers untouched, and
is unit-testable without a database.

Pushing branch selection into the query plan (`Scope.feed(uri, { branch })`) so
filtering happens _before_ `limit` stays available as a later optimization, once
a feed is large enough that materializing the chain to resolve it hurts.

### Absent parent → stop and truncate

A parent id may legitimately be missing: partial replication (feeds support
`replicate(fromPosition)`), the item was `@deleted`, or the caller's filter
excluded it. The walk stops there and reports `truncated: true`, so a UI can say
"earlier history unavailable". Falling back to append order instead would
present abandoned items as live, which is worse than showing less.

### Forward references terminate the walk

A parent that appears at or after its child in the list is a cycle or a forward
reference — possible with arbitrary multi-writer data. The walk requires the
cursor to strictly decrease, so it always terminates; such an edge is reported
as `truncated`.

### Resolve over the projection you render

`Feed.query(feed, Filter.type(Message.Message))` excludes interleaved items of
other types, so "the previous item in append order" means "the previous item _in
the list you passed_". Fork parents must point at items of the same projection;
one pointing at a filtered-out item is treated as absent (truncated). This falls
out of the resolver being a pure function over a caller-supplied list, and is
the documented contract.

## API

Added to [`Feed.ts`](../../../packages/core/echo/echo/src/Feed.ts):

```ts
/** Foreign-key source for an item's explicit lineage parent. */
export const PARENT_KEY = 'org.dxos.key.feed-parent';

export const getParent: (item: Obj.Unknown | Obj.Snapshot) => EntityId.EntityId | undefined;
export const setParent: (item: Obj.Unknown, parent: Obj.Unknown | EntityId.EntityId | undefined) => void;

export interface BranchOptions {
  /** Item to resolve from. Defaults to the last item in `items` (latest-wins). */
  head?: Obj.Unknown | Obj.Snapshot | EntityId.EntityId;
}

export interface Branch<T> {
  /** The resolved chain, in append order. */
  items: T[];
  /** A parent was referenced but not present in `items`, so the chain is incomplete. */
  truncated: boolean;
}

export const resolveBranch: <T extends Obj.Unknown | Obj.Snapshot>(
  items: readonly T[],
  options?: BranchOptions,
) => Branch<T>;

// Existing signature gains an options bag.
export const append: (
  feed: Feed,
  items: Entity.Unknown[],
  options?: { parent?: Obj.Unknown | EntityId.EntityId },
) => Effect.Effect<void, never, Database.Service>;
```

`append`'s `parent` applies to the **first** item only; the rest of the batch
chain implicitly in append order, which is what a batch means.

`BranchOptions.head` is what makes the deferred explicit-head pointer cheap: the
resolver already accepts an arbitrary starting point, so an active-branch
pointer only has to decide _what_ to pass.

## Usage

```ts
// Fork: continue the conversation from an earlier message.
yield * Feed.append(feed, [Message.make({ sender, blocks })], { parent: m3 });

// Read: resolve the live branch.
const messages = yield * Feed.query(feed, Filter.type(Message.Message)).run;
const { items, truncated } = Feed.resolveBranch(messages);
```

## Testing

- [`Feed.test.ts`](../../../packages/core/echo/echo/src/Feed.test.ts) — pure
  unit tests, no database, matching the DB-free tests already in that package:
  `getParent`/`setParent` round-trip; the `M1..M5(M3)` and `M6(M4)` worked
  examples; no-lineage feeds resolve to the identity; `head` override; absent
  parent truncates; forward reference / cycle terminates; empty input.
- A DB-backed round-trip in
  [`feed.test.ts`](../../../packages/core/echo/echo-client/src/feed/feed.test.ts)
  proving the parent key survives append → query → dedupe.

## Prior art

- **Hard fork** already exists: `ForkChat` creates a new `Feed` and appends a
  `SessionLink` cutoff; `SessionLoader.reifyHistory` splices the source feed's
  history back in at read time
  ([`fork-chat.ts`](../../../packages/plugins/plugin-assistant/src/operations/fork-chat.ts),
  [`SessionLoader.ts`](../../../packages/core/compute/assistant/src/session/SessionLoader.ts)).
  Soft fork is the same user intent without the copy, and the two are
  independent: a soft-forked feed can still be hard-forked.
- **Feed deletion** is already a tombstone append (`{ id, '@deleted': true }`)
  resolved on read ([`local-feed-service.ts`](../../../packages/core/echo/echo-host/src/db-host/local-feed-service.ts)),
  so read-time resolution over an append-only log is an established pattern here.

## Gotchas

- **`Message.parentMessage` is not this**, and it is about to carry a third
  meaning. Today it means tool-call / sub-agent nesting in
  [`execution-graph.ts`](../../../packages/core/compute/assistant/src/util/execution-graph.ts);
  the `chat` work-stream plans to retype it `Ref(Message)` and use it for
  **replies**. Fork lineage is a fourth relationship and stays in `@meta` —
  coordinate with `chat` before either touches the other, since a single field
  cannot mean nesting, replies, and lineage at once.
- **Lineage is mutable.** `Obj.update` re-appends the whole object including
  meta, so a later block can change an item's parent — that is how "move a
  branch" would be implemented, but it also means lineage is last-flush-wins at
  whole-object granularity, same as every other feed-object field
  (see `feed-live-objects`).
- **Callers must not pre-sort by `created`.** See
  [Append order](#append-order-not-wall-clock).

## Deferred

- `Feed.branches(items)` — enumerate leaves and their chains, for a "N other
  versions" affordance (Q3 #3). Additive; needs the full DAG.
- An explicit active-branch head, most likely a field on `Feed.Feed`, passed to
  `resolveBranch` via `head` (Q3 #2). Adds mutable multi-writer state, so only
  worth it once branch _switching_ is actually wanted.
- `Scope.feed(uri, { branch })` query-plan push-down, so branch filtering
  precedes `limit` in the indexer.
- Assistant chat wiring: a "revert to here" affordance plus `SessionLoader` /
  `AiSession.getHistory` integration.

# Synchronous query propagation

Status: design brainstorm, no code. Companion to `echo-host/docs/SQL_QUERY_EXECUTION.md` (the
index side) and `.agents/projects/feed-live-objects/DESIGN.md` stage 2 (the feed seam, which this
generalizes to all scopes).

## Summary

Make the local working set the core of the query pipeline instead of one source among several.
Today `GraphQueryContext` concatenates whatever each `QuerySource` returns and dedups by id. The
proposal replaces that with a **local query engine** that answers synchronously from the working
set, treats every remote answer (index, EDGE, registry) as versioned evidence, and revalidates each
remote entry against local state before presenting it. Remote sources stop being "query contexts"
and become async completers.

Three things fall out of that:

1. **Static characteristics on the AST.** A pure function classifies any query into what the
   working set can answer alone, what it can answer partially, what it can revalidate, and what is
   remote-only. The classes drive the merge, the completeness flag on results, and whether a UI
   needs a loading state.
2. **Versions on every remote entry.** Automerge heads for documents, `(sequence, actorId)` plus the
   server `insertionId` for feed items. Local wins when it is at or ahead of the version the remote
   saw. This is the single rule that lets a local edit disqualify a remote hit.
3. **Derivations on traversal and aggregate results.** A traversal result carries the path(s) it was
   reached through; an aggregate carries a membership manifest. Without them local cannot tell
   whether its own change invalidates the remote's conclusion.

The public `Query` builder does not change. `QueryResult` gains a completeness signal and a stated
synchronous guarantee for the local classes.

## 1. Where we are

### 1.1 The pipeline

```
Query API ──► QueryResultImpl ──► GraphQueryContext ──┬─► SpaceQuerySource (per db, working set, sync)
                                   (concat + dedup)   ├─► IndexQuerySource (host SQL index, async stream)
                                                      ├─► RegistryQuerySource
                                                      └─► provider sources (EDGE, ...)
```

- `GraphQueryContext.getResults()` is `flatMap(source.getResults())`
  (`echo-client/src/query/graph-query-context.ts`). `QueryResultImpl._uniqueObjects` dedups by id,
  first occurrence wins, and `_collapseDuplicates` drops entries whose local core is a tombstone.
- `SpaceQuerySource` runs the shared `QueryPlanner` (`noIndexes: true`) and the
  `WorkingSetQueryExecutor` over `db.allObjectCores()`. It declines text and timestamp selectors,
  windowed queries (`order`/`limit`/`skip`, see `queryHasWindowing`), feed scopes, and aggregates
  that need the index (`queryAggregateNeedsIndex`).
- `IndexQuerySource` opens a `REACTIVE` stream to `QueryServiceImpl` in the host. The host re-runs a
  live query when an `InvalidationHint` (space, queue, typename, object id) overlaps the query's
  static scopes (`extractScopes` in `echo-host/src/query/query-executor.ts`), with a
  cost-proportional debounce. Hits are hydrated into live objects through `ObjectLoader`.
- The only completeness signals are `QuerySource.isSynchronous()` and `isPending()`, used by
  `subscribe({ fire })` to decide whether an empty initial snapshot is safe to deliver.

### 1.2 What "synchronous" means today

A local write goes: automerge `change` event → `EntityManager._onDocumentUpdate` (synchronous) →
`_scheduleThrottledDbUpdate` → `UpdateScheduler.forceTrigger` → **microtask** →
`_updateEvent.emit` → `SpaceQuerySource._onUpdate` → `changed.emit` → `QueryResultImpl` recompute →
subscriber. So `db.add(x); query.results` in the same frame does not contain `x`. Object-level
reactivity (`useObject`, proxies, signals) is synchronous; query membership is not.

Host-delivered changes are coalesced at 10 Hz (`DB_UPDATE_MAX_FREQ`). Index-served membership
changes need flush → index → host re-run (debounced) → stream → hydrate.

### 1.3 Failure modes the proposal targets

| Symptom                                                                                                                                                              | Mechanism                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Local edit removes an object from a filter, UI keeps showing it                                                                                                      | The index source still holds the entry; concat keeps it until the host re-runs. Only tombstones are collapsed locally.         |
| Local add, list does not show it until next tick (or at all for windowed queries)                                                                                    | Microtask hop; windowed queries are excluded from the working set entirely.                                                    |
| Plugins keep a parallel store or run operations under `Effect.runSync` to land a write "in the gesture frame" (`plugin-tasks/src/types/TaskOperation.ts` `MoveTask`) | No contract that a query reflects a local write synchronously.                                                                 |
| Count/aggregate over a mix of local and remote members is wrong                                                                                                      | Working set aggregates are over the loaded subset; index aggregates ignore unflushed local writes; the two are not reconciled. |
| `subscribe({ fire })` heuristics                                                                                                                                     | There is no completeness value, only "some source is sync" and "some source is pending".                                       |

### 1.4 Pieces that already exist and are reused

- `WorkingSetQueryExecutor` executes the same plan the host executes; this is the local engine's
  evaluator.
- `extractScopes` / `InvalidationHint` are a static characteristic already computed on the host for
  the same purpose (can this change affect this query). The classification below extends it.
- `Heads` is already a protobuf message in `dxos/echo/query.proto`.
- Feed blocks carry `(actorId, sequence)` and the server-assigned `insertionId`
  (`feed/src/feed-store.ts`); the feed-live-objects seam already specifies versioned, latest-per-id
  merging for feeds.
- `filterMatchDoc` evaluates any root-executable filter against a single document.

## 2. Goals and non-goals

Goals:

- After a local write in frame F, a query in a local class reflects it in frame F: `results`,
  `runSync()`, and the subscriber notification all happen before control returns to the writer.
- A remote entry never outlives the local evidence against it. If the working set is at or ahead
  of the version the remote evaluated, local evaluation is authoritative for that entry.
- Every result carries a completeness value a UI can act on without guessing.
- Static characteristics are a pure function of the AST, testable without a database.

Non-goals:

- Making remote-only classes (text search, vector, timestamp selectors) synchronous.
- Changing the builder API or the AST.
- Exactness for aggregates in the first phases. Partial aggregates are labelled, not fixed.
- Replacing the host index or EDGE executor. They gain output fields, not new semantics.

## 3. Model

### 3.1 Two clocks

The working set is usually ahead of every remote: a local write exists here first and reaches the
index after flush and the EDGE after replication. Occasionally a remote is ahead: a peer's change the
host has indexed but this tab has not loaded. The merge rule has to handle both, so every remote
entry carries the version the remote evaluated it at.

```ts
type Version =
  | { kind: 'automerge'; heads: readonly string[] } // per document; inline objects share it
  | { kind: 'feed'; sequence: number; actorId: string; insertionId?: number };
```

Comparison, per entry:

- `local-ahead-or-equal`: every remote head is in the local document's history
  (`A.getChangeByHash` per head), or the local feed item has the same `(sequence, actorId)` or a
  later one for that id. Local evaluation wins.
- `remote-ahead-or-concurrent`: some remote head is unknown locally, or the local core is not
  loaded. Remote verdict stands; the engine requests the document (`batchLoadObjectCores`) and
  re-evaluates when it lands.

Concurrent heads (neither ancestor of the other) are treated as remote-ahead until merge, which is
conservative: the remote verdict is kept. This is the one case where a stale-looking entry survives
briefly, and it converges on sync.

### 3.2 Local engine owns the merge

```
Query API ──► QueryResult ──► LocalQueryEngine ──┬─ working set (sync, authoritative for loaded docs)
                               plan once         ├─ remote answers, versioned, revalidated
                               merge             │    ├─ host index (REACTIVE stream)
                               completeness      │    ├─ EDGE
                                                 │    └─ registry
                                                 └─ dirty tracking: sync notify, lazy recompute
```

Per query the engine holds:

- the plan (`QueryPlanner`, shared with the host so local and remote agree on semantics),
- the static characteristics (§3.3),
- the latest answer from each remote source: entries with `version`, optional `path` or
  `manifest`,
- a dirty flag and the last presented result.

`getResults()` is: run the plan over the working set, then for each remote entry not already in the
local result decide `keep`, `drop`, or `trust` by §3.1 and the class rules in §3.3. Keep and trust
both present the entry; drop removes it. Entries local produced are always presented.

The `QuerySource` interface shrinks to the async half:

```ts
interface RemoteQuerySource {
  update(query: QueryAST.Query): void; // start/restart the reactive stream
  run(ctx, query): Promise<RemoteEntry[]>; // one-shot
  readonly answer: Event<RemoteAnswer>; // { entries: RemoteEntry[], complete: boolean }
  open(): void;
  close(): void;
}
type RemoteEntry = SourceEntry & { version: Version; path?: TraversalPath[]; manifest?: GroupManifest };
```

`isSynchronous` and `isPending` move to the engine, computed from the class and from which sources
have answered.

### 3.3 Static characteristics

A pure function `Query.characteristics(ast)` (lives next to `visit`/`fold` in `echo-protocol` or in
`echo-client/src/query/util.ts`) returns:

```ts
type Characteristics = {
  scope: { spaces: 'owning' | SpaceId[] | 'all'; feeds: boolean; registry: 'none' | 'local' | 'remote' | 'both' };
  selection: 'id' | 'type' | 'wildcard' | 'text' | 'timestamp' | 'changes' | 'feed-cursor' | 'incoming-ref';
  predicates: 'local' | 'index'; // every residual filter is root-executable via filterMatchDoc, or not
  shape: { traversal: number /* hops */; union: boolean; difference: boolean; subquery: boolean };
  window: { order: 'none' | 'local-property' | 'index'; limit: boolean; skip: boolean };
  aggregate: 'none' | 'members' | 'scalar' | 'index'; // items/group vs count/sum/min/max vs timestamp keys
  class: 'local-complete' | 'local-partial' | 'local-revalidating' | 'remote-only';
  revalidation: 'entry' | 'path' | 'manifest' | 'none';
};
```

How each AST node contributes:

| AST node                                                                                                                                   | Contribution                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select` with `object.id`                                                                                                                  | `selection: id`. Local-complete once every id is loaded (runtime check).                                                                                                                                        |
| `select` with `object.typename` / wildcard                                                                                                 | `selection: type` / `wildcard`. Local-partial: the working set holds a subset of the space.                                                                                                                     |
| `object.props`, `compare`, `in`, `contains`, `range`, `tag`, `annotation`, `mnemonic`, `has-parent`, `child-of`, `not`/`and`/`or` of these | `predicates: local`. Revalidatable per entry with `filterMatchDoc`.                                                                                                                                             |
| `text-search`, `timestamp`, `feed-cursor`, `changes`                                                                                       | `remote-only` selection. The working set has no FTS, no index timestamps, no feed positions, no change log.                                                                                                     |
| `in-query`                                                                                                                                 | `shape.subquery`. Class is the weaker of the outer and inner classes; revalidation needs the inner result set, so `revalidation: none` unless the inner query is local-complete.                                |
| `reference-traversal`, `incoming-references`, `relation`, `relation-traversal`, `hierarchy-traversal`                                      | `shape.traversal += 1`. Local-partial; `revalidation: path`.                                                                                                                                                    |
| `union`                                                                                                                                    | Class is the weakest member. Each branch keeps its own revalidation.                                                                                                                                            |
| `set-difference`                                                                                                                           | Local can only _add_ to `exclude` safely (dropping more), never shrink it; so a local-ahead change on the exclude side drops, a remote-ahead keeps. `revalidation: entry` on both sides.                        |
| `order` by property                                                                                                                        | `window.order: local-property`. Local can sort its own view; the merged list is re-sorted by the engine.                                                                                                        |
| `order` by `rank`/`timestamp`                                                                                                              | `window.order: index`. Remote-only ordering; local entries are appended unsorted and flagged.                                                                                                                   |
| `limit` / `skip`                                                                                                                           | A slice of a total set. Remote-only unless the query is local-complete. Local can still _drop_ from a remote page (disqualified entries) and _prepend_ new local matches as a labelled overflow, never re-page. |
| `aggregate` with `items`/`group`/`type`/`time` keys                                                                                        | `aggregate: members`. Local-partial with manifest revalidation.                                                                                                                                                 |
| `aggregate` with `count`/`sum`/`min`/`max`                                                                                                 | `aggregate: scalar`. Remote-authoritative with local deltas for `count`/`sum`; `min`/`max` can only be widened locally, never narrowed.                                                                         |
| `aggregate` with `timestamp` key                                                                                                           | `aggregate: index`. Remote-only.                                                                                                                                                                                |
| `from` feeds                                                                                                                               | `scope.feeds`. Remote-only today (the working set holds no feed items); the feed seam supplies the local half later.                                                                                            |
| `from` registry `remote`                                                                                                                   | Remote-only for that scope.                                                                                                                                                                                     |
| `options.deleted`                                                                                                                          | Affects the tombstone collapse only.                                                                                                                                                                            |

The class is the meet over all contributions: `remote-only` dominates, then `local-revalidating`
(remote-authoritative, local can drop), then `local-partial`, then `local-complete`.

Static vs dynamic: the static class is an upper bound. `local-complete` for by-id is only true once
the ids are loaded, so the engine reports a **dynamic completeness** on each result:

```ts
type Completeness = 'complete' | 'local-only' | 'merged' | 'pending';
// complete:   nothing outstanding (local-complete, or every remote answered and revalidated)
// local-only: local answer shown, remote not yet answered
// merged:     local + at least one remote answer, some remote still pending or some entry unverifiable
// pending:    remote-only class, no answer yet
```

### 3.4 The examples

**`Query.select(Filter.id(X))`.** Static `local-complete`. If the core is loaded with a body, answer
from the working set and do not open a remote stream: replication updates the document, so the
working set stays authoritative for a loaded document. If not loaded, kick `batchLoadObjectCores`
and open the index stream to learn the document id; completeness is `pending` until the body
lands. A deleted-and-not-replicated edge case (the object was removed from the space root by a
peer) resolves through the directory update, same as today.

**`Query.select(Filter.type(T))`.** `local-partial`. Local entries appear synchronously. Remote
entries that are not in the local result are kept only if the local core is absent or behind
(§3.1); a loaded, local-ahead core that no longer matches (type change, tombstone) drops the entry.
Completeness goes `local-only` → `merged` → `complete` as sources answer.

**Property filter.** Same as type, plus per-entry revalidation: run `filterMatchDoc(residualFilter,
localDoc)` on every remote entry whose core is local-ahead. The residual filter is what the planner
leaves after the select step; it is the same object the host applies, so no divergence.

**Traversals.** The remote returns the derivation alongside the frontier:

```ts
type TraversalPath = {
  hop: number;
  from: EntityId;
  edge: {
    kind: 'ref' | 'incoming-ref' | 'relation-source' | 'relation-target' | 'parent' | 'child';
    property?: string;
  };
  to: EntityId;
}[];
```

For a result reached by several paths the remote returns each path (a DAG per result, deduped by
edge). Local revalidation walks each path: for every edge whose `from` object is loaded and
local-ahead, re-check the edge against the local document (the property still references `to`, the
relation endpoint is unchanged, the parent pointer is unchanged). A path with a broken edge is dead;
the result survives if any path survives or if the local traversal produces it. Local also _adds_:
the engine runs the traversal plan over the working set seeded with the union of local anchors and
remote anchors, so a new local edge shows up synchronously. Anchors the remote found but local does
not have are trusted as anchors.

Why paths and not per-hop frontiers: a frontier tells you which objects were at hop k, not which
hop-(k-1) object led to each, so a broken local edge cannot be attributed to a result. Size is
bounded by `results × hops × fan-in`; a cap with fallback to `revalidation: none` (remote verdict
stands) handles pathological fan-in.

**Aggregations.** Split by kind:

- `items`, `group`, `type`, `time` keys: the remote returns the member list with group keys and
  versions (it already returns `groupKey` per record). Local recomputes groups over
  `local ∪ revalidated remote members` exactly as `_assembleGroups` does today.
- `count`, `sum`: the remote returns the scalar plus a **manifest**: `(id, groupKey, version,
contribution)` per member. For each local-ahead core, subtract its manifest contribution and add
  its local contribution (possibly to a different group, or none). For local members absent from the
  manifest, add. Result is exact when every local-ahead core is covered; otherwise `merged`.
- `min`, `max`: subtraction does not work. Local can widen (a local value beyond the remote extreme
  wins) but cannot narrow (removing the remote's extreme needs the runner-up). Reported as `merged`
  until the remote re-runs. Exactness would need the remote to send the top-k, which is a later
  option.
- `timestamp` keys ("activity"): remote-only. The working set has no index timestamps; the engine
  presents the remote answer and nothing else.

A manifest is `O(members)`, the same order as `items`, so it costs no more than the member list a UI
would typically ask for anyway. Scalar-only aggregates over large groups (a count of 50k) are the
case where this is too much; there the remote sends the scalar plus a version watermark, local
applies deltas only for cores it knows to be ahead of the watermark whose _previous_ state it can
reconstruct from automerge history (`A.view(doc, heads)`), and otherwise reports `merged`.

### 3.5 Does the query API change

Builder: no. Every characteristic is derived from the AST the builder already produces.

`QueryResult`:

- `completeness: Completeness` (new), replacing the `isSynchronous`/`hasPendingSources` pair in
  `QueryContext`.
- Guarantee, stated in the JSDoc: for `local-complete` and `local-partial` classes, a write made
  through this database is visible in `results`/`runSync()` and has notified subscribers before the
  writing call returns. For other classes the local contribution obeys the same rule; the remote
  contribution does not.
- `Entry.resolution` gains `version` and `verified: boolean` (revalidated against the working set).
- `subscribe({ fire })` fires when `completeness !== 'pending'`; the current three-way heuristic
  goes away.
- `Query.characteristics(query)` is public, so a component can decide at render time whether it
  needs a skeleton.

`useQuery` is unchanged in signature; `useSyncExternalStore` is the right consumer for
notify-synchronously, read-lazily. A `useQueryState` returning `{ results, completeness }` is an
additive hook.

`db.query(...).runSync()` stops being "whatever is cached" and becomes "the engine's current merged
answer", with completeness readable alongside.

### 3.6 Propagation mechanics

Notify synchronously, recompute lazily:

1. `EntityManager._onDocumentUpdate` is already synchronous inside the automerge change event. Add a
   synchronous `coreChanged(core, changedFields)` signal from it, before the scheduler is triggered.
   The scheduler path stays for object-level events and host bulk coalescing.
2. The engine keeps a per-space index of live queries by static scope (typename set, id set,
   wildcard), the local twin of the host's `extractScopes`. A core change marks the overlapping
   queries dirty in `O(matching queries)`.
3. A dirty query emits `changed` synchronously (inside `batchEvents` so a write that touches many
   objects notifies once). Recompute happens on the next read of `results`.
4. Re-entrancy: a subscriber that writes during the notification re-dirties; the batch flushes
   after the outer write. Same discipline as signal effects.

Working-set evaluation cost: `allCores()` is a scan. For the sync path to stay cheap, the working
set needs a `typename → cores` map (maintained in `EntityManager` on bind/rebind) so a type query
recomputes in `O(result)`, and the by-id path stays `O(ids)`. Wildcard stays `O(working set)`.

Remote answers arrive async as today, are merged on arrival, and emit `changed` once.

### 3.7 Protocol and EDGE

`dxos/echo/query.proto` `QueryResult` gains:

- `Heads heads` (message exists) for document-backed hits; `FeedVersion { sequence, actorId,
insertionId }` for feed hits.
- `repeated TraversalPath paths` when the query has traversal clauses.
- `GroupManifest manifest` when the query has a scalar aggregate.

`QueryExecutor` (host) and `db-service/src/worker/query/query-executor.ts` (EDGE) both run the
shared plan, so both attach the same fields: heads from the automerge handle the hit was read from,
paths from `_execTraverseStep` (it already walks per anchor; it has to retain `(from, edge, to)`
instead of only the frontier), manifest from `_execAggregateStep`.

## 4. Phases

0. **Characteristics and harness.** `Query.characteristics` as a pure function with a table test
   over the AST corpus; a timing test that pins the current microtask gap so the change in phase 1
   is observable. No behaviour change.
1. **Engine owns the merge, flat queries.** `LocalQueryEngine` replaces `GraphQueryContext`
   internally; `QuerySource` becomes `RemoteQuerySource`; heads on index hits; entry revalidation
   for `local-partial` with `predicates: local`; synchronous notify via `coreChanged`; typename map
   in the working set; `completeness` on `QueryResult`. Windowed queries stay remote-only but gain
   local drop + overflow. This phase removes the "stale entry after local edit" class of bugs.
2. **Traversals.** Paths in the protocol, host and EDGE executors; path revalidation and local
   augmentation in the engine.
3. **Aggregates and ordering.** Manifests for `count`/`sum`; widen-only for `min`/`max`;
   local-property ordering over the merged set.
4. **Feeds.** The feed-live-objects stage 2 seam plugs in as another versioned remote with the
   local tail as part of the working set; `scope.feeds` moves from remote-only to local-partial.

## 5. Open questions

1. Where does the characteristics function live: `echo-protocol` next to the AST (no deps, usable
   by EDGE) or `echo-client`? Leaning `echo-protocol`.
2. By-id queries with all ids loaded: skip the remote stream entirely, or keep it open at low
   priority as a safety net for directory changes the tab missed?
3. `local-ahead` for inline objects: heads are per document, so an unrelated inline object's write
   makes every object in that document look local-ahead. Correct but causes extra revalidation.
   Cheap, since revalidation is `filterMatchDoc` on a loaded doc, but worth measuring on large
   documents.
4. Path cap: what fan-in bound, and does the remote return "truncated" so the engine knows to fall
   back to trusting the remote verdict?
5. Concurrent heads: keep the remote verdict (proposed) or evaluate locally on the merged doc once
   `A.merge` has happened? The latter is what the working set will show anyway after sync.
6. Should `completeness` be on the entry stream (per source) or only on the result? Per result is
   enough for UI; per source helps diagnostics.
7. Do registry-local results join the working set (they are in-process and synchronous) or stay a
   remote source with `version` undefined and `verified: true`?

## 6. Rejected alternatives

- **Optimistic overlay in the query layer.** A ledger of pending local writes applied over remote
  results. Duplicates the working set, which already _is_ the overlay, and has to re-implement
  predicate evaluation that `filterMatchDoc` already provides.
- **Faster remote invalidation only.** The round trip is flush → index → host re-run → stream →
  hydrate; the debounce exists because re-runs are expensive. It can be made faster, never
  synchronous.
- **UI-side stores.** The status quo. Every plugin re-derives membership for the objects it just
  wrote, and gets it wrong differently.
- **Per-hop frontiers instead of paths.** Cannot attribute a broken edge to a result (§3.4).

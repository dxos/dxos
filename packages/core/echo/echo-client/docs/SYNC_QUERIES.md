# Synchronous query propagation

Status: phases 1 to 4 implemented. §8 covers phase 1 and §9 the later phases, each with where it
differs from the design. §1 describes the pipeline as it was before phase 1. Revised once after an
adversarial review against the code; the review's findings are folded in and the ones that changed the
design are called out in §7.

Tests: `echo-client-e2e/src/sync-query.test.ts` counts subscriber notifications per write.

Related documents:

- `echo-host/docs/SQL_QUERY_EXECUTION.md`: the index side. This proposal needs two things that
  doc's goals exclude (§3.8), so the two have to be reconciled before phase 1.
- `.agents/projects/feed-live-objects/DESIGN.md` stages 2 and 3: the feed seam and the feed version
  comparator, which this proposal reuses rather than redefines.

## Summary

Make the local working set the core of the query pipeline instead of one source among several.
Today `GraphQueryContext` concatenates whatever each `QuerySource` returns and dedups by id. The
proposal replaces that with a **local query engine** that answers from the in-process sources (the
working set per space, and the registry) before the writing call returns, treats every remote
answer (index, EDGE) as versioned evidence, and revalidates each remote entry against local state
before presenting it. Remote sources stop being "query contexts" and become async completers.

Three things fall out of that:

1. **Static characteristics on the AST.** A pure function classifies every branch of a query into
   what the working set can answer alone, what it can answer partially, what it can only
   revalidate, and what is remote-only. The classes drive the merge, the completeness value on
   results, and whether a UI needs a loading state.
2. **Versions on every remote entry.** Automerge heads plus the document id for documents; the
   feed-live-objects stage 3 comparator for feed items. A loaded local document is evaluated
   locally whatever the remote saw; the version only decides what to do with a remote entry local
   cannot evaluate.
3. **Derivations on traversal and aggregate results.** A traversal result carries the edges it was
   reached through, each naming the object that holds the edge; an aggregate carries a membership
   manifest. Without them local cannot tell whether its own change invalidates the remote's
   conclusion.

The public `Query` builder does not change. `QueryResult` gains a completeness value and a stated
guarantee for the local classes.

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
- `SpaceQuerySource` runs the shared `QueryPlanner` with `noIndexes: true` and the
  `WorkingSetQueryExecutor` over `db.allObjectCores()`. With `noIndexes` the planner emits a
  wildcard select plus a `FilterStep` carrying the **whole** filter, typename included
  (`query-planner.ts` `_generateSelectionFromFilter`), and skips `_optimizeBareAggregate`. The
  source serves only the owning space, and declines text and timestamp selectors, windowed queries
  (`order`/`limit`/`skip`, `queryHasWindowing`), feed scopes, and aggregates that need the index
  (`queryAggregateNeedsIndex`).
- `RegistryQuerySource` is the second synchronous source. It serves a query only when the `from`
  clause carries `Scope.registry()` (location `local`), matches `registry.list()` in memory with
  `filterMatchEntity`, and answers only simple selections (`isSimpleSelectionQuery`: no traversal,
  no windowing, no feeds). `list()` already merges an upstream registry chain, so entries hydrated
  from elsewhere (an EDGE-side registry built by `McpServer.hydrateRegistry`, a plugin's type
  registry) are served synchronously too. `Registry.add`/`remove`/`clear` emit `changed`
  synchronously, so a registry write reaches a subscriber in the writing frame today. Location
  `remote` is reserved and unserved: `Scope.ts` marks it not yet implemented and the EDGE executor
  selects nothing for a registry scope.
- `IndexQuerySource` opens a `REACTIVE` stream to `QueryServiceImpl` in the host. The host re-runs a
  live query when an `InvalidationHint` (space, queue, typename, object id) overlaps the query's
  static scopes (`extractScopes` in `echo-host/src/query/query-executor.ts`), with a
  cost-proportional debounce. Hits are hydrated into live objects through `ObjectLoader`. A stream
  that errors or times out is marked answered-with-nothing (`_fail`).
- The only completeness signals are `QuerySource.isSynchronous()` and `isPending()`, used by
  `subscribe({ fire })` to decide whether an empty initial snapshot is safe to deliver.
- The wire type is the Effect schema `QueryResult` in `protocols/src/QueryService.ts` (the proto in
  `dxos/echo/query.proto` mirrors it). It carries `documentId`, `queueId`, `groupKey`, `groupCount`,
  `aggregates`, and no version.

### 1.2 What "synchronous" means today

A local write goes: `ObjectCore.change` takes the per-handle `docChangeSemaphore` → automerge
`change` event, emitted synchronously inside `DocHandleProxy.change` → `EntityManager._onDocumentUpdate`
(synchronous) → `_emitObjectUpdateEvent` (object listeners notified **inside the write**) →
`_scheduleThrottledDbUpdate` → `UpdateScheduler.forceTrigger` → at least two microtask hops, and a
wait for any emission already in flight → `_updateEvent.emit` → `SpaceQuerySource._onUpdate` →
`changed.emit` → `QueryResultImpl` recompute → subscriber.

So `db.add(x); query.results` in the same frame does not contain `x`, and the gap is bounded by the
previous emission's duration, not by one tick. Object-level reactivity (`useObject`, proxies,
signals) is synchronous; query membership is not.

Host-delivered changes take the same `forceTrigger` path unless a single inbox batch carries
`BULK_BATCH_DOCUMENTS` (32) or more documents (`repo-proxy.ts`); only those are coalesced at
`DB_UPDATE_MAX_FREQ` (10 Hz). Index-served membership changes need flush → index → host re-run
(debounced) → stream → hydrate.

### 1.3 Failure modes the proposal targets

| Symptom                                                                  | Mechanism                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local edit removes an object from a filter, UI keeps showing it          | The index source still holds the entry; concat keeps it until the host re-runs. Only tombstones are collapsed locally (`_collapseDuplicates`, and the index source's deleted-flag re-check). |
| Local add, list does not show it until a later tick (never, if windowed) | Scheduler hop; windowed queries are excluded from the working set entirely.                                                                                                                  |
| Count/aggregate over a mix of local and remote members is wrong          | Working set aggregates are over the loaded subset; index aggregates ignore unflushed local writes; the two are not reconciled.                                                               |
| A failed or timed-out index stream reads as "no results"                 | `_fail` marks the source answered; `subscribe({ fire })` then delivers an empty snapshot that a default-object creator acts on.                                                              |
| `subscribe({ fire })` heuristics                                         | There is no completeness value, only "some source is sync" and "some source is pending".                                                                                                     |

### 1.4 Pieces that already exist and are reused

- `WorkingSetQueryExecutor` executes the same plan the host executes; it is the local evaluator.
- `extractScopes` / `InvalidationHint` are a static characteristic already computed on the host for
  the same purpose (can this change affect this query). The classification below extends it.
- `SpaceQuerySource._onUpdate` already does a per-object "does this change affect me" check for
  simple queries (`filterMatchDoc` on the updated core); the engine generalizes it.
- `A.getHeads(doc)` is a sorted hash list, so two documents with equal heads are the same state and
  heads compare as arrays. Full history is present client-side (the host ships `A.save` then
  `saveSince`, `documents-synchronizer.ts`), so `A.view(doc, heads)` can reconstruct a past state
  when the heads are known locally.
- Feed blocks carry `(actorId, sequence)` and the server-assigned `insertionId`
  (`feed/src/feed-store.ts`); feed-live-objects stage 3 defines the one comparator every read path
  uses.
- `RegistryQuerySource` already is a synchronous, in-process source with its own change event; the
  engine keeps it as one and only moves the merge.
- `filterMatchDoc` evaluates a filter tree against a single document for every filter type except
  `child-of`, `timestamp`, `changes`, `feed-cursor`, `in-query` (throw) and `text-search`
  (returns false in the host build). The classification has to walk the whole tree for those.

## 2. Goals and non-goals

Goals:

- After a local write, a query in a local class reflects it before the writing call returns:
  `results`, `runSync()`, and the subscriber notification all happen inside `db.add` / the
  proxy assignment, after the change has committed.
- A remote entry never outlives the local evidence against it. If the local document is loaded
  with a body, local evaluation is authoritative for that entry. For traversal hits this covers the
  derivations the remote supplied; a path-truncated answer (§3.4) is reported as unverified rather
  than revalidated.
- Every result carries a completeness value a UI can act on without guessing, including failure
  and staleness.
- Static characteristics are a pure function of the AST, testable without a database.

Non-goals:

- Making remote-only classes (text search, vector, timestamp selectors, feed cursors, changes)
  synchronous.
- Changing the builder API or the AST.
- Exactness for aggregates in the first phases. Partial aggregates are labelled, not fixed.
- Replacing the host index or EDGE executor. They gain output fields, not new semantics.

## 3. Model

### 3.1 Two clocks and one rule

The working set is usually ahead of every remote: a local write exists here first and reaches the
index after flush and the EDGE after replication. Occasionally a remote is ahead: a peer's change the
host has indexed but this tab has not loaded, or a concurrent change not yet merged here. The merge
has to handle both.

```ts
type Version =
  | { kind: 'automerge'; documentId: string; heads: readonly string[] }
  | { kind: 'feed'; insertionId: number; sequence: number; actorId: string };
```

`documentId` is part of the version because the object↔document binding moves: objects are rebound
between the space root and linked documents (`entity-manager.ts` `updateSpaceState`, rebind on
mismatch), and the host dedups union results by `(spaceId, documentId, objectId)` across epochs.
Comparing heads across documents is meaningless.

The rule, per remote entry, for `revalidation: entry`:

1. **Local core loaded with a body in the document the directory places it in.** Evaluate locally,
   full stop. Concurrent or remote-ahead heads do not change this: the local document already
   contains the user's write, and automerge merge adds the peer's fields without reverting it, so
   the local verdict is what the merged document will say too — except where a peer assigned the
   same property concurrently, whose value can win the merge and change the verdict once
   replication lands and the query re-runs. This is the case the proposal exists for, and the
   earlier draft got it wrong by trusting the remote on concurrent heads.
2. **Local core absent, or loaded without a body.** Trust the remote verdict, request the document
   (`batchLoadObjectCores`), re-evaluate when it lands.
3. **Remote entry names a different `documentId` than the local directory.** The directory is
   authoritative on placement; treat as case 1 against the local document. The remote is reading
   an epoch or a pre-move copy.

The mirror case is deliberate and worth stating: a **remote-ahead change that excludes an object
the local document still matches** (a peer's edit the host has indexed but this tab has not
replicated yet) keeps the object in the result. The remote sends no negative evidence for it, and
the engine does not ask for any. The result then agrees with what the rest of the UI renders from
the same document (the object's own fields still show the pre-edit values), and it converges when
replication lands and the post-commit notify re-runs the affect check. Negative evidence
("id X is excluded at version V") would cost a per-query exclusion list on every answer to hide an
object whose visible state matches, which is the inconsistency the proposal is removing elsewhere.
The same holds for the aggregate manifest in §3.4: a loaded local member absent from the manifest
contributes its local value, whether the remote excluded it or never saw it. The `stale` and
`merged` completeness values are how a UI learns a remote answer is in flight.

**Heads are compared for equality only.** The engine never asks whether local is ahead, behind, or
concurrent with what the remote saw, because no rule acts on the answer: a loaded document is
evaluated locally in every case (case 1 above, and the same for a path holder or a manifest member
in §3.4), and an unloaded one is trusted (case 2). What equality buys is a skip: when the local
document's heads equal the remote entry's, the remote evaluated the exact state local holds, so the
local re-check would reproduce its verdict and is not run. That makes the common steady-state case
(nothing changed since the index ran) free. `A.getMissingDeps` is not needed; it would cost a wasm
call per entry to compute a three-way distinction the design discards.

The one place history matters is the scalar-aggregate watermark in §3.4, which reconstructs a
member's previous state with `A.view(doc, heads)`. That call fails when the heads are not in local
history, and the engine takes the failure as "cannot delta, report `merged`" rather than testing
first.

Feeds use the feed-live-objects stage 3 comparator: `insertionId` primary, `(sequence, actorId)`
only as the Lamport tiebreak for same-id blocks. `sequence` is per actor, so it is not an order on
its own. This document defines no second comparator.

### 3.2 Local engine owns the merge

```
Query API ──► QueryResult ──► LocalQueryEngine ──┬─ in-process sources (sync)
                               plan once         │    ├─ working set, per space (authoritative for loaded docs)
                               merge             │    └─ registry (simple selections, `Scope.registry()` only)
                               completeness      ├─ remote answers, versioned, revalidated
                                                 │    ├─ host index (REACTIVE stream)
                                                 │    └─ EDGE
                                                 └─ dirty tracking: post-commit notify, affect check
```

The registry is on the synchronous side, not the remote one. It has no document and no version:
its entries are plain in-memory entities, so there is nothing to revalidate and nothing that can be
behind. The engine treats a registry hit as `verified: true` with `version: undefined`, and a
registry `changed` event as a dirty trigger exactly like a core change, evaluated through the
same affect check (the registry already emits synchronously inside `add`/`remove`, so no
post-commit hook is needed there). Where a space entry and a registry entry share a `meta.key`,
the space entry wins, which is the precedence `GraphQueryContext` has a TODO for today.

Per query the engine holds:

- the plan (`QueryPlanner` with `noIndexes`, so the `FilterStep` carries the full filter and
  `filterMatchDoc` on one document is a complete re-check),
- the static characteristics per branch (§3.3),
- the latest answer from each remote source: entries with `version`, optional `path` or
  `manifest`, plus the answer's own state (answered, failed, stale),
- the last presented result and the ids/order it was computed from, for change suppression.

The hypergraph has one working set per database, so a cross-space query evaluates per space and the
engine dedups by `(spaceId, id)` the way concat does today for free.

`getResults()` is: run the plan over each in-scope working set, then for each remote entry not
already in the local result decide `keep`, `drop`, or `trust` by §3.1 and the branch rules in §3.3.
Keep and trust both present the entry; drop removes it. Entries local produced are always presented.

The `QuerySource` interface shrinks to the async half:

```ts
interface RemoteQuerySource {
  update(query: QueryAST.Query): void; // start/restart the reactive stream
  run(ctx, query): Promise<RemoteEntry[]>; // one-shot
  readonly answer: Event<RemoteAnswer>; // { entries, complete, truncated?: 'paths' }
  readonly failed: Event<Error>;
  open(): void;
  close(): void;
}
type RemoteEntry = SourceEntry & { version: Version; paths?: TraversalPath[]; manifest?: GroupManifest };
```

`isSynchronous` and `isPending` move to the engine, computed from the classes and from which sources
have answered.

### 3.3 Static characteristics

A pure function `Query.characteristics(ast)` (in `echo-protocol` next to `visit`/`fold`, so EDGE
can use it) returns one record **per branch**: a `union` or `set-difference` has one per member,
and a `filter` clause or `from(query)` inherits from its inner query. There is no single meet over
the whole query; a union of a local branch and a remote-only branch has a synchronous local
contribution and a pending remote one, and completeness (below) is where that shows.

```ts
type BranchCharacteristics = {
  scope: {
    spaces: 'owning' | SpaceId[] | 'all';
    feeds: boolean;
    includeAllFeeds: boolean;
    registry: 'none' | 'local' | 'remote' | 'both';
  };
  selection: 'id' | 'type' | 'wildcard' | 'text' | 'timestamp' | 'changes' | 'feed-cursor' | 'incoming-ref';
  predicates: 'local' | 'index'; // whole residual filter tree is filterMatchDoc-evaluable, or not
  shape: { traversal: number /* hops, child-of counts as one */; subquery: boolean };
  window: { order: 'none' | 'natural' | 'local-property' | 'index'; limit: boolean; skip: boolean };
  aggregate: 'none' | 'members' | 'scalar' | 'index';
  class: 'local-complete' | 'local-partial' | 'local-revalidating' | 'remote-only';
  revalidation: 'entry' | 'path' | 'manifest' | 'none';
};
```

How each AST node contributes:

| AST node                                                                                                                                                                      | Contribution                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select` with `object.id`                                                                                                                                                     | `selection: id`. Local-complete once every id is loaded with a body (runtime check). Feed-scoped ids are index-served.                                                                                                                                                                                                                                                                                                            |
| `select` with `object.typename` / wildcard, `not(type)`                                                                                                                       | `selection: type` / `wildcard`. Local-partial: the working set holds a subset of the space. Inverted type is wildcard plus a local predicate.                                                                                                                                                                                                                                                                                     |
| `object.props`, `foreignKeys`, `metaKey`/`metaVersion`, `compare`, `in`, `contains`, `range`, `tag`, `annotation`, `mnemonic`, `has-parent`, and `not`/`and`/`or` over these  | `predicates: local`. Revalidatable per entry with `filterMatchDoc`.                                                                                                                                                                                                                                                                                                                                                               |
| `text-search`, `timestamp`, `feed-cursor`, `changes`, `in-query` **anywhere in the residual filter tree**                                                                     | `predicates: index`, `revalidation: none` for the branch. `filterMatchDoc` throws on four of these and returns false on `text-search` in the host build, so a nested one would silently drop remote hits if revalidated. As a top-level selector, `text`/`timestamp`/`changes`/`feed-cursor` make the branch `remote-only`.                                                                                                       |
| `child-of`                                                                                                                                                                    | A transitive hierarchy traversal, not a predicate: `shape.traversal += 1`, `revalidation: path`. The working-set executor walks parents via `getCoreById` and answers false on an unloaded link, so an unloaded link never drops a remote hit.                                                                                                                                                                                    |
| `filter` clause, `from` with `_tag: 'query'`                                                                                                                                  | Inherit the inner query's characteristics; the outer filter contributes as above.                                                                                                                                                                                                                                                                                                                                                 |
| `reference-traversal`, `incoming-references`, `relation` (selects relation objects; its own `filter` contributes as a predicate), `relation-traversal`, `hierarchy-traversal` | `shape.traversal += 1`. Local-partial; `revalidation: path`.                                                                                                                                                                                                                                                                                                                                                                      |
| `union`                                                                                                                                                                       | One record per member branch.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `set-difference`                                                                                                                                                              | The remote returns only the difference, so local cannot merge either side from that alone. Either the remote also returns `exclude` membership (then `source` is local-partial and `exclude` is entry-revalidated), or the branch is `local-revalidating`, drop-only: a local edit that _removes_ an object from `exclude` is not reflected until the remote re-runs. Phase 1 takes the drop-only form and says so.               |
| `order` natural                                                                                                                                                               | `window.order: natural`; the working set sorts by it today.                                                                                                                                                                                                                                                                                                                                                                       |
| `order` by property                                                                                                                                                           | `window.order: local-property`. The engine re-sorts the merged list.                                                                                                                                                                                                                                                                                                                                                              |
| `order` by `rank`/`timestamp`                                                                                                                                                 | `window.order: index`. Remote-only ordering; local entries are appended unsorted and flagged.                                                                                                                                                                                                                                                                                                                                     |
| `limit` / `skip`                                                                                                                                                              | A slice of a total set. Remote-only unless the branch is local-complete. Local can still _drop_ from a remote page (disqualified entries) and _prepend_ new local matches as a labelled overflow, never re-page.                                                                                                                                                                                                                  |
| `aggregate` with `items`/`group`/`type`/`time` keys                                                                                                                           | `aggregate: members`. Local-partial with manifest revalidation. An `items` aggregate with its own `limit`/`order` is a per-group window: the never-re-page rule applies inside each group.                                                                                                                                                                                                                                        |
| `aggregate` with `count`/`sum`/`min`/`max`                                                                                                                                    | `aggregate: scalar`. Remote-authoritative with local deltas for `count`/`sum`; `min`/`max` can only be widened locally, never narrowed.                                                                                                                                                                                                                                                                                           |
| `aggregate` with `timestamp` key                                                                                                                                              | `aggregate: index`. Remote-only.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `from` feeds, `space.includeAllFeeds`                                                                                                                                         | `scope.feeds`. Remote-only today (the working set holds no feed items); `includeAllFeeds` leaks feed items into a type query, so such a branch is remote-only even for a type select. The feed seam supplies the local half later.                                                                                                                                                                                                |
| `from` registry `local`                                                                                                                                                       | A synchronous in-process branch. `local-complete` for a simple selection (select, local predicates, `options`, `limit`): the registry is fully in memory, so there is no remote half and nothing pending. A traversal, aggregate, `order`, or feed scope on a registry branch is **unsupported** today (the source returns nothing for it), and `Query.characteristics` says so rather than reporting a misleading `remote-only`. |
| `from` registry `remote`                                                                                                                                                      | Reserved; nothing serves it. `remote-only` with completeness `pending` forever until a remote registry source exists, which is a reason to reject the query at `characteristics` time instead.                                                                                                                                                                                                                                    |
| `options.deleted`                                                                                                                                                             | Affects the tombstone collapse only.                                                                                                                                                                                                                                                                                                                                                                                              |

Within one branch the class is the weakest contribution: `remote-only`, then `local-revalidating`
(remote-authoritative, local can drop), then `local-partial`, then `local-complete`.

Static vs dynamic: the static class is an upper bound. `local-complete` for by-id is only true once
the ids are loaded with bodies, so the engine reports a **dynamic completeness** on each result:

```ts
type Completeness =
  | 'complete' // nothing outstanding: local-complete, or every remote answered, not stale, and revalidated
  | 'local-only' // local answer shown, no remote has answered yet
  | 'merged' // local + at least one remote answer; some remote pending, or some entry unverifiable
  | 'stale' // a remote answer predates a local change inside its scope; its re-run is pending
  | 'failed' // a remote source errored or timed out; `sources` names it
  | 'pending'; // remote-only branches only, no answer yet
```

`stale` and `failed` exist because the current pipeline cannot express either: a failed stream is
"answered with nothing" today, and a host re-run held inside its debounce window, or records stalled
in hydration, look like a complete answer. `subscribe({ fire })` never auto-fires on `failed` or
`pending`.

### 3.4 The examples

**`Query.select(Filter.id(X))`.** Static `local-complete`. If the core is loaded with a body, answer
from the working set and do not open a remote stream for the owning space: replication updates the
document, so the working set stays authoritative for a loaded document. If not loaded, or loaded
without a body, kick `batchLoadObjectCores` and open the index stream to learn the document id;
completeness is `pending` until the body lands. Feed-scoped ids go to the index as today.

**`Query.select(Filter.type(T))`.** `local-partial`. Local entries appear before the writing call
returns. Remote entries not in the local result are kept only if the local core is absent or has no
body (§3.1 case 2); a loaded core that no longer matches (type change, tombstone) drops the entry.
Completeness goes `local-only` → `merged` → `complete` as sources answer, and `stale` on each local
write inside the scope until the host re-runs.

**Property filter.** Same as type, plus per-entry revalidation: `filterMatchDoc(fullFilter,
localDoc)` on every remote entry whose core is loaded. The filter is the whole one the `noIndexes`
plan carries, so no divergence from the host's residual is possible. If any node in the tree is one
of the throw/false types, the branch is `revalidation: none` and nothing is dropped locally.

**Traversals.** The remote returns the derivation alongside the frontier. Each edge names the
object that **holds** it, because for three of the five edge kinds that is not the `from` side:

```ts
type PathEdge = {
  hop: number;
  from: EntityId;
  to: EntityId;
  kind: 'ref' | 'incoming-ref' | 'relation-source' | 'relation-target' | 'parent' | 'child';
  property?: string;
  holder: EntityId; // ref/parent: from. incoming-ref/child: to. relation-*: the relation object.
  holderVersion: Version;
};
type TraversalPath = PathEdge[];
```

For a result reached by several paths the remote returns each path (a DAG per result, deduped by
edge). Local revalidation walks each path: for every edge whose holder is loaded locally with a
body, re-check the edge against the holder's document (the property still references `to`, the
relation endpoint is unchanged, the parent pointer is unchanged), skipping the check when the
holder's heads equal `holderVersion.heads`. An unloaded holder leaves the edge standing. A path with
a broken edge is dead; the result survives if any path survives or if the local traversal produces
it. This is the §3.1 rule applied to the holder: a path the local document cannot reproduce is not
shown, even when the remote found it through an edge this tab has not replicated yet, because the
local traversal would not find it either and the result converges on sync.

Local also _adds_: the engine runs the traversal plan over the working set seeded with the union of
local anchors and remote anchors. Two anchor rules: a remote anchor local cannot evaluate is trusted
as an anchor; a remote anchor local has evaluated and disqualified is dead, and nothing is derived
from it. Without the second rule local augmentation re-derives results from an anchor the full
query would have filtered out.

Why paths and not per-hop frontiers: a frontier tells you which objects were at hop k, not which
hop-(k-1) object led to each, so a broken local edge cannot be attributed to a result.

Size: the index source already strips `documentJson` from retained results because keeping it cost
hundreds of KB per mail message for the subscription's lifetime; a path DAG per result on a
mailbox-scale incoming-reference query would be retained twice (host response, engine). The cap is
therefore **bytes per query answer**, set by the remote, and an answer over the cap carries
`truncated: 'paths'`. For that answer path-level revalidation is lost: a local edge change cannot
disqualify a remote traversal hit until the remote re-runs. What survives is entry-level
revalidation of each hit (tombstone, the trailing filter if the traversal has one) and local
augmentation from loaded anchors. The engine reports such an answer as `merged` with
`verified: false` on its unverifiable entries, and the §2 guarantee is qualified accordingly: it
holds for the derivations the engine was given, and a truncated answer withholds them. This is
decided, not open.

**Aggregations.** Split by kind:

- `items`, `group`, `type`, `time` keys: the remote returns the member list with group keys and
  versions (it already returns `groupKey` per record). Local recomputes groups over
  `local ∪ revalidated remote members` as `_assembleGroups` does today.
- `count`, `sum`: the remote returns the scalar plus a **manifest**: `(id, groupKey, version,
contribution)` per member. Before any delta, manifest ids are resolved through the convergence-key
  survivor mapping (`#resolveMergeSurvivorId` in `hypergraph.ts`), so a merged-away loser in the
  manifest and its survivor locally are one member, not two. Then: for each loaded local core,
  subtract its manifest contribution and add its local contribution (possibly to a different group,
  or none when deleted); for local members absent from the manifest, add. The tombstone adjustment
  `_assembleGroups` applies today (`removed` entries subtracted from `count`) is folded into this
  rule, not applied on top of it. Result is exact when every loaded core is covered; otherwise
  `merged`.
- `min`, `max`: subtraction does not work. Local can widen (a local value beyond the remote extreme
  wins) but cannot narrow (removing the remote's extreme needs the runner-up). Reported as `merged`
  until the remote re-runs. Exactness would need the remote to send the top-k, which is a later
  option.
- `timestamp` keys ("activity"): remote-only. The working set has no index timestamps; the engine
  presents the remote answer and nothing else.

A manifest is `O(members)`, the same order as `items`. Scalar-only aggregates over large groups (a
count of 50k) are the case where this is too much; there the remote sends the scalar plus a version
watermark, local applies deltas only for loaded cores whose heads differ from the watermark and
whose _previous_ state it can reconstruct from automerge history (`A.view(doc, heads)`), and
otherwise reports `merged`.

### 3.5 Does the query API change

Builder: no. Every characteristic is derived from the AST the builder already produces.

`QueryResult`:

- `completeness: Completeness` and `sources: { name, state }[]` (new), replacing the
  `isSynchronous`/`hasPendingSources` pair in `QueryContext`.
- Guarantee, stated in the JSDoc: for `local-complete` and `local-partial` branches, a write made
  through this database is visible in `results`/`runSync()` and has notified subscribers before the
  writing call returns. For other branches the local contribution obeys the same rule; the remote
  contribution does not.
- `Entry.resolution` gains `version` and `verified: boolean` (revalidated against the working set).
- `subscribe({ fire })` fires when completeness is neither `pending` nor `failed`; the current
  three-way heuristic goes away.
- `Query.characteristics(query)` is public, so a component can decide at render time whether it
  needs a skeleton.

`useQuery` is unchanged in signature. A `useQueryState` returning `{ results, completeness }` is an
additive hook.

`db.query(...).runSync()` stops being "whatever is cached" and becomes "the engine's current merged
answer", with completeness readable alongside.

### 3.6 Propagation mechanics

The earlier draft said "notify synchronously inside the change handler, recompute lazily". Both
halves were wrong against the code, so the mechanics are:

**Notify after commit, before the writer returns.** `ObjectCore.change` holds `docChangeSemaphore`
for the whole `docHandle.change` call, and `_onDocumentUpdate` runs inside it. A subscriber that
writes to any object in the same document (every inline object shares the space root) from a
notification raised there hits `failedInvariant('Recursive call to doc.change')`. So the engine is
notified from a **post-commit hook**: `DocHandleProxy.change` (or the semaphore release) runs the
engine's dirty pass after the outermost change has committed and the semaphore is released, still
inside the caller's `db.add` / proxy assignment. A write made from a notification is a separate
change, by construction. `batchEvents` does not help here: it defers proxy `EventId` emissions only,
not an `Event.emit()`, so the engine keeps its own batch: one dirty pass per outermost commit,
one `changed` per affected query.

**Recompute is synchronous for React.** `useQuery` hands `results` to `useSyncExternalStore` as
the snapshot, and React calls `getSnapshot` inside the store-change callback to decide whether to
re-render. A lazy recompute would therefore run inside the notification anyway, and the change
suppression `QueryResultImpl` does today (no emit when ids and order are unchanged) needs the
recompute to exist. So: the dirty pass recomputes the affected queries, compares ids/order, and
emits only on a difference. Lazy evaluation buys nothing.

**The dirty pass must be cheap, so two things are phase-1 prerequisites, not optimizations:**

1. **A typename map in the working set**, `canonicalTypename → Set<ObjectCore>` (the same
   canonicalization as `invalidation-hint.ts`, so hints and the map agree). There is no type index in
   `EntityManager` today (`_objects` is flat); the type lives in the document, is absent until
   `isBodyAvailable`, and changes on rebind. The map is maintained from `_onDocumentUpdate`'s
   `updatedObjectIds` (old-type/new-type diff per core) and from `_markBodiesAvailable`, not "on
   bind".
2. **A per-query affect check**, generalizing `SpaceQuerySource._onUpdate`: for a changed core,
   "was it in my last result, or does it match my filter now". For branches `extractScopes` calls
   non-simple (traversal, union, set-difference, child-of, in-query, inverted type, text selectors)
   the host re-runs on every hint; the client cannot afford that, because it would turn one local
   write into N `allCores()` scans inside the writer's frame. For those branches the affect check
   is: the changed core is in the last result, is a path holder in a retained path, or matches the
   branch's anchor filter. Only then does the branch recompute.

With both, a type query recomputes in `O(result)` and by-id in `O(ids)`; wildcard stays
`O(working set)` and is the one shape that should be flagged in `Query.characteristics` as
expensive to subscribe to.

Remote answers arrive async as today, are merged on arrival, and emit `changed` once.

### 3.7 Protocol, host, and EDGE

The wire `QueryResult` (`protocols/src/QueryService.ts`, mirrored in `query.proto`) gains:

- `version`: `{ documentId, heads }` for document-backed hits; `{ insertionId, sequence, actorId }`
  for feed hits.
- `paths: PathEdge[][]` when the query has traversal clauses, and a per-answer `truncated` flag.
- `manifest` when the query has a scalar aggregate.

Where these come from is the hard part, and §3.8 covers it.

### 3.8 Reconciling with `SQL_QUERY_EXECUTION.md`

That doc's goals 1 and 3 say the host answers a query without loading an Automerge document, the
working set never crosses into JS, and the `QueryService` wire schema stays as it is. This proposal
needs versions, paths, and manifests on every hit, and today:

- EDGE loads hits via `indexer.querySnapshotsJSON` (JSON snapshots, never a document) and throws
  `unsupported('Aggregation')`; there is no handle to take heads from.
- The host's bare-aggregate path (`_optimizeBareAggregate`) builds items with `QueryItem.fromIndexRow`,
  index rows only. `EntityMeta` rows carry no heads; the only heads in `index-core` are the
  indexing cursor.
- Once the SQL compiler lands, no path on the host loads a document either.

So the sources of the new fields have to be the index, not a document handle:

1. **Heads become an indexed column**, written by the indexer per document row at index time (it
   already reads the heads to advance its cursor). `documentId` is already on the row.
2. **Paths are produced by the SQL compiler**, as a recursive CTE emitting `(holder, kind, from, to,
holderHeads)` rows alongside the frontier, with the byte cap applied in the projection.
3. **Manifests are the group-by projection** with `(id, groupKey, heads, contribution)` instead of
   the collapsed scalar, behind the same cap.
4. **Goal 3 is amended**: the wire schema gains optional fields; old clients ignore them, old hosts
   omit them, and the engine treats a missing version as "cannot revalidate" (`verified: false`).

Until that is agreed, phase 1's "heads on index hits" is implementable only on the host's
non-bare, document-loading path. That path is enough for phase 1's target (flat type and property
queries on the owning space), and the column is the first deliverable of phase 2.

### 3.9 The index ↔ engine API

Today the boundary is one streamed RPC, `execQuery` on `QueryService`
(`protocols/src/QueryService.ts`: `QueryRequest { queryId, reactivity, query }` → a stream of
`QueryResponse { queryId, results, objects }`), plus `awaitQueryUpdates` behind `db.flush({ indexes:
true })`, plus the out-of-band `ObjectLoader` the client uses to turn a hit into a live object. The
host and EDGE serve the same RPC. The proposal keeps the one-RPC shape and changes what crosses it,
in both directions.

**Engine → index.** The request says what the engine can use and what it already has:

```ts
type QueryRequest = {
  queryId: string;
  reactivity: 'one-shot' | 'reactive';
  query: QueryAST.Query;
  /** Absent on an old client; an old host ignores it. Each field is opt-in. */
  wants?: {
    versions: true;
    paths?: { budgetBytes: number };
    manifest?: { budgetBytes: number };
  };
  /** Documents the engine holds loaded with a body; the index omits bodies for hits in them. */
  loaded?: readonly DocumentId[];
};
```

`loaded` is the engine telling the index what the working set already covers. A hit in a loaded
document needs only its id and version to be merged (§3.1 case 1 evaluates it locally); only hits
the engine cannot evaluate (case 2) need a body, and for a document-backed hit that body is the
automerge document, fetched through the existing document load, not through this RPC.
`documentJson` on the wire stays for feed items, which have no document to load.

**Index → engine.** Each answer is self-describing about its own freshness and completeness:

```ts
type QueryAnswer = {
  queryId: string;
  /** Index progress this answer was computed at, per in-scope space. */
  watermark: Record<SpaceId, IndexSeq>;
  /** False while a one-shot is still paging; a reactive answer is always complete for its watermark. */
  complete: boolean;
  truncated?: 'paths' | 'manifest';
  entries: RemoteEntry[];
  /** Scalar aggregates only: one record per group. */
  groups?: { key: GroupKey; aggregates: Record<string, AggregateValue>; manifest?: ManifestEntry[] }[];
};

type RemoteEntry = {
  id: EntityId;
  spaceId: SpaceId;
  rank: number;
  version: Version; // { kind: 'automerge', documentId, heads } | { kind: 'feed', insertionId, sequence, actorId }
  paths?: PathEdge[][];
  groupKey?: GroupKey;
  body?: { documentJson: string }; // feed items; never for a document the request listed as loaded
};
```

`IndexSeq` is a per-space monotonic counter the indexer advances each time it commits a cursor
move (`IndexEngine` already tracks a cursor per `(spaceId, resourceId)`; the counter is the commit
number of that tracker transaction). It is the one new piece of state the index exposes.

**Index → engine, progress.** A second stream, subscribed once per client rather than per query:

```ts
type IndexProgress = { spaceId: SpaceId; seq: IndexSeq; documents: { documentId: DocumentId; heads: Heads }[] };
```

This is what makes `stale` precise (§3.3). On a local commit inside a live query's scope the engine
records `(documentId, heads)` against that query and marks it `stale`. A progress event tells it at
which `seq` the indexer absorbed those heads; the first answer whose `watermark[spaceId]` is at or
past that `seq` clears the flag. `awaitQueryUpdates` becomes a client-side wait on the same two
streams (progress past the flushed heads, then an answer past that seq) and stops being an RPC.

**What does not cross this boundary.** Invalidation stays host-side: the host keeps re-running
reactive queries from its own hints and debounce, and pushes answers. The engine never asks the
index to re-run; it reports `stale` and waits. Hydration of document-backed hits stays on the
document-load path. Revalidation is entirely client-side; the index never learns the engine's
verdicts.

**Inside the host.** `QueryExecutor` ↔ `IndexEngine` is unchanged in shape. The executor gains
three reads: the heads column per hit (§3.8), the `(holder, kind, from, to)` rows from the
traversal step, and the manifest rows from the aggregate step; the `QueryServiceImpl` stamps the
watermark from the tracker's current seq when it sends. EDGE's executor serves the identical
`QueryAnswer` over its transport, with its indexer Durable Object's commit counter as the seq.

**Compatibility.** Every new request field is optional and every new answer field is additive.
An engine talking to an old host sees no `version` and treats every entry as `verified: false`
(§3.8, point 4); an old client talking to a new host sends no `wants` and gets today's answer.

## 4. Phases

0. **Characteristics and harness.** `Query.characteristics` as a pure function with a table test
   over the AST corpus; a timing test that pins the current gap as "after the in-flight emission
   completes" so the phase-1 change is observable. No behaviour change.
1. **Engine owns the merge, flat queries on the owning space.** `LocalQueryEngine` replaces
   `GraphQueryContext` internally; `QuerySource` becomes `RemoteQuerySource`; post-commit notify;
   typename map and affect check; heads plus `documentId` on document-loading index hits; entry
   revalidation for `local-partial` with `predicates: local`; `completeness` with `failed` and
   `stale`; set-difference as drop-only. Windowed queries stay remote-only but gain local drop and
   overflow. This phase removes the "stale entry after local edit" class of bugs for flat queries.
2. **Index-sourced versions, then traversals.** Heads column in the index and on EDGE; paths with
   holders from the host and EDGE executors (CTE once the compiler lands, `_execTraverseStep`
   retaining `(holder, kind, from, to)` before); path revalidation and local augmentation with both
   anchor rules; byte cap and `truncated`.
3. **Aggregates and ordering.** Manifests for `count`/`sum` with survivor resolution; widen-only for
   `min`/`max`; local-property ordering over the merged set; EDGE aggregation.
4. **Feeds.** The feed-live-objects stage 2 seam plugs in as another versioned remote with the
   local tail as part of the working set; `scope.feeds` moves from remote-only to local-partial
   under the stage 3 comparator.

## 5. Open questions

1. By-id queries with all ids loaded: skip the remote stream entirely, or keep it open at low
   priority as a safety net for directory changes the tab missed?
2. Heads equality for inline objects: heads are per document, so an unrelated inline object's write
   makes every object in that document miss the equality skip and re-check. The affect check (§3.6)
   bounds the recompute to queries that hold or match the changed core, but path holders in the
   space root are the case to measure.
3. Should `completeness` be on the entry stream (per source) or only on the result? Per result is
   enough for UI; `sources` carries the per-source state for diagnostics.
4. Set-difference: is drop-only acceptable past phase 1, or does the remote return `exclude`
   membership? Depends on how `Query.without` is used in plugins.
5. The post-commit hook: on `DocHandleProxy.change`, on semaphore release, or on
   `EntityManager` after `_onDocumentUpdate` returns? The first two cover changes that bypass the
   entity manager; the third is simplest.

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
- **Notify inside the change handler, recompute lazily.** Recursion invariant and React's
  synchronous `getSnapshot` (§3.6).
- **Trust the remote on concurrent heads.** Re-creates the stale-entry bug in the multi-user case
  (§3.1).

## 7. What the adversarial review changed

Kept here so the next reader does not re-derive them:

- Versions carry `documentId`. The review first replaced a per-hash lookup (`getChangeByHash` is a
  wasm-backend method, not a top-level export) with `A.getMissingDeps`; a later pass (dmaretskyi)
  dropped the ancestry test altogether: heads compare for equality only, as a skip.
- A loaded local document is always evaluated locally; the version only matters when local cannot
  evaluate (absent core, path holder, manifest member).
- Path edges name their holder; relation and incoming-reference edges live on a third object or on
  the target.
- `child-of` is a traversal, not a `filterMatchDoc` predicate; `text-search` and the throwing
  filter types anywhere in a tree disable entry revalidation for that branch.
- Characteristics are per branch; the single meet contradicted the per-branch local guarantee.
- Notify after commit, not inside the change handler; recompute eagerly with change suppression.
- Typename map and affect check moved from "optimization" to phase-1 prerequisite.
- Completeness gained `failed` and `stale`.
- Manifests resolve survivors and absorb the existing tombstone adjustment.
- Feed comparator defers to feed-live-objects stage 3.
- The SQL execution doc's goals 1 and 3 conflict with this proposal and are reconciled in §3.8;
  EDGE has no document handle to source heads from.
- Path cap is bytes per answer with a `truncated` flag, decided rather than open.
- §1.2 corrected: only bulk host deliveries are throttled; the local gap is "after the in-flight
  emission", at least two microtask hops.
- The registry moved from the remote side of the diagram to the synchronous side (dmaretskyi):
  `RegistryQuerySource` answers simple selections in memory, including upstream-hydrated entries,
  and emits synchronously on write. Registry `remote` is unserved today.

## 8. Phase 1 as implemented

What landed, mapped to the design, and where it deliberately differs. The update-counting suite in
`echo-client-e2e/src/sync-query.test.ts` pins every behaviour below.

**Commit scope** (`@dxos/echo/internal`, `commit-scope.ts`). A depth counter and a deduplicating
post-commit queue. `executeChange` (so one `Obj.update` is one commit), `docChangeSemaphore`,
`DocHandleProxy.change`/`changeAt`/`update`, `EntityManager.addCore` and `retainObjects` each open a
commit. The queue drains when the outermost commit ends, after every semaphore is released and every
change event delivered, and before the writing call returns. A write made from a callback ends its own
commit inside the drain and runs in the next round. A throwing callback does not stop the others and is
rethrown in a microtask, so it surfaces as unhandled instead of making the write throw.

**Post-commit flush** (`EntityManager`). A change event with `source: 'change'` requests
`#flushLocalCommit`, which emits `_localCommitEvent` and then the existing `_updateEvent` synchronously.
Host deliveries (`host`, `bulk`) keep the `UpdateScheduler` path. No new recompute machinery was needed:
`SpaceQuerySource` already listens to `_updateEvent` and `QueryResultImpl` already recomputes and diffs
on `changed`, so making the event synchronous made the whole chain synchronous.

**The engine is `GraphQueryContext`, evolved rather than renamed.** `QuerySource` gained `kind`,
`isServing`, `answers` and `isFailed`; no `RemoteQuerySource` split. `getResults` and `run` both merge
through one `#merge`: in-process entries first, then remote entries `keepRemoteEntry` does not overrule,
using the plan from `merge-plan.ts`. When the plan sets `natural`, the merged entries are then sorted by
id, the natural order the planner gives the query and both sources answer in. `natural` covers one
space-scoped type or wildcard selection with no order, limit, skip, traversal, aggregate, feed scope or
registry scope; every other query keeps the merge order. Without that sort an
object's position would depend on which source held it, so a write that loaded an index-backed object
moved it ahead of the objects it had not touched.

**Revalidation** applies to single-branch flat queries (`select`, `filter`, `options`, `from` scope,
`order`, `limit`, `skip`) whose characteristics say `entry`. A remote entry whose object is loaded with a
body is re-evaluated with `filterMatchDoc` against the flat filter and the deleted option; anything else
stands. No heads are compared yet (§3.1 makes equality a skip, not a rule), so this needs no protocol
change. `verified` on entries is not implemented.

**Windows.** A property-ordered window with a limit and no skip admits loaded local matches that sort at
or before the last entry of a full remote window, re-sorts stably with the host's comparator
(`compareOrderValues`, now exported from the working-set executor) and cuts to the limit. A short
remote window admits every local match. Before the remote answers, the window is empty. Other windows
are drop-only. Because the working set does not serve windows, the engine re-merges on
`_localCommitEvent` itself.

**Completeness** is computed live from the sources and the plan. Reading it never notifies; subscribers
are still notified only when ids or order change, so a `stale` transition alone is silent. `merged`
means some remote sources answered and some have not; it is not used for unverifiable entries.
`subscribe({ fire })` keeps its existing heuristic rather than keying on completeness, because a
`local-only` empty result would otherwise fire and a default-creating subscriber would act on it.

**Staleness and the `unchanged` heartbeat.** A local write marks a query stale when local evidence
cannot decide its membership (no entry revalidation, or a window), the write's canonical typename
passes the query's typename constraint (never narrower than the host's own invalidation), and a remote
serves it. It clears when the remote's answer count passes the count at the write. To make that count
move when a re-run changes nothing, the host now sends `QueryResponse.unchanged` for a reactive re-run
whose result matches the last one sent. Known gap: a re-run already in flight when the write lands, or
one driven by the primary index before full text catches up, clears `stale` early. The per-space
watermark of §3.9 is the fix.

**Per-write cost.** A notification per write means the recompute must cost the write, not a scan. For a
single flat type or wildcard selection, `SpaceQuerySource` applies each written object to its cached
results as a delta: removed when it no longer matches, inserted where a full recompute would place it.
That position is the object's id order, since the planner orders a query without an order step
naturally (by id). Other shapes still recompute through the executor. `_collapseDuplicates` skips
working-set entries, which the executor already filtered for tombstones. Measured on the sandbox (4
cores), a synchronous loop of 1000 `db.add` calls with a subscribed type query:

| Build   | Loop  | Settled | Notifications |
| ------- | ----- | ------- | ------------- |
| Before  | 6.2 s | 11.8 s  | 0             |
| Phase 1 | 7.4 s | 13.3 s  | 1000          |

The remaining overhead is `QueryResultImpl` presenting O(results) per notification. "Before" delivered no
notifications because of the gap below, so it is a floor rather than a like-for-like baseline.

**A gap this closed.** `SpaceQuerySource._onUpdate` returned early while its results were uncomputed, so
a subscriber that had not read yet missed every write until some later event computed the results. It now
signals a relevant write either way.

**Not done in phase 1** (§9 covers all but the typename map and the progress stream): the typename map in the working set (window admission and non-delta shapes
still scan all cores), heads on the wire, paths, manifests, `RemoteQuerySource`, the progress stream,
and skipping the remote stream for a by-id query whose ids are all loaded. A by-id query reports
`complete` once its ids are loaded, but the index stream still opens.

**Initial notification.** The first recompute after subscribe still notifies even when the result
equals what an earlier read returned; this predates the change and the suite counts from a baseline
taken after it.

## 9. Phases 2 to 4 as implemented

### 9.1 The engine

```
Query API ──► QueryResultImpl ──► LocalQueryEngine ──┬─► WorkingSetView (per db: cores + feed tail, sync)
                                   (merge, verdicts)  ├─► RegistryView (sync)
                                                      └─► RemoteQuerySource ─┬─► index (host QueryService)
                                                                             └─► EDGE
```

`LocalQueryEngine` (`local-query-engine.ts`) replaces `GraphQueryContext`. It owns one
`WorkingSetView` per database and the `RegistryView`; neither is a query source any more. Only
`RemoteQuerySource`s (the index and EDGE, both through `QueryService`) are remote, and the engine judges
each of their entries `drop`, `verified` or `trusted` (`judgeRemoteEntry` in `merge-plan.ts`).
`resolution.verified` is true for a `verified` entry.

**By id.** When every id of a by-id query is held, the remote stream is closed. When it is open, `run()`
answers local ids first, then takes the remote answer, then loads only the ids no remote answered. The
working set no longer loads documents itself.

### 9.2 Versions

Every row carries `version`: `{automerge, documentId, heads}` for a document object, `{feed,
insertionId}` for a feed item. A new `objectSnapshot.version` column (migration 0004) holds the heads
each copy was read at; `heads` still marks a copy at the document's saved heads that can back the row, and a
row indexed before the column reads its version from `heads`. A remote entry whose object is loaded at
exactly its version is verified without re-evaluation.

The host answers from index copies before it loads documents. The memory executor uses a copy whenever
its heads equal the document's current heads (the in-memory heads if loaded, else the stored heads), and
counts `echo.querySnapshotHits` and `echo.queryDocumentLoads`. The SQL executor never loads documents.

### 9.3 Paths (phase 2)

A traversal hit carries `paths`, one per derivation: an ordered list of `PathEdge {from, to, kind,
property?, holder, holderHeads?}`. The holder is the object whose document records the edge. Both
executors produce them. The memory executor extends the paths of each anchor at each hop. The SQL
compiler keeps an edge relation per hop of the query's own chain and walks back from each final row
through a recursive CTE.

The client revalidates a hit against every path (`path-revalidation.ts`). It checks each level's filter
on each loaded object and checks each edge against its loaded holder. An edge whose holder is held at
`holderHeads` stands without a read. The hit survives when any path holds.

Limits: 16 paths per item and 512 edges per compiled row; an item past either limit ships no paths and is
trusted. One answer carries at most 256 KiB of paths. Past that the response sets `truncated: 'paths'`,
and completeness reads `merged`.

### 9.4 Manifests and local ordering (phase 3)

A collapsed group (scalar aggregates, no `items`) carries a `manifest`: each member's id, version and
share of `count`, `sum`, `min` and `max`. The client (`manifest-merge.ts`) subtracts the share of each
member it holds and adds its local members, which the working set lists by evaluating the query with an
appended `items` aggregate. `min` and `max` can only widen: removing a held extreme marks the group
unverified. The same 256 KiB budget applies (`truncated: 'manifest'`). A count-only group ships a manifest
without reading member values.

A property or natural order without `limit` or `skip` is applied by the engine over the merged entries,
so `characteristics` no longer classes it as a window.

### 9.5 Feeds (phase 4)

A feed write made through the handle (`FeedHandle.localWrites`) joins the working set as the feed tail
of a simple selection over that feed or over all feeds. It appears before the write returns and stays
past the feed service's acknowledgement, so it does not vanish before the index catches up. The handle's
`localWrite` event names the objects each write appended, edited or deleted, and the tail re-checks only
those. A feed opened after the query starts joins through `_feedHandleCreated`. A remote feed
entry is dropped when a local write of the same id no longer matches. `characteristics` classes a simple
feed selection as `local-partial`; a feed window stays remote-only.

### 9.6 Startup milestones

`markMilestone` (`@dxos/util`) writes `performance.mark('dxos:<name>')` with DevTools' `marker` data type,
which draws a vertical line on the Performance timeline. Marks: `worker.spawned`, `worker.started`,
`worker.services-ready`, `worker.session-ready`, `worker.connected`, `client.initializing`, `client.ready`,
`identity.ready`, `network.started`, `network.connected`, `spaces.opening`, `spaces.loaded`, `spaces.ready`,
`replication.connected` (per space), `indexing.started` and `indexing.caught-up`.

### 9.7 Not done

- EDGE's executor does not yet send versions, paths or manifests. EDGE rows stay `trusted`.
- The typename map in the working set and the progress stream of §3.9.
- Paths for traversals inside a union branch or a subquery: such rows ship without paths.

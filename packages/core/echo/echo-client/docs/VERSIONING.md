# Versioning: time travel & branching

ECHO-core support for viewing an object at a historical point (**time travel**) and for maintaining
writable alternate timelines of an object subtree (**branching**). These are the low-level
primitives; the product-facing `Version`/`Branch`/`History` model lives in `@dxos/versioning`, and
the git-graph UI in `@dxos/plugin-space` / `@dxos/plugin-markdown`.

- **Time travel** — pin a live object's reads to a set of automerge `heads`; writes are refused, the
  full edit history is untouched, and reactivity flows so the UI reflects the historical view.
- **Branching** — fork an object (and its referenced subtree) into a separate synced document that
  shares change ancestry with the original, so it merges back as a true CRDT 3-way merge. Selection
  of which branch a surface views is device-local; the branch documents themselves replicate.

## Overview

How the pieces fit, end to end:

1. **Objects are automerge subtrees.** An object lives at a mount path inside an automerge document;
   its state at any point is addressed by `heads` (the change-DAG frontier). `A.view(doc, heads)`
   reconstructs a past state; `A.save`/`A.load` copies a document while preserving its change
   ancestry. Everything below is built from these two.

2. **Time travel = a read pin on `ObjectCore`.** `setTimeTravel(heads)` memoizes an `A.view` and
   redirects `data`/`meta` reads to it; `system` reads, indexing, and edit history stay live, and
   writes throw. Nothing is copied or rewound — the pin is a lens over the live document.

3. **Two reactive channels keep scrubbing safe.** A pin fires the **display** channel (`EventId`, via
   `ObjectCore.displayUpdates`) so editors/labels re-render on the historical value, but not the
   **latest** channel (`LatestEventId`, via `ObjectCore.updates`). Side-effecting subscribers opt into
   `{ latestOnly: true }` and read through an ambient `withLatestRead` context, so they never act on
   scrubbed data. A real change fires both channels.

4. **A branch = a forked document that shares ancestry.** `createBranch` walks the object's
   referenced subtree and, per member, `A.save`s the member's document (`forkDump`) and re-imports it
   as a new synced document. Because ancestry is preserved, `A.merge` back into main is a genuine
   CRDT 3-way merge (same object ids, no new objects), not a two-roots conflict.

5. **The space-root `branches` registry ties it together.** `branchName → { objectId → branchDocUrl }`
   on the root document is the single synced source of truth for both branch membership and the set
   of documents to replicate. Branch docs deliberately sit outside `links` (so they never load as
   phantom objects); every path that enumerates space documents (replication, export, import remap)
   also walks the registry.

6. **Selection is device-local; edits are per-surface.** `switchBranch` rebinds a subtree's live
   cores to a branch's documents for this device only (persisted via the injected `BranchStore`,
   never synced). Independently, `db.branch(obj, name)` hands a caller a disposable **binding** whose
   reads/writes target one branch document only — so an agent can edit a draft while the user stays
   on main, with multiple bindings coexisting.

The rest of this document details each layer.

## Background: the storage model

Each ECHO object is a subtree inside an automerge document. The **space root** document
(`DatabaseDirectory`) holds inline objects under `objects` and a `links` map (`objectId → doc url`)
for objects that live in their own documents. Automerge tracks history as a Merkle-DAG of changes;
`heads` is the frontier (the set of latest change hashes — an array, because concurrent edits leave
multiple leaves).

Two facts drive the design:

- `A.view(doc, heads)` reconstructs any historical state, and `A.save`/`A.load` round-trips a
  document **preserving its change ancestry** — the basis for both features.
- A branch cannot hide inside one document: to diverge and later merge cleanly it needs its own
  document that shares ancestry with the original. Hence branch docs are separate, registered
  outside `links`.

## Time travel

### ObjectCore

`ObjectCore` holds the pin state:

- `setTimeTravel(heads)` — records `#timeTravelHeads` and memoizes an `A.view` at those heads
  (rebuilt if the latest doc advances mid-scrub, e.g. a remote change). Unreachable heads (not yet
  synced) are ignored with a warning, leaving the object live.
- `clearTimeTravel()` / `isTimeTraveling()` / `getTimeTravelHeads()`.
- `#getReadDoc(path)` — while pinned, `data` and `meta` reads resolve the historical view; `system`
  reads, indexing, writes, and edit history always use the latest doc. An ambient
  `isReadingLatest()` context (below) lets a `latestOnly` recompute bypass the pin.
- `change`/`changeAt` throw `Cannot mutate a time-traveling object` while pinned.

### Dual notification channels

Reactivity is split so side-effecting subscribers never observe scrubbed (historical) data:

- `ObjectCore.updates` — fires on **real** data changes only (local writes, remote sync).
- `ObjectCore.displayUpdates` — fires on real changes **and** on time-travel transitions
  (set/clear/scrub).
- On the proxy layer, each target carries two events: `EventId` (default/display channel) and
  `LatestEventId` (latest channel). `echo-handler` installs two subscriptions per object —
  `displayUpdates → EventId`, `updates → LatestEventId` — and the change-context batching flushes
  both keys when a change context exits.
- `subscribe(obj, cb, { latestOnly: true })` (threaded through `Obj.subscribe`/`Entity.subscribe`)
  binds to `LatestEventId`; parallel `latestOnly` atom families in `@dxos/echo` read through
  `withLatestRead(...)` so their value is the latest committed state even while the object is
  pinned. `Entity.timeTravelAtom` reflects the pin state (backed by the virtual `TimeTravelingId`
  accessor); `Entity.isTimeTraveling` is the synchronous guard.

### Driver API (`@dxos/echo-client`)

- `setTimeTravel(obj, heads)` / `clearTimeTravel(obj)`.
- `getEditHistory(obj)` — automerge history states.
- `getEditHistoryWithDiffs(obj)` — per-version add/remove magnitudes for a timeline. Each version's
  `heads` is the **cumulative frontier** up to that change (not the bare change hash), so it
  round-trips through `A.view`/`checkoutVersion` even across concurrent/merged history.
- `checkoutVersion(obj, heads)` — raw historical data (read-only), unchanged.

References are independent cores, so time-travel is applied per object (primary + each child) to
scrub a subtree.

## Branching

### The registry (protocol)

`DatabaseDirectory.branches` (`SpaceBranchRegistry`) is a synced map on the space root:

```ts
branches[rootObjectId][branchName] = {
  members: { [objectId]: docUrl },  // one branch doc per subtree member
  baseHeads?: string[],             // root's heads at fork time (provenance)
  createdAt?: number,
}
```

It is the single source of truth for **both** branch membership and the set of documents the space
must replicate. `DatabaseDirectory.getBranches` / `getAllBranchDocUrls` read it. The `'main'` branch
is implicit (the object's own doc via `links`) and never listed.

Branch docs live **outside** `links` deliberately: the client document loader and patch differ
process only `links`, so branch documents never materialize as phantom objects. But because they're
outside `links`, every doc-lifecycle path that enumerates a space's documents must also walk the
registry:

- `echo-host` `DatabaseRoot.getAllLinkedDocuments()` unions `links` + `getAllBranchDocUrls`, so
  branch docs join the space document list (replication) and export.
- `DatabaseRoot.mapLinks` (space import/copy) remaps the registry's member urls too, or an imported
  space's branches would point at the source space's documents.

### EntityManager operations

- `createBranch(rootId, name, { fromHeads? })` — BFS the referenced subtree; for each member,
  `forkDump` the member's document and `RepoProxy.import` it as a new synced doc; record the urls in
  the registry. `fromHeads` forks from a historical frontier (a bare `Heads` applies to the root;
  a `{ objectId → Heads }` map forks each member from its own scrubbed position). Inline objects
  cannot be branched yet (clear error).
- `switchBranch(rootId, name)` — device-local. Rebinds every subtree member's `ObjectCore` to the
  branch (or main) document, moving the `change` listener to the newly-bound doc and clearing any
  active time-travel pin. Membership is unioned across branches so the cascade covers every member.
- `mergeBranch(rootId, name, { deleteAfter? })` — `A.merge` each member's branch doc into its main
  doc (well-defined because they share fork ancestry), then switch back to main.
- `deleteBranch(rootId, name)` — remove the registry entry; members viewing the deleted branch fall
  back to main (rebinding the member set captured **before** removal).
- `bindCoreToBranch(objectId, name)` — see BranchBinding below.

All transitions (switch / merge / delete-fallback) run through a serialized `#branchOpChain` so
concurrent operations cannot interleave per-member rebinds and leave a subtree on mixed branches.

### forkDump

`forkDump(sourceDoc, atHeads?)`:

- No `atHeads` → `A.save(sourceDoc)` (full history).
- With `atHeads` → reconstruct the **ancestor closure** of the requested frontier (walk each head's
  `deps` via `A.decodeChange`, apply that subset in the source's topological order, then `A.save`).
  A linear replay of `getAllChanges` can interleave concurrent siblings and never reproduce an exact
  single-head frontier, so the closure is required. Heads not present in the source throw rather than
  silently forking at the tip with wrong provenance.

`A.save`/`A.load` preserves ancestry, so a forked branch shares history with main and `A.merge` is a
true CRDT 3-way merge (same object ids, no new objects) — not an unrelated "two roots" conflict.

### BranchStore (device-local selection)

Which branch a device currently views an object on must survive a reload but never replicate.
`BranchStore` is an injected port (`load()`/`save(entries)`), threaded
`EchoClient.constructDatabase → DatabaseImpl → EntityManager`:

- On open, hydrate selections and re-bind each branched subtree to its selection (objects otherwise
  load on main); invalid/deleted selections are skipped (never installed) so `getCurrentBranch`
  never reports a branch the core is not actually bound to.
- On switch, persist. Saves are chained so out-of-order writes cannot persist a stale map.
- In-memory when no store is injected. The browser client backs it with the worker metadata store;
  the deployed app injects a `localStorage`-backed store in `space-proxy`; tests use a per-peer store
  that survives `reload()`.

### BranchBinding (writable, per-surface)

`db.branch(obj, name): BranchBinding` returns a caller-owned, ephemeral, writable binding to one
branch of one object:

- Reads resolve the branch document; writes land on the branch document **only**.
- Multiple bindings to different branches of the same object may coexist in a process; the
  device-global selection (`switchBranch`) and other bindings are unaffected.
- `'main'` returns the canonical live object; the object must be bound to this database (guarded).
- `dispose()` releases the binding's doc-handle listener; it never deletes the branch document
  (that stays in the registry, replicating). Bindings are never persisted — `BranchStore` records
  only the device default, which bindings override locally.

This is what lets an agent (or a second plank) edit a draft branch while the user stays on main —
the use case a read-only, device-global `getObjectOnBranch` could not express.

### Public API surface

The branching methods and `BranchBinding` type live on the core `Database.Database` interface, so
`Obj.getDatabase(obj)` suffices for callers. `@dxos/echo-client` also exposes object-first helpers:
`createBranch(obj, …)`, `switchBranch`, `mergeBranch`, `deleteBranch`, `getBranches`,
`getCurrentBranch`, and `getObjectOnBranch(obj, name)` (a one-shot read of an object's current
decoded data on a branch, via a transient binding).

### Nested branches (planned)

Today a branch can only fork from **main**: `createBranch` forks each member from its current core
document, and `mergeBranch` always merges into the main document. A branch-of-a-branch (a sub-branch
forked off another branch's tip or one of its revisions) is therefore unsupported — the fork would
derive from main (wrong content) or throw "fork frontier not reachable" (the sub-branch's changes are
not in main). The plugin layer guards against it (the "New branch" affordance is disabled on a branch
or a branch revision) rather than silently forking from main.

The planned model is a **parent pointer**, keeping the registry flat (still keyed by
`(rootObjectId, branchName)`) and forming a branch _tree_ via one added field:

```ts
branches[rootObjectId][branchName] = {
  members, baseHeads?, createdAt?,
  parent?: string,   // parent branch name; absent ⇒ main. baseHeads become the parent's fork heads.
}
```

Only the two hardwired-to-main operations change; the fork source and merge target resolve through
`parent`:

- `createBranch(rootId, name, { fromHeads?, parent? })` — when `parent` is set, `forkDump` each
  member from the **parent branch's** document (`registry[parent].members[objectId]`) at the fork
  frontier, not from the member's current core doc.
- `mergeBranch(rootId, name)` — merge into the **parent branch's** documents when `record.parent` is
  set, else main; afterwards switch the device back to the parent branch. Merging or deleting a
  branch that still has live children is blocked in v1 ("merge children first"); re-parenting
  children to the grandparent is a deferred refinement.
- `deleteBranch` — orphaned members fall back to `record.parent ?? 'main'`.

Everything else is already nesting-agnostic and unchanged: `switchBranch`, `bindCoreToBranch`,
`listBranches`, and `_findBranchRootFor` resolve a branch by name (a nested branch is just another
named branch under the same root); replication (`getAllBranchDocUrls`), import remap
(`DatabaseRoot.mapLinks`), and `BranchStore` iterate all records regardless of parentage. Merge
correctness is free: a child shares the parent's automerge ancestry, which shares main's, and
`A.merge` is order-independent over shared history, so child→parent→main converges under any
interleaving. The field is additive and optional — existing branches read as parented to main, so no
migration is needed.

Full design, plugin/timeline plumbing, and estimate:
[`agents/superpowers/specs/2026-07-17-nested-branches-design.md`](../../../../../agents/superpowers/specs/2026-07-17-nested-branches-design.md).

## Design notes & constraints

- **Selection is per-surface/session, not device-global.** The canonical object is never globally
  switched out from under other surfaces; each plank/agent binds independently. `switchBranch`
  remains the lower-level device-global capability that `BranchStore` persists.
- **Registry vs. records.** The space-root registry owns the replication-critical facts (doc urls,
  membership); product metadata (label, status, creator, anchor) lives in `@dxos/versioning`
  `Branch`/`Version` records keyed by the registry branch name.
- **Storage cost.** Each member's branch doc is a full `A.save` copy (history included — deliberate,
  to preserve ancestry for CRDT merge). Cost is O(subtree size × branch count); dedup/compaction is
  future work.
- **Writes never go through a pinned object** (they throw by design). Callers viewing a checkpoint
  clear the pin first, then apply historical content as a forward edit on the live tip.
- **Text > 300k chars** degrades to `RawString` (no CRDT); branching/time-travel follow the same
  limit.

## Tests

`packages/core/echo/echo-client/src/echo-handler/`: `time-travel.test.ts`, `edit-history.test.ts`,
`branching.test.ts` (incl. two-peer replication, reload persistence, concurrent-frontier fork, and
guard cases), `branch-binding.test.ts`.

## Status

Current risk and known limitations in the echo core layers (`echo`, `echo-host`, `echo-client`,
`echo-protocol`). Product/UI-layer risk lives with the consuming plugins.

- **Reactivity blast radius (highest).** The dual-channel split (`updates`/`displayUpdates`,
  `latestOnly` + the ambient `withLatestRead`) sits on the subscription path that _every_ ECHO object
  uses. A wiring error would surface as subtle staleness in unrelated subscribers, not a loud
  failure. Broadly exercised by tests, but the affected surface is the whole DB layer.
- **Branch-doc lifecycle completeness.** Branch docs live outside `links`, so every path that
  enumerates a space's documents must also walk the registry. Done: host `getAllLinkedDocuments`
  (replication/export) and `DatabaseRoot.mapLinks` (import remap). Deferred:
  `EntityManager.getDocumentHeads`/`reIndexHeads` still enumerate only `links`, so `flush()` may
  return before a freshly created branch doc has replicated (no data loss — the host still replicates
  it), and `reIndexHeads` intentionally omits branch docs (indexing them would surface phantom,
  duplicate-id objects — the reason branch docs sit outside `links`).
- **Merged-branch head reachability.** After `mergeBranch`, a checkpoint taken on the merged branch
  is read back against the root document, relying on `A.merge` keeping the branch's historical heads
  reachable in main. This holds for shared-ancestry CRDT merges but is an implicit dependency on
  automerge semantics.
- **Storage cost.** Each member's branch doc is a full `A.save` copy (history included, deliberately,
  to preserve ancestry for merge). O(subtree size × branch count); no dedup/compaction yet.
- **Nested branch-of-branch unsupported.** The registry is flat (keyed by the root object) and
  fork/merge resolve to main only — see [Nested branches (planned)](#nested-branches-planned).
- **Inline objects cannot be branched** (promotion not implemented) — a clear runtime error, not
  silent misbehaviour.
- **Unreachable time-travel heads** (a frontier not yet synced) are ignored with a warning, leaving
  the object live rather than throwing.

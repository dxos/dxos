# Worker-only ECHO: spike and API proposal

Status: spike, not for merge. Branch `claude/compassionate-davinci-z0634h`, based on `fd873d2f`.

Tabs keep a JSON mirror of each document plus their own unconfirmed edits. Only the worker runs
Automerge. This document evaluates that design, describes the spike that tests it, and proposes the
API it implies.

## Short answer

1. **It works.** The spike runs ECHO in a tab without an Automerge document. 582 of the 615 existing
   echo-client tests pass unchanged in mirror mode. The 33 that fail are the areas this design
   changes on purpose: branches, edit history, heads read in the same tick as a write, and tests that
   inspect Automerge or the byte protocol directly.
2. **It saves 16 to 72 MB per tab for a realistic space, plus about 7 MB of compiled wasm.** The
   tab's replica of a space with 200 tasks and three long documents costs 16 MB of JS heap and wasm
   when typing was saved in bursts and 72 MB when every keystroke was its own change; the mirror of the
   same space costs 0.4 MB. The saving repeats for every tab that has the space open.
3. **The app can live with heads that advance only after the worker confirms a write**, given three
   guarantees: `db.flush()` resolves only once the tab has the confirmed heads (implemented), branch
   operations queue behind pending edits and return the heads they used, and an object the worker has
   not confirmed reports `versioned: false` (implemented). About 20 tests need an `await db.flush()`.
4. **The largest blockers are UI work, not the protocol**: the CodeMirror binding, 19 files that use
   Automerge cursors, and moving branches, history and migrations to worker RPCs.
5. **The Cloudflare functions runtime keeps the byte protocol and Automerge.** EDGE's db-service
   stores commits and never builds documents, so EchoClient keeps two document backends behind one
   seam. The mirror protocol is a separate RPC group; `DataService` is unchanged.

## What the spike shows

| Question                                                                     | How it was tested                                                                                                                             | Result                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Do tabs and a worker converge on nested documents?                           | 3,000 sessions of 400 random steps: 2 to 4 tabs and a remote writer over maps, lists of maps and text inside lists                            | No divergence in 109,846 entries; 32,792 stale batches rebased by the worker, 278,124 rebases in tabs |
| Do the transforms converge pairwise?                                         | 30,000 random op-list pairs on nested documents                                                                                               | All converge; 10,874 pairs dropped or split an op                                                     |
| Does it hold against real Automerge, with a remote peer and worker restarts? | 1,500 sessions: Automerge worker, a peer editing its own replica, 3,343 abrupt restarts, lagging saves, an append-only text as identity check | Every tab and the peer match the worker; 67,806 unique edits each appear exactly once                 |
| Does ECHO run without Automerge in the tab?                                  | The echo-client suite with `DX_ECHO_MIRROR=1`                                                                                                 | 582 of 615 pass unchanged (replica mode: all pass)                                                    |
| Can comments and presence keep synchronous cursor reads?                     | A cursor minted by the worker, moved by another tab's insert and by an unconfirmed local edit                                                 | Positions correct in both cases, read synchronously                                                   |
| Do replica-protocol clients and mirror tabs coexist?                         | A replica client writes; a mirror tab on the same worker reads                                                                                | The tab sees the object and later edits                                                               |
| What does a tab hold?                                                        | Replica and mirror of one corpus, each in its own worker thread                                                                               | See [Memory](#memory)                                                                                 |

The restart fuzz found one weak spot. In 5 of 1,730 recoveries, a tab's in-flight batch resolved
differently against history rebuilt from Automerge than it had against the dead worker's original
entries. The tab then rebuilt its visible state from the confirmed one, and every tab still converged.
A small persisted op log in the worker would remove the case (see [Blockers](#blockers)).

## Memory

A space of 200 task documents, three documents of about 45,000 characters and the space root. Each
figure is one realm's V8 heap plus wasm linear memory, above an empty worker thread
(`docs/worker-only/tab-cost.mjs`).

| Text history                                 | Replica in a tab                     | Mirror in a tab |
| -------------------------------------------- | ------------------------------------ | --------------- |
| Typed in 20-character bursts (6,845 changes) | 3.3 MB heap + 13.1 MB wasm = 16.4 MB | 0.43 MB         |
| One change per keystroke (136,830 changes)   | 3.3 MB heap + 68.6 MB wasm = 71.8 MB | 0.43 MB         |

Not counted above: the compiled code of the Automerge and Subduction modules (7.4 MB of
`WasmNativeModuleTag` in a page heap snapshot, per `.agents/projects/memory-usage/ALLOCATION.md`) and
the idle Subduction instance each tab creates (1.25 MB). In a single run of a preview build in
Chromium, with the same three documents open, one tab's Automerge heap equalled the worker's (21.2
against 21.4 MB): each tab with a space open carries a second full copy today.

The worker gains little. The sequencer keeps no copy of the document, only a window of recent
entries per followed document, so the worker can still evict documents between writes.

## API proposal

### Tab

The database layer talks to a `ClientRepo` and `ClientDocHandle` (`automerge/client-handle.ts`).
`RepoProxy` (Automerge replica, byte protocol) and `MirrorRepo` (JSON mirror) both implement them, so
EDGE keeps the first and tabs switch to the second.

- **`MirrorDocHandle`.** `doc()` returns a frozen JSON snapshot with structural sharing. `change(fn)`
  runs `fn` against a recording draft that accepts what an Automerge change callback accepts:
  assignment, deletion, `push`, `pop`, `shift`, `unshift`, `splice`, `insertAt`, `deleteAt`. Change
  events carry Automerge-shaped patches, expanded per nested key as Automerge reports them.
  `changeAt` works only at the current heads; `update` is not supported.
- **Heads.** `heads` are the last confirmed ones; unconfirmed edits do not move them.
  `pendingOps` and the `confirmed` event expose what is still in flight.
- **`DocOps`.** The Automerge calls the database layer makes directly (`getHeads`, `hasHeads`,
  `splice`, `updateText`, local documents for objects not yet added) dispatch on the document kind. A
  tab without Automerge keeps only the mirror branch.
- **`MirrorCursors`.** `track(cursors)` asks the worker once, against the tab's confirmed heads.
  `position(cursor)` is then synchronous: the tab moves positions through its own unconfirmed edits
  and every later change. `create(positions)` is asynchronous and waits for confirmation when a
  position falls in text only this tab has seen.
- **Flush.** `db.flush()` resolves once every earlier edit is confirmed and its heads are in the tab.
  It rejects if a submit fails.

### Wire

`MirrorService` (`protocols/src/MirrorService.ts`), a separate RPC group:

| RPC                                                 | Purpose                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| `subscribe(subscriptionId, clientId, spaceId)`      | Stream of `snapshot`, `entry`, `recovered`, `requesting` and `unavailable` events |
| `updateSubscription(add, remove)`                   | Follow documents; `add` carries `{ epoch, version, heads }` when resubscribing    |
| `submit(batches)`                                   | Apply batches; resolves once they are saved and their entries are on the stream   |
| `resolveCursors(documentId, path, heads, cursors)`  | Positions of Automerge cursors as of `heads`                                      |
| `createCursors(documentId, path, heads, positions)` | Cursors for positions as of `heads`                                               |

Proposed next, not in the spike: `history`, `viewAt`, branch create, merge and sync, import and
export, migrations.

### Worker

- **`DocumentSequencer`** (`echo-host/src/mirror`) orders every write to a document into entries.
  Each tab batch is transformed over the entries its tab had not seen and written as one Automerge
  change, with the batch id in the change message. Changes that arrive another way (network merges,
  replica clients) become entries through `A.diff`. After a restart, `recover` rebuilds the entries
  after a tab's confirmed heads from change metadata, so the tab recognizes its applied batch.
- **`MirrorServiceImpl`** serializes work per document, broadcasts only saved changes, ignores a batch
  it already applied, and sends `requesting` when a document is not on disk.

### Shared

`Mirror` in echo-protocol: the op model (`put`, `del`, `insert`, `remove`, `splice` addressed by
path), `applyOps`, `transformOp` and `transformLists` (the ot.js algorithm for text, json0-style path
rules for maps and lists), `MirrorClientState` (the tab's confirmed state, one batch in flight and a
buffer) and `MirrorSequencer`.

## What changes for app code

1. Heads advance about one RPC and one save after a write.
2. History, branches, migrations and binary import become asynchronous worker calls.
3. Minting a cursor is asynchronous; reading one stays synchronous after the first resolution.
4. `changeAt` against older heads goes away in the tab.
5. Of two concurrent writes to the same key, the one that reaches the worker last wins. Automerge
   picks by actor id today. Concurrent text and list edits still merge.

## Blockers

Ordered by risk. Size: S is up to a day, M is 2 to 5 days, L is more than a week.

| Blocker                                                                                                    | What it takes                                                                                                                      | Size |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| CodeMirror binding (`ui-editor/.../collab/automerge`)                                                      | Turn transactions into splices on the mirror; incoming change events already carry the patch shape `update-codemirror.ts` consumes | L    |
| Cursor consumers: comments, anchors, presence, review (19 files, 13 minting sites)                         | Move reads to `MirrorCursors`, make minting asynchronous                                                                           | L    |
| Branches, merge, edit history, versioning, migrations                                                      | Worker RPCs that queue behind pending edits and return heads                                                                       | L    |
| Heads read right after a write                                                                             | The flush guarantee plus the versioning fixes the audit lists; about 20 tests                                                      | M    |
| Shared operation code calling Automerge through `Doc.Handle` (plugin-markdown operations also run on EDGE) | Route through `DocOps` so both backends work                                                                                       | M    |
| Recovery after an abrupt worker restart                                                                    | Persist a small per-document op log, or accept the rebuild path                                                                    | M    |
| Remaining Automerge in the tab: wasm init in `main.tsx`, the devtools hook exposing the module             | Remove or load on demand                                                                                                           | S    |
| Wire encoding                                                                                              | Tag `RawString` values for structured clone; the spike uses an in-process transport                                                | S    |
| Entry window                                                                                               | Trim to the oldest version a subscriber still needs, not a fixed 1,000 entries                                                     | S    |

The inventory counts about 2,600 lines to change in 54 tab files if the facade keeps the current
contracts. The spike adds about 3,300 lines of production code and 800 lines of tests.

## Migration

1. Land the seam: `ClientRepo`, `ClientDocHandle` and `DocOps`. Behavior-neutral.
2. Land the shared protocol and the worker's `MirrorService` behind a flag, with the fuzz tests.
3. Add worker RPCs for history, branches, migrations and import; replica clients can use them too.
4. Port the editor binding and the cursor consumers.
5. Fix heads-after-write callers.
6. Switch Composer tabs to mirror mode behind a flag, measure 1, 2 and 3 tabs against the baseline,
   then drop wasm initialization from tabs.
7. Move HOST-mode clients and tests to the mirror. Keep the replica backend for EDGE.

## Open questions

1. Is last-writer-wins by arrival at the worker acceptable for concurrent writes to the same key?
2. Should recovery persist an op log in the worker, or is the rebuild path enough?
3. Should HOST mode keep a second in-process replica, or use the mirror over the in-process bridge?

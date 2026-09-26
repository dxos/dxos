# @dxos/worker-only-spike

Spikes that prove a fix for each blocker to a browser tab with no Automerge and no WebAssembly. The
package is private and ships nothing. Its tests run ECHO's own code, unmodified, over documents a tab
holds as plain JS, and its benches measure those documents in Chromium.

The design under test is in [OP-IDS.md](../automerge-proxy/docs/OP-IDS.md) and
[HISTORY.md](../automerge-proxy/docs/HISTORY.md). The blockers are the table in
[WORKER-ONLY.md](../echo-client/docs/WORKER-ONLY.md#blockers).

## Short answer

1. **Every blocker has a fix that a test or a bench proves.** 37 tests in 16 files pass. Each test
   that runs ECHO code also records any Automerge function that receives a tab document, and asserts
   that none did.
2. **A tab can answer the whole Automerge namespace without Automerge.** A tab document keeps every op
   with its Automerge id, read from the worker's saved bytes. The editor binding, `ObjectCore`, the
   history functions, the store adapter and the cursor helpers run over it unmodified. A child process
   with `WebAssembly` deleted loads, edits, encodes and saves one.
3. **Heads are real hashes the moment a tab writes.** The tab picks the op ids Automerge would pick,
   encodes the change byte for byte as Automerge does, and hashes it. The worker refuses bytes that
   are not canonical and applies the tab's exact bytes, so every peer sees the hash the tab reported.
4. **Tabs recover from a worker restart on their own.** Every change a tab holds rebuilds to its exact
   bytes, so tabs send back what the worker lost, including a closed tab's changes and another peer's.
5. **In Chromium a tab document now takes less memory than a replica for both kinds of typing.** A tab
   holding the test space takes 20.9 MB against 69.8 MB when every keystroke is a change, and 12.8 MB
   against 14.3 MB when text arrives in 20-character bursts. Three tabs take 61.8 against 208.4 MB, and
   37.2 against 41.9 MB. A tab that drops its documents keeps 2.7 MB; a replica tab keeps its wasm
   memory, 14.0 and 69.5 MB.
6. **A tab document is no slower than a replica anywhere the user waits.** A write takes 0.34 to
   0.36 ms against 0.38 to 0.45 ms. Receiving another peer's keystroke and reading the text takes 1.8
   to 2.0 ms against 12.8 to 13.2 ms. Loading the space takes 172 ms for bursts and 237 ms for
   keystrokes, against 316 and 574 ms.
7. **The worker takes a tab's change in the time it takes a replica's**, about 13 to 14 ms, nearly all
   of it Automerge applying the change. It checks the change against a compact index in 6 to 8 µs.
   In Node the index takes 14.1 MB for the keystroke space and 5.9 MB for the burst space, where the
   second model it replaces took 20.8 and 12.6 MB.

Five fixes got there from a tab document that wrote in 2 ms, took 32.4 MB for keystrokes and loaded
the keystroke space in 0.9 s. They are described under [Fixes for latency and memory](#fixes-for-latency-and-memory).

## How it works

| Part         | Files                                                  | Role                                                                                                                         |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Tab document | `tab.ts`                                               | Mints Automerge op ids for the tab's own ops, encodes each change, keeps unconfirmed changes, takes acks and refusals by hash |
| Model        | `model.ts`, `changes.ts`, `id-index.ts`, `ids.ts`      | Every op with the ops that overwrote it, in typed-array columns, so any version, cursor, conflict, diff and change is a lookup |
| Formats      | `reader.ts`, `encode.ts`, `sha256.ts`, `save.ts`       | Automerge's saved-document and change formats read and written in JS                                                         |
| Worker       | `host.ts`, `check-index.ts`                            | Automerge plus a check index per document, which it uses to check each tab change before Automerge sees it                  |
| Namespace    | `namespace.ts`, `mocks.ts`, `immutable-string.ts`      | Automerge's functions answered for tab documents; anything else falls through to Automerge                                  |
| Handles      | `handle.ts`, `client-handle.ts`                        | ECHO's `Doc.Handle` and `ClientDocHandle` over a tab document                                                               |
| Transport    | `network.ts`, `sender.ts`                              | Messages between tabs and the worker in order, with structured clone; sends on RepoProxy's schedule and on page hide        |

### A write

1. The change callback edits a draft from `@dxos/automerge-proxy/Draft`, which records positional ops.
2. `translate` turns them into Automerge ops. Ids start one above the highest op counter the tab has
   seen, under the tab's actor. Each op names the element it follows and the values it overwrites
   (`pred`), in Lamport order.
3. `encodeChange` writes the change chunk as Automerge does and hashes it with SHA-256. The tab applies
   the change to its model, and its heads become that hash. On the current version the draft's ops
   also move the tab's cached value, so nothing is read again.
4. The tab sends the change and its bytes through `BatchedSender`: the first change after a pause at
   once, later ones at most ten batches a second, as RepoProxy sends. `SpikeHost.submit` checks, in
   order, that:
   1. the bytes decode to the hash the tab claims (a change the worker already has is acknowledged);
   2. the bytes are canonical, which is the encoder's output for the decoded change;
   3. every dependency is known, and the seq continues the actor's chain;
   4. the version the tab edited holds the actor's previous change, which Automerge needs to load what
      it saves;
   5. the start op is above the highest op that version reaches;
   6. each op names an object, element and preds that exist in that version, in the same object and
      the same key or element, and no op increments a counter.
5. `flush` applies every queued change of a document in one `A.applyChanges` call, forwards each change
   to the other tabs, saves, then acknowledges each change by hash to every tab that sent it.
6. A refusal names a hash. The tab takes that change and every pending change built on it out of its
   model, and reports them.

### Realms

In tests, the tab's code and the worker's code share one `@automerge/automerge`. The namespace decides
the realm on each call:

- A function that takes a document dispatches on a symbol that every container of a tab document
  carries (`tagOf`). A tab document answers from its model; anything else goes to Automerge.
- `from`, `init`, `load` and `decodeChange` take no document, so `asTab` marks code that runs as the
  tab.
- `watchLeaks` wraps every other Automerge function and records any call that receives a tab document.

A product build would set the realm per bundle instead: the tab's bundle resolves the namespace to the
model, and the worker's to Automerge.

## The blockers

Largest first. Size is the estimate for the production work, from WORKER-ONLY.md, not for the spike.

| Blocker                                        | Size | Fix                                                                            | Proven by                                          |
| ---------------------------------------------- | ---- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| The editor's replica                           | L    | Tab-minted op ids; cursors and diffs from the model                            | `editor.test.ts`, `foundation.test.ts`             |
| Branches, merge, edit history, migrations      | L    | History read in the tab; fork, merge and copy in the worker                    | `history.test.ts`, `hostless.test.ts`              |
| Cursor consumers with no editor open           | M    | Cursors resolve in the model                                                   | `cursors.test.ts`                                  |
| Store adapters                                 | M    | `diff` and change events from the model                                        | `store-adapter.test.ts`                            |
| Heads read right after a write                 | M    | The tab encodes and hashes; the worker requires canonical bytes                | `heads.test.ts`                                    |
| Recovery after an abrupt worker restart        | M    | Tabs rebuild any change byte for byte and send what the worker lacks           | `restart.test.ts`                                  |
| Remaining Automerge in the tab                 | M    | Hostless documents, the JS codec, the tab's own `ImmutableString`              | `hostless.test.ts`, `codec.test.ts`, `no-wasm.test.ts` |
| Shared operation code on EDGE                  | S    | The namespace passes Automerge documents through                               | `edge.test.ts`                                     |
| Automerge's cached view drifts after `A.merge` | S    | Tabs read saved bytes and changes, never the cached view                       | `drift.test.ts`                                    |
| A real worker boundary and a browser run       | S    | Measured in Chromium with a shared worker                                      | `bench/browser/run.ts`, `bench/memory.ts`          |
| `meta.updatedAt`                               | S    | Change times from the model                                                    | `hostless.test.ts`                                 |
| Edits pending when a tab closes                | S    | Batch per interval; send the queue on `pagehide`                               | `pagehide.test.ts`                                 |
| Publishing `@dxos/automerge-proxy`             | S    | The package packs and imports cleanly; it needs a trusted publisher             | `bench/publish/pack.ts`                            |
| Other wasm in the tab                          | S    | Follow-up: sodium and panproto after the core SDK; plugin wasm out of scope     | `bench/wasm/analyze.ts`, `bench/wasm/run-manifold.ts` |

### The editor's replica

Today a tab holds an Automerge replica of every document open in an editor, for op-id cursors. A tab
document has op ids for text the moment it is typed, because the tab picks the ids Automerge would pick
and the worker writes the change under exactly those ids.

`editor.test.ts` runs ui-editor's `automerge()` CodeMirror extension, unmodified, in two tabs while a
peer edits through Automerge: 3 seeds of 60 steps. Both editors converge with the worker, and every
comment anchor minted before the worker saw its text resolves where Automerge resolves it.
`foundation.test.ts` adds 5 seeds of 80 steps with three tabs and a peer: every character's id in every
tab equals `A.getCursor`, and `diff` equals `A.diff` for three pairs of versions.

To integrate, the editor keeps its imports; the namespace answers them. `mirrorSync`, the replica
lease and the position mapping in `echo-client/src/text.ts` go.

### Branches, merge, edit history, versioning, migrations

History reads run in the tab from the model, which holds every change and every overwritten op. Writes
that create or combine documents run in the worker.

`history.test.ts` compares echo-client's own functions over a tab document and over the worker's
Automerge document. `getEditHistory` gives the same hashes, actors, seqs, times and snapshots.
`checkoutVersion` gives the same object at every version, and `A.getChangesMetaSince` the same
metadata. `getEditHistoryWithDiffs` runs unmodified: it calls `A.init` and `A.applyChanges`, which make
and fill a tab document when called as the tab. A branch forks in the worker at the tab's heads, both
sides edit, and the worker merges; the tab's main document receives the branch's changes. A migration
copies in the worker, and a rewrite is a new document the tab creates. In `hostless.test.ts`,
`migrateDocument` clones and rewrites a tab document as it does an Automerge one.

To integrate, `createBranch`, `mergeBranch` and `repo.import` become worker calls that wait for the
tab's pending changes (HISTORY.md, "Waiting for the tab's edits").

### Cursor consumers with no editor open

Anchor sort, review and AI edits resolve cursors through the replica an open editor holds today. On a
tab document they resolve in the model.

`cursors.test.ts` inserts text and anchors proposals on it before the worker has seen it. Another tab
with no editor resolves every anchor with echo-client's unmodified `getRangeFromCursor`, sorts them as
plugin-markdown does, and after the anchored text is deleted, both tabs collapse each anchor where
Automerge collapses it.

### Store adapters

The tldraw and excalidraw adapters extend echo-doc's `AbstractStoreAdapter`, which diffs heads with
`A.diff`. `store-adapter.test.ts` keeps two tabs' stores in step through the unmodified adapter over 3
seeds of 60 random adds, updates and deletes with random delivery. Both stores match the worker's
document.

### Heads read right after a write

The tab encodes the change (`encode.ts`) and hashes it (`sha256.ts`), so heads name the final hash at
once. Automerge indexes a change under the hash of the bytes it receives but exports it re-encoded, so
the worker requires the bytes to be canonical; otherwise the heads would name a hash no peer ever gets.

`heads.test.ts` has five tests:

1. Heads right after a write are the change's hash, and the worker ends with exactly those heads.
2. `Obj.version` right after `Obj.update` is final, and `checkoutVersion` reads that version.
3. Over 4 seeds of 100 steps, every version a tab read right after a write is one the worker has, with
   the same state, and every hash a tab reported is exported.
4. The worker refuses bytes with their preds reordered. Without the check, Automerge's heads name one
   hash, it exports another, and its save no longer loads.
5. A late refusal names a hash, so it cannot drop a later change that reused the seq.

### Recovery after an abrupt worker restart

No op log. Every change a tab holds, whether it wrote, received or loaded it, rebuilds from the model
to the exact bytes of its hash, so after a restart each tab sends every change the worker lacks.

`restart.test.ts`:

1. Over 3 seeds, every change each tab holds rebuilds to the bytes the worker exports.
2. Over 4 seeds, a restart loses unsaved work, including a change from a tab that then closes and
   changes from a peer. The remaining tabs send them back under their original hashes, everything
   converges, and the peer's next sync repeats nothing.
3. A change the worker saved just before it died is confirmed on reconnect, not sent again.

### Remaining Automerge in the tab

- **Documents made in the tab.** `from`, `init`, `load`, `clone`, `merge`, `change`, `changeAt` and
  `save` answer from the model when called as the tab (`hostless.test.ts`). The worker's Automerge
  loads what `save` returns, with the same heads and history. An ECHO object made in a tab lives in a
  tab document, versions with real heads, and moves into a database.
- **The codec.** The JS reader decodes every change as `A.decodeChange` does, for every value type,
  and the encoder writes it back byte for byte (`codec.test.ts`). The reader computes every change hash
  from a saved document, and a changed byte fails its checksum. A tab's save is change chunks, which
  Automerge loads.
- **No WebAssembly.** `no-wasm.test.ts` runs the tab's side in a child process where `WebAssembly` does
  not exist. It loads the worker's saved bytes, applies delivered changes, writes text, a scalar
  string, bytes and a date through the namespace, and saves. The worker's Automerge applies the
  child's changes and ends with the child's document, heads, cursor and diff.
- **`ImmutableString`.** Automerge's slim entry touches `WebAssembly` when imported, so the tab has its
  own class (`immutable-string.ts`), marked with the registered symbol Automerge checks. ECHO tests
  `instanceof A.RawString`, so the tab's namespace must export this class under that name. The tests
  share Automerge's class with the worker, so there the model makes Automerge's instances instead.

To integrate, `@dxos/automerge-proxy/Automerge` resolves to these overrides in the tab, and
`composer-app/src/main.tsx` initializes wasm only in replica mode and `DX_HOST`.

### Shared operation code on EDGE

EDGE's functions runtime keeps replica mode and Automerge documents. The namespace passes any document
that is not a tab document through to Automerge, so shared code needs nothing.

`edge.test.ts` runs echo-doc's `applyEdits` and the core of plugin-markdown's accept-change operation
(`getRangeFromCursor`, `cherryPickHunk`, `splice`) on a replica handle and on a tab handle. Results
match, and both sets of changes converge in the worker.

### Automerge's cached view drifts after `A.merge`

Tab documents read the worker's saved bytes and changes, never Automerge's cached view. In
`drift.test.ts`, 300 rounds of three peers writing and deleting three keys and merging leave
Automerge's cached view wrong on some keys. A model read from the saved bytes, and a tab document built
from the changes, match a fresh load on all 900 keys, values and conflicts both.

### A real worker boundary and a browser run

`bench/browser/run.ts` loads the test space (200 tasks and three documents of about 45,000 characters)
into one shared worker, then opens one, two and three tabs, each holding the space as replicas or as
tab documents. See [Memory and latency](#memory-and-latency).

### `meta.updatedAt`

`getUpdatedAt` reads change times through `getBackend(doc).getChangeMetaByHash`, which the namespace
answers from the model. In `hostless.test.ts` it returns the time the tab wrote, the same value as over
the worker's Automerge document.

### Edits pending when a tab closes

`BatchedSender` (`sender.ts`) sends a tab's changes through `UpdateScheduler` at RepoProxy's rate: the
first change after a pause goes at once, and later ones go at most ten batches a second, each of which
the worker applies in one Automerge call. The queue goes when the page fires `pagehide`.
`pagehide.test.ts` shows both, and shows a waiting batch lost when no `pagehide` reaches the sender.

### Publishing `@dxos/automerge-proxy`

`bench/publish/pack.ts` packs the built package: 239 KB, 134 files, every export target present,
workspace specifiers resolved, and an import through its exports works in a clean consumer. What
remains is outside the code: an npm trusted publisher for `publish-all.yml`, then dropping `private`
with a changeset. Until then `scripts/check-public-dependencies.mjs`, which the `Check` workflow runs,
fails on this branch: echo-client, echo-doc, echo-host, plugin-markdown, protocols and ui-editor
depend on the private package.

### Other wasm in the tab

Out of scope for now: this work covers Automerge's wasm in the core SDK. Two uses come next, and the
rest belong to plugins.

- **Sodium, a follow-up.** Composer's storage probe imports the root of `@dxos/client-services`.
  `bench/wasm/analyze.ts` bundles that import: 1,853 modules and 22 MB of input, with
  hypercore-crypto's sodium, Automerge's 3.6 MB `.wasm` and Subduction's 2.3 MB base64 wasm. Importing
  the storage module directly bundles 924 modules and no wasm.
- **panproto, a follow-up** with its core extension. plugin-library's atproto lenses load it, in
  development builds only.
- **Plugin wasm: manifold, wnfs and pica.** A realm never returns wasm memory, so the only way to free
  it is to end the realm. `WasmWorker` (`bench/wasm/wasm-worker.ts`) runs a module's jobs in a
  dedicated worker and terminates it when idle. With manifold, Spacetime's CSG module, one job run in
  the page leaves 208.4 MB for good. Through a `WasmWorker` the page holds 3.6 MB, and the total drops
  from 210.9 MB to 1.0 MB when the worker ends. The same pattern fits wnfs and panproto. pica runs
  inside Excalidraw, so moving it means changing Excalidraw.

## Fixes for latency and memory

Replica mode sets the bar. A tab must be no slower than a replica tab wherever the user waits, the
worker should take changes in about the time it takes today, and memory should be as low as it can
be. A background save may take longer. Five fixes meet the bar; figures are Chromium, one tab.

| Fix                            | What changed                                                                                               | Before                  | After, against a replica                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| 1. The cached value            | A write applies the draft's ops to the cached value; a remote change diffs only the objects it touched      | 2.0 to 2.2 ms a write   | 0.34 to 0.36 ms against 0.38 to 0.45 ms           |
| 2. Loading                     | Hashes arrive as bytes keyed by actor and seq; the change table fills in one pass                           | 0.4 and 0.9 s in Node   | 172 and 237 ms against 316 and 574 ms             |
| 3. Send cadence                | `BatchedSender` on `UpdateScheduler`, at RepoProxy's rate                                                   | One batch per interval  | Sent when a replica tab's changes would be        |
| 4. Typed arrays                | Ops and changes in typed-array columns; loaded arrays fit exactly                                           | 20.1 and 32.4 MB        | 12.8 and 20.9 MB against 14.3 and 69.8 MB         |
| 5. The worker's check index    | Each op's object, key or element and kind, plus the change table, in place of a second model               | 12.6 and 20.8 MB (Node) | 5.9 and 14.1 MB in Node, beside Automerge         |

Where a row has two figures, the first is the burst corpus and the second the keystroke corpus, as
everywhere in this README.

### 1. The cached value moves change by change

A write on the current version turns the draft's ops into the new value with `Op.apply` and reports
them as the patches, so the tab reads nothing again. A remote change goes into the model first, then
`model.diff` turns it into patches and `applyPatches` applies them to the cached value.

- **The diff walks only what changed.** It visits the objects that an op between the two versions
  touched, and their ancestors, so a keystroke into a 45,000-character text costs the text, not the
  space.
- **Containers carry tags in a `WeakMap`.** Each container records its tab, its heads and its path.
  Only new containers get tags; a container shared with the last version keeps its tag, which stays
  true at its own heads. The root is new in every version.
- **A refusal reads the whole document again.** Containers that the refused change created carry tags
  naming heads that no longer exist.

`cache.test.ts` runs 4 seeds of 150 steps: local writes, writes on older versions, a peer's changes,
refusals and merges between tabs. After every step the value equals a fresh read of the model, and
every container is frozen and tagged with a path that resolves at its own heads. Receiving a peer's
keystroke and reading the text takes 1.8 to 2.0 ms against 12.8 to 13.2 ms for a replica, which
applies each change to Automerge.

### 2. Loading no slower than a replica

After fix 4, loading the keystroke space took 0.61 s against 0.41 to 0.43 s for a replica, most of it
parsing hex hashes and looking up each dependency by hash. Now:

- **Hashes arrive as bytes, keyed by actor and seq.** A snapshot lists them actor by actor, actors
  sorted by id, each actor's hashes in seq order. An actor and a seq name one change, so the worker
  writes the list from its check index, and the tab places each hash from the saved columns. Neither
  side depends on the order in which a save lists changes, and no snapshot asks Automerge for hashes.
  Only a document's first load in the worker does, through `A.getChangesMetaSince`: 0.8 s for the
  keystroke space, or 0.35 s through `A.topoHistoryTraversal`, which returns them in save order.
- **The change table fills in one pass.** Saved changes name their dependencies by position, so
  nothing is looked up.
- **Most values skip `TextDecoder`.** A one-character string decodes by hand, and runs of ops reuse the
  last object and element they resolved.
- **Loaded arrays fit exactly.** Most documents in a space are never written to, and the first write
  grows only the arrays it touches, by an eighth. That first write takes 4.5 to 6.3 ms, against 18 to
  24 ms for a replica's first write.

In Node, the burst space loads in 0.12 s and the keystroke space in 0.13 to 0.15 s, against 0.20 to
0.24 s and 0.40 to 0.42 s for replicas. Every one of the 204 documents in both corpora loads to
Automerge's values, heads and hashes.

### 3. Send cadence

`BatchedSender` sends through `UpdateScheduler` from `@dxos/async`, at RepoProxy's
`MAX_UPDATE_FREQ` of 10: the first change after a pause goes at once, and later ones coalesce into one
batch per 100 ms. `pagehide` sends what waits. The worker receives each change when a replica tab's
would arrive.

### 4. Ops and changes in typed arrays

The model keeps one row per op in typed-array columns: counter, actor, object, key or element, value,
flags, first successor and first predecessor. Side maps hold only what is rare: a second successor, a
value that does not fit 32 bits, a write to an element after its insert. A sequence's elements are an
`Int32Array`. The change table keeps 32-bit columns, the hash as 32 bytes and an open-addressing table
on it, about 63 bytes a change. Chrome counts array buffers in its heap figure, so the figures include
them.

A space holds hundreds of small documents, so slack matters: each loaded document carrying 1,024
spare op rows cost 6 MB in the burst space before loads fit their arrays exactly.

### 5. The worker's check index

The worker held a full model of each document beside Automerge, only to check a tab's references.
It now keeps each op's object, key or element and kind, found by id, plus the change table. Values
stay in Automerge. The index refuses what Automerge would reject or read differently from a tab's
model:

1. an object, element or pred missing from the version the change names;
2. a pred in another object, key or element, or an element of another sequence;
3. a delete with no pred, an insert with one, and an update that names the head;
4. an increment, since the tab's model has no counters and would read it as a new value;
5. a change whose version lacks its actor's previous change.

A pred need not list every current value: leaving one out makes a conflict, which Automerge and the
model read alike. A fuzz in `check-index.test.ts` sends 1,600 random changes, mostly malformed, and
requires every change the index accepts, 561 of them, to apply in Automerge, survive a save and a load
under its own hash, and read the same in the model. It found rule 5: Automerge applies such a change,
then cannot load its own save. The old checks accepted it too. A tab never sends one, since it writes
under a fresh actor on a version that lacks its last change, as Automerge's `changeAt` does.

The index checks and adds a keystroke in 6 to 8 µs; applying one to the model took 35 µs before any
check. In Chromium the worker spends 13.3 to 13.8 ms on a tab document's change, against 12.9 to 13.3 ms
on a replica's, nearly all of it `A.applyChanges`. The change table is two thirds of the index for
the keystroke space, 138,000 changes for 202,000 ops. Keeping 16 bytes of each hash and dropping the
columns only a tab reads would save about 4 MB more.

## Memory and latency

The test space is 200 tasks, three documents of about 45,000 characters, and the space root, typed in
20-character bursts (7,846 changes) or one change per keystroke (137,831 changes). Every tab shares one
worker, which holds the space in Automerge either way.

Chromium, per tab. Chrome counts wasm memory in its heap figure; the wasm share is in brackets.

| Tabs | Bursts, replicas | Bursts, tab documents | Keystrokes, replicas | Keystrokes, tab documents |
| ---- | ---------------- | --------------------- | -------------------- | ------------------------- |
| 1    | 14.3 MB (11.7)   | 12.8 MB               | 69.8 MB (67.2)       | 20.9 MB                   |
| 3    | 41.9 MB total    | 37.2 MB total         | 208.4 MB total       | 61.8 MB total             |

- **Dropping every document.** A replica tab frees 0.5 MB and keeps 14.0 and 69.5 MB. A tab-document
  tab keeps 2.6 to 2.7 MB.
- **Writes.** 200 one-character writes to a long document in one tab. A tab-document tab writes in
  0.34 to 0.36 ms, a replica tab in 0.38 to 0.45 ms. The round trip to the worker's acknowledgement
  takes 14.3 to 15.0 ms against 13.9 to 14.5 ms, with p95 up to 21.8 and 21.4 ms.
- **Receiving.** 100 keystrokes from another peer, each applied and followed by a read of the text:
  1.8 to 2.0 ms a keystroke in a tab-document tab, 12.8 to 13.2 ms in a replica tab.
- **Loading.** Median of six tabs: 172 and 237 ms for tab documents, 316 and 574 ms for replicas.
- **Node figures run higher for tab documents**, because Node here has no pointer compression. Above an
  empty realm of 17.6 MB, tab documents take 12.6 and 20.8 MB against 14.2 and 69.7 MB for replicas,
  and the worker's check index takes 5.9 and 14.1 MB.
- **A tab that hashes every change itself** loads in 0.8 and 4.2 s in Node instead of 0.12 and 0.13
  to 0.15 s, which is why the snapshot carries the hashes.

## Automerge issues to investigate

Found while building the spike, against Automerge 3.5.0. None has been reported upstream.

1. **Non-canonical change bytes break saves.** `applyChanges` accepts a change whose preds are out of
   Lamport order, indexes it under the hash of those bytes, and exports it re-encoded under another
   hash. The heads name a hash no peer can reach, and `A.load(A.save(doc))` throws "mismatching heads".
   `heads.test.ts` reproduces it.
2. **A bad reference corrupts the document.** `applyChanges` accepts most bad references without an
   error, and then the document's save no longer loads: an unknown object or element, a pred at
   another key, in another object or on another element, a delete or update with no pred, a map op on
   a list. An insert after an element of another list panics inside the wasm instead.
3. **The cached view drifts after `A.merge`.** Properties of the document object disagree with a fresh
   load for 0.3 to 0.4% of keys. `drift.test.ts` reproduces it.
4. **`getConflicts` on `A.view(doc, heads)` ignores the heads** and reports the current conflicts.
5. **`A.encodeChange` writes some float64 values one unit in the last place off.** `A.decodeChange`
   returns the stored bits, but `A.encodeChange` of its result differs from the original bytes for 112
   of 794 non-integer values in a sweep, so a change rebuilt through Automerge gets another hash. The
   spike's encoder writes the stored bits.
6. **A remote change costs time proportional to the text it touches, per call**: 13 to 19 ms at 45,000
   characters, and about as much for a batch as for one change.
7. **The format spec says sequence ops are sorted by element id**; saved documents store them in
   document order, which the tab's reader relies on.
8. **Some bad changes are accepted without an error.** A change with an unknown dependency waits in the
   queue, and a start op below the ops it depends on is accepted.
9. **The slim entry touches `WebAssembly` on import**, through wasm-bindgen's `new WebAssembly.Tag`.
10. **`A.encodeChange` sorts preds itself**, which hides issue 1 from anyone who encodes through it.
11. **`A.decodeChange` returns byte values as plain arrays**, and its `Op` type leaves out `elemId` and
    `insert`.
12. **A change that skips its actor's previous change breaks saves.** `applyChanges` accepts a change
    with seq 2 whose deps do not reach the actor's seq 1, and `A.load(A.save(doc))` then throws
    "missing ops". `check-index.test.ts` shows the worker refusing one.
13. **An increment is accepted where it means nothing.** An `inc` whose pred is not a counter applies,
    and the key then reads as deleted; an `inc` with no pred applies and changes nothing.

## Running

```bash
# Tests.
moon run worker-only-spike:test

# A corpus: 200 tasks, 3 documents of 400 paragraphs, 20 characters per change (1 for keystrokes).
node ../echo-client/docs/worker-only/corpus.mjs /tmp/corpus.json 200 3 400 20

# Memory and load time in Node: replicas, tab documents and the worker's check index.
node --expose-gc --conditions=source src/bench/memory.ts /tmp/corpus.json

# Memory, load, write and receive latency in Chromium.
node --conditions=source src/bench/browser/run.ts /tmp/corpus.json --tabs 1,2,3

# Wasm in the storage probe's bundle, and plugin wasm in a worker.
node --conditions=source src/bench/wasm/analyze.ts
node --conditions=source src/bench/wasm/run-manifold.ts

# Whether @dxos/automerge-proxy packs and imports as published.
moon run automerge-proxy:build && node src/bench/publish/pack.ts /tmp/pack
```

The browser benches use the pre-installed Chromium at `/opt/pw-browsers/chromium`; set `CHROMIUM_PATH`
to use another.

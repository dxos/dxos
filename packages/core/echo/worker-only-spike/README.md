# @dxos/worker-only-spike

Spikes that prove a fix for each blocker to a browser tab with no Automerge and no WebAssembly. The
package is private and ships nothing. Its tests run ECHO's own code, unmodified, over documents a tab
holds as plain JS, and its benches measure those documents in Chromium.

The design under test is in [OP-IDS.md](../automerge-proxy/docs/OP-IDS.md) and
[HISTORY.md](../automerge-proxy/docs/HISTORY.md). The blockers are the table in
[WORKER-ONLY.md](../echo-client/docs/WORKER-ONLY.md#blockers).

## Short answer

1. **Every blocker has a fix that a test or a bench proves.** 30 tests in 13 files pass. Each test
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
5. **In Chromium, a tab document costs half a replica's memory for keystroke-typed text and 40% more
   for burst-typed text.** A tab holding the test space takes 32.4 MB against 69.8 MB when every
   keystroke is a change, and 20.1 MB against 14.3 MB when text arrives in 20-character bursts. Three
   tabs: 96.1 against 208.4 MB, and 59.3 against 41.9 MB. A tab that drops its documents keeps 2 MB; a
   replica tab keeps its wasm memory, 14.0 and 69.5 MB.
6. **Writes cost more in the tab, and the worker must batch.** A write takes about 2 ms in the tab
   against 0.3 to 0.6 ms for a replica. The worker's Automerge spends about 19 ms applying one change
   to a 45,000-character text in either mode, and about as long for a batch.

## How it works

| Part         | Files                                                  | Role                                                                                                                         |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Tab document | `tab.ts`                                               | Mints Automerge op ids for the tab's own ops, encodes each change, keeps unconfirmed changes, takes acks and refusals by hash |
| Model        | `model.ts`, `changes.ts`, `ids.ts`                     | Every op with the ops that overwrote it, so any version, cursor, conflict, diff and change is a lookup                      |
| Formats      | `reader.ts`, `encode.ts`, `sha256.ts`, `save.ts`       | Automerge's saved-document and change formats read and written in JS                                                         |
| Worker       | `host.ts`                                              | Automerge plus a model per document, which it uses to check each tab change before Automerge sees it                        |
| Namespace    | `namespace.ts`, `mocks.ts`, `immutable-string.ts`      | Automerge's functions answered for tab documents; anything else falls through to Automerge                                  |
| Handles      | `handle.ts`, `client-handle.ts`                        | ECHO's `Doc.Handle` and `ClientDocHandle` over a tab document                                                               |
| Transport    | `network.ts`, `sender.ts`                              | Messages between tabs and the worker in order, with structured clone; batching and the page-hide send                       |

### A write

1. The change callback edits a draft from `@dxos/automerge-proxy/Draft`, which records positional ops.
2. `translate` turns them into Automerge ops. Ids start one above the highest op counter the tab has
   seen, under the tab's actor. Each op names the element it follows and the values it overwrites
   (`pred`), in Lamport order.
3. `encodeChange` writes the change chunk as Automerge does and hashes it with SHA-256. The tab applies
   the change to its model, and its heads become that hash.
4. The tab sends the change and its bytes. `SpikeHost.submit` checks, in order, that:
   1. the bytes decode to the hash the tab claims (a change the worker already has is acknowledged);
   2. the bytes are canonical, which is the encoder's output for the decoded change;
   3. every dependency is known, and the seq continues the actor's chain;
   4. the start op is above the highest op the dependencies reach;
   5. each op names objects, elements and values that exist in the version the tab edited.
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
| Other wasm in the tab                          | S    | Import the storage module directly; run plugin wasm in a worker the page ends   | `bench/wasm/analyze.ts`, `bench/wasm/run-manifold.ts` |

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

`BatchedSender` (`sender.ts`) sends a tab's changes as one batch per interval, which the worker applies
in one Automerge call, and sends the queue when the page fires `pagehide`. `pagehide.test.ts` shows both,
and shows a queued batch lost when no `pagehide` reaches the sender.

### Publishing `@dxos/automerge-proxy`

`bench/publish/pack.ts` packs the built package: 239 KB, 134 files, every export target present,
workspace specifiers resolved, and an import through its exports works in a clean consumer. What
remains is outside the code: an npm trusted publisher for `publish-all.yml`, then dropping `private`
with a changeset. Until then `scripts/check-public-dependencies.mjs`, which the `Check` workflow runs,
fails on this branch: echo-client, echo-doc, echo-host, plugin-markdown, protocols and ui-editor
depend on the private package.

### Other wasm in the tab

- **Sodium.** Composer's storage probe imports the root of `@dxos/client-services`. `bench/wasm/analyze.ts`
  bundles that import: 1,853 modules and 22 MB of input, with hypercore-crypto's sodium, Automerge's
  3.6 MB `.wasm` and Subduction's 2.3 MB base64 wasm. Importing the storage module directly bundles 924
  modules and no wasm.
- **Plugin wasm.** A realm never returns wasm memory, so the only way to free it is to end the realm.
  `WasmWorker` (`bench/wasm/wasm-worker.ts`) runs a module's jobs in a dedicated worker and terminates
  it when idle. With manifold, Spacetime's CSG module, one job run in the page leaves 208.4 MB for good.
  Through a `WasmWorker` the page holds 3.6 MB, and the total drops from 210.9 MB to 1.0 MB when the
  worker ends. The same pattern fits wnfs and panproto. pica runs inside Excalidraw, so moving it
  means changing Excalidraw.

## Memory and latency

The test space is 200 tasks, three documents of about 45,000 characters, and the space root, typed in
20-character bursts (6,845 changes) or one change per keystroke (136,830 changes). Every tab shares one
worker, which holds the space in Automerge either way.

Chromium, per tab. Chrome counts wasm memory in its heap figure; the wasm share is in brackets.

| Tabs | Bursts, replicas | Bursts, tab documents | Keystrokes, replicas | Keystrokes, tab documents |
| ---- | ---------------- | --------------------- | -------------------- | ------------------------- |
| 1    | 14.3 MB (11.7)   | 20.1 MB               | 69.8 MB (67.2)       | 32.4 MB                   |
| 3    | 41.9 MB total    | 59.3 MB total         | 208.4 MB total       | 96.1 MB total             |

- **Dropping every document.** A replica tab frees 0.5 MB and keeps 14.0 and 69.5 MB. A tab-document
  tab keeps 2.0 to 2.3 MB.
- **Writes.** 200 one-character writes to a long document in one tab, median of each run over two
  runs per corpus. A replica tab writes in 0.3 to 0.6 ms, a tab-document tab in 2.0 to 2.2 ms. The
  round trip to the worker's acknowledgement takes 19.5 to 20.3 ms and 21.3 to 21.5 ms, with p95 up to
  23.9 and 25.3 ms. The worker spends 18.6 to 19.2 ms of it applying the change, in both modes.
- **Where the tab's write time goes.** In Node, recording, encoding and hashing a write takes 0.2 ms
  (the hash 0.07 ms). The next read then rebuilds the whole document, 3.6 ms for 45,758 characters,
  because a write drops the tab's cached value. Updating the cached value from the change would remove
  most of the 2 ms.
- **Loading, in Node.** Replicas load in 0.25 and 0.57 s. Tab documents load in 0.4 and 0.9 s when the
  worker sends the change hashes, and in 1.2 and 5.5 s when the tab computes them.
- **Node figures run higher for tab documents**, because Node here has no pointer compression. Above an
  empty realm of 17.6 MB, tab documents take 34.9 and 49.6 MB against 14.2 and 69.7 MB for replicas.

The burst case is the one where a tab document costs more. The model keeps one JS record per op, and
the same ops in typed arrays took 28 bytes per op in an earlier prototype ([HISTORY.md](../automerge-proxy/docs/HISTORY.md),
"What was checked").

## Automerge issues to investigate

Found while building the spike, against Automerge 3.5.0. None has been reported upstream.

1. **Non-canonical change bytes break saves.** `applyChanges` accepts a change whose preds are out of
   Lamport order, indexes it under the hash of those bytes, and exports it re-encoded under another
   hash. The heads name a hash no peer can reach, and `A.load(A.save(doc))` throws "mismatching heads".
   `heads.test.ts` reproduces it.
2. **A bad reference corrupts the document.** An unknown element or object in `applyChanges` panics
   inside the wasm; the document still reads in memory, but its save no longer loads.
3. **The cached view drifts after `A.merge`.** Properties of the document object disagree with a fresh
   load for 0.3 to 0.4% of keys. `drift.test.ts` reproduces it.
4. **`getConflicts` on `A.view(doc, heads)` ignores the heads** and reports the current conflicts.
5. **`A.encodeChange` writes some float64 values one unit in the last place off.** `A.decodeChange`
   returns the stored bits, but `A.encodeChange` of its result differs from the original bytes for 112
   of 794 non-integer values in a sweep, so a change rebuilt through Automerge gets another hash. The
   spike's encoder writes the stored bits.
6. **A remote change costs time proportional to the text it touches, per call**: about 19 ms at 45,000
   characters, and about as much for a batch as for one change.
7. **The format spec says sequence ops are sorted by element id**; saved documents store them in
   document order, which the tab's reader relies on.
8. **Some bad changes are accepted without an error.** A change with an unknown dependency waits in the
   queue, and a start op below the ops it depends on is accepted.
9. **The slim entry touches `WebAssembly` on import**, through wasm-bindgen's `new WebAssembly.Tag`.
10. **`A.encodeChange` sorts preds itself**, which hides issue 1 from anyone who encodes through it.
11. **`A.decodeChange` returns byte values as plain arrays**, and its `Op` type leaves out `elemId` and
    `insert`.

## Running

```bash
# Tests.
moon run worker-only-spike:test

# A corpus: 200 tasks, 3 documents of 400 paragraphs, 20 characters per change (1 for keystrokes).
node ../echo-client/docs/worker-only/corpus.mjs /tmp/corpus.json 200 3 400 20

# Memory in Node, and memory and write latency in Chromium.
node --expose-gc --conditions=source src/bench/memory.ts /tmp/corpus.json
node --conditions=source src/bench/browser/run.ts /tmp/corpus.json --tabs 1,2,3

# Wasm in the storage probe's bundle, and plugin wasm in a worker.
node --conditions=source src/bench/wasm/analyze.ts
node --conditions=source src/bench/wasm/run-manifold.ts

# Whether @dxos/automerge-proxy packs and imports as published.
moon run automerge-proxy:build && node src/bench/publish/pack.ts /tmp/pack
```

The browser benches use the pre-installed Chromium at `/opt/pw-browsers/chromium`; set `CHROMIUM_PATH`
to use another.

# @dxos/automerge-proxy design

Automerge documents in a tab that loads no Automerge. The tab holds each document as a model of
every op with its Automerge id, writes each change in Automerge's binary format and names it by its
SHA-256 hash, so its history and heads are the ones Automerge would have. A host that holds the real
Automerge documents checks each change and applies exactly its bytes.

## Why a package

1. The boundary is the contract, so it can be tested alone: tabs and a host over an in-memory
   transport, checked against real Automerge.
2. Nothing in it is ECHO-specific. ECHO supplies the transport (its `DataService` RPCs), the store
   (its Automerge host) and index copies.
3. Code outside DXOS that wants Automerge documents in a UI thread without wasm can use it.

## Entry points

The package is a subpath package: each namespace module has its own entry, and consumers import the
namespace they use (`import * as Repo from '@dxos/automerge-proxy/Repo'`). `dxos-subpath-imports`
rewrites a barrel import into that form, and `dxos-subpath-exports` checks the barrel against the
exports map. Importing only what a side needs is what keeps Automerge out of a tab.

| Subpaths                                                                   | Needs at runtime                     | Side  |
| -------------------------------------------------------------------------- | ------------------------------------ | ----- |
| `Automerge`, `Handle`, `Repo`, `Draft`, `Op`, `Wire`, `Contract`, `errors` | Nothing under `browser` or `workerd` | tab   |
| `Host`                                                                     | Automerge                            | host  |
| `testing`                                                                  | Automerge                            | tests |

In Node, importing `Automerge` loads and registers Automerge, so tests need no setup. The root
barrel re-exports every namespace, so it loads Automerge through `Host`; nothing in the repo imports
it.

## The tab document

`TabDoc` (in `Handle`) holds three things:

- **The model.** Every op with its id, in typed arrays. It answers reads at any version the tab
  holds: values, conflicts, `diff`, `view`, history and cursors.
- **The change table.** Each change's hash, actor, seq, dependencies and time.
- **The cached value.** A frozen JS value that each change's patches move forward, so a read never
  rebuilds the document.

A `change()` callback writes through a `Draft`, which behaves as Automerge's draft does and records
ops. The tab gives the ops their ids, encodes the change canonically and hashes it with
`@noble/hashes`. Heads read right after a write are final, because the host stores the same bytes
under the same hash. `changeAt(heads, fn)` writes on an older version, as Automerge's does.

A snapshot (`open`) and changes from the host (`receiveChanges`) enter the same model. Patches have
Automerge's shape: a local write that creates a container reports it empty and then its contents,
as Automerge does.

`Handle.DocHandle` wraps a `TabDoc` with the handle a repo hands out: `doc()`, `change`, `changeAt`,
`'change'` events, `whenReady` and the states the host reports.

## The namespace

`Automerge` exports Automerge's whole value API, and code imports it as `A` in place of
`@automerge/automerge`. A function that takes a document answers from the tab document when the
document carries a tab document's tag, and otherwise calls the registered Automerge. Functions that
make a document from nothing (`from`, `init`, `load`, `decodeChange`) use the registered Automerge
when the realm registered one, and make tab documents otherwise.

The namespace imports no Automerge itself. Its `#automerge-realm` import registers Automerge in
Node and is empty under the `browser` and `workerd` conditions. Elsewhere the code that holds
Automerge documents registers it: in ECHO, a replica tab's `RepoProxy` and the worker's
`AutomergeHost` call `registerAutomerge` when they are constructed.

`RawString`, `ImmutableString` and `Counter` are the tab's own classes, marked with Automerge's
registered symbols, and `instanceof` matches values from either side. A function a tab document
cannot answer, such as marks, blocks, sync messages or fragments, throws
`TabDocumentUnsupportedError` for one. The host refuses a counter increment from a tab.

## The contract

`Contract.ts` defines the payloads as effect Schemas. ECHO's `DataService` in `@dxos/protocols`
wraps them in its proxy RPCs (`subscribeProxy`, `updateProxySubscription`, `submit`) and adds the
subscription id and the space, so there is one definition.

`Repo.Host` is the host as a tab reaches it. `Repo.TabRepo` programs against it, and ECHO's
`TabClientRepo` implements it over the worker's `DataService`:

```ts
interface Host<Id extends string = string> {
  subscribe(
    request: { subscriptionId: string; clientId: string },
    handlers: { onEvents(events): void; onError(error): void; onClose(): void },
  ): () => void;
  updateSubscription(request: { subscriptionId: string; add?: Contract.Follow[]; remove?: string[] }): Promise<void>;
  submit(request: { subscriptionId: string; batches: Contract.SubmitBatch[] }): Promise<Contract.SubmitResult[]>;
  createDocument(changes: readonly Uint8Array[]): Promise<Id>;
  flush(documentIds: Id[]): Promise<void>;
}
```

| Event         | Carries                                                                    | Sent when                                                   |
| ------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `snapshot`    | The save with uncompressed columns, every change hash in save order, heads | A follow names heads the host does not hold                 |
| `changes`     | Change bytes the tab lacks, in causal order                                | Other tabs or peers write; a follow names heads it holds    |
| `caughtUp`    | Nothing                                                                    | The changes answering a follow are all sent                 |
| `ack`         | Hashes                                                                     | A save covered the tab's changes                            |
| `refuse`      | A hash and a reason                                                        | The host refused a change                                   |
| `copy`        | Heads and a value                                                          | The host has a copy outside Automerge, such as ECHO's index |
| `requesting`  | Nothing                                                                    | The document is not stored yet and is being fetched         |
| `unavailable` | Nothing                                                                    | The host cannot produce the document                        |

`submit` answers each document `accepted` or `unfollowed`; the acks and refusals come on the stream.
A refused change is dropped from the tab with every later change built on it, and a flush waiting
for it fails.

The repo keeps the contract safe to repeat. Every change is named by its hash, and both sides ignore
a change they hold, so a resend after a lost response or a restart changes nothing. Each stream gets
its own subscription id, so an answer meant for an earlier stream never lands on a later one. After
a dropped stream the repo subscribes again with backoff and follows every document with the heads
it holds; the host sends what the tab lacks, and the tab resends what the host lacks. While a follow
is unanswered the tab holds back that document's changes, then sends them in causal order, so the
host never gets a change before its dependencies.

Sends go at most ten times a second, the first after a pause at once, and `pagehide` sends at once.
A new document is created from the tab's first change: the host stores exactly those bytes, so the
document's heads are the tab's from the start. `TabRepo.import` creates one from another document's
whole history the same way, which is how ECHO forks a branch.

## The host

`Host.DocumentHost` implements `Repo.Host` over a `Host.Store` of Automerge documents and an
optional `Host.CopySource`. It borrows a document from the store only for the length of each call,
so the store alone decides what stays loaded.

For each followed document the host keeps a check index beside Automerge's document: each op's
object, key or element and kind, found by id, and the change table. Values stay in Automerge alone.
The index is built on the first follow, from the save with uncompressed columns and the hashes in
save order, and kept while any tab follows. A submitted change is refused, leaving the index as it
was, when any of these holds:

1. It does not decode, or its hash is not the one the tab claimed.
2. Its bytes are not the canonical encoding. Automerge indexes a change under the hash of the bytes
   it was given but exports it re-encoded, so other peers could never reach those heads.
3. A dependency is unknown, or its seq is not its actor's next.
4. An op names an object, element or pred missing from the version the change names, or sitting in
   another object, key or element, or it increments a counter.

Accepted changes queue. At most ten times a second per document, the host applies the queue as the
exact bytes the tabs sent, forwards them to the other followers, saves, and acknowledges each by
hash. Changes that reach the store any other way, through sync or a replica client, arrive through
`Store.onChanged`; the host adds them to the index and forwards them.

The save with uncompressed columns comes from Automerge's wasm handle, not its public API.
`internal/automerge.ts` keeps that access in one place, and the codec, model and check-index tests
read its output, so an Automerge upgrade that changes it fails there.

## Tests at the boundary

`/testing` supplies a `MemoryStore` of Automerge documents, a `Transport` that clones every call and
event after a random delay and can drop a stream as a restart does, and seeded random edits.

| Property                                                                                                                                             | Where                          | How                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------- |
| The model reads every sampled version, diff, conflict and cursor as Automerge does, loaded from saved bytes or from changes                          | `internal/model.test.ts`       | seeded                                        |
| The JS decoder reads every change as `A.decodeChange` does and the encoder writes it back byte for byte; a save read in JS yields Automerge's hashes | `internal/codec.test.ts`       | seeded                                        |
| The cached value equals the model read afresh after local, older-version, remote, refused and merged changes                                         | `internal/cache.test.ts`       | seeded                                        |
| Every change the check index accepts, Automerge applies and the model reads the same; it refuses the rest, and a refusal leaves it unchanged         | `internal/check-index.test.ts` | seeded                                        |
| A tab loads, applies, writes, encodes and saves where WebAssembly does not exist                                                                     | `internal/no-wasm.test.ts`     | a child process under the `browser` condition |
| Heads read right after a write are final and a version the host ends with; refusals name changes by hash; tabs resend exactly what a restart lost    | `internal/tab-doc.test.ts`     | seeded, over an in-memory host                |
| Tab documents read a merged document right where Automerge's own cached view drifts                                                                  | `internal/drift.test.ts`       | seeded, 300 rounds                            |
| With no Automerge registered, the namespace makes tab documents from nothing, and Automerge loads what they save                                     | `Automerge.test.ts`            | cases                                         |
| Tabs converge with the host across creation, imports, peers, refusals, restarts, send cadence, `pagehide` and random interleavings                   | `Repo.test.ts`                 | cases, and seeded interleavings               |
| The draft against `A.change`: the same calls give the same document or the same refusal                                                              | `Draft.test.ts`                | seeded, and 67 cases                          |
| The copy codec round-trips any value Automerge stores, including objects that look like its tags                                                     | `Wire.test.ts`                 | fast-check, 500 runs                          |

ECHO's `tab-repo.test.ts` in echo-client runs tabs over the real `DataService` and worker: writes
across tabs, final heads, concurrent text, anchors, history, and objects made before they join a
database. ui-editor's editor binding and shared text operations, and echo-doc's store adapter and
`AddOnlySet`, have their own tests over `TabHarness`. `withoutAutomerge` from `/testing` runs code as
a realm that registered no Automerge, as a proxy-mode tab in a browser is.

[MEASUREMENTS.md](./MEASUREMENTS.md) gives memory and latency against replicas, from the benches in
`scripts/bench`. [INTEGRATION.md](./INTEGRATION.md) is the plan that brought tab documents into ECHO,
with what each phase changed. [OP-IDS.md](./OP-IDS.md) and [HISTORY.md](./HISTORY.md) record the
design work behind op ids and history in the tab.

## Automerge 3.5.0 behaviour the design works around

Found while building tab documents. None has been reported upstream.

1. **`applyChanges` accepts bytes that are not canonical**, such as preds out of Lamport order. It
   indexes the change under the hash of those bytes, exports it re-encoded under another hash, and
   `A.load(A.save(doc))` then throws "mismatching heads". The host refuses such bytes, and
   `Repo.test.ts` shows the corruption without the check.
2. **A bad reference corrupts the document without an error**: an unknown object or element, a pred
   at another key, in another object or on another element, a delete or update with no pred, a map
   op on a list. The save then no longer loads. An insert after an element of another list panics in
   the wasm instead. The check index refuses all of these.
3. **A change that skips its actor's previous change breaks saves.** Automerge applies a seq 2 whose
   deps do not reach the actor's seq 1, then `A.load(A.save(doc))` throws "missing ops".
4. **An increment applies where it means nothing.** An `inc` whose pred is not a counter makes the key
   read as deleted; one with no pred changes nothing. The host refuses increments.
5. **The cached view drifts after `A.merge`.** Properties of the document disagree with a fresh load
   for 0.3 to 0.4% of keys. Tab documents read saved bytes and changes, never the cached view
   (`internal/drift.test.ts`).
6. **`getConflicts` on `A.view(doc, heads)` ignores the heads** and reports the current conflicts.
7. **`A.encodeChange` writes some float64 values one unit in the last place off**, so a change rebuilt
   through it gets another hash. The package's encoder writes the stored bits.
8. **`A.encodeChange` sorts preds itself**, which hides issue 1 from code that encodes through it.
9. **A remote change costs time proportional to the text it touches**, 13 to 19 ms at 45,000
   characters, and about as much for a batch as for one change.
10. **Sequence ops are stored in document order**, where the format spec says element id order. The
    tab's reader relies on document order.
11. **Some bad changes wait or pass silently.** A change with an unknown dependency waits in the queue,
    and a start op below the ops it depends on is accepted.
12. **The slim entry touches `WebAssembly` on import**, through wasm-bindgen's `new WebAssembly.Tag`,
    so the tab has its own `ImmutableString` and value classes.
13. **`A.decodeChange` returns byte values as plain arrays**, and its `Op` type leaves out `elemId` and
    `insert`.

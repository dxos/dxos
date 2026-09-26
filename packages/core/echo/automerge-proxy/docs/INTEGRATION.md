# Tab documents in ECHO: integration plan

A spike, `@dxos/worker-only-spike`, proved a fix for every blocker to a tab with no Automerge, and
met replica mode's bar on latency and memory. It is gone now: its tests live in the packages that own
the code (see "As built", item 17), and its measurements in [MEASUREMENTS.md](./MEASUREMENTS.md). This plan maps
that design and its five fixes onto ECHO's packages. It is judged by one measure: code outside ECHO's
core keeps working as it was written for replica mode. ECHO's core here means the packages that
implement the document backend: `@dxos/automerge-proxy`, echo-client, echo-host, protocols and
index-core. Everything else, echo-doc included, consumes documents.

## Short answer

1. **Packages outside ECHO's core change by import lines and configuration, never by logic.** On
   this branch they carry about 420 lines of production code for proxy mode. About 220 are mirror
   logic in ui-editor: the mirror binding, replica cursors, pending comments, `whenExact` and an
   `isProxy` branch. Another 50 are seeding hooks in two apps. A tab document answers the whole
   Automerge API, so the mirror logic goes, and the seeding stays with the spike. What stays is about
   130 lines and a lint rule: the document-mode setting and its config plumbing, three RPC stubs on
   EDGE, and one import line in each of about 15 files.
2. **Two seams carry the change, and the branch already has one.** `ClientRepo` and
   `ClientDocHandle` in echo-client let the database layer run on any backend. The `Automerge`
   namespace in `@dxos/automerge-proxy/Automerge` is the other: tab code calls Automerge through it,
   and it answers a tab document from its model and anything else from Automerge.
3. **The namespace decides at runtime, not at build time.** Vite resolves a specifier the same way in
   the page and its workers in dev, HOST mode and `recovery.html` run ECHO inside the page, and Node
   tests run host and client in one module graph. So one bundle serves both modes. The namespace
   imports nothing from Automerge, and a realm that holds Automerge documents registers Automerge at
   startup.
4. **The worker keeps its RPC slots and changes their payloads.** `subscribeProxy`,
   `updateProxySubscription` and `submit` carry saved bytes, change hashes and change bytes instead of
   JSON and positional ops. `resolveCursors` and `createCursors` go, since cursors resolve in the tab.
5. **Eight phases, each shippable behind `document_mode` with replica mode the default.** The backend
   lands first in `@dxos/automerge-proxy` and echo-host, then the adapter in echo-client, then the
   namespace switch downstream, then the mirror comes out.

## The measure

The branch's changes outside `@dxos/automerge-proxy` and the spike, from a file-by-file audit against
the merge base (c209b420):

| Kind                                                | Lines on the branch | Under tab documents                                                  |
| --------------------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| The seam: `ClientRepo`, `ClientDocHandle`, the mode | +340 / −116         | Stays                                                                |
| Mirror machinery                                    | +1,007 / −43        | About 890 lines go                                                   |
| Imports switched to the namespace                   | +16 / −21           | Stays, and about 15 more files join                                  |
| Index reads (query results carry document copies)   | +407 / −27          | Stays, deferred to the last phase                                    |
| Worker RPCs and the proxy host                      | +330 / −14          | Replaced: three RPC slots stay with new payloads, two cursor RPCs go |
| Tests, benches, measurement scripts, docs           | +3,540 / −13        | The mirror's tests go; the spike's move in                           |

The mirror machinery also leaks through the seam: four `instanceof MirrorRepo` probes in
`EntityManager`, two `instanceof MirrorDocHandle` probes, and four `A.isProxy` probes. None survives
this plan.

## The two seams

### `ClientRepo` and `ClientDocHandle`

`EntityManager` picks the repo from the document mode; everything above it (`ObjectCore`,
`DatabaseImpl`, queries, `Obj.*`) sees only the seam. In proxy mode the repo becomes a tab-document
repo instead of `MirrorRepo`:

| `ClientDocHandle` member | Tab document                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `doc()`                  | The cached value, tagged so the namespace can answer for any container in it               |
| `change`, `changeAt`     | `TabDoc.change` and `changeAt`, at any version the tab holds                               |
| `'change'` events        | `before`, `after` and patches from the tab document; `'bulk'` for a large delivery         |
| `whenReady`, `state`     | Ready once the snapshot is read; `'requesting'` and `'unavailable'` as the host says       |
| `whenSettledOnDisk`      | Whether the document was on the worker's disk, from the host's `requesting` or snapshot    |
| `update(fn)`             | Not available; its callers, `mergeBranch` and `syncBranch`, become worker calls in phase 7 |

The probes that leak through the seam each find a home or go:

1. `catchUp` (`waitUntilHeadsReplicated`) goes. Heads are real hashes, so `A.hasHeads` answers.
2. `editsRejected` moves into `ClientRepo`, and a replica never fires it. A refusal names change
   hashes and a reason instead of positional ops.
3. `primeCopy` and `findIndexed` fold into `ClientRepo.find(id, { copy })` in phase 8.
4. `instanceof MirrorDocHandle` in `Obj.version` goes: heads are final the moment a tab writes, so
   `versioned` is always true again, as in replica mode.

### The `Automerge` namespace

Tab code imports `* as A from '@dxos/automerge-proxy/Automerge'` wherever it calls an Automerge
function. Type imports stay on `@automerge/automerge`. The namespace follows three rules:

1. **Dispatch by document.** A function that takes a document answers from the tab document when the
   argument carries a tab document's tag, and otherwise calls the registered Automerge. This is the
   spike's `spikeOverrides`, with registration in place of `vi.mock`.
2. **Documents from nothing follow the realm.** `from`, `init`, `load` and `decodeChange` make tab
   documents when `EchoClient` runs in proxy mode, and Automerge documents otherwise. `EchoClient` sets
   the realm when it connects; a realm with no Automerge registered is a tab realm.
3. **No static import of Automerge.** The worker, HOST mode, `recovery.html`, EDGE and replica-mode
   tabs register the module after initializing its wasm. A proxy-mode tab never loads it. A Node build
   resolves a variant of the subpath that registers Automerge on import, so tests need no setup.

The namespace must export Automerge's whole value API, since replica-mode code reaches Automerge
through it too. Functions the tab answers are dispatched; the rest forward to the registered module
and throw a named error when a tab document reaches them. Three gaps from the spike close here:

| Missing                                       | Tab call sites | How it closes                                                                                        |
| --------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `RawString`, `ImmutableString`                | 12             | The tab's class, marked with Automerge's registered symbol and matching either class in `instanceof` |
| `equals`                                      | 5              | Automerge's deep equality is plain JS already; the namespace carries a copy                          |
| `emptyChange`, `saveSince`, `loadIncremental` | 3              | Forwarded: only the replica handle calls them, on Automerge documents                                |

Counters are not answered: the proxy never supported them and no ECHO code writes one. The worker
refuses an increment from a tab, and a peer's counter reads wrong in a tab until the model supports
them.

A lint rule enforces the import: in a package that runs in a tab, `@automerge/automerge` and
`@automerge/automerge-repo` may be imported only as types. The automerge-repo root statically imports
Automerge's slim entry, and echo-client takes three helpers from it (`interpretAsDocumentId`,
`stringifyAutomergeUrl`, `isValidAutomergeUrl`), which are a few lines to keep locally over `bs58check`,
the package automerge-repo uses for them, so the ids come out identical.
The devtools hook, which loads on every page, takes `cbor` from it and exposes Automerge itself to the
console; it switches to the namespace too.

**Why not an alias.** Resolving `@automerge/automerge` itself to the namespace in tab bundles would
leave imports untouched, but only a Vite worker plugin in a bundled build can resolve differently for
the page and a worker, plain `vite serve` cannot, and the page hosts ECHO in HOST mode and in
`recovery.html`. One specifier would also mean two modules in Node tests, where host and client share
a module graph. The explicit import costs one line per file and says what it does.

## Where the spike's code lands

| Spike file                                        | Destination                                                                                             | Replaces                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `model.ts`, `changes.ts`, `id-index.ts`, `ids.ts` | `@dxos/automerge-proxy`, internal modules                                                               | `Transform`, `Sync`                                 |
| `reader.ts`, `encode.ts`                          | `@dxos/automerge-proxy`, internal modules                                                               | `Wire` for documents; `Wire` stays for index copies |
| `sha256.ts`                                       | Deleted for `sha256` from `@noble/hashes`, which the tree already installs; see [Decisions](#decisions) |                                                     |
| `tab.ts` (`TabDoc`)                               | `@dxos/automerge-proxy/Handle`                                                                          | The mirror `DocHandle`                              |
| `sender.ts`, `network.ts`                         | `@dxos/automerge-proxy/Repo`, over the `Repo.Host` contract                                             | `ProxyRepo`'s submit loop and subscriptions         |
| `namespace.ts`, `immutable-string.ts`             | `@dxos/automerge-proxy/Automerge`                                                                       | Today's namespace, which re-exports Automerge       |
| `check-index.ts`                                  | `@dxos/automerge-proxy/Check`, host side                                                                | `Sequencing`, `AutomergeOps`                        |
| `host.ts` (`SpikeHost`)                           | `@dxos/automerge-proxy/Host`, over the same `Store`                                                     | `Host.DocumentHost`                                 |
| `client-handle.ts`                                | echo-client, a `ClientDocHandle` adapter                                                                | `MirrorDocHandle`                                   |
| `save.ts` (`saveNoCompress`)                      | echo-host, next to the Automerge host                                                                   |                                                     |

`Draft` and `Op` stay: the draft records every write, and `Op.apply` moves the cached value on a local
write. `Cursors` goes. `@dxos/automerge-proxy` keeps its shape, a client side that needs nothing at
runtime and a host side that needs Automerge, and ECHO keeps thin adapters as it does today:
`MirrorRepo` becomes a `ClientRepo` over `Repo` with a `Repo.Host` built from `DataService`, and
echo-host's `createProxyHost` keeps its `Store` over the Automerge host.

## The five fixes in place

| Fix                 | Where it lives                                     | What the integration adds                                                                                | Tests that move                        |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1. The cached value | `TabDoc` in `Handle`                               | The adapter forwards `before`, `after`, patches and source; `ObjectCore` is unchanged                    | `cache.test.ts`                        |
| 2. Loading          | The model in the package; hashes from `Check`      | The snapshot event carries saved bytes, hashes by actor and seq, and heads                               | `model.test.ts`, `codec.test.ts`       |
| 3. Send cadence     | `Repo`'s send loop                                 | `UpdateScheduler` at 10 a second and the `pagehide` send, as `RepoProxy` does                            | `pagehide.test.ts`                     |
| 4. Typed arrays     | The model                                          | Nothing outside the package                                                                              | `model.test.ts`                        |
| 5. The check index  | `Check`, held by `Host` for each followed document | Built on first follow and kept while a tab follows, so reloading an evicted document does not rebuild it | `check-index.test.ts`, `heads.test.ts` |

Two details carry over. The check index refuses a change whose version lacks its actor's previous
change, which Automerge applies and then cannot load, and it refuses increments. A loaded document
fits its arrays exactly and grows them by an eighth on its first write, so a document that is only
read carries no slack.

## The wire

The three proxy RPC slots stay on `DataService`, with their payloads from `Contract` as today. The
same six packages depend on `@dxos/automerge-proxy` before and after. Publishing it (a trusted
publisher, then dropping `private`) is deferred, and still has to happen before the branch lands.

| RPC                               | Today's payload                                                                              | With tab documents                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `subscribeProxy`                  | A stream of JSON events: snapshot, entry, recovered, caughtUp, copy, requesting, unavailable | A stream of events: snapshot, changes, ack, refuse, copy, requesting, unavailable |
| `updateProxySubscription`         | `add: Follow[]` with epoch, version, heads and the batch in flight                           | `add: Follow[]` with the heads the tab holds, if any                              |
| `submit`                          | Batches of positional ops against a version, answered applied, resync or stale               | Change bytes and their claimed hashes, per document, in order                     |
| `resolveCursors`, `createCursors` | Cursor positions at a version                                                                | Gone                                                                              |
| `createDocument`, `flush`         | Shared with replicas                                                                         | Unchanged                                                                         |

The events:

- **`snapshot`**: saved bytes, every change hash as 32 bytes keyed by actor and seq, and heads. The
  host writes the hashes from its check index, so no snapshot asks Automerge for them.
- **`changes`**: change bytes the tab lacks, in causal order, from other tabs or from peers through
  sync, batched per flush.
- **`ack`** names the hashes a save covered. **`refuse`** names a hash and a reason.
- **`copy`**, **`requesting`** and **`unavailable`** are unchanged.

A follow that names heads the host holds is answered with the changes since them; otherwise with a
snapshot. After a worker restart each tab follows again and sends every change it holds that the host
lacks, its own or another peer's, since every change a tab holds encodes to the bytes of its hash.

## The worker

echo-host keeps `createProxyHost` and its `Store` over `AutomergeHost`, with `applyChanges` added to
the stored document. For each followed document the host holds a check index beside Automerge's
document:

1. **First follow.** The host builds the index from `saveNoCompress` and the hashes
   `A.getChangesMetaSince` gives: 0.8 s across the keystroke space's 204 documents.
2. **Submit.** Each change is checked (hash, canonical bytes, dependencies, seq, its actor's previous
   change, start op, then each op against the index) and queued. A refused change leaves the index as
   it was.
3. **Flush.** Per document, at most ten times a second, the host applies the queue in one
   `A.applyChanges`, sends the changes to the other followers, saves, and acknowledges.
4. **Peers.** On `documentHeadsChanged` the host reads the changes since the heads it last forwarded,
   adds them to the index and forwards them.

The worker spends 13 to 14 ms per change on a 45,000-character text in either mode, nearly all of it
`A.applyChanges`; the check takes microseconds.

## Package by package

Lines are production code against the merge base, estimated for the plan's end state.

**Outside ECHO's core**

| Package                              | On the branch                                                                                         | After this plan                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `@dxos/ui-editor`                    | +233: mirror binding, replica cursors, pending comments, `whenExact`, a converter re-read, one import | 3 import lines (`automerge.ts`, `sync.ts`, `update-automerge.ts`)      |
| `@dxos/echo-doc`                     | 2 import lines                                                                                        | 5 import lines (`record.ts`, `store-adapter.ts`, `AddOnlySet.ts` join) |
| `@dxos/plugin-markdown`              | 3 import lines                                                                                        | The same                                                               |
| `@dxos/migrations`                   | `ClientRepo` types                                                                                    | The same, and 1 import line                                            |
| `@dxos/client`                       | Document mode from config (+28)                                                                       | The same, and the devtools hook's import                               |
| `@dxos/assistant`                    | Nothing                                                                                               | 1 import line (`util/diff.ts`)                                         |
| `@dxos/plugin-debug`                 | The document-mode setting (+59 / −8)                                                                  | The same; the index-reads choice waits for phase 8                     |
| `@dxos/functions-runtime-cloudflare` | Five RPC stubs (+32)                                                                                  | Three stubs                                                            |
| Apps (Tasks, TodoMVC, Composer)      | Seeding and measurement scripts, and Tasks creating a space for a new identity                        | Nothing: the scripts stay with the spike, and the Tasks change reverts |

The converter re-read in ui-editor's awareness extension fixes a stale converter after any
reconfiguration, so it can land on main by itself.

**ECHO's core**

| Package                 | Stays                                                    | Goes                                                                                                                                         | New                                                    |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `@dxos/echo-client`     | The seam, the mode, `editsRejected`, index reads         | `MirrorRepo`'s mirror parts, `MirrorDocHandle`, `mirror-atoms`, `replica.ts`, the position mapping in `text.ts`, `accessorCores`, the probes | A `ClientRepo` adapter over `Repo`; 6 import lines     |
| `@dxos/echo-host`       | `createProxyHost`'s store, creation leases, index copies | The mirror `DocumentHost`, JSON `Wire` on submit                                                                                             | `applyChanges` on the store; the host's flush          |
| `@dxos/protocols`       | The config enum, `QueryService` copies                   | The cursor RPCs                                                                                                                              | The proxy RPC schemas take the new `Contract` payloads |
| `@dxos/index-core`      | Everything, gated on index reads in phase 8              |                                                                                                                                              | Nothing                                                |
| `@dxos/automerge-proxy` | `Draft`, `Op`, `Contract`, the `Repo.Host` contract      | `Transform`, `Sync`, `Cursors`, `Sequencing`, `AutomergeOps`                                                                                 | The model, formats, `TabDoc`, `Check`, the namespace   |

## Order of work

Each phase is one pull request that leaves replica mode, the default, untouched.

| Phase | What lands                                                                                                                                                                                                                                    | Done when                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | The model, formats, `TabDoc`, `Check` and the namespace in `@dxos/automerge-proxy`, with the spike's package-level tests                                                                                                                      | Their tests pass; nothing outside the package changes                                                                                     |
| 2     | The host: `Host` and `Contract` for tab documents, the new payloads on `DataService`, and `applyChanges` on echo-host's store                                                                                                                 | Host tests with a fake tab pass: submit, refusal, flush, peers, restart                                                                   |
| 3     | The client: `Repo` over the new contract and echo-client's adapter; `EntityManager` picks it in proxy mode; echo-client's 6 files switch to the namespace                                                                                     | echo-client's suite passes in both modes; the spike's editor, cursor, store-adapter, history and restart tests pass over the real adapter |
| 4     | The namespace downstream: echo-doc, ui-editor, plugin-markdown, migrations, client devtools, assistant; the lint rule                                                                                                                         | No value import of Automerge left in tab packages; no `A.isProxy` left                                                                    |
| 5     | The mirror comes out: `MirrorDocHandle`, `mirror-atoms`, `replica.ts`, the `text.ts` mapping, ui-editor's mirror binding, pending comments and `whenExact`, and the package's `Transform`, `Sync`, `Cursors`, `Sequencing` and `AutomergeOps` | The downstream diff against main is the table above                                                                                       |
| 6     | No wasm in proxy tabs: Composer loads its wasm module lazily and initializes Automerge only in replica mode and HOST, and a build check fails if the page's static import graph reaches Automerge                                             | Composer in proxy mode instantiates no wasm; e2e suites pass in proxy mode                                                                |
| 7     | Branches and imports as worker calls: `createBranch`, `mergeBranch`, `syncBranch` and `repo.import` wait for the tab's pending changes ([HISTORY.md](./HISTORY.md), "Writes")                                                                 | Branch and migration tests pass in proxy mode                                                                                             |
| 8     | Index reads over tab documents: a write before the snapshot records positional ops at the copy's heads, and once the snapshot arrives the tab translates them at those heads, as `changeAt` does                                              | echo-client's index-read tests pass over the adapter                                                                                      |

Until phase 7, proxy mode refuses branch operations and imports, as the mirror does today. Composer's
default can move to proxy mode after phase 7, once 1, 2 and 3 tabs are measured against replica mode
in the app itself.

Phase 8 departs from OP-IDS.md's "Objects read from the index", which has the worker resolve a write's
positions against the copy and the copy carry the highest op counter. A tab holds the document by the
time it sends, so it resolves the positions itself, and a copy needs nothing it does not carry today.

## As built

Phases 1 to 7 have landed, phase 5's removals together with phases 2 and 3. The code departs from
the plan above in these places:

1. **Phases 2, 3 and 5 are one commit.** The new `Contract` replaced the mirror's events and
   requests, and `Host` and `Repo` were rewritten over it, so the mirror's tab side had nothing left
   to talk to. Keeping it for a commit would have meant two contracts in one package.
2. **The check index and `saveNoCompress` stay inside the package**, under `src/internal/` beside the
   host that uses them, instead of a `Check` subpath and an echo-host function. Nothing else calls
   them.
3. **`createDocument` carries the tab's first changes.** The host stores exactly those bytes, so the
   document's heads are the tab's from its first write. An initial change the worker wrote itself
   would be concurrent with the tab's early writes, and it hid them in 15 of 20 runs of a test.
4. **A follow answered with changes ends with `caughtUp`.** The tab holds back a document's changes
   while its follow is open, and sends them in causal order once `snapshot` or `caughtUp` arrives.
5. **`submit` answers each document `accepted` or `unfollowed`.** The acks and refusals come on the
   stream. `unfollowed` makes the tab follow the document and send again.
6. **The namespace follows registration, not the client's mode.** `from`, `init`, `load` and
   `decodeChange` use the registered Automerge whenever the realm registered one, and make tab
   documents otherwise; `EchoClient` sets nothing. A Node test that makes a document from nothing
   gets an Automerge document in either mode, and a proxy-mode tab in a browser gets a tab document.
7. **`A.isProxy` went with phase 3.** Its last caller, `ObjectCore.getUpdatedAt`, reads change times
   through the namespace's `getBackend`, which answers `getChangeMetaByHash` for a tab document.
8. **The class that holds Automerge documents registers Automerge.** `RepoProxy` and echo-host's
   `AutomergeHost` call `registerAutomerge` in their constructors. A replica tab, the worker, HOST
   mode and EDGE therefore register it with no code in the apps, and a proxy tab, which builds no
   `RepoProxy`, registers nothing. Phases 2 and 3 registered only in Node, so in a browser or on EDGE
   a replica's call through the namespace threw.
9. **The replica repo keeps importing Automerge.** `RepoProxy` and `DocHandleProxy` are what load
   Automerge in a replica tab, and the lint rule exempts them. Phase 6 makes them load only in
   replica mode.
10. **plugin-script's templates keep `@automerge/automerge`.** They are user scripts, loaded as raw
    source and run in the functions runtime, which has Automerge. echo-generator switched too, since
    it splices text with `A.splice`.
11. **`cbor` comes from automerge-repo's `helpers/cbor.js`**, which imports only `cbor-x`. The three
    url helpers live in echo-client's `automerge-url.ts` over `bs58check`. They match automerge-repo's
    for every url ECHO writes; a sub-document path is accepted without checking its segments.
12. **The editor and store-adapter tests moved to ui-editor and echo-doc**, beside the code they
    test. They run over `TabHarness` from `@dxos/automerge-proxy/testing`, the package's real repo,
    host and handles, with a peer merging into the host's store, and no mocks.
13. **The build check follows dynamic imports.** Composer loads `@dxos/react-client`, and with it all
    of ECHO, through a dynamic import, so a walk of static imports alone misses what a tab loads.
    `automergeGates` (`composer-app/src/vite/automerge-gates.ts`) walks both kinds from `main.tsx`
    and stops only at gates, the modules a page imports only when it holds Automerge documents: the
    wasm loader, echo-client's replica repo and client-services. Its first run found three routes:
    `main.tsx` importing the wasm loader, echo-client's barrel exporting the replica repo, and
    client-services reached through the first run's storage check.
14. **echo-client loads the replica repo only in replica mode.** `EchoClient` resolves a repo factory
    when it opens (`loadCreateRepo`) and hands it to each database. `RepoProxy` and `DocHandleProxy`
    left the barrel; `@dxos/echo-client/testing` exports `RepoProxy` for tests that tell the repos
    apart.
15. **Composer initializes Automerge once it has read its config**, when it knows whether the page
    hosts echo or keeps replicas. `documentModeFromConfig` from `@dxos/client` decides the mode as
    the client does. Replica boots measured the same before and after the move: medians of 2,111
    and 2,087 ms from a fresh profile, 3,452 and 3,490 ms on reload, three runs each.
16. **Branches and imports run in the tab, not as worker calls.** A tab document holds every change,
    so `repo.import` sends a saved document's history as the new document's changes
    (`TabRepo.import`), which the worker checks as it checks any creation. `A.merge` into a tab
    document applies the other document's changes in place and relays the ones the worker lacks, so
    `mergeBranch` and `syncBranch` work unchanged through `update`. Nothing waits on a worker call. A
    tab without Automerge reads a save only when it is change chunks, which is what the namespace's
    `save` writes; a compressed save from Automerge itself needs the reader to inflate columns (risk
    1).
17. **The spike is gone, and every one of its tests has a home.** Some behaviours had none after
    phases 1 to 7, so they were ported before the package was deleted:

    | Spike test                               | Now                                                                                                               |
    | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
    | `heads.test.ts`, `restart.test.ts`       | `internal/tab-doc.test.ts`; canonical bytes on the real host in `Repo.test.ts`                                    |
    | `pagehide.test.ts`, `foundation.test.ts` | `Repo.test.ts` (send cadence, bursts); ui-editor `tab-document.test.ts`                                           |
    | `drift.test.ts`                          | `internal/drift.test.ts`                                                                                          |
    | `hostless.test.ts`                       | `Automerge.test.ts`; echo-client `tab-repo.test.ts` and `migrate-document.test.ts`; echo-doc `AddOnlySet.test.ts` |
    | `edge.test.ts`                           | ui-editor `review/shared-code.test.ts`                                                                            |
    | `cursors.test.ts`, `history.test.ts`     | echo-client `tab-repo.test.ts`, and its branching and migration suites in proxy mode                              |

    The benches moved to this package's `scripts/bench`, not `tools/`, since they import its internal
    modules. The pack bench went, since the package's `pack` task packs it, and so did the wasm
    benches, whose findings are under "Wasm in the tab" in WORKER-ONLY.md. Rerun on the package, the
    benches give the spike's figures on the same machine.

18. **Composer's first-run storage check loads only client-services' storage entry.** It imported the
    package root, whose key modules instantiate sodium and whose profile archive reaches Automerge
    through automerge-repo's root. A fresh profile's first boot in proxy mode therefore loaded
    sodium's wasm and evaluated Automerge's JS, which made it about 150 ms slower than replica mode's.
    `@dxos/client-services/storage` exports `createStorageObjects` alone, and the build check now
    walks it instead of stopping at it.

echo-client's suite passes in both modes, 633 tests each. automerge-proxy passes 113 tests,
ui-editor 461, echo-doc 22 and `@dxos/client` 47 under CI's filter. Over the real adapter,
`tab-repo.test.ts` covers writes across tabs, final heads, concurrent text, anchors, history, update
time and objects made before they join a database, and `Repo.test.ts` covers restarts at the
package level.

Composer in proxy mode fetches no Automerge module and instantiates no wasm at all, on a fresh
profile's first boot or on reload, and edits persist across a reload in both modes. Composer's e2e
suite in proxy mode passes 28 tests and skips 15. Its one failure, "drag object into collection",
fails in replica mode too.

| Composer build | First boot, fresh profile | Reload   |
| -------------- | ------------------------- | -------- |
| Replica        | 1,957 ms                  | 3,722 ms |
| Proxy          | 1,954 ms                  | 3,409 ms |

These are medians of three runs of the app's own `composer.startup` total, both builds with item 18
in. Before it, proxy's first boot took 2,265 ms.

## Tests that move

| Spike test                                                                                                                                | Destination                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `model.test.ts`, `codec.test.ts`, `cache.test.ts`, `check-index.test.ts`, `no-wasm.test.ts`                                               | `@dxos/automerge-proxy`, against its `testing/` Automerge store           |
| `heads.test.ts`, `restart.test.ts`, `drift.test.ts`                                                                                       | `@dxos/automerge-proxy` for the contract; echo-client for the real client |
| `editor.test.ts`, `cursors.test.ts`, `store-adapter.test.ts`, `history.test.ts`, `hostless.test.ts`, `edge.test.ts`, `foundation.test.ts` | echo-client, over `EchoTestBuilder` in proxy mode, with no `vi.mock`      |
| `pagehide.test.ts`                                                                                                                        | `@dxos/automerge-proxy`, with the send loop                               |
| `bench/`                                                                                                                                  | Stays in the spike until phase 6, then moves to `tools/`                  |

The spike's tests reach unmodified ECHO code by mocking both `@automerge/automerge` and the namespace.
Once the namespace is the only runtime import in tab packages, the moved tests drop the mocks, which is
the check that nothing still calls Automerge directly.

## Decisions

Settled on 2026-09-26.

1. **Tab code imports the namespace by name.** No bundler alias, for the reasons under "Why not an
   alias" in [the two seams](#the-two-seams).
2. **Publishing `@dxos/automerge-proxy` waits.** The package stays private for now. The branch still
   needs it published before it lands, since public packages depend on it.
3. **SHA-256 comes from `@noble/hashes`.** No DXOS package has a synchronous SHA-256. The repo's own
   hashing calls WebCrypto's `subtle.digest`, which is async and so cannot run inside `change()`, or
   `node:crypto`, which browsers lack. Sodium's, under `@dxos/crypto`, runs as wasm in a browser.
   `@noble/hashes` is already installed, pulled in by automerge-repo's `bs58check` to checksum
   document urls, and Composer's page bundle carries it today. Cure53 audited it at 1.0.0. It matches
   the spike's own hash on every input of 0 to 4,095 bytes and runs 4 to 5 times faster in Node 24:
   2 µs against 10 µs for a 105-byte keystroke change, 24 µs against about 95 µs for 4 KB. The
   catalog takes the 1.8.0 already in the lockfile. The range `bs58check` asks for, `^1.2.0`, accepts
   it too, so a dedupe leaves the tab one copy.
4. **No project registry entry.** This document tracks the phases.

## Risks and open questions

1. **`saveNoCompress` is not public.** The package reaches it through the wasm handle behind a
   document, in `internal/automerge.ts`, and the codec, model and check-index tests fail if an
   Automerge upgrade changes it. Teaching the tab's reader DEFLATE would remove the dependency.
2. **A document's first load in the worker costs its hashes**: 0.8 s through `A.getChangesMetaSince`
   for the keystroke space, or 0.35 s through `A.topoHistoryTraversal`, whose order matches the save
   in every document measured but is not documented.
3. **Counters.** The model reads an increment as a new value, so a peer's counter reads wrong in a
   tab. No ECHO code writes counters.
4. **Changes from peers reach Automerge unchecked**, in both modes, as today.
5. **Costs the branch added to replica mode.** Index-core migration 0008 re-indexes every document
   once; `automerge-data-source` computes heads and stored fields for every indexed object; echo-host
   builds the proxy host whatever the mode. Phase 8 should gate them on index reads being on.
6. **EDGE keeps replica mode and real Automerge.** Shared code there calls the namespace, which
   forwards to the Automerge the functions runtime registers.

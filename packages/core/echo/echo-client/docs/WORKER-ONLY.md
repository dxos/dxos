# Worker-only ECHO: spike and API proposal

Status: built into ECHO's client services behind `runtime.client.document_mode`, which is off
(`REPLICA`) by default. Branch `claude/compassionate-davinci-z0634h`.

The tab-document design that replaces the mirror ([OP-IDS.md](../../automerge-proxy/docs/OP-IDS.md),
[HISTORY.md](../../automerge-proxy/docs/HISTORY.md)) had a spike for every row of
[Blockers](#blockers), which ran ECHO's own code, unmodified, over documents a tab holds with no
Automerge and no WebAssembly. It has since landed in ECHO
([INTEGRATION.md](../../automerge-proxy/docs/INTEGRATION.md)), and the spike's tests with it.

Tabs keep a JSON mirror of each document plus their own unconfirmed edits. Only the worker runs
Automerge. This document evaluates that design, describes the spike that tested it, and records how
it now fits into ECHO's services (see [Folding the proxy into client services](#folding-the-proxy-into-client-services)).
The early sections ran in Node over an in-process transport; later ones ran across the real worker
boundary in Chromium.

## Short answer

1. **The protocol works, and it survived an adversarial review.** Tabs and the worker converge in
   every fuzz run, including runs that restart the worker through the real client and service. A
   code review found 13 defects in the code around the transforms, among them lost and duplicated
   edits after restarts. The transforms themselves held. Every defect now has a fix and a regression
   test (see [Review findings](#review-findings)).
2. **ECHO runs on mirrors.** With `DX_ECHO_DOCUMENT_MODE=proxy`, 633 of the 664 echo-client tests
   that pass on replicas pass too. The 31 that fail are the areas this design changes on purpose:
   branches and edit history (23 of them), heads read in the same tick as a write,
   `meta.updatedAt`, tests that call Automerge on a proxied document, and tests that cut the byte
   protocol. In replica mode every test passes, the proxy tests included.
3. **A tab saves most of its Automerge memory.** In a Node model of one tab holding a space of 200
   tasks and three long documents, the replica costs 16 MB when typing arrives in 20-character
   changes and 72 MB when every keystroke is its own change. The editor writes one change per
   keystroke today, so 72 MB is the realistic case. The mirror costs 0.4 MB. A resident-memory check
   gives 67 to 110 MB against 1.2 to 1.5 MB. Compiled wasm adds several MB per renderer on top. These
   figures come from a Node model. The spike measured replicas and tab documents in Chromium (see
   [In Chromium](#in-chromium)).
4. **A JSON mirror cannot be drop-in for every Automerge library, so the proposal is a hybrid.**
   Tabs hold mirrors by default and a real Automerge replica of any document handed to code that
   needs the Automerge API. The replica syncs through the existing byte protocol and converges with
   the mirrors. A tab pays for Automerge only while it holds one: one long document costs 9 to 40 MB
   depending on its history. Libraries that expect automerge-repo's `Repo` also need a facade, in
   either design (see [Drop-in compatibility](#drop-in-compatibility)).
5. **The app can live with heads that advance only after the worker confirms a write**, given the
   heads audit's contracts and its versioning fixes. `db.flush()` resolves only once the tab has the
   confirmed heads, and an object with unconfirmed edits reports `versioned: false`. Both are
   implemented. Branch operations must queue behind pending edits, return the heads they used, and
   resolve after the tab has their result. That is not implemented.
6. **The largest blockers** are worker RPCs for branches, history and migrations, and shared
   operation code that calls Automerge through `Doc.Handle`. The editor works: it writes to the
   mirror and takes op-id cursors from a replica of its document that it holds while open (see
   [The editor in mirror mode](#the-editor-in-mirror-mode)).
7. **A tab can show objects whose documents the worker never loads.** The worker answers from its
   SQLite index, and a tab's first write to a document loads it and rebases the write. In Chromium,
   with ECHO in a dedicated worker and SQL query evaluation on, the Tasks app shows 1,000 items three
   times sooner than today while the worker holds one document instead of 1,001 (see
   [Index reads in the browser](#index-reads-in-the-browser)). Composer's nav tree lists 1,000
   documents in about 10 s instead of 31 s with 4 documents in the worker
   ([Index reads in Composer's nav tree](#index-reads-in-composers-nav-tree)). Sync still loads a
   document that receives remote changes, so this saves loads for reading, not for changes.
8. **Composer's e2e suite passes on proxies with index reads, after the fold-in into `DataService`:**
   28 passed and 15 skipped, and the one failure also fails on main. TodoMVC passes all 8 in both
   modes. Getting there took nine fixes, each with a unit test that reproduces its cause (see
   [E2E suites in mirror mode](#e2e-suites-in-mirror-mode)).
9. **The Cloudflare functions runtime keeps the byte protocol and Automerge.** EDGE's db-service
   serves commit blobs without building documents for reads (its indexer loads them separately), so
   the EchoClient there is what turns bytes into objects. EchoClient keeps both document backends
   behind one interface. `DataService` carries both protocols: the byte protocol, unchanged, and the
   proxy RPCs beside it.

## What the spike shows

| Question                                                         | How it was tested                                                                                                                                                                           | Result                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Do the transforms converge pairwise?                             | 30,000 random op-list pairs on nested documents under both conflict rules, plus 19 named edge cases from the review and 3 for a write against a delete                                      | All converge; 10,842 pairs dropped or split an op                                                                                                                                                                      |
| Do tabs and a worker converge on nested documents?               | 3,000 sessions of 400 random steps with 2 to 4 tabs and a remote writer, over maps, lists of maps and text inside lists                                                                     | Every tab matched the worker at the end of every session (115,582 entries); 34,875 stale batches rebased by the worker                                                                                                 |
| Does it hold against real Automerge, a remote peer and restarts? | 2,000 sessions with an Automerge worker, a peer editing its own replica and 4,470 abrupt restarts, modeled at the sequencer level                                                           | Every tab and the peer's document match the worker; 84,038 appended markers each appear exactly once                                                                                                                   |
| Does a refused change stay contained?                            | In the two fuzzes above, about one change in 30 holds an op no document fits, which the worker refuses                                                                                      | Protocol: 14,277 refusals, each reported once by its tab, plus 6,301 later changes that only made sense on top of one; tabs still converge. Automerge: 6,220 refused markers are gone and reported, the rest land once |
| Does it hold through the real client and service?                | 500 sessions of three mirror tabs with 1,801 worker restarts through `EchoTestPeer.restartHost`, with batches in flight and edits made while the worker was down                            | Every tab and the new worker's document converge; 13,924 edits, each in the list and the text exactly once                                                                                                             |
| Do the failure paths the review found hold now?                  | One regression test each: a failed save, a refused change, a resync, an orphaned delivery, a refused creation, a document still fetching, a dropped stream, reconnecting to the same worker | See [Review findings](#review-findings)                                                                                                                                                                                |
| Does ECHO run without Automerge in the tab?                      | The echo-client suite with `DX_ECHO_DOCUMENT_MODE=proxy`                                                                                                                                    | 633 of the 664 tests that pass on replicas pass; the 31 failures are areas the design changes on purpose                                                                                                               |
| Can comments and presence keep synchronous cursor reads?         | A worker-minted cursor read synchronously through an unconfirmed edit, remote edits, and a list insert that moves its text                                                                  | Positions correct; the text's path follows list edits; a replaced text leaves the cursor unresolved                                                                                                                    |
| Do replica clients and mirror tabs coexist?                      | A replica client writes, a mirror tab reads and writes back; one tab mixes mirrors with a replica                                                                                           | Both directions converge                                                                                                                                                                                               |
| Does an unmodified Automerge editor plugin run on a mirror?      | `@automerge/automerge-codemirror` 0.2.0 with its `@automerge/automerge` import pointed at a small shim, two tabs, 40 random concurrent edits                                                | Both editors and both mirrors converge                                                                                                                                                                                 |

The protocol fuzz reproduces with `MIRROR_FUZZ_SEEDS=30000` and the Automerge fuzz with
`MIRROR_FUZZ_SEEDS=2000`; CI runs a tenth of the first and 120 sessions of the second. The Automerge
fuzz fixes actor ids and change times per seed, so a failing seed replays exactly. The restart
fuzz through the client runs 3 sessions in CI and `MIRROR_FUZZ_SEEDS` sessions when set.

The sequencer-level restart fuzz found one weak spot. In 8 of the 2,161 recoveries that acknowledged
an in-flight batch, the batch resolved differently against history rebuilt from Automerge than
against the dead worker's entries. The tab rebuilt its visible state from the confirmed one, and every
tab still converged. A small persisted op log in the worker would remove the case.

The same fuzz found an Automerge issue, not a mirror one. After `A.merge`, Automerge 3.5.0 can leave
the properties of a document object out of step with the document: in one run a list reads `""`
where a fresh `A.load(A.save(doc))` has `"Rt195"`, and the elements after it shift. `A.toJS` and
`A.diff` over the same heads are correct. A script that replays the recorded steps with only
`A.load`, `A.change` and `A.merge` reproduces it, and the fuzz from before the per-change work showed
it in 1 of 2,000 sessions. The worker builds snapshots from those properties, and replica-mode ECHO
reads them too, so both can show the drift. It is listed for later investigation in the spike's
README. Tab documents read the worker's saved bytes and changes, so the drift cannot reach them.

## Memory

A space of 200 task documents, three documents of about 45,000 characters and the space root. Each
figure is one realm's V8 heap plus wasm linear memory above an empty worker thread
(`docs/worker-only/tab-cost.mjs`).

| Text history                                 | Replica in a tab  | Mirror  | Mirrors plus one long document as a replica | Automerge loaded, no document |
| -------------------------------------------- | ----------------- | ------- | ------------------------------------------- | ----------------------------- |
| Typed in 20-character bursts (6,845 changes) | 3.3 + 13.1 = 16.4 | 0.43 MB | 1.5 + 7.9 = 9.5 MB                          | 1.0 + 1.25 = 2.3 MB           |
| One change per keystroke (136,830 changes)   | 3.3 + 68.6 = 71.8 | 0.43 MB | 1.5 + 38.3 = 39.8 MB                        | 1.0 + 1.25 = 2.3 MB           |

Values are heap plus wasm in MB.

- **The keystroke row is the realistic one for typed text.** The CodeMirror binding makes one
  `changeAt` per editor update, RepoProxy ships the changes separately and the worker keeps them. The
  corpus has no deletions, so real typing costs more.
- **One replica costs more than its share.** Wasm linear memory keeps the high-water mark of loading,
  so the first long document in the hybrid costs over half of what all three do.
- **Resident memory is higher.** One process per mode, above an empty process: replica 67 to 76 MB
  (bursts) and 101 to 110 MB (keystrokes), mirror 1.2 to 1.5 MB, the Automerge module alone 8.7 to
  9.4 MB. TurboFan tier-up and committed heap pages account for the difference. Chromium commits
  less of its wasm memory than Node, so a browser may come in lower.
- **Load order moves the replica figure.** Loading the three documents before the tasks gives 12.8
  and 55.5 MB instead of 16.4 and 71.8.
- **The mirror side is complete.** With the real `Sync.ClientState` and a tab mid-typing, the mirror
  costs 0.56 to 0.69 MB.

Not counted above: the compiled code of the Automerge module, which a page heap snapshot estimated
at 7.4 MB together with Subduction's (the leader tab may share it with the worker). Tabs no longer
instantiate Subduction unless ECHO runs in the tab (`DX_HOST`), since abbf4983. Part of the saving
needs no mirror: compacting text history would bring the keystroke case close to the burst case, at
the cost of the history that branches and versioning read.

### In Chromium

The browser bench (`automerge-proxy/scripts/bench/browser/run.ts`) loads the same space into one
shared worker and opens one, two and three tabs, each holding the space as Automerge replicas or as tab
documents. Chrome counts wasm memory in its heap figure; the wasm share is in brackets.

| Tabs | Bursts, replicas | Bursts, tab documents | Keystrokes, replicas | Keystrokes, tab documents |
| ---- | ---------------- | --------------------- | -------------------- | ------------------------- |
| 1    | 14.3 MB (11.7)   | 12.8 MB               | 69.8 MB (67.2)       | 20.9 MB                   |
| 3    | 41.9 MB total    | 37.2 MB total         | 208.4 MB total       | 61.8 MB total             |

- **Each replica tab holds a second copy.** Its wasm memory equals the worker's, 11.7 and 67.2 MB, and
  it keeps that memory after dropping every document. A tab-document tab keeps 2.6 to 2.7 MB.
- **Tab documents carry the full history**, which ECHO's synchronous history APIs read, so they cost
  far more than the mirror's 0.4 MB. The model keeps ops and changes in typed-array columns, and a
  loaded document's arrays fit exactly.
- **A tab document is no slower than a replica anywhere the user waits.** A write takes 0.34 to 0.36 ms
  against 0.38 to 0.45 ms. Receiving another peer's keystroke and reading the text takes 1.8 to 2.0 ms
  against 12.8 to 13.2 ms. Loading the space takes 172 and 237 ms against 316 and 574 ms. The worker
  spends 13 to 14 ms applying each change to a 45,000-character text in both modes, so it applies each
  document's queued changes in one call.
- The spike's README describes the five fixes behind these figures: the tab's cached value moves
  change by change, loads take hashes as bytes, tabs send on RepoProxy's schedule, ops live in typed
  arrays, and the worker checks against a compact index instead of a second model.
- The JSON mirror's memory has not been measured in Chromium.

### Wasm in the tab

Read from the source and a full-catalog build, then checked in a browser with Composer's wasm probe.
With the default plugins and ECHO in the dedicated worker, a replica-mode tab instantiates one wasm
module at boot, Automerge's, and a proxy-mode tab none.

| Module                                 | Size of the .wasm | When the tab instantiates it                                                                                    |
| -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Automerge                              | 3.6 MB            | At boot, in replica mode and with `DX_HOST` (`initPageAutomerge` in `composer-app/src/main.tsx`)                |
| Subduction                             | 1.7 MB            | At boot, only with `DX_HOST`                                                                                    |
| Five sodium modules (hypercore-crypto) | 19 KB             | Only with `DX_HOST`. The first boot's storage probe imports `@dxos/client-services/storage`, which carries none |
| pica (in Excalidraw)                   | 2.5 KB            | Inserting an image into a drawing                                                                               |
| manifold                               | 490 KB            | Opening a Spacetime scene (experimental plugin)                                                                 |
| wnfs                                   | 1.0 MB            | The first `wnfs://` blob (experimental plugin)                                                                  |
| panproto                               | 7.3 MB            | plugin-library's atproto lenses (development builds only)                                                       |

SQLite runs in the worker. esbuild, Excalidraw's font subsetting and pdf.js run in their own workers,
and pdf.js falls back to its JS decoders because Composer passes it no wasm URL.

Automerge and sodium are out of proxy-mode tabs. panproto, with its core extension, is a follow-up;
manifold, wnfs and pica belong to plugins. The spike checked two of these. Its `bench/wasm/analyze.ts`
bundles the storage probe's import of
`@dxos/client-services`: 1,853 modules, carrying sodium, Automerge's `.wasm` and Subduction's base64
wasm. Importing the storage module directly bundles 924 modules and no wasm. Its `run-manifold.ts`
runs one manifold job in the page, which keeps 208.4 MB of wasm memory for good, and the same job in a
worker the page terminates when idle, which frees all but 1.0 MB.

The worker's own cost is unmeasured for the mirror. The sequencer keeps no copy of the document, so
the worker evicts it 30 s after its last call on it. It keeps up to 1,000 recent entries and 1,000
applied batch ids per followed document, about 0.7 MB at the full window. With tab documents the
worker keeps a check index beside Automerge: each op's object, key or element and kind, plus the
change table. In Node it takes 5.9 and 14.1 MB for the two spaces, against 11.7 and 67.2 MB of
Automerge wasm.

## Drop-in compatibility

Automerge code talks to two layers: functions on the document (`A.getHeads`, `A.diff`, `A.splice`,
marks, history) and automerge-repo's `Repo` and `DocHandle`. The survey below read what four
published libraries call.

| Tier | What the code calls                                                                               | Example                                                                                                               | On a mirror                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | The handle: `doc()`, `change()`, change events, `whenReady()`                                     | `automerge-repo-svelte-store` 2.6; `automerge-repo-react-hooks` 2.6, which also calls `handle.broadcast` for presence | Works, except `broadcast`, which neither ECHO handle implements today                                                                 |
| 2    | Recent history: `getHeads`, `equals`, `diff` between versions it saw, `splice`                    | `automerge-codemirror` 0.2                                                                                            | Works through local version tokens: the unmodified plugin, pointed at a shim, kept two tabs converged over 40 random concurrent edits |
| 3    | Rich text: marks and spans                                                                        | `automerge-prosemirror` 0.2 (`spans`, `mark`, `unmark`, `marksAt`, `updateSpans`, `view`)                             | Not supported; the op model has no marks                                                                                              |
| 4    | Op identity and full history: `getHistory`, `view` at any heads, `save`, op-id cursors, actor ids | devtools, history views, ECHO's own edit history                                                                      | Needs a replica                                                                                                                       |

The CodeMirror experiment vendors the MIT-licensed plugin, so it is not in the repository. It swaps
the plugin's one import of `@automerge/automerge` for a 57-line shim that serves `getHeads`, `equals`,
`diff` and `splice` from version tokens the tab mints for each state of its mirror.

A mirror can cover tiers 1 and 2 and could grow tier 3, but tier 4 needs the change graph, which only
Automerge has. So the requirement is met by construction instead:

- **Mirror by default, replica on demand.** `MirrorRepo.replica(documentId)` returns a genuine
  Automerge document handle for one document, synced through the byte protocol like any replica
  client. Any document-level function works on it, and the mirrors of that document, in the same tab
  and in others, converge with it one round trip later (`src/mirror/replica.test.ts`). It adds no
  Automerge document to a tab that never calls it, but Composer still loads Automerge's wasm in
  every tab (see [Blockers](#blockers)).
- **ECHO's own editor writes to the mirror and takes cursors from a replica.** The mirror binding
  (`ui-editor/.../collab/mirror/mirror.ts`) writes the editor's edits to the mirror and applies any
  other change as the smallest edit that makes the texts equal. Comments and presence need op-id
  cursors, so the editor also holds a replica of its document while open (see
  [The editor in mirror mode](#the-editor-in-mirror-mode)).
- **Repo-level libraries need a facade either way.** Neither `RepoProxy` nor `MirrorRepo` is an
  automerge-repo `Repo`, and neither handle implements `broadcast`, `heads()`, `history()` or `view()`.
  A thin `Repo` and `DocHandle` facade over replica handles would serve libraries like the React
  hooks, in either design.

Tab documents ([OP-IDS.md](../../automerge-proxy/docs/OP-IDS.md)) cover tiers 2 and 4 without a
replica: they hold every op with its Automerge id and the full history. The spike runs the unmodified
editor binding, ECHO's history functions and the store adapter over them. Tier 3 is still out, since the
model has no marks.

## API proposal

### Tab

The database layer talks to a `ClientRepo` and `ClientDocHandle` (`automerge/client-handle.ts`).
`RepoProxy` (Automerge replica, byte protocol) and `MirrorRepo` (JSON mirror) both implement them, so
EDGE keeps the first and tabs switch to the second.

- **`MirrorDocHandle`.** `doc()` returns a frozen JSON snapshot with structural sharing. `change(fn)`
  runs `fn` against a recording draft that behaves as an Automerge change callback's draft does: the
  same mutations and refusals, and drafts that keep their container through list edits. It refuses
  a few values Automerge stores lossily (nested `Map`, `Set`, functions, typed arrays) and
  Automerge's counter types, which the op model lacks. Text edits go through `A.splice` or
  `A.updateText`. Change events carry Automerge-shaped patches.
  `changeAt` works only at the current confirmed heads with nothing pending; `update` is not
  supported.
- **Heads.** `heads` are the last confirmed ones; unconfirmed edits do not move them. `pendingOps`,
  `hasPendingAt(path)` and the `confirmed` event expose what is still in flight.
- **`@dxos/automerge-proxy/Automerge`.** Automerge's own API, which code imports as `A` in place of
  `@automerge/automerge`. `getHeads`, `hasHeads`, `splice` and `updateText` answer a proxy document
  as well as an Automerge one, and `isProxy` tells the two apart; every other function is Automerge's.
  Branching, history, cursors and conflicts still need an Automerge document.
- **`MirrorCursors`.** `track(cursors)` asks the worker once, against the tab's confirmed heads and
  the text's confirmed path. `position(cursor)` is then synchronous: the tab moves positions through
  its own unconfirmed edits and every later change, and follows the text through list edits above it.
  `create(positions)` waits for confirmation when a position falls in text only this tab has seen,
  and moves the positions through what arrives meanwhile.
- **Flush.** `db.flush()` resolves once every earlier edit is confirmed, every document the tab
  created is back from the worker, and the heads are in the tab. It rejects if a submit or a creation
  fails, or if the worker refuses an edit. A document still being fetched does not hold it up.
- **Refused edits.** The worker writes each `change()` call whole or refuses it, which only happens
  when the tab's view and the worker's document disagree, so it means a bug. The tab takes the
  change back and reports it: the handle's `refused` event, then `db.editsRejected` with the refused
  ops, and a waiting flush rejects with `EditsRejectedError`. The repo logs each refusal and the
  worker logs the Automerge error.
- **`catchUp(documentId)`.** Resolves once the tab holds everything the worker's copy has now.
  `waitUntilHeadsReplicated` uses it, since a mirror cannot test whether heads are ancestors of its
  own.
- **`replica(documentId)`.** A real Automerge handle for code that needs the Automerge API.
- **`leaseReplica(accessor)`.** Holds a replica of the document behind a mirrored accessor until
  released, shared by every lease on that document. `inStep()` says whether the replica has
  everything the mirror confirmed while nothing of this tab's is in flight. The cursor helpers
  (`toCursor`, `fromCursor`, `getTextInRange`) resolve a mirrored accessor's cursors through the
  held replica and map positions through the difference between the two texts.

### Wire

`DataService`'s proxy RPCs (`protocols/src/DataService.ts`), beside its byte protocol:

| RPC                                                 | Purpose                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `subscribeProxy(subscriptionId, clientId, spaceId)` | Stream of document events                                                                |
| `updateProxySubscription(add, remove)`              | Follow documents; `add` carries `{ epoch, version, heads, inflight }` when catching up   |
| `submit(batches)`                                   | Apply batches of changes; `applied` once saved and on the stream, or `resync` or `stale` |
| `resolveCursors(documentId, path, heads, cursors)`  | Positions of Automerge cursors as of `heads`                                             |
| `createCursors(documentId, path, heads, positions)` | Cursors for positions as of `heads`                                                      |

Events: `snapshot` (says whether it contains the tab's in-flight batch, and which change of it the
worker refused), `entry`, `recovered` (for a tab that knew another epoch), `caughtUp` (ends the
answer to a tab that knew this epoch), `requesting` and `unavailable`.

Rules the review showed are needed:

- **An epoch names one numbering of one document**, and the worker starts a new one each time it
  starts following the document, including after its last subscriber left.
- **A tab has at most one catch-up per document in flight, and sends no batch for that document
  until it is answered.** The answer settles the batch in flight: acknowledged by an entry, contained
  in a snapshot, or not applied and never will be, in which case the tab sends it again.
- **The worker sends nothing before it is saved.** Entries wait in the document's queue until a save
  succeeds; a failed save keeps them for the next attempt. Batch dedupe is recorded when the change
  is committed.
- **Each `change()` call is written whole or refused.** A batch carries one list of ops per change.
  The worker writes them in order as one Automerge change and stops at the first that does not fit.
  The entry's `origin.refusedAt` names that change, and so does the change message, for a worker
  that restarts. The tab takes the refused change back, rebases the later changes as if it had never
  been made, and sends them again. A later change that only made sense on top of it is refused too.
- **Only the worker decides whether a change fits.** The tab shows the ops of each change that fit
  its view and sends the whole change. Taking a change back undoes exactly the ops the tab applied,
  and the later changes win a write-or-delete tie against the undo, since they were made after it.
- **A stream that ends without the tab closing it is replaced** after a backoff, and every document
  is caught up again.

Proposed next, not in the spike: `history`, `viewAt`, branch create, merge and sync, import and
export, migrations, change times for `meta.updatedAt`.

### Worker

- **`Sequencing.DocumentSequencer`** (`@dxos/automerge-proxy/Sequencing`) orders every write to a
  document into entries. Each tab batch is transformed over the entries its tab had not seen and
  written as one Automerge change, up to the first change that does not fit, with the batch id in
  the change message. Changes that arrive another way (network merges, replica clients) become
  entries through `A.diff`. After a restart, `recover` rebuilds the entries after a tab's confirmed
  heads from change metadata, so the tab recognizes its applied batch.
- **`Host.DocumentHost`** (`@dxos/automerge-proxy/Host`) serializes work per document, saves before
  it sends, ignores a batch it already applied, and sends `requesting` when a document is not
  stored. Once closed it refuses new calls and stops queued work. echo-host's `createProxyHost`
  builds it over the worker's Automerge host, with the index as the documents' copies, and
  `DataServiceImpl` serves it as RPCs.

### Shared

`@dxos/automerge-proxy` (see its [design](../../automerge-proxy/docs/DESIGN.md)): the op model in
`Op` (`put`, `del`, `insert`, `remove`, `splice` addressed by path, grouped into one `Op.Change` per
`change()` call) with `Op.apply` and `Op.invert`; `Transform.pair`, `Transform.lists` and
`Transform.changes`; `Sync.ClientState` (the tab's confirmed state, one batch in flight and a
buffer) and `Sync.Sequencer`; `Draft.Recorder`, the draft a `change()` callback writes through;
and the `Contract` schemas `DataService`'s proxy RPCs carry. Text splices transform as in ot.js, the
operational-transformation library CodeMirror's collaboration model follows. Map and list ops
transform by path, as in ShareDB's json0 type.

The package's property tests run clients against a real host through lost responses and restarts.
They and the three defects they found are in its
[design doc](../../automerge-proxy/docs/DESIGN.md#tests-at-the-boundary).

## What changes for app code

1. Heads advance about one RPC and one save after a write, plus up to 50 ms of submit throttling.
2. History, branches, migrations and binary import become asynchronous worker calls. History reads
   are synchronous today, and some run during render.
3. Minting a cursor is asynchronous; reading one stays synchronous after the first resolution.
4. `changeAt` against older heads goes away in the tab.
5. Between tabs of one worker, the later arrival wins when two writes hit the same key. Automerge
   picks by op counter and breaks ties by actor id. A write beats a concurrent delete of the same
   map key or list element, and an edit inside a deleted value is lost, both as in Automerge.
   Changes from other devices still merge by Automerge's rules, and concurrent text edits and list
   inserts merge in both.
6. Code written against the Automerge API asks for a replica of the documents it works on.
7. An edit the worker refuses disappears from the tab. Apps should listen to `db.editsRejected` and
   tell the user. A replica has no such case: Automerge refuses a bad write inside `change()`, and
   the mirror's draft refuses the same writes there too.

Tab documents remove items 1 to 6. Heads name a change's final hash as soon as it is written, history
reads and cursors are synchronous, `changeAt` works at any version the tab holds, and tabs merge by
Automerge's own rules because they write Automerge ops. Item 7 remains: the worker still refuses a
change that fails its checks, which only a bug in the tab can produce.

## Snapshot atoms

A mirror tab's document is a frozen JSON tree, and a subtree an edit did not touch keeps its
identity. So the atom can be the document instead of a copy of it. `MirrorDocHandle.atom` holds the
tree `doc()` returns, and an object's snapshot is a projection of its subtree. A replica has no such
tree. Its state is the Automerge document, and an atom can only copy it on each change, which is
what `Obj.atom` does today.

`mirror-atoms.test.ts` measures three ways to keep a snapshot atom for every mounted object while
one object is edited. The first column is the edit alone; the others are what the atoms add to it.

| Scenario                                        | Edit, no atoms | `Obj.atom` | Document atom | Routed projection |
| ----------------------------------------------- | -------------- | ---------- | ------------- | ----------------- |
| Small object (20 items), 50 mounted             | 0.095 ms       | +0.172 ms  | +0.187 ms     | +0.164 ms         |
| Large object (1,000 items), 50 mounted          | 0.185 ms       | +3.156 ms  | +0.381 ms     | +0.422 ms         |
| 200 objects inline in the root, one title typed | 0.131 ms       | +0.212 ms  | +0.453 ms     | +0.170 ms         |

- `Obj.atom` walks the proxy and copies the whole object on every change, so its cost grows with
  the object.
- The document atom projects each object from one atom per document. Unchanged subtrees keep their
  identity, but every object in the document recomputes when any of them changes, which is why it is
  slowest with 200 objects inline in the space root.
- The routed projection listens to the object's own update event and projects only that object. It
  costs about the same as the others on small objects and about an eighth of `Obj.atom` on the large
  one.

All three send one notification per edit in the benchmark. The projections match `Obj.atom`'s
value, symbols and meta included, and keep the identity of unchanged items; `Obj.atom` never does.

## Reading objects from the index

The worker's SQLite index already holds every object's JSON. A mirror tab can ask for an object's
document in `copy` mode, and the worker answers from the index without loading the Automerge
document. The tab's first write to the document switches it to live. The tab resubscribes from the
heads the index copy was read at, the worker loads the document, and its recovery path sends what
changed since those heads. That rebases the write the way a restart does.
`runtime.client.proxy_index_reads` (or `DX_ECHO_PROXY_INDEX_READS`) turns it on for a proxy client;
it is off by default. With it on, query results also carry the copies, so a listed object needs no
second round trip.

The index copy is used only when it reproduces the document exactly. After the switch, recovery
sends only what changed since the index heads, so a field the copy got wrong would stay wrong in the
tab, and the worker would refuse a write to a path that exists only in the tab's copy. The object
snapshot store keeps two columns for that beside each object's JSON:

- `heads`: the document's heads when the indexer read the object.
- `stored`: the document's `access` and the object's stored `system` and `meta`. The JSON form
  reshapes these. It drops `createdAt`, `kind` and empty meta containers and re-parses references,
  and a test comparing every document both ways found each of those differences.

A tracker migration re-presents every document to the snapshot store once, so existing rows gain
both columns. The worker serves a document live instead when its objects were read at different
heads (so the space root and inline objects stay live), or when one holds a value JSON cannot carry:
bytes, a date, or a string over 300,000 characters, which ECHO stores as `RawString`. It reads every
document a subscription asks for with one query, and after an index pass it pushes only the followed
documents that pass changed, switching one to live if its copy stopped being exact.

| Question                                                                           | Result                                                                                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does a tab show objects whose documents the worker never loads?                    | 10 objects shown, 0 documents loaded; a write loads only its own                                                                                  |
| Does a query show objects without loading their documents?                         | Yes, with SQL query evaluation ([#13288](https://github.com/dxos/dxos/pull/13288)) on                                                             |
| Does a remote edit reach a tab reading from the index?                             | Yes, after the next index pass                                                                                                                    |
| Does a write against an index copy that missed an insert land where the tab meant? | Yes, recovery rebases it                                                                                                                          |
| Does a write survive arriving with the index copy, or a worker restart in flight?  | Yes. Before a fix, both left the write unsent                                                                                                     |
| Is the index copy identical to the worker's copy?                                  | Yes for plain values, references, meta keys, typed objects, a parent, a relation and a deleted object; an object holding bytes falls back to live |
| Does a copy that stops being exact hand over to the live document?                 | Yes, when the tab's object gains bytes                                                                                                            |

None of the following blocks a rollout. Index reads depend on mirror tabs, so as built they ship with
worker-only ECHO or after it.

Limits on what it saves:

1. **A document that changes remotely still loads.** When a peer changes a document the worker has
   evicted, the collection-sync diff leases it until it syncs (`_leaseUntilSettled`), and the save
   reindexes it, so the index copy follows. Collection sync that works without loading would leave
   only the load for indexing.
2. **The space root and inline objects stay live.** Objects get their own document by default, so
   this is one document per space plus whatever is inlined. A per-document snapshot table would
   serve those too.
3. **A tab keeps a document live after editing it** until it reloads.
4. **Index lag.** An edit in another tab reaches a tab reading from the index in 51 ms median and
   84 ms at most, in Node, and in 200 to 460 ms in the Tasks runs below. Pushing from the worker's
   copy while it is loaded would remove most of that.
5. **Upgrading re-reads every document once.** The reindex migration loads each document the first
   time a worker opens an existing database.

## Index reads in the browser

TodoMVC and the Tasks app run the whole path in Chromium: ECHO in a dedicated worker behind the real
worker transport, proxy tabs, SQL query evaluation and index reads. `DX_ECHO_DOCUMENT_MODE=proxy` at
build time turns on proxy tabs, `DX_ECHO_PROXY_INDEX_READS=true` adds index reads, and `?seed=N`
fills the list. `packages/apps/todomvc/scripts/measure-echo.mjs` measures a served build in the mode
it was built with (`APP=tasks` for Tasks). The numbers below predate the fold-in, when a `?echo=`
parameter chose the mode per page load.

Four changes made that work beyond the Node tests:

1. The worker's services serve the proxy protocol (then a separate `MirrorService`, now part of
   `DataService`), and `Client` chooses proxies from its config.
2. The worker transport encodes every `Schema.Unknown` as strict JSON and fails on a RawString,
   bytes or a date. Mirror values now cross it with those leaves tagged (`Wire.encodeEvent`,
   `Wire.encodeChanges` and their inverses).
3. The index copy lives in snapshot columns rather than in the snapshot JSON, which SQL query
   results now carry.
4. Queries run in SQL, which is now the worker's default.

Time until every item is on screen, with a fresh page and worker per run on data seeded in replica
mode. About 2 s of each is boot, the same in every mode. Medians of three runs for 200 items, of two
for 1,000.

| App, how it lists         | Items | Mode    | Shown after | Worker documents | Worker heap | Worker buffers | Tab buffers |
| ------------------------- | ----- | ------- | ----------- | ---------------- | ----------- | -------------- | ----------- |
| Tasks, a query            | 200   | replica | 3,662 ms    | 201              | 19.0 MB     | 48.9 MB        | 28.4 MB     |
|                           |       | mirror  | 3,306 ms    | 201              | 19.2 MB     | 48.0 MB        | 24.3 MB     |
|                           |       | indexed | 2,670 ms    | 1                | 16.0 MB     | 42.7 MB        | 24.3 MB     |
|                           | 1,000 | replica | 10,144 ms   | 1,001            | 30.2 MB     | 75.8 MB        | 45.6 MB     |
|                           |       | mirror  | 7,419 ms    | 1,001            | 30.4 MB     | 71.6 MB        | 25.3 MB     |
|                           |       | indexed | 3,337 ms    | 1                | 16.8 MB     | 45.6 MB        | 25.3 MB     |
| TodoMVC, refs from a list | 200   | replica | 4,697 ms    | 202              | 19.6 MB     | 49.1 MB        | 28.9 MB     |
|                           |       | mirror  | 4,583 ms    | 202              | 19.8 MB     | 49.2 MB        | 24.5 MB     |
|                           |       | indexed | 3,830 ms    | 1                | 16.6 MB     | 42.8 MB        | 24.5 MB     |

- With index reads the worker holds one document, the space root. A query-driven list of 1,000
  shows three times sooner than today, and its worker holds 13 MB less heap and 30 MB less buffer
  memory, about 44 KB per small document.
- A mirror tab holds 4 to 20 MB less buffer memory than a replica tab. It still initializes
  Automerge's wasm, about 24 MB of buffers, so tab memory cannot fall to the mirror's own cost until
  that goes.
- TodoMVC at 1,000 takes 22 to 33 s in every mode, with a page heap of 180 to 300 MB. Its list
  rendering dominates there, so those runs say nothing about the backends.
- A write in index-read mode loaded exactly one document, and the change survived a reload in
  replica mode.
- A second tab, proxying through the first tab's worker and reading from the index, saw an edit from
  the first in 200 to 460 ms in Tasks, and in 1.6 s in TodoMVC at 1,000, where rendering dominates.
- Seeding 1,000 items at once in replica mode hits one 30 s RPC timeout, in today's path, and every
  item still arrives. The runs themselves log no errors besides EDGE being unreachable.
- EDGE is unreachable from the sandbox, so none of this measures sync.

## Index reads in Composer's nav tree

Composer takes the same switch: the build variables, or the ECHO documents choice in its debug
settings. `packages/apps/composer-app/scripts/measure-navtree.mjs` seeds a space with markdown
documents through the `markdown.create` operation, opens its Collections branch, and times the
served build until every document row is in the nav tree. Each run relaunches the browser on the
same profile, so every run starts a fresh worker on the same data. The runs below chose each mode
with a `?echo=` parameter, since removed.

The nav tree lists a space's documents with an ECHO query that follows its root collection's
`objects` refs, and each row reads the live object for its label. With SQL queries and index reads,
neither the query nor the rows load a document in the worker.

| Documents | Mode    | First row     | All rows      | Worker documents | Worker heap | Worker buffers | Tab buffers |
| --------- | ------- | ------------- | ------------- | ---------------- | ----------- | -------------- | ----------- |
| 200       | replica | 7.4 s         | 7.4 s         | 213              | 23.3 MB     | 37.6 MB        | 25.8 MB     |
|           | mirror  | 6.6 s         | 6.6 s         | 209              | 23.3 MB     | 36.7 MB        | 20.4 MB     |
|           | indexed | 6.7 s         | 6.7 s         | 4                | 19.7 MB     | 29.6 MB        | 20.4 MB     |
| 1,000     | replica | 8.8 s         | 30.9 s        | 1,010            | 35.6 MB     | 71.1 MB        | 45.7 MB     |
|           | mirror  | 5.8 s         | 13.9 s        | 1,009            | 37.2 MB     | 67.8 MB        | 20.7 MB     |
|           | indexed | 8.7 to 12.4 s | 8.7 to 12.4 s | 4                | 21.5 MB     | 35.9 MB        | 20.7 MB     |

Medians of three runs for 200 documents; both runs for 1,000. About 5.5 s of each run is boot.

- At 1,000 documents the nav tree takes 31 s today, 14 s on mirrors and 9 to 12 s with index reads.
  With index reads the worker holds 4 documents instead of 1,010, and about 50 MB less memory.
- A mirror tab holds 25 MB less buffer memory than a replica tab at 1,000 documents.
- With index reads every row arrives at once, since one SQLite query answers the whole subscription
  request. Answering it in chunks would show the first rows sooner.
- Opening a document failed in mirror mode when these numbers were taken: the markdown editor
  called Automerge on the tab's copy of the document and threw `RangeError: must be the document
root`. [The editor in mirror mode](#the-editor-in-mirror-mode) fixes it.

## The editor in mirror mode

An editor over a mirrored document writes to the mirror and takes op-id cursors from a replica of
the document (`ui-editor/.../collab/mirror/mirror.ts`).

1. **Text.** `automerge(accessor)` sees a mirror document and returns `mirrorSync`. The editor's
   transactions become splices on the mirror, and any other change reaches the editor as the
   smallest edit that makes the two texts equal. The object reads what the editor wrote at once.
2. **Replica.** While open, the editor leases a replica of its document with `leaseReplica`. A
   document the tab just created opens once the worker names it. Every lease on a document shares
   one replica, and the last release closes it.
3. **Cursors.** Comments and presence need op-id cursors, which only Automerge mints. The replica
   trails the mirror by a round trip, so the converter maps positions through the difference
   between the two texts, and there are no cursors until the replica holds the text. Text typed a
   moment ago has no cursor until the worker has applied it, so `createComment` waits for the
   converter's `whenExact()`, which resolves once the replica has caught up, and follows the
   selected range through edits made meanwhile.

The first version moved the editor onto the Automerge binding over the replica once the two texts
agreed. That broke reads: the editor then wrote to the replica while the object still read the
mirror, which hears of each edit a round trip later. A new thread took its name from the object
right after typing and came out empty, and a reply read its draft before the text had arrived.

A tab holds Automerge for each document open in an editor. The saving is for documents that are
only listed, queried or shown. [OP-IDS.md](../../automerge-proxy/docs/OP-IDS.md) proposes how the
editor could run on the proxy alone: the tab mints Automerge's op ids for its own edits and receives
everyone else's, so cursors and recent history need no replica.

## E2E suites in mirror mode

`DX_ECHO_DOCUMENT_MODE=proxy` and `DX_ECHO_PROXY_INDEX_READS=true` at build time run a whole bundle on
proxies with index reads; `Client` reads them from the build's env in config. These runs used
Chromium in the cloud sandbox with 2 workers, after the fold-in into `DataService`.

| Suite              | Replicas                        | Proxies with index reads        |
| ------------------ | ------------------------------- | ------------------------------- |
| Composer, 44 tests | 26 passed, 3 failed, 15 skipped | 28 passed, 1 failed, 15 skipped |
| TodoMVC, 8 tests   | 8 passed                        | 8 passed                        |

A page of each TodoMVC bundle reported which repo its space uses (`{"proxy":true}` and
`{"proxy":false}`), so the mode under test is the one the bundle was built with.

The replica run's two extra failures, "host and guest can see each others' changes in same document"
and "settings sync across devices", pass alone, twice each. Both drive two peers and take 1 to 1.6
minutes of their 90 s limit even alone, so a second worker on this 4-core sandbox pushes them over.
The collaboration test failed the same way once on proxies. That it also fails on replicas shows the
flake is not the proxy's.

Before the fold-in, the spike's runs gave 28 passed, 1 failed and 15 skipped in both modes, and
TodoMVC passed all 8.

The failure in both modes, "drag object into collection", also fails on main's own CI
(the runs for `08cddf6a` and earlier): after the drag, Collection 1 shows both at the top level and
inside Collection 2.

The other suites have no worker and no mirror tabs, so they ran in today's mode only. All pass:
rpc-tunnel (4), lit-grid (3), react-ui-mosaic (7), react-ui-canvas (17), react-ui-canvas-compute
(6), plugin-kanban (5), react-ui-table (9) and plugin-sheet (3). plugin-script's 5 tests skip
without deployed functions. react-ui-table and plugin-sheet each failed their first two tests once:
two tests waiting on the same cold story compile passed the 30 s wait on this 4-core sandbox. Both
pass on a rerun, and plugin-sheet passes with one worker.

The first mirror-mode run passed 24 tests. Each fix since then has a unit test that reproduces its
cause:

| Symptom in the suite                                  | Cause                                                                                                | Test                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Documents did not open                                | The editor called Automerge on a mirror document                                                     | `mirror.test.ts` (ui-editor)                |
| Comments on a new document had no highlight           | A document the tab created has no id until the worker names it, so the editor leased no replica      | `replica.test.ts`, `mirror.test.ts`         |
| Comments failed when several editors opened at once   | Concurrent `replica()` calls got a replica repo that had not finished opening                        | `replica.test.ts`                           |
| Anchors collapsed to the end of the text              | A comment made right after typing asked for cursors the replica could not have yet                   | `mirror.test.ts`: a comment made before...  |
| Anchors one character early                           | At the edge of a pure insertion, positions mapped before the inserted text                           | `replica.test.ts`: cursors map positions... |
| New threads had empty names, replies had empty bodies | The editor wrote to the replica while the object read the mirror, a round trip behind (first design) | `mirror.test.ts`: the editor writes to...   |
| Typed text landed mid-line in the two-peer test       | A remote insertion at the caret left the caret in front of it, so End stopped at the wrap point      | `mirror.test.ts`: a remote insertion...     |
| Remote carets drawn in the wrong place                | The awareness extension read the cursor converter once, when it was created                          | Covered by the two-peer test                |
| Unhandled rejections at teardown                      | A lease's `ready` rejected when the client closed while its replica opened                           | `mirror.test.ts` runs clean                 |

## Folding the proxy into client services

Built, behind a switch that is off by default. A proxy tab reaches documents through one service,
`DataService`, and the separate `MirrorService` is gone.

| Service         | What it carries                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataService`   | The byte protocol for replicas (`subscribe`, `updateSubscription`, `update`), unchanged. Beside it the proxy RPCs: `subscribeProxy`, `updateProxySubscription`, `submit`, `resolveCursors`, `createCursors`. `createDocument`, `flush`, heads, sync state and stats serve both. |
| `QueryService`  | With `documentCopies` in the request, the index copy of each result document that is new to the query or whose heads moved, so a listed object shows from the query's own round trip.                                                                                           |
| `MirrorService` | Removed.                                                                                                                                                                                                                                                                        |

The proxy RPCs' payloads are the proxy package's `Contract` schemas, so the RPC schema cannot drift
from the package. In the worker, `DataServiceImpl` serves the `Host.DocumentHost` that
`createProxyHost` builds over the Automerge host, with the index as its copies. In the tab,
`MirrorRepo`'s `Repo.Host` adapter calls `DataService`; `Repo.ProxyRepo` and `Handle.DocHandle` did
not change.

The worker leases a document a proxy tab uses only for each call on it, as the replica synchronizer
does after its first send. The Automerge host evicts a document 30 s after its last lease, so a tab
that keeps editing keeps the document loaded, and one that stops lets it go. The next edit, or a
remote change, loads it again. A document followed through its index copy is not loaded at all,
since the point is not to load it.

A document a proxy tab created used to stay leased in the worker for good: `createDocument` leases it
until a client follows it, and only the byte protocol released that lease. Following it through
`updateProxySubscription` now releases the creation lease, and the eviction delay decides from there.

### The switch

Configured like the SQL query executor: a `runtime.client` field in `config.proto` with an
environment variable, resolved once where it enters, so nothing below reads config or the
environment.

```proto
enum DocumentMode {
  UNSPECIFIED_DOCUMENT_MODE = 0;
  REPLICA = 1; // The default.
  PROXY = 2;
}

optional DocumentMode document_mode = 19 [ (env_var) = "DX_ECHO_DOCUMENT_MODE" ];
optional bool proxy_index_reads = 20 [ (env_var) = "DX_ECHO_PROXY_INDEX_READS" ];
```

| Question           | Query executor (`query_executor`)                               | Document mode (`document_mode`)                                                  |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Values, default    | `MEMORY`, `SQL`; `SQL`                                          | `REPLICA`, `PROXY`; `REPLICA`                                                    |
| Resolution         | `EchoHost` option, config, `DX_ECHO_QUERY_EXECUTOR`, then `SQL` | config, `DX_ECHO_DOCUMENT_MODE`, then `REPLICA`                                  |
| Resolved in        | `EchoHost`, from `runtimePropsFromConfig` in the worker         | `Client` maps config; `EchoClient.connectToService` falls back to the env        |
| Tests pick it with | `EchoTestPeer({ queryExecutor })`                               | `EchoTestPeer({ documentMode })`, or `createClient({ documentMode })` per client |
| Non-default value  | `MEMORY`: queries load documents and run in JS                  | `PROXY`: the tab builds `MirrorRepo` and sends op batches                        |

The environment variable reaches a browser tab through the build: the config plugin copies every
`DX_*` variable into `runtime.app.env`, and `Client` reads it there. Vite puts no `DX_*` variable in
`import.meta.env`, which is also why `DX_ECHO_QUERY_EXECUTOR` has no effect in a browser build.

The tab reads the switch, not the worker. Queries run in the worker, so the worker picks the
executor, but the worker serves both kinds of tab at once. Its proxy RPCs cost nothing until a tab
calls them, because `Host.DocumentHost` loads no document and reads no index until a subscription
follows one.

Each client decides for itself, so no process-wide setting remains, which HOST mode needs. An object
made before it joins a database keeps an Automerge document in every mode, since no database is
known yet, and joining a proxy database copies its value.

Composer's debug settings offer the three choices (replicas, proxies, proxies read from the index)
and write the two fields to stored config, like the storage adaptor beside them. `MirrorRepo` counts
every refused edit in `dxos.echo.edits.rejected` through `trace.metrics`, and the worker logs each
refusal as an error with the Automerge error attached, so observability collects both without
knowing about ECHO. Neither carries the refused ops, which are user content.

### Order of work

| Step | Change                                                                                               | With the switch off                            | State   |
| ---- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------- |
| 1    | `document_mode` and `proxy_index_reads`; `Client` resolves them; the spike's options and `?echo=` go | Nothing changes                                | done    |
| 2    | `DataService` gains the proxy RPCs over `Host.DocumentHost`; `MirrorService` goes                    | Nothing calls the new RPCs                     | done    |
| 3    | `QueryService` results carry index copies when the client asks                                       | Queries ask for none                           | done    |
| 4    | `ReplicaService` takes the byte protocol                                                             | Would have moved replica tabs to a new service | dropped |
| 5    | Composer offers the modes as a setting, and refused edits go to telemetry                            | Only tabs that opt in run the proxy            | done    |
| 6    | The default flips to `PROXY` once the conditions below hold                                          | `REPLICA` is the off position                  |         |
| 7    | After two releases on the new default, `REPLICA` goes as a mode for tabs                             | Replicas remain on lease and for EDGE          |         |

Step 4 is dropped, and both protocols stay on `DataService` for good. Against main, the fold-in only
adds five RPCs and optional fields, so edge needs no change.

A separate `ReplicaService` would only have fixed the names. Once `PROXY` is the default, most
clients subscribe with `subscribeProxy` and the exception with `subscribe`. That is not worth what
the split costs:

- Every replica tab would move to a new service, the plan's only change to the off path.
- Edge would break on its next bump. Its operation-service builds its own `FunctionContext`, and its
  tests connect ECHO with only `dataService` and `queryService`, so neither would pass the new
  service.
- `createDocument`, `flush`, heads and sync state serve both protocols, so the split would duplicate
  them or give them to one side.
- The byte protocol would stay anyway, since EDGE and the replicas a proxy tab leases still use it
  after step 7.

Before the default flips, each of these has to hold:

1. CI runs the e2e suites in both modes, with a `DX_ECHO_DOCUMENT_MODE` axis for composer-e2e and
   todomvc. Not built yet.
2. The worker serves branches, merges, history and migrations over RPC; until then those features
   need a replica.
3. The proxy package's property suites cover the contract, including worker restarts, reconnects
   and lost responses. They do today for one document per repo; several documents per repo, copy
   following and cursors under load are next.
4. Measurements at scale with EDGE sync on: memory and write latency for 1, 2 and 3 tabs.
5. Composer has dogfooded `PROXY` behind its setting with no refused edits in telemetry, since every
   refusal is a bug.
6. HOST mode runs on the proxy over the in-process bridge. The per-client switch allows it; no test
   runs it yet.

## Blockers

Ordered by risk. Size: S is up to a day, M is 2 to 5 days, L is more than a week. The last column
names the test or bench that proves the fix today; the spike that first proved each one is gone, and
its measurements are in [MEASUREMENTS.md](../../automerge-proxy/docs/MEASUREMENTS.md).

| Blocker                                                                                                                                     | What it takes                                                                                                                                                                                                                                                                                       | Size | Proven by                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| The editor's replica: a tab holds Automerge for every document open in an editor                                                            | Op ids in the proxy, phases 1 to 3 of [OP-IDS.md](../../automerge-proxy/docs/OP-IDS.md)                                                                                                                                                                                                             | L    | ui-editor `tab-document.test.ts`                               |
| Shared operation code calling Automerge through `Doc.Handle` (plugin-markdown operations also run on EDGE)                                  | The `Automerge` namespace serves both realms: EDGE's functions runtime runs replica mode with Automerge documents, and text writes in echo-doc and plugin-markdown use the namespace. `getObjectOnBranch` reads the branch's document like any other; creating and merging branches is the next row | S    | ui-editor `shared-code.test.ts`                                |
| Cursor consumers outside an open editor (anchor sort, review, AI edits)                                                                     | They resolve in the tab's model, with no editor open and no replica                                                                                                                                                                                                                                 | M    | echo-client `tab-repo.test.ts`                                 |
| Branches, merge, edit history, versioning, migrations                                                                                       | History reads in the tab from each document's saved bytes, read in plain JS, so `Obj.getVersion`, `Obj.getChanges` and `checkoutVersion` stay synchronous; forks, merges and imports as worker calls ([HISTORY.md](../../automerge-proxy/docs/HISTORY.md))                                          | L    | echo-client's branching and migration suites in proxy mode     |
| Store adapters (tldraw, excalidraw) diff heads with `A.diff(lastHeads)`                                                                     | `diff` on tab documents, which is all they use                                                                                                                                                                                                                                                      | M    | echo-doc `store-adapter.test.ts`                               |
| Heads read right after a write                                                                                                              | Real hashes at write time: the tab encodes each change as Automerge does, and the worker applies only canonical bytes ([OP-IDS.md](../../automerge-proxy/docs/OP-IDS.md))                                                                                                                           | M    | `tab-doc.test.ts`, `Repo.test.ts`                              |
| Recovery after an abrupt worker restart                                                                                                     | No op log: every tab rebuilds any change it holds byte for byte and sends what the worker lacks                                                                                                                                                                                                     | M    | `tab-doc.test.ts`, `Repo.test.ts`                              |
| Automerge 3.5.0's cached view can drift after `A.merge`                                                                                     | Tab documents read saved bytes and changes, never the cached view; replica mode still reads it, and the issue is listed for later investigation                                                                                                                                                     | S    | `drift.test.ts`                                                |
| Remaining Automerge in the tab                                                                                                              | Wasm init in `main.tsx`, the devtools hook, imports in echo-client and echo-doc, objects made before they join a database, and the tab's own `ImmutableString`, since even Automerge's slim entry touches WebAssembly; phase 4 of [OP-IDS.md](../../automerge-proxy/docs/OP-IDS.md)                 | M    | `Automerge.test.ts`, `no-wasm.test.ts`, Composer's build check |
| A real worker boundary and a browser run                                                                                                    | Done in the spike: memory with 1, 2 and 3 tabs and write latency in Chromium (see [In Chromium](#in-chromium))                                                                                                                                                                                      | S    | `scripts/bench/browser/run.ts`                                 |
| `meta.updatedAt`                                                                                                                            | Change times from the tab's model, which the saved bytes and every change carry                                                                                                                                                                                                                     | S    | echo-client `tab-repo.test.ts`                                 |
| Edits pending when a tab closes                                                                                                             | Send on `pagehide`, as `RepoProxy` does                                                                                                                                                                                                                                                             | S    | `Repo.test.ts`                                                 |
| Publishing: `@dxos/automerge-proxy` is private, but echo-client, echo-doc, echo-host, plugin-markdown, protocols and ui-editor depend on it | A trusted publisher, then drop `private`; until then `check-public-dependencies` fails on this branch                                                                                                                                                                                               | S    | The package's `pack` task                                      |
| Other wasm in the tab                                                                                                                       | Sodium is done: Composer's storage check imports `@dxos/client-services/storage`. panproto is a follow-up, and plugin wasm is out of scope (see [Wasm in the tab](#wasm-in-the-tab))                                                                                                                | S    | Composer's wasm probe                                          |

The inventory counts about 2,600 lines to change in 54 tab files if the facade keeps the current
contracts, plus about 345 at risk, not counting the worker and protocol side. The mirror spike adds
about 5,000 lines of production code and 3,000 lines of tests. The tab-document spike is about 5,500
lines of source, 2,200 of tests and 1,100 of benches.

## Review findings

Two reviews ran against the spike: one tried to break the code, one checked every claim in this
document. The transforms held under 40 targeted cases, 20,000 random pairs of up to 12 ops and
40,000 single-op pairs in strict mode. The defects were in the code around them.

| #   | Defect                                                                                                                             | Fix                                                                                        | Test                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| F1  | A new text next to a `RawString` inserted before it became `RawString('')`                                                         | Trust the value types patches carry; `RawString` arrives as an instance                    | `AutomergeOps.test.ts`, including a 2,000-diff differential run        |
| F2  | A failed save left an entry that was never sent, and the resent batch was applied twice                                            | Hold entries until a save succeeds; record dedupe at commit; apply a batch whole or not    | `mirror-repo.test.ts`: a failed save                                   |
| F3  | A document re-followed under the same epoch restarted its numbering, orphaning tabs                                                | An epoch per numbering; `since()` refuses versions it never produced; re-check in delivery | `mirror-mode.test.ts`: reconnecting to the same worker; orphan test    |
| F4  | A `resync` or same-epoch `stale` never settled the batch in flight, losing every later edit                                        | The `caughtUp` answer settles it                                                           | `mirror-repo.test.ts`: a batch sent again after catching up            |
| F5  | A worker restart through the real client applied edits twice                                                                       | One catch-up per document, no batches while it is open, known state read at send time      | `mirror-mode.test.ts`: restart tests and the restart fuzz              |
| F6  | The draft accepted writes Automerge refuses, and the worker retried the batch forever                                              | The draft refuses what Automerge refuses; the worker refuses only a change it cannot apply | `Draft.test.ts`: 34 refusals; `mirror-repo.test.ts`: a refused change  |
| F7  | `db.flush()` resolved over a failed `createDocument`                                                                               | Retry failed creations in `flushCreations`, then throw                                     | `mirror-repo.test.ts`: a refused creation                              |
| F8  | A document still being fetched stalled every flush for 30 s                                                                        | Flush waits only for pending edits and created documents                                   | `mirror-repo.test.ts`: a document still fetching                       |
| F9  | `waitUntilHeadsReplicated` hung once the root moved past the heads                                                                 | Catch up with the worker instead of testing ancestry                                       | `mirror-repo.test.ts`                                                  |
| F10 | Unconfirmed objects reported `versioned: true`                                                                                     | False while the object has unconfirmed ops                                                 | `mirror-repo.test.ts`                                                  |
| F11 | A nested draft held across a list edit wrote into a different object                                                               | Drafts keep their container through list edits and detach when it is removed or replaced   | `Draft.test.ts`: 29 cases against `A.change` and a held-draft fuzz     |
| F12 | Reconnect was not wired for mirror clients, and a dropped stream never resubscribed                                                | Services carry the mirror service; resubscribe with backoff                                | `mirror-mode.test.ts` restart tests; `mirror-repo.test.ts` stream test |
| F13 | Absorbed changes were sent before they were saved                                                                                  | Save before sending, on every path                                                         | `mirror-repo.test.ts`: only saved changes                              |
| F14 | The entry window was never trimmed for documents that only get remote changes                                                      | Trim on every send                                                                         | Code review                                                            |
| F15 | `MirrorCursors.create` minted cursors for stale positions after waiting                                                            | Move positions through changes that arrive during the wait                                 | `mirror-cursors.test.ts`                                               |
| F16 | Smaller issues: cursor paths, a `RawString` text update, a retry kept after release, a leaked document, unhandled probe rejections | Fixed where they touch correctness; the rest are listed under blockers                     | `mirror-cursors.test.ts`                                               |

## Migration

The tab-document design replaces the mirror; its integration, package by package and fix by fix, is
[INTEGRATION.md](../../automerge-proxy/docs/INTEGRATION.md). The steps below record the mirror's path.

1. Land the interfaces: `ClientRepo`, `ClientDocHandle` and the `Automerge` namespace. Behavior-neutral: the replica
   suite passes unchanged.
2. Land the shared protocol and the worker's proxy RPCs behind a flag, with the fuzz and regression
   tests. Done: `DataService`'s proxy RPCs behind `runtime.client.document_mode`.
3. Add worker RPCs for history, branches, migrations and import; replica clients can use them too.
4. Port the editor binding and the cursor consumers, and give Automerge-API code replicas.
5. Fix heads-after-write callers.
6. Switch Composer tabs to proxies behind a flag (done: the debug settings choice), measure 1, 2 and
   3 tabs against the baseline, then drop wasm initialization from tabs.
7. Move HOST-mode clients and tests to the mirror. Keep the replica backend for EDGE.

## Open questions

1. Is last-writer-wins by arrival acceptable for two writes to one key between tabs of one worker?
   Automerge picks by op counter, so the two can choose different winners. Tab documents write
   Automerge ops, so Automerge's rule holds between tabs too.
2. Should recovery persist an op log in the worker, or is the rebuild path enough? With tab
   documents, neither: tabs send back every change the worker lost (`restart.test.ts` in the spike).
3. Should HOST mode keep a second in-process replica, or use the mirror over the in-process bridge?
4. Which documents get replicas besides those open in an editor, which hold one for cursors: only
   those code asks for explicitly, or every document an Automerge-API plugin opens? Tab documents
   need no replica for cursors or history.

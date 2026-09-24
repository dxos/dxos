# Worker-only ECHO: spike and API proposal

Status: spike, not for merge. Branch `claude/compassionate-davinci-z0634h`, based on `fd873d2f`.

Tabs keep a JSON mirror of each document plus their own unconfirmed edits. Only the worker runs
Automerge. This document evaluates that design, describes the spike that tests it, and proposes the
API it implies. Everything here ran in Node tests over an in-process transport. Nothing has crossed a
real worker boundary or run in a browser yet.

## Short answer

1. **The protocol works, and it survived an adversarial review.** Tabs and the worker converge in
   every fuzz run, including runs that restart the worker through the real client and service. A
   code review found 13 defects in the code around the transforms, among them lost and duplicated
   edits after restarts. The transforms themselves held. Every defect now has a fix and a regression
   test (see [Review findings](#review-findings)).
2. **ECHO runs on mirrors.** In mirror mode, 577 of the 608 existing echo-client tests pass, plus 7
   tests marked as expected failures that still fail. The ones that fail are the
   areas this design changes on purpose: branches, edit history, heads read in the same tick as a
   write, `meta.updatedAt`, and tests that cut or inspect the byte protocol. In replica mode every
   test passes, the new mirror tests included.
3. **A tab saves most of its Automerge memory.** In a Node model of one tab holding a space of 200
   tasks and three long documents, the replica costs 16 MB when typing arrives in 20-character
   changes and 72 MB when every keystroke is its own change. The editor writes one change per
   keystroke today, so 72 MB is the realistic case. The mirror costs 0.4 MB. A resident-memory check
   gives 67 to 110 MB against 1.2 to 1.5 MB. Compiled wasm adds several MB per renderer on top. The
   figures are a Node proxy and have not been measured in a browser.
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
6. **The largest blockers** are the cursor consumers, worker RPCs for branches, history and
   migrations, and shared operation code that calls Automerge through `Doc.Handle`. The CodeMirror
   binding, the largest UI item, has a working prototype.
7. **The Cloudflare functions runtime keeps the byte protocol and Automerge.** EDGE's db-service
   serves commit blobs without building documents for reads (its indexer loads them separately), so
   the EchoClient there is what turns bytes into objects. EchoClient keeps both document backends
   behind one interface. The mirror protocol is a separate RPC group, and `DataService` is unchanged.

## What the spike shows

| Question                                                         | How it was tested                                                                                                                                                                           | Result                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Do the transforms converge pairwise?                             | 30,000 random op-list pairs on nested documents under both conflict rules, plus 19 named edge cases from the review and 3 for a write against a delete                                      | All converge; 10,842 pairs dropped or split an op                                                                                                                                                                      |
| Do tabs and a worker converge on nested documents?               | 3,000 sessions of 400 random steps with 2 to 4 tabs and a remote writer, over maps, lists of maps and text inside lists                                                                     | Every tab matched the worker at the end of every session (115,582 entries); 34,875 stale batches rebased by the worker                                                                                                 |
| Does it hold against real Automerge, a remote peer and restarts? | 2,000 sessions with an Automerge worker, a peer editing its own replica and 4,470 abrupt restarts, modeled at the sequencer level                                                           | Every tab and the peer's document match the worker; 84,038 appended markers each appear exactly once                                                                                                                   |
| Does a refused change stay contained?                            | In the two fuzzes above, about one change in 30 holds an op no document fits, which the worker refuses                                                                                      | Protocol: 14,277 refusals, each reported once by its tab, plus 6,301 later changes that only made sense on top of one; tabs still converge. Automerge: 6,220 refused markers are gone and reported, the rest land once |
| Does it hold through the real client and service?                | 500 sessions of three mirror tabs with 1,801 worker restarts through `EchoTestPeer.restartHost`, with batches in flight and edits made while the worker was down                            | Every tab and the new worker's document converge; 13,924 edits, each in the list and the text exactly once                                                                                                             |
| Do the failure paths the review found hold now?                  | One regression test each: a failed save, a refused change, a resync, an orphaned delivery, a refused creation, a document still fetching, a dropped stream, reconnecting to the same worker | See [Review findings](#review-findings)                                                                                                                                                                                |
| Does ECHO run without Automerge in the tab?                      | The echo-client suite with `DX_ECHO_MIRROR=1`                                                                                                                                               | 577 of 608 pass, plus 7 expected failures; about 520 of them run through mirror clients                                                                                                                                |
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
reads them too, so both can show the drift. It needs an upstream report with the replay script.

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
- **The mirror side is complete.** With the real `MirrorClientState` and a tab mid-typing, the mirror
  costs 0.56 to 0.69 MB.

Not counted above: the compiled code of the Automerge and Subduction modules, which a page heap
snapshot estimates at 7.4 MB (the leader tab may share it with the worker), and the Subduction module
each tab instantiates and never uses (1.25 MB of linear memory). Part of the saving needs no mirror.
Tabs could stop instantiating Subduction today, and compacting text history would bring the
keystroke case close to the burst case, at the cost of the history that branches and versioning
read. In a single run of a preview build in Chromium, with the same
three documents open, one tab's Automerge linear memory matched the worker's (21.2 against 21.4 MB),
which suggests a second copy per tab. The 2- and 3-tab runs have not been done.

The worker's own cost is unmeasured. The sequencer keeps no copy of the document, so the worker can
still evict it between writes. It keeps up to 1,000 recent entries and 1,000 applied batch ids per
followed document, about 0.7 MB at the full window.

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
  and in others, converge with it one round trip later (`src/mirror/replica.test.ts`). A tab that
  never calls it loads no Automerge.
- **ECHO's own editor uses the mirror.** The mirror binding (`ui-editor/.../collab/mirror/mirror.ts`)
  is about 70 lines against 434 for the Automerge binding, because the mirror already merges with the
  worker and the editor only keeps step with change events.
- **Repo-level libraries need a facade either way.** Neither `RepoProxy` nor `MirrorRepo` is an
  automerge-repo `Repo`, and neither handle implements `broadcast`, `heads()`, `history()` or `view()`.
  A thin `Repo` and `DocHandle` facade over replica handles would serve libraries like the React
  hooks, in either design.

## API proposal

### Tab

The database layer talks to a `ClientRepo` and `ClientDocHandle` (`automerge/client-handle.ts`).
`RepoProxy` (Automerge replica, byte protocol) and `MirrorRepo` (JSON mirror) both implement them, so
EDGE keeps the first and tabs switch to the second.

- **`MirrorDocHandle`.** `doc()` returns a frozen JSON snapshot with structural sharing. `change(fn)`
  runs `fn` against a recording draft that behaves as an Automerge change callback's draft does: the
  same mutations and refusals, and drafts that keep their container through list edits. It refuses
  a few values Automerge stores lossily (nested `Map`, `Set`, functions, typed arrays) and
  Automerge's counter types, which the op model lacks. Text edits go through `DocOps.splice` or
  `updateText`. Change events carry Automerge-shaped patches.
  `changeAt` works only at the current confirmed heads with nothing pending; `update` is not
  supported.
- **Heads.** `heads` are the last confirmed ones; unconfirmed edits do not move them. `pendingOps`,
  `hasPendingAt(path)` and the `confirmed` event expose what is still in flight.
- **`DocOps`.** The direct Automerge calls the database layer makes (`getHeads`, `hasHeads`, `splice`,
  `updateText`, local documents for objects not yet added) dispatch on the document kind. Branching,
  history, cursors and conflicts still call Automerge.
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

### Wire

`MirrorService` (`protocols/src/MirrorService.ts`), a separate RPC group:

| RPC                                                 | Purpose                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `subscribe(subscriptionId, clientId, spaceId)`      | Stream of document events                                                                |
| `updateSubscription(add, remove)`                   | Follow documents; `add` carries `{ epoch, version, heads, inflight }` when catching up   |
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

- **`DocumentSequencer`** (`echo-host/src/mirror`) orders every write to a document into entries.
  Each tab batch is transformed over the entries its tab had not seen and written as one Automerge
  change, up to the first change that does not fit, with the batch id in the change message. Changes that arrive another way (network merges,
  replica clients) become entries through `A.diff`. After a restart, `recover` rebuilds the entries
  after a tab's confirmed heads from change metadata, so the tab recognizes its applied batch.
- **`MirrorServiceImpl`** serializes work per document, saves before it sends, ignores a batch it
  already applied, and sends `requesting` when a document is not on disk. Once closed it refuses new
  calls and stops queued work.

### Shared

`Mirror` in echo-protocol: the op model (`put`, `del`, `insert`, `remove`, `splice` addressed by
path, grouped into one `Change` per `change()` call), `applyOps`, `invertOps`, `transformOp`,
`transformLists` and `transformChanges`, `MirrorClientState` (the tab's confirmed state, one batch in
flight and a buffer) and `MirrorSequencer`. Text splices transform as in ot.js,
the operational-transformation library CodeMirror's collaboration model follows. Map and list ops
transform by path, as in ShareDB's json0 type.

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

## Blockers

Ordered by risk. Size: S is up to a day, M is 2 to 5 days, L is more than a week.

| Blocker                                                                                                    | What it takes                                                                                                                                                 | Size |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Shared operation code calling Automerge through `Doc.Handle` (plugin-markdown operations also run on EDGE) | Route through `DocOps` so both backends work; the realms report calls it the hardest part                                                                     | L    |
| Cursor consumers: comments, anchors, presence, review (19 files, 13 minting sites)                         | Move reads to `MirrorCursors`, make minting asynchronous                                                                                                      | L    |
| Branches, merge, edit history, versioning, migrations                                                      | Worker RPCs that queue behind pending edits, return heads, and resolve after the tab has the result                                                           | L    |
| CodeMirror binding                                                                                         | Finish the prototype: remote presence and cursors                                                                                                             | M    |
| Store adapters (tldraw, excalidraw) diff heads with `A.diff(lastHeads)`                                    | Port to change events, or give them a replica                                                                                                                 | M    |
| Heads read right after a write                                                                             | The flush contract plus the audit's versioning fixes; about 20 tests and stories                                                                              | M    |
| Recovery after an abrupt worker restart                                                                    | Persist a small per-document op log, or accept the rebuild path                                                                                               | M    |
| Automerge 3.5.0's cached view can drift after `A.merge`                                                    | A minimal repro and an upstream fix; until then, build snapshots from a fresh load or check them against one                                                  | S    |
| Remaining Automerge in the tab                                                                             | Wasm init in `main.tsx`, the devtools hook, a `RawString` replacement, imports in echo-client and echo-doc                                                    | M    |
| A real worker boundary and a browser run                                                                   | Structured-clone encoding with `RawString` tags; 1-, 2- and 3-tab A/B in Chromium; write latency and worker CPU, since every batch is its own change and save | S    |
| `meta.updatedAt`                                                                                           | The worker sends change times                                                                                                                                 | S    |
| Mirror mode is process-wide                                                                                | A per-client flag, for HOST mode and mixed tests                                                                                                              | S    |
| Edits pending when a tab closes                                                                            | Send on `pagehide`, as `RepoProxy` does                                                                                                                       | S    |

The inventory counts about 2,600 lines to change in 54 tab files if the facade keeps the current
contracts, plus about 345 at risk, not counting the worker and protocol side. The spike adds about
5,000 lines of production code and 3,000 lines of tests.

## Review findings

Two reviews ran against the spike: one tried to break the code, one checked every claim in this
document. The transforms held under 40 targeted cases, 20,000 random pairs of up to 12 ops and
40,000 single-op pairs in strict mode. The defects were in the code around them.

| #   | Defect                                                                                                                             | Fix                                                                                        | Test                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| F1  | A new text next to a `RawString` inserted before it became `RawString('')`                                                         | Trust the value types patches carry; `RawString` arrives as an instance                    | `automerge-ops.test.ts`, including a 2,000-diff differential run         |
| F2  | A failed save left an entry that was never sent, and the resent batch was applied twice                                            | Hold entries until a save succeeds; record dedupe at commit; apply a batch whole or not    | `mirror-repo.test.ts`: a failed save                                     |
| F3  | A document re-followed under the same epoch restarted its numbering, orphaning tabs                                                | An epoch per numbering; `since()` refuses versions it never produced; re-check in delivery | `mirror-mode.test.ts`: reconnecting to the same worker; orphan test      |
| F4  | A `resync` or same-epoch `stale` never settled the batch in flight, losing every later edit                                        | The `caughtUp` answer settles it                                                           | `mirror-repo.test.ts`: a batch sent again after catching up              |
| F5  | A worker restart through the real client applied edits twice                                                                       | One catch-up per document, no batches while it is open, known state read at send time      | `mirror-mode.test.ts`: restart tests and the restart fuzz                |
| F6  | The draft accepted writes Automerge refuses, and the worker retried the batch forever                                              | The draft refuses what Automerge refuses; the worker refuses only a change it cannot apply | `recorder.test.ts`: 34 refusals; `mirror-repo.test.ts`: a refused change |
| F7  | `db.flush()` resolved over a failed `createDocument`                                                                               | Retry failed creations in `flushCreations`, then throw                                     | `mirror-repo.test.ts`: a refused creation                                |
| F8  | A document still being fetched stalled every flush for 30 s                                                                        | Flush waits only for pending edits and created documents                                   | `mirror-repo.test.ts`: a document still fetching                         |
| F9  | `waitUntilHeadsReplicated` hung once the root moved past the heads                                                                 | Catch up with the worker instead of testing ancestry                                       | `mirror-repo.test.ts`                                                    |
| F10 | Unconfirmed objects reported `versioned: true`                                                                                     | False while the object has unconfirmed ops                                                 | `mirror-repo.test.ts`                                                    |
| F11 | A nested draft held across a list edit wrote into a different object                                                               | Drafts keep their container through list edits and detach when it is removed or replaced   | `recorder.test.ts`: 29 cases against `A.change` and a held-draft fuzz    |
| F12 | Reconnect was not wired for mirror clients, and a dropped stream never resubscribed                                                | Services carry the mirror service; resubscribe with backoff                                | `mirror-mode.test.ts` restart tests; `mirror-repo.test.ts` stream test   |
| F13 | Absorbed changes were sent before they were saved                                                                                  | Save before sending, on every path                                                         | `mirror-repo.test.ts`: only saved changes                                |
| F14 | The entry window was never trimmed for documents that only get remote changes                                                      | Trim on every send                                                                         | Code review                                                              |
| F15 | `MirrorCursors.create` minted cursors for stale positions after waiting                                                            | Move positions through changes that arrive during the wait                                 | `mirror-cursors.test.ts`                                                 |
| F16 | Smaller issues: cursor paths, a `RawString` text update, a retry kept after release, a leaked document, unhandled probe rejections | Fixed where they touch correctness; the rest are listed under blockers                     | `mirror-cursors.test.ts`                                                 |

## Migration

1. Land the interfaces: `ClientRepo`, `ClientDocHandle` and `DocOps`. Behavior-neutral: the replica
   suite passes unchanged.
2. Land the shared protocol and the worker's `MirrorService` behind a flag, with the fuzz and
   regression tests.
3. Add worker RPCs for history, branches, migrations and import; replica clients can use them too.
4. Port the editor binding and the cursor consumers, and give Automerge-API code replicas.
5. Fix heads-after-write callers.
6. Switch Composer tabs to mirror mode behind a flag, measure 1, 2 and 3 tabs against the baseline,
   then drop wasm initialization from tabs.
7. Move HOST-mode clients and tests to the mirror. Keep the replica backend for EDGE.

## Open questions

1. Is last-writer-wins by arrival acceptable for two writes to one key between tabs of one worker?
   Automerge picks by op counter, so the two can choose different winners.
2. Should recovery persist an op log in the worker, or is the rebuild path enough?
3. Should HOST mode keep a second in-process replica, or use the mirror over the in-process bridge?
4. Which documents get replicas: only those code asks for explicitly, or every document an
   Automerge-API plugin opens?

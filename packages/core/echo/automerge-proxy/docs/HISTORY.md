# Proposal: full history without Automerge in the tab

Branches, merge, edit history, versioning and migrations can work in a tab that has no Automerge.
History reads run in the tab from the document's saved bytes, read in plain JS. History writes run in
the worker, which owns the documents, and their results reach the tab as ordinary changes. This
builds on the model in [OP-IDS.md](./OP-IDS.md). The reads were checked in node against Automerge
3.5.0, and a spike, [`@dxos/worker-only-spike`](../../worker-only-spike/README.md), runs ECHO's own
history functions over it; nothing in ECHO uses it yet.

## Short answer

1. **Reads come from the saved document.** A saved Automerge document holds every op with the ops that
   later overwrote or deleted it, and every change's actor, seq, time and dependencies. A plain JS
   reader turns those bytes into the model OP-IDS.md describes, with nothing compacted away. The model
   then answers `A.view` at any heads, `A.getHistory`, `A.diff` between any versions and
   `A.getConflicts` synchronously. Each document the tab loads can carry this history, because ECHO's
   history APIs are synchronous (see [Where the history lives](#where-the-history-lives)).
2. **Writes go to the worker.** Forking a document, merging one into another, importing and copying
   create or combine whole documents, which the worker already does with Automerge. The tab sees the
   result as new documents it can subscribe to, or as changes arriving on documents it follows.
3. **Writes wait for the tab's own edits.** A write names the version the tab is at, including its
   unconfirmed changes, and the worker acts only after it has applied them.

## What was checked

| Claim                                                         | Evidence                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The model reads any version of a whole document               | Random ECHO-shaped documents with concurrent editors (nested maps, lists of scalars and of objects, text, `RawString`, numbers, dates, null, replaced nested objects): 7,680 versions, each equal to `A.view` then `toJS`                    |
| The model reproduces `A.getHistory`                           | 1,421 entries: each snapshot and each change's actor, seq and time identical                                                                                                                                                                 |
| The model's diff reproduces `A.diff` between any two versions | 2,700 random pairs: every patch list reaches the target version; 97% identical patch for patch                                                                                                                                               |
| The model answers `getConflicts` for any version              | Identical to Automerge at the current version. On an older view Automerge reports the current conflicts, including values the view does not contain; the model answers for the version asked                                                 |
| The model can be built from the saved bytes alone             | From the saved document plus its change hashes in stored order, with no decoded changes: 3,840 versions and 2,883 `getHistory` snapshots identical, and every change's actor, seq, time, highest op and dependencies identical               |
| Reading the saved bytes is quick                              | The untuned reader takes the op columns of a 31 KB save (31k characters, 20,000 keystrokes of history) in 95 ms, and of a 131 KB save (156k characters, 100,000 keystrokes) in 820 ms                                                        |
| ECHO's history functions run unmodified over the model        | In the spike, `getEditHistory`, `checkoutVersion`, `A.getChangesMetaSince` and `getEditHistoryWithDiffs` give the same results over a tab document as over Automerge; `migrateDocument` rewrites one (`history.test.ts`, `hostless.test.ts`) |

Memory depends on the layout. The fuzzed model keeps every op as a JS object: 25 MB for the
20,000-keystroke history and 112 MB for 100,000. The same history in typed arrays, one row per op with
successors in a side table, takes 28 bytes per op: 1.1 MB and 5.3 MB. It reads the text at the
current version in 3 and 12 ms and at a mid-history version in 2 and 4 ms, matching Automerge both
times.

## Reads

The worker sends a document's saved bytes and its change hashes in stored order, since the saved form
keeps hashes only for the heads. The tab reads them into the model and keeps it current with the
changes that arrive afterwards, which come as ops anyway.

| API on a proxy                          | Answer                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| `A.getHistory`                          | The changes in stored order, each with the document after it |
| `A.view(doc, heads)`                    | The model read at the clock of those heads                   |
| `A.diff(doc, before, after)`            | The model's diff between the two clocks                      |
| `A.getConflicts` at a version           | The values visible at that clock                             |
| Change metadata (`getChangesMetaSince`) | Read from the change columns                                 |

### Where the history lives

ECHO's history reads are synchronous public APIs: `Obj.getVersion(obj, heads)` and
`Obj.getChanges(obj)` in `@dxos/echo`, `checkoutVersion`, which `@dxos/versioning` calls for
plugin-review's version views, and `getEditHistory`, which devtools calls in a `useMemo`. So there are
two ways to place the history:

1. **In every loaded document.** The subscribe that loads a document ships its saved bytes and hashes,
   and every Automerge call on the proxy stays synchronous. Nothing downstream changes.
2. **On demand.** A document carries only recent versions until code asks for its history. Every
   synchronous history API then needs an asynchronous load before it, which changes their callers.

The first costs memory in proportion to each document's history, and much less than the Automerge
replica it replaces:

| Document                                 | Automerge replica (wasm, never given back) | History as typed arrays | Change hashes |
| ---------------------------------------- | ------------------------------------------ | ----------------------- | ------------- |
| 31k characters after 20,000 keystrokes   | 20.2 MB                                    | 1.1 MB                  | 0.6 MB        |
| 156k characters after 100,000 keystrokes | 100.1 MB                                   | 5.3 MB                  | 3.2 MB        |

The hashes are 32 bytes per change. The tab can compute them itself, since the spike's encoder matches
Automerge byte for byte, but hashing costs load time: in Node the spike's test space loads in 0.12 s
with the hashes and 0.8 s without when text arrives in bursts, and in 0.13 to 0.15 s and 4.2 s when
every keystroke is a change. A replica loads the same space in 0.20 to 0.24 s and 0.40 to 0.42 s. The
recommendation is the first placement, with the worker sending the hashes by actor and seq from its
check index (OP-IDS.md, "Settled questions"). Documents a tab only lists or queries are not loaded at all under index reads, so
they carry nothing.

## Writes

| Operation                       | In the worker                                    | What the tab sees                             |
| ------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Fork documents, at heads or now | A new document per source, cloned at those heads | The new document ids, to subscribe to         |
| Merge a document into another   | `A.merge` of the source into the target          | The target's new changes, on its subscription |
| Import saved bytes              | Load them as a new document                      | The new document id                           |
| Copy or export a document       | Save it                                          | A new document id, or the bytes               |

Each call resolves once the tab's proxy holds the result, so code that reads right after it sees the
merge or the new document.

## Waiting for the tab's edits

A write carries the tab's current heads, which name real hashes even for changes the worker has not
applied yet, and the worker waits until it has those changes. A change the worker refuses fails the
call, as it fails the edit.

## Branches

ECHO's branches (`echo-client/src/echo-handler/branching.ts`) fork an object's subtree into new
documents and merge them back:

| Call                                                              | What it needs                                                                            | On a proxy                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `getBranches`, `getCurrentBranch`, `switchBranch`, `deleteBranch` | The branch list and the device's selection                                               | No history involved                                             |
| `getObjectOnBranch`                                               | Binds the object to the branch's document (`db.branch`) and reads its data               | Works once the branch exists: the branch document is a document |
| `createBranch`                                                    | `forkDump` saves and replays the source (`A.save`, `A.applyChanges`), then `repo.import` | A worker call that forks at the given heads                     |
| `mergeBranch`, `syncBranch`                                       | `A.merge` inside `handle.update`                                                         | A worker call that merges one document into another             |

Both worker-side steps are single Automerge calls there: `A.clone(A.view(doc, heads))` forks at old
heads, and `A.merge` merges back.

## Migrations

Space migrations and compaction (`sdk/migrations/src/migration-builder.ts`,
`echo-client/src/util/migrate-document.ts`) run in asynchronous flows and use four things:

| Use                                              | On a proxy                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `toJS` of a document                             | The proxy's JSON                                                                    |
| `new A.RawString`                                | The tab's own class, since even Automerge's slim entry touches WebAssembly          |
| `A.save` then `repo.import`, to copy a document  | The copy or import worker call                                                      |
| `A.clone` then `A.change`, to rewrite a document | A new document whose first change the tab mints from the rewritten JSON (OP-IDS.md) |

This table comes from the first inventory of tab code. The spike runs `migrateDocument` unmodified
over a tab document, which exercises the last two rows.

## Shared code on EDGE

plugin-markdown's operations run in the tab and on EDGE. The Cloudflare functions runtime connects
its `EchoClient` without a document mode (`functions-runtime-cloudflare/src/functions-client.ts:48`),
so it falls back to replica mode and holds Automerge documents. Shared code therefore meets Automerge
documents on EDGE and proxies in a proxy tab. The `Automerge` namespace serves both, which is how
the text writes in echo-doc and plugin-markdown work today. The calls only an Automerge document
supports, `handle.update` and `repo.import`, are the branch writes above: in replica mode they keep
calling Automerge, and in proxy mode they become the worker calls.

## Open questions

1. Should the worker send stored chunks instead of calling `A.save`? The tab reads document chunks and
   change chunks already, so the worker could serve a document without loading it into Automerge.

The tab now encodes changes itself, which was the first open question here. The spike's encoder
matches Automerge's bytes for every change it was given (`codec.test.ts`), so a tab computes change
hashes from saved bytes and gives its own changes real hashes.

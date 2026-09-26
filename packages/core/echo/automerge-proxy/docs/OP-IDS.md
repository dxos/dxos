# Proposal: Automerge op ids in the proxy

A proxy document can answer Automerge's cursor and recent-history API itself, so an editor binding
written for Automerge runs over it unchanged and the tab needs no Automerge. The mechanisms were
checked in node against Automerge 3.5.0 (see [What was checked](#what-was-checked)). A spike,
[`@dxos/worker-only-spike`](../../worker-only-spike/README.md), builds the design and runs ECHO's own
code over it; nothing in ECHO uses it yet.

## Short answer

A cursor is an op id, and an op id is `counter@actor`. Automerge picks both numbers by rules a
client can follow on its own:

1. Give each tab its own actor.
2. The tab numbers its ops the way Automerge would: the first op of a change is one more than the
   highest op counter the tab has seen, and each op after it takes the next number.
3. The tab encodes the change byte for byte as Automerge would, so it knows the change's hash at
   once. The worker checks the bytes and applies exactly those with `A.applyChanges`, which merges
   them like any peer's change.
4. The worker sends the tab everyone else's ops with their ids.

Then text the tab just typed has its final id at once, and `getCursor`, `getCursorPosition`,
`getHeads`, `diff` and `changeAt` are lookups over state the tab already holds. They return what
Automerge would.

The naive options fail in two different ways:

1. Taking whatever id the proxy has fails for text the tab just typed: no id exists until the worker
   writes it, and the worker's id would differ anyway.
2. An optimistic cursor that is corrected later fails once the cursor has been stored. A comment
   anchor written right after typing is the common case, and fixing it means finding every copy.

With tab-minted ids nothing needs correcting. The only thing the tab has to work out is where its own
text lands next to text another peer inserted at the same spot, and it computes that exactly when the
remote op arrives (see [Sequences](#sequences)).

## What was checked

| Claim                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The worker can write a change under the tab's actor and ids after merging a concurrent remote change | Same text as a real replica making the same edit and merging; the tab's cursors resolve to the characters it typed                                                                                                                                                                                                      |
| The tab can predict every id                                                                         | 300 of 300 start ops matched the highest op the peer had seen, plus one; ids equal a replica's; one op per code point; a splice numbers its inserts before its deletes                                                                                                                                                  |
| Resending is safe                                                                                    | Encoding the same change twice gives the same hash, and applying it twice changes nothing                                                                                                                                                                                                                               |
| A plain JS model of a text reproduces Automerge                                                      | 800 random concurrent histories (partial syncs, random causal replay order, 2-unit characters): text, 65,376 `getCursor` checks and 22,810 positions of deleted characters, 0 mismatches                                                                                                                                |
| A clock-based diff reproduces `A.diff`                                                               | 6,600 diffs between random pairs of versions, including backwards and concurrent pairs: identical patches                                                                                                                                                                                                               |
| A plain JS map register reproduces Automerge                                                         | 2,700 keys with concurrent puts and deletes: same winner and same `getConflicts`, checked against a fresh load of the document                                                                                                                                                                                          |
| A bad reference corrupts the document, so none may reach Automerge                                   | An unknown element or object panics inside the wasm (`PanicError`); the document still reads and edits in memory, but its saved form no longer loads. A seq gap panics without harm                                                                                                                                     |
| `changeAt` at heads that leave out the actor's own last change switches actor                        | Automerge writes that change under a fresh actor with seq 1, starting after the highest op it knows                                                                                                                                                                                                                     |
| A plain JS model of a whole document reproduces Automerge at every version                           | Random ECHO-shaped documents (nested maps, lists of scalars and of objects, text, `RawString`, numbers, dates, null, concurrent replacement of nested objects), 7,680 versions: the state equals `A.view` then `toJS` every time; 1,421 `getHistory` entries identical; `getConflicts` identical at the current version |
| The model's whole-document diff reproduces `A.diff`                                                  | 2,700 random version pairs: every patch list turns the first version into the second; 97% are identical to `A.diff` patch for patch, and the rest differ because Automerge also re-sends a key whose conflicts changed                                                                                                  |
| A saved document can be read without Automerge                                                       | A JS reader of the saved format recovers every element's id, origin and deletion, since Automerge stores sequences in document order: same runs, tombstones, text and cursors as the replay below                                                                                                                       |
| Taking refused changes back out of the model is exact                                                | 400 refusals of a random tab change and every later one, with a remote peer editing meanwhile: the model's state equals Automerge's document built without those changes                                                                                                                                                |
| The tab can encode a change exactly as Automerge does                                                | A JS encoder reproduces the bytes of every change of a fuzzed document and of one with every value type (`codec.test.ts` in the spike)                                                                                                                                                                                  |
| Automerge must receive canonical bytes                                                               | A change with its preds out of Lamport order is indexed under one hash and exported under another, and the document's save no longer loads (`heads.test.ts`)                                                                                                                                                            |

The map check had to use a fresh load: after many merges, Automerge 3.5.0's cached view dropped a
conflicting value in about 0.4% of keys, though the winner stayed right. That is the drift already
listed under [Blockers](../../echo-client/docs/WORKER-ONLY.md#blockers). The whole-document check
found a second bug: `getConflicts` on `A.view(doc, heads)` ignores the heads and reports the current
conflicts, including values the view does not contain. The model answers for the version asked.

Two rules came out of the text checks that Automerge does not document:

1. A cursor on a deleted character resolves `'after'` to where the character was.
2. A `'before'` cursor on a deleted character resolves to the nearest visible character on its chain
   of origins. A character's origin is the one it was typed after, which differs from the previous
   character in the text when another peer inserted between them. Using the previous character
   instead fails on concurrent histories.

## The model

The tab keeps what it keeps today, the JSON the app reads, plus these ids:

| For                           | The tab holds                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every object                  | Its object id, which is the id of the op that made it                                                                                                           |
| Each text and list            | Its elements in document order, visible and deleted, as runs: the id of the first element, the run length, the origin of the first element, and whether deleted |
| Each map key and list element | The op ids of its current values, which a write names as `pred` and `getConflicts` returns                                                                      |
| The document                  | The confirmed heads, a clock (the highest op counter per actor) and the highest op counter overall                                                              |

Consecutive typing is usually one run, because each keystroke takes the next counter and its origin
is the character before it. Runs break where text was inserted in the middle or deleted.

### Sequences

Placing an insert is the RGA rule: start after the origin, move past each following element whose
id is greater, and stop at the first smaller one. Ids compare by counter, then by actor. The tab applies remote ops and its own ops with this one rule, so
the order in which its own ops and remote ops reach it does not matter; that independence is what
the random causal replay order in the checks exercised. A delete marks the element and records the
deleting op's id, so older versions can still see it.

### Writes

The draft records Automerge ops instead of positional ops:

1. An insert names the element it follows, as seen in the version being edited, or `_head`.
2. A delete names the element and its `pred`.
3. A put names its `pred`: the ids of the values it overwrites.
4. A new object is a `make*` op, and its id becomes the object id.
5. Strings become text objects unless they are `RawString`, as Automerge 3 does.

The tab applies the change to its own state at once, with the same rules as remote ops, encodes it,
and submits the bytes. The encoding orders each op's preds by Lamport order, and the other actors and
the deps as Automerge does, so the bytes are canonical and the hash is final. The deps are the heads it
edited, which name real hashes, its own unconfirmed changes included.

The worker checks the bytes and every reference before Automerge sees them. The bytes must decode to
the hash the tab claims and be canonical: Automerge indexes a change under the hash of the bytes it
receives but exports it re-encoded, so other bytes would leave heads that no peer can reach. Each
element and object must exist in the version the tab edited, the seq must continue the actor's chain,
the start op must be above that version's highest op, and each `pred` must match its values there,
because a bad reference corrupts the stored document. The worker then applies the tab's bytes with
`A.applyChanges`. Acknowledgements and refusals name the hash.

The worker cannot build the change with `A.encodeChange` instead: it sorts preds itself, and it writes
some float64 values one unit in the last place off, so its bytes can hash differently from the tab's.

A refused change and the tab's later changes come out of the tab's state: their elements go,
their deletes come back, and the values they overwrote return. After a worker restart each tab sends
every change it holds that the worker lacks, its own or not, since any change rebuilt from the model
encodes to the bytes of its hash.

This removes the `Transform` module. Positional ops needed rebasing because a position means
something only in one state; an op that names ids means the same thing in every state.

### Objects read from the index

Under index reads the tab holds only an object's JSON copy, with no ids. A write to such an object
still mints ids for what it creates, which needs only the document's highest op counter, so the copy
has to carry that number. What the write refers to, the element an insert follows or the values a
put overwrites, the tab names by position in the copy, and the worker resolves it against the version
the copy came from with Automerge (`view` at those heads). Cursors need the object's ids, which arrive
once the tab subscribes to the document.

### Remote changes

The worker sends the ops of each new change in the order Automerge applied them, which is causal,
with the change's hash, actor, seq and deps. The tab's own changes come back as a confirmation only.

### Snapshots

A subscribe returns the JSON with the ids above. Automerge has no call that lists deleted elements.
Two ways work without one:

| History                                  | Saved size | Replay decoded changes | Read the saved document | Runs             |
| ---------------------------------------- | ---------- | ---------------------- | ----------------------- | ---------------- |
| 31k characters after 20,000 keystrokes   | 31 KB      | 580 ms                 | 95 ms                   | 5,971 (93 KiB)   |
| 156k characters after 100,000 keystrokes | 131 KB     | 3.7 s                  | 820 ms                  | 29,987 (469 KiB) |

Replaying spends about 10 µs per op decoding, through `decodeChange` and through bundles alike. The
reader is an untuned prototype of the saved format (header, column metadata, RLE, delta and boolean
columns, values, successors) that skips everything but the op columns. It works because Automerge
stores a sequence's ops in document order, with each op's successors, though the format spec says
they are sorted by element id; the reference implementation decides, and the replay stays as the
fallback if that ever changes.

The reader needs no Automerge, so it can run in the tab as well as the worker: the worker sends the
saved bytes, which already carry the ids and for these documents are no larger than the text alone
(31 KB for 31k characters, 131 KB for 156k), and the tab reads the state and ids itself. The same bytes hold every change's metadata and every op's successors, which is what
[HISTORY.md](./HISTORY.md) builds on.

## History

A version is a clock. An op is in a version when its counter is at most the clock's entry for its
actor, which is Automerge's own rule, since an actor's changes form a chain.

| API                              | On a proxy                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `getHeads`                       | The current version, whose hashes are final as soon as a change is written                                               |
| `equals`                         | Automerge's own, which is plain JS                                                                                       |
| `hasHeads`                       | Clock comparison for heads the tab has seen                                                                              |
| `diff(before, after)`            | A walk over the elements and values that compares visibility under both clocks; matched `A.diff` patch for patch on text |
| `view(heads)`                    | A read-only document at that clock                                                                                       |
| `changeAt(heads, fn)`            | A draft that reads at that clock; returns the new change's hash, and switches actor as Automerge does                    |
| `getCursor`, `getCursorPosition` | Lookups in the element runs                                                                                              |
| `getConflicts`                   | The current values of the key                                                                                            |

A tab that loaded the document's full history ([HISTORY.md](./HISTORY.md))
can name every version; one seeded from a snapshot names every version since the snapshot, and older
heads throw, as Automerge throws for heads it does not have.

The editor's Automerge binding (`ui-editor/.../collab/automerge`) uses `getHeads`, `equals`, `diff`,
`changeAt` and the two cursor calls, all in the table, plus `splice`, which the draft records. The
tldraw and excalidraw store adapters use `getHeads`, `equals` and `diff`. So both run over proxies unchanged, and these go:

- `mirrorSync` and the editor's replica lease (`leaseReplica`, `heldReplica`, `MirrorRepo.replica`).
- The position mapping between mirror and replica in `echo-client/src/text.ts`.
- `Cursors` and the `resolveCursors` and `createCursors` RPCs.

Full history, branches, merge and migrations are covered in [HISTORY.md](./HISTORY.md): the tab reads
the whole history from the document's saved bytes, and forks, merges and imports run in the worker.

## Costs

Automerge 3.5.0 applies a remote change in time proportional to the size of the text it touches, per
call:

| Document                             | Local `A.change` | One remote change per call | 100 remote changes in one call |
| ------------------------------------ | ---------------- | -------------------------- | ------------------------------ |
| 31k characters, 20,000 changes       | 0.58 ms          | 15 ms                      | 0.20 ms each                   |
| 156k characters, 100,000 changes     | 0.84 ms          | 76 ms                      | 0.81 ms each                   |
| 156k characters, 1 change            |                  | 61 ms                      |                                |
| Under 100 characters, 20,000 changes |                  | 0.13 ms                    |                                |

The cost follows the text, not the history, and it is the same on the raw handle, so it is not the
JS view. Replica mode already pays it: a replica tab takes each change from the worker through
`A.loadIncremental`, which costs the same (17 ms and 77 ms per change on the two long documents), and
the worker takes each tab's changes the same way. Today's proxy host avoids it because it writes the tab's ops as a local change. With tab-minted
ids the worker applies remote changes, so it applies each document's queued changes in one call per
interval. The tab does not wait on that call: its own state already holds its edits.

Checking a reference through Automerge (`view` at the edited heads, then `getCursorPosition`) costs
2 ms at 31k characters and 10 ms at 156k. The element index the worker keeps for snapshots answers
the same check with a map lookup.

## What else keeps Automerge in the tab

From the inventory of tab code, beyond cursors and recent history:

| Use                                                                         | Where                                                                                                                             | Without Automerge                                                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Wasm initialization at boot                                                 | `composer-app/src/main.tsx:268`                                                                                                   | Only in replica mode and `DX_HOST`                                                                                |
| `A.from` for an object before it joins a database                           | `echo-client/src/core-db/object-core.ts:252`                                                                                      | A proxy document with no host, whose first change the tab mints                                                   |
| `RawString`                                                                 | 8 files                                                                                                                           | The tab's own class, marked with the symbol Automerge checks                                                      |
| The devtools hook exposes the Automerge namespace                           | `sdk/client/src/devtools/devtools.ts:30`                                                                                          | Expose `@dxos/automerge-proxy/Automerge`                                                                          |
| Edit history, branches, merge, migrations, versioning, import, change times | `echo-handler/edit-history.ts`, `core-db/branching.ts`, `entity-manager.ts`, `sdk/migrations`, `sdk/versioning`, `object-core.ts` | History reads in the tab from saved bytes; forks, merges and imports as worker calls ([HISTORY.md](./HISTORY.md)) |

Even Automerge's slim entry touches WebAssembly when imported, so the tab's namespace imports nothing
from Automerge. The spike runs its tab side in a process where `WebAssembly` does not exist
(`no-wasm.test.ts`). Nothing in the tab uses marks, so the model leaves them out.

## Phases

Size: S is up to a day, M is 2 to 5 days, L is more than a week.

| Phase                                                                                                                                                           | Size |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1. Ids on the read side: snapshots with ids, remote changes as ops, cursors answered in the tab, the model fuzzed against Automerge in CI                       | M    |
| 2. Tab-minted writes: the draft records Automerge ops, the tab encodes, the worker checks and batches, refusal and resend; `Transform` and `Cursors` go         | L    |
| 3. Versions: `getHeads`, `diff`, `view`, `changeAt`; the Automerge binding and store adapters over proxies; `mirrorSync` and replica leases go                  | M    |
| 4. No wasm in a proxy tab: a namespace that imports nothing from Automerge, hostless documents, the tab's own `RawString`, devtools, no initialization, a check | M    |
| 5. Faster snapshots: a tuned reader of the saved document, in the tab or the worker                                                                             | M    |

The full-history RPCs stay a separate L blocker. The spike proves each phase; its README gives the
evidence.

## Risks

1. The model is right only while it follows Automerge's merge rules. Those rules are part of the
   storage format, since old peers have to converge with new ones, so they cannot change quietly. The
   fuzz tests against Automerge would run in CI.
2. The worker pays Automerge's per-call cost for remote changes: about 19 ms at 45,000 characters in
   the spike, for one change or a batch. Batching bounds it.
3. Snapshots of long histories are slow until phase 5.
4. Automerge corrupts a document it is handed a bad reference for. The worker's checks guard the
   tab's changes; changes from other peers reach Automerge unchecked today, in both modes.
5. Each tab session adds an actor to each document it edits, as replica mode does today.
6. Heads can name changes the worker has not applied yet. A worker call that takes heads waits for
   those changes, as [HISTORY.md](./HISTORY.md) describes.
7. Hashing in JS costs load time: the spike loads its keystroke corpus in 5.5 s when the tab hashes
   every change and in 0.9 s when the worker sends the hashes.

## Open questions

1. Should every snapshot carry the change hashes? The tab can compute them, but hashing takes the
   burst corpus from 0.4 to 1.2 s and the keystroke corpus from 0.9 to 5.5 s.

Heads with unconfirmed changes carry real hashes, which was the first open question here: the spike's
encoder matches Automerge byte for byte. The Automerge issues found along the way are listed in the
spike's README for later investigation.

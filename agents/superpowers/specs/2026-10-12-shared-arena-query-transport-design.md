# Shared arena for ECHO query results

Status: draft, not yet implemented. Decisions here come from a design discussion on 2026-10-12;
every throughput figure is an order-of-magnitude estimate until the measurement in phase 0 replaces it.

## Summary

Query results leave the SQLite worker today as JS objects: each row is read column by column into
strings, the snapshot is re-serialized by `json()`, structured-cloned to the tab, parsed again with
`JSON.parse`, and walked a second time by `Obj.fromJSON`. This spec replaces that path with one binary
entry format, read lazily in the tab, carried over two transports:

- **Leader tab**: a `SharedArrayBuffer` arena owned by the tab's dedicated worker. The window reads
  entries in place. Only a handle crosses `postMessage`.
- **Follower tabs**: the same entry bytes, transferred as an `ArrayBuffer` over the existing
  MessagePort. One buffer per response.

Snapshots are stored in SQLite as JSONB, so the stored blob, the arena payload and the wire payload
are the same bytes, and the SQL filter compiler keeps using `json_extract` on the column.

## Constraints that shaped the design

1. **Shared memory does not cross tabs.** A SAB can be posted only within one agent cluster: a
   window and its own dedicated workers. Posting one to a SharedWorker or to another tab throws
   `DataCloneError`. The arena is therefore per tab. We accept this; the boundary the arena removes,
   DB thread to UI thread, is inside each tab.
2. **A SAB requires cross-origin isolation** (`Cross-Origin-Opener-Policy: same-origin`,
   `Cross-Origin-Embedder-Policy: require-corp`). Only `testbench-app` sets these today. The follower
   path must work on its own so the leader degrades to it when `crossOriginIsolated` is false, or
   when the growable `SharedArrayBuffer` (`maxByteLength` option, `grow()`) is missing. Both are
   feature-detected at startup; either one failing selects the follower path.
3. **SQLite memcpys every blob column once.** `OP_Column` copies the cell out of the page into the
   statement register before `sqlite3_column_blob` returns a pointer; there is no API to a page.
   The floor is two copies per blob (page to register, register to arena). We do not rebuild
   wa-sqlite with shared memory to remove the second one.
4. **The SQL compiler reads the snapshot column.** `compile.ts` has 31 `json_extract` / `json_each`
   / `json_type` calls on `d.snapshot`. The stored format must stay readable by SQLite's JSON
   functions, which rules out CBOR or a custom binary without dual storage.
5. **`@effect/wa-sqlite` 0.1.2 bundles SQLite with JSONB** (`jsonb`, `jsonb_extract`, … are present
   in the wasm), so no engine change is needed.
6. **`TextDecoder.decode` rejects views over a SAB.** Any string read from the arena copies its
   slice to a plain buffer first.

## Current data path

| step                                    | where         | cost                                       |
| --------------------------------------- | ------------- | ------------------------------------------ |
| `step()`, read columns                  | worker        | SQLite memcpy per blob/text column         |
| `json(d.snapshot)`                      | SQLite        | parse and re-serialize the snapshot in C   |
| `column_text`                           | wa-sqlite     | UTF-8 decode into a JS string per column   |
| `compiledRowToItem`                     | worker        | one `QueryResult` object, 11 string fields |
| Effect Schema encode + structured clone | worker to tab | serialize and copy every object            |
| `JSON.parse(documentJson)`              | tab           | full parse                                 |
| `Obj.fromJSON`                          | tab           | schema decode, second full walk            |
| `_mapRecords`                           | tab           | hydrates every row eagerly, in chunks      |

References: `packages/core/echo/echo-host/src/query/query-executor.ts` (`compiledRowToItem`),
`packages/core/echo/echo-host/src/query/sql/compile.ts` (`#final`),
`packages/core/echo/echo-client/src/client/index-query-source-provider.ts` (`_mapRecords`),
`packages/core/protocols/src/QueryService.ts` (`QueryResult`),
`packages/common/sql-sqlite/src/internal/opfs-client.ts` (`readRow`).

## Design

### Topology

- Leader election and the port handoff stay as they are (`worker-framework/src/Coordinator`).
- The leader's dedicated worker is the arena's only writer. The leader window is its only reader.
- Followers receive entry bytes over their existing port. A follower may later keep its own arena,
  fed from those bytes, so a compute worker in that tab can share them. Not in scope here.

### Entry format

All integers little-endian. Every structure is 8-byte aligned.

**Arena regions**

```
offset 0         ArenaHeader      64 B
offset 64        SlotTable        maxSlots × 16 B
                 RefCounts        maxSlots × 4 B   (Int32Array)
                 Entries          grows to the end of the buffer
```

The buffer is a growable SAB: `new SharedArrayBuffer(initial, { maxByteLength })`. Only the entries
region grows. Views created without an explicit length track the buffer length, so readers never
refresh them. `maxSlots` is fixed at creation; exhausting it triggers a new arena, which is counted
and alarmed on rather than optimized. The old arena is not migrated: the writer stops publishing into
it and keeps it alive until every pin it holds is released, then drops it. Handles never move
between arenas (see **Handles** below).

**ArenaHeader (64 B)**

```
 0  u32  magic           0x52415844  'DXAR'
 4  u32  formatVersion   1
 8  u32  maxSlots
12  u32  slotTableOffset 64
16  u32  refCountOffset
20  u32  entriesOffset
24  u32  epoch           bumped after every publish batch
28  u32  arenaId         random, unique per arena instance; messages name the arena they refer to
32..63   reserved, zero
```

**Slot (16 B)**

```
 0  u32  offset      byte offset of the EntryHeader
 4  u32  length      total entry bytes, padded
 8  u32  generation  0 never used; odd = being written or freed; even = live
12  u8   kind        copy of EntryHeader.kind
13  u8   flags
14  u16  reserved
```

**Handles**

A handle is `(slot, generation)` and is always scoped to one arena. In messages it is a `Uint32Array`
pair; a result list is one `Uint32Array` of pairs plus the `arenaId` it belongs to. There is no
single-number form: `slot * 2**32 + generation` exceeds `Number.MAX_SAFE_INTEGER` once `slot` reaches
`2**21`, and two handles could then collide. The reader keeps a `Map<arenaId, ArenaView>`; a handle
is resolved against the arena its message named, so a handle from a retired arena still reads the
retired arena's bytes, never a same-numbered slot in its successor.

**EntryHeader (16 B) + body**

```
 0  u8   kind         1 Snapshot  2 AmSnapshot  3 AmChanges  4 Row
 1  u8   version      1
 2  u8   headsCount   0..255
 3  u8   flags        bit0 payloadIsText
 4  u32  metaLen
 8  u32  payloadLen
12  u32  checksum     CRC32 of payload, 0 = not computed
16       heads        headsCount × 32 B   Automerge change hashes
         meta         TLV sequence, padded to 8
         payload      padded to 8
```

Meta TLV: `u8 tag, u8 reserved, u16 len, bytes[len]`, padded to 4. Tags: 1 objectId, 2 spaceId,
3 documentId, 4 typeDxn, 5 baseSlot (handle pair; the AmSnapshot an AmChanges entry applies to),
6 rank (f64).

Heads come before meta and payload so a reader checking staleness reads `16 + 32·n` bytes and stops.

**Kinds**

| kind       | payload                                             | written when                                  |
| ---------- | --------------------------------------------------- | --------------------------------------------- |
| Snapshot   | JSONB blob, verbatim from `objectSnapshot.snapshot` | the worker materializes an object for a query |
| AmSnapshot | `Automerge.save()` output                           | a document is loaded or compacted             |
| AmChanges  | changes since `baseSlot`'s heads                    | a document changes                            |
| Row        | cell table, see below                               | one per result row                            |

**Row payload**

```
 0  u16  columnCount
 2       per column: u8 type   1 INT, 2 FLOAT, 3 TEXT, 4 BLOB, 5 NULL   (sqlite3_column_type values)
                               6 REF                                     (not a SQLite type; see below)
                     u8 reserved, u32 length
         cells, each 8-aligned; INT as i64, FLOAT as f64, TEXT as UTF-8 bytes, BLOB as bytes,
         REF as u32 ref + u32 generation
```

The executor writes a Row with no per-shape code: for each column, `switch (column_type)`, with
TEXT and BLOB copied via `column_blob` (which returns the stored UTF-8 bytes for a TEXT register, no
conversion). Column names travel once per query in the result-list message, not per row.

**REF cells.** The snapshot is not inlined in the Row. The executor replaces the snapshot column with
a REF cell pointing at the Snapshot entry, so the large bytes are written once per document version
and shared across queries. A REF's meaning depends on the transport:

| transport | `ref`                                      | `generation`          |
| --------- | ------------------------------------------ | --------------------- |
| leader    | slot in the arena the message named        | the slot's generation |
| follower  | index into the response buffer's directory | 0                     |

**INT cells** are read as a JS `number` when the value fits `Number.MIN_SAFE_INTEGER..MAX_SAFE_INTEGER`
and as a `bigint` otherwise, which is what `readRow` already gets from wa-sqlite's `row()` (its
`cvt32x2AsSafe` applies the same rule to `sqlite3_column_int64`), so callers see no type change.
Boundary tests cover `2**53 - 1`, `2**53`, `-(2**53)` and `i64` min/max.

### Protocols

**Publish (writer, single thread, no locks)**

1. Allocate `length` in the entries region from a size-class free list kept in the worker's own JS
   memory (powers of two from 64 B to 64 KB; exact-size with coalescing above). Allocator metadata is
   not in the SAB; the reader never needs it.
2. Write header, heads, meta, payload.
3. Take a free slot. `generation = previous + 1` (odd).
4. `Atomics.store(refCount, slot, initialPins)`, one pin per holder the writer is about to hand the
   entry to.
5. Write `offset`, `length`, `kind`, then `Atomics.store(generation, previous + 2)` (even). This is
   the release; plain writes before it are visible to a reader that `Atomics.load`s the generation.
6. Bump `epoch`. Post the doorbell.

**Dereference (reader)**

1. `gen = Atomics.load(slot.generation)`. If `gen !== handle.generation` or `gen` is odd, throw.
   Refs only travel pinned, so this fires on a bug, never on a race.
2. Read `offset` and `length`, parse the header, build `subarray` views.

**Pin and release**

- The writer pins each handle in a result set once before posting the list. The reader releases the
  set when the subscription ends.
- The reader promotes a handle to a long-lived cache with `Atomics.add` from a slot it already holds,
  so a count never goes 0 → 1 on the reader side.
- Release is `Atomics.sub`. No message back.

**View lifetime.** A lazy `QueryResult` or snapshot view is owned by the result set that delivered
it and is valid only until that set is released. Code that keeps a view past the subscription must
`retain()` it first, which promotes the underlying handle (`Atomics.add`) and returns a disposable;
disposing it releases the promoted pin. A view read after its owner is released throws, in every
build: the view checks its owner's `released` flag before touching bytes, and the generation check
in **Dereference** is the second line of defence once the slot has been swept. Values already decoded
and cached on the view stay readable, since they no longer point into the arena.

**Sweep (writer)**

On free-list pressure or a periodic tick: for each slot with even generation and
`Atomics.load(refCount) === 0`, store `generation + 1` (odd), return the bytes to the free list,
return the slot to the slot free list. A reader cannot resurrect a zero-count slot, so no CAS.

### Query path after the change

Worker, per `step()`:

1. Look up `recordId → Snapshot handle` in a worker-side map. On a miss, `column_blob` the JSONB
   snapshot into a new Snapshot entry and pin it for the worker's cache. The worker asserts the
   blob's first header byte has type nibble 12 (OBJECT); anything else is a row the migration in
   **Storage changes** did not reach, and is an error, not a fallback.
2. Write one Row entry: scalar cells, id cells as raw UTF-8, a REF cell to the Snapshot entry.
3. Append `(slot, generation)` to a `Uint32Array` and `rank` to a `Float64Array`.

Response:

- Leader: `{ queryId, arenaId, columns, handles: Uint32Array, ranks: Float64Array }`.
- Follower: `{ queryId, columns, buffer: ArrayBuffer, ranks: Float64Array }`, one transfer. The
  buffer starts with a **directory**: `u32 entryCount`, then `(u32 offset, u32 length)` per entry,
  padded to 8, followed by the entries. Rows come first in result order, then each distinct Snapshot
  entry once. REF cells in the Rows were rewritten during packing to `(directoryIndex, 0)`, so a
  follower resolves them with no slot table. The same Snapshot bytes are copied into the buffer once
  per response, however many Rows reference them.

Tab:

1. `QueryResult` becomes a lazy view over a Row entry. `objectId`, `spaceId` and other id cells
   decode on first access.
2. The Snapshot payload is read by a **lazy JSONB reader** (below). The result object is a read-only
   snapshot proxy over the bytes; a property decodes on first `get` and is cached on the proxy.
   Nested objects and arrays return child proxies over their own offsets.
3. **Schema validation moves to the writer.** Today `Obj.fromJSON` validates every hydrated object
   in the tab before `_mapRecords` returns it, so an invalid object never reaches a component. A
   lazy proxy cannot keep that contract in the tab without a full decode, which is the cost this
   design removes. The contract is kept by moving it: the indexer validates a snapshot against its
   schema when it writes `objectSnapshot`, once per document version, and records the outcome in the
   row (`valid` column, or a flag in the Snapshot entry's header). The executor filters invalid rows
   with the same gate it uses for dependency-broken objects, so the tab sees only validated bytes.
   Tab-side validation then runs only on materialization (first write), where a full decode happens
   anyway. The failure contract for the client is unchanged: invalid objects are absent from results.
   What changes is where the schema lookup runs, which needs schema resolution available in the
   worker; `index-core` already has it for typed indexing. Open question 5 asks whether this holds
   for dynamic schemas.
4. On the first write the proxy materializes into a normal reactive object (copy-on-write). The
   reactive handler keeps its mutable plain target; Automerge stays the only mutation path for
   documents.
5. Parsed values are cached per `(slot, generation)`, so a live query's re-run reuses unchanged rows.

### JSONB reader

SQLite's JSONB (≥ 3.45): each element is a header byte (low 4 bits type, high 4 bits inline size or
an escape for a 1/2/4/8-byte size) followed by its payload. Types: 0 NULL, 1 TRUE, 2 FALSE, 3 INT,
4 INT5, 5 FLOAT, 6 FLOAT5, 7 TEXT, 8 TEXTJ, 9 TEXT5, 10 TEXTRAW, 11 ARRAY, 12 OBJECT. Containers
carry their byte length, so a sibling is skipped in O(1) without parsing. Numbers are ASCII and are
parsed on access.

Requirements, from oxc's raw-transfer work where string decoding dominated lazy reads:

1. **Intern short strings.** For byte length ≤ 32, hash the bytes in JS and look up a
   `Map<hash, string>`; decode on miss only. Keys and enum-like values then decode once per distinct
   string per tab.
2. **Hand-rolled ASCII decode** below ~16 bytes; `String.fromCharCode` beats a `TextDecoder` call.
3. One `TextDecoder('utf-8', { ignoreBOM: true })` instance for everything longer.
4. Objects with many keys or large arrays build a key/offset table on first touch; small objects scan.
5. `TEXTJ` and `TEXT5` are unescaped in JS. `TEXT` and `TEXTRAW` are both raw UTF-8 contents and
   are decoded verbatim; the difference matters only when the reader emits JSON text, where
   `TEXTRAW` contents must be escaped and `TEXT` contents need not be.
6. A fuzz test compares the reader against SQLite's own `json()` output for the same `jsonb()` input,
   including Cyrillic, CJK, an emoji (surrogate pair), a lone surrogate, and a `TEXTRAW` string
   holding `"`, `\` and control characters, so the two never drift.

### Storage changes

- `objectSnapshot.snapshot` becomes JSONB: writes go through `INSERT … jsonb(?)` so `JSON.stringify`
  stays native and the conversion runs in C. Reads for export or debugging use `json(d.snapshot)`.
- **Existing rows hold JSON text** (`JSON.stringify` output). A SQLite migration, written per
  `.agents/projects/sql-migrations/DESIGN.md`, rewrites them in place:
  `UPDATE objectSnapshot SET snapshot = jsonb(snapshot) WHERE typeof(snapshot) = 'text'`. It runs
  before the first query on the new path, and the worker's type-nibble assertion above catches any
  row it missed. There is no dual-format reader: supporting both formats at read time would put a
  branch on the hot path for a one-time condition.
- `compile.ts` `#final` drops `json(d.snapshot)` and selects the column bare. Filters are unchanged;
  `json_extract` and `json_each` accept JSONB and run faster on it.
- Assert `PRAGMA encoding = 'UTF-8'` at open, since `column_blob` on a TEXT register returns the
  database encoding.

## Alternatives considered

| option                                                               | why not                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| CBOR for snapshots                                                   | SQLite cannot filter it; needs dual storage. Its construction-time control is available from JSONB.                                  |
| Rebuild wa-sqlite with shared memory, arena inside the wasm heap     | Removes one memcpy per blob. Custom wasm build for a few hundred nanoseconds per sub-page entry. Deferred.                           |
| Multi-tab direct SQLite reads (`OPFSCoopSyncVFS`, `OPFSPermutedVFS`) | Gives followers zero-copy local reads but costs the leader its `EXCLUSIVE` WAL. Revisit if follower latency is user-visible.         |
| Multi-tab WAL                                                        | Needs `xShmMap`, which the browser cannot provide. Only `EXCLUSIVE` WAL exists in OPFS.                                              |
| Turso                                                                | Its MVCC is in-process; cross-tab coordination falls back to the same locks. Engine switch for a feature this topology does not use. |
| One entry type per SQL row shape                                     | Fixed layouts per shape must track the compiler's select list. The generic Row covers every shape.                                   |
| Eager binary deserialize to plain objects                            | oxc measured this at a modest constant over `JSON.parse`; the multiple comes from lazy access.                                       |

## Phases

0. **Measure.** Spans around row read, `json()`, decode, clone, parse and hydration on a large
   query, so the before/after is a number. `RpcTiming` already reports `queueWaitMs`.
1. **Format + follower path.** New private package (working name `@dxos/shared-arena`): entry
   format, Row and Snapshot writers, readers, JSONB reader with intern table. `QueryResult` carries
   transferred bytes for every tab. No isolation needed. Node tests run writer and reader in two
   `worker_threads` over a real SAB.
2. **JSONB storage.** `objectSnapshot.snapshot` to JSONB, `json()` dropped from `#final`, fuzz test.
3. **Leader arena.** Allocator, slot table, refcounts, sweep, behind the `crossOriginIsolated` and
   growable-SAB checks. COOP/COEP for Composer is a product decision taken in this phase.
4. **Automerge entries.** `AmSnapshot` and `AmChanges` chained by `baseSlot`; the window checks heads
   before loading.

## Open questions

1. Where in `index-core` is `objectSnapshot` written, and is it one site?
2. Crossover size below which `decode` + `JSON.parse` beats the lazy proxy for a full read, which
   decides whether lazy is the default or kicks in above a threshold.
3. Whether COOP/COEP is acceptable for Composer, given its embeds and iframes.
4. CRC32 always on or debug only (~1 GB/s in JS; cheap for sub-page entries).
5. Writer-side validation needs the schema in the worker at index time. Does `index-core` resolve
   dynamic (database-stored) schemas there today, or only static ones?

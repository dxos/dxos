# oxigraph-mem — Oxigraph wasm in-memory Store + SQLite journal

All numbers below come from the deployed worker `https://rdf-bench-oxigraph-mem.dxos.workers.dev`,
version `e86265bb-421f-4673-aa04-b064bc850246` (deployed 2026-10-12T18:15Z), driven from the sandbox
(ping ≈ 33–47 ms). No local/Node numbers are reported. Raw data: `results/oxigraph-mem.json` (full run
with probes, db `full1-gz`), `results/oxigraph-mem-rerun.json` (1k/10k rerun, cleaner timings),
`results/oxigraph-mem-40k.json`, `-45k.json`, `-50k.json`, and `results/oxigraph-mem-cold.jsonl` (cold-start /
compaction series from `oxmem-scripts/cold.mjs`).

## 1. Approach

The published `oxigraph@0.5.11` npm package, web build (`oxigraph/web.js` + `web_bg.wasm` imported as a
`CompiledWasm` module, instantiated with `initSync`), holds the entire graph in an in-memory `Store`
inside the DO isolate. DO SQLite is used only for durability: every ingest batch is loaded into the
Store and, in the same request, appended to a `journal` table as N-Quads text chunks (≤1 MB, line
aligned) — either raw UTF-8 or `deflate-raw` (CompressionStream). SPARQL UPDATE text is journaled
verbatim and replayed. `POST /compact` dumps the Store as N-Quads and atomically replaces the journal
with snapshot chunks. On the first request after eviction the Store is rebuilt by replaying the
journal (`store.load(..., {lenient:true})`). Queries go straight to `store.query()`; result `Map`s are
converted to harness `Row`s (same mapping as the oracle).

```
ingest:  quads ─► N-Quads text ─┬─► store.load()  (wasm heap, all indexes)
                                └─► deflate ─► INSERT journal(kind,enc,data)   [same request]
update:  SPARQL UPDATE ─► store.update() ─► INSERT journal(kind='update', text)
query:   SPARQL ─► store.query() ─► Map<var,Term>[] ─► Row[]          (no SQLite touched)
cold:    SELECT journal ORDER BY seq ─► inflate ─► store.load()/update()  (replay)
compact: store.dump(N-Quads) ─► chunk ─► deflate ─► DELETE journal; INSERT snap rows (txn)
```

## 2. Numbers

### Per scale (gz journal; ingest = in-DO generated batches of 1000 facts)

| facts   | triples | ingest quads/s | median batch ms | dbBytes   | SQLite B/triple | wasm memory | wasm B/triple | cold start ms (Q1 after abort)                                         |
| ------- | ------- | -------------- | --------------- | --------- | --------------- | ----------- | ------------- | ---------------------------------------------------------------------- |
| 1 000   | 10 128  | 73 767         | 170             | 102 400   | 10.1            | 6.6 MB      | 647           | 286                                                                    |
| 10 000  | 101 441 | 92 597         | 140             | 917 504   | 9.0             | 35.1 MB     | 346           | 1 006 (712 in first run)                                               |
| 40 000  | 405 943 | 61 963         | 187             | 3 624 960 | 8.9             | 113.9 MB    | 281           | 3 614                                                                  |
| 45 000  | 456 714 | 64 457         | 190             | 4 075 520 | 8.9             | 134.3 MB    | 294           | 3 337                                                                  |
| 50 000  | 507 425 | 76 232         | 157             | 4 526 080 | 8.9             | 150.9 MB    | 297           | **all queries fail** (see §4)                                          |
| 100 000 | —       | —              | —               | —         | —               | —           | —             | **failed**: ingest died at 90 000 facts (913 411 triples, wasm 247 MB) |

Raw-text journal costs ~10× more storage (10.1 MB vs 0.9 MB at 10k facts; 92 MB vs 7.9 MB at 89k) and
is _slower_ to replay at scale (see cold-start table), so gz is the default.

### Cold start vs size, journal vs compacted snapshot (median of 3, `oxmem-cold.jsonl`)

| facts / triples | gz journal                      | raw journal | compaction ms (gz)                 | gz snapshot cold |
| --------------- | ------------------------------- | ----------- | ---------------------------------- | ---------------- |
| 1k / 10k        | 235                             | 173         | 111                                | 120              |
| 10k / 101k      | 733                             | 693         | 680                                | 631              |
| 30k / 304k      | 1 214                           | 2 086       | **fails** (`RangeError` in `dump`) | —                |
| 60k / 609k      | loads, queries fail             | —           | fails                              | —                |
| 89k / 903k      | 3 788 (replay ok, queries fail) | 8 646       | fails (`unreachable`)              | —                |

Cold start ≈ 3.5–4 µs/triple (gz) plus ~100–250 ms fixed (isolate + 4 MB wasm instantiation, network).
Compaction does not shorten replay — the cost is parsing + indexing N-Quads, not the number of rows.

### Query `serverMs` (slope method; ✓ = matches oracle row count + checksum)

| query        | 1k facts | 10k facts | 40k facts       | 45k facts |
| ------------ | -------- | --------- | --------------- | --------- |
| Q1_lookup    | 1.6 ✓    | 0.8 ✓     | 1.0 (no oracle) | 0.0       |
| Q2_entity    | 0.3 ✓    | 3.9 ✓     | 16.0            | 14.1      |
| Q3_filtered  | 1.0 ✓    | 2.1 ✓     | 10.0            | 8.3       |
| Q4_asof      | 0.2 ✓    | 1.0 ✓     | 3.9             | 5.5       |
| Q5_aggregate | 0.6 ✓    | 6.9 ✓     | 32.4            | 45.2      |
| Q6_join      | 0.0 ✓    | 7.2 ✓     | 168.5           | 319.2     |
| Q8_text      | 0.6 ✓    | 3.0 ✓     | 23.0            | 28.2      |
| Q9_optional  | 0.6 ✓    | 0.8 ✓     | 3.2             | 9.4       |
| Q10_count    | 4.2 ✓    | 46.0 ✓    | 277.5           | 263.2     |

(1k/10k from the rerun; the first full run also had 18/18 ✓ with noisier timings.) `expected.json` has
no 40k/45k entries, so those are unchecked; 100k could not be checked (fails).

**Q7 (code graph, 10 000 files, `deus:imports+`)**: ✓ (1318), wall 60.5 ms median (≈25 ms over ping);
ingest of 65k quads 1.0 s.

**Bundle**: 4 021.9 KiB / gzip 1 432.5 KiB (almost all the wasm). **Peak memory**: wasm
`memory.buffer.byteLength` reported in `/stats` (table above); 281–297 B/triple at ≥300k triples.

## 3. Capabilities

- **Probes: 22/22.**
- Full SPARQL 1.1 Query (SELECT/ASK/CONSTRUCT/DESCRIBE, OPTIONAL, UNION, MINUS, EXISTS, all FILTER
  functions, BIND/VALUES, aggregates, subqueries, property paths, named graphs, SERVICE excluded).
- **SPARQL 1.1 Update** verified on the deployed worker: `INSERT DATA`, `DELETE WHERE`; both are
  journaled as text and survived a `ctx.abort()` replay (deleted triples stayed deleted).
- **RDF 1.2 / RDF-star** verified: `INSERT DATA { << s p o >> sx:confidence 0.5 }` creates a reifier
  with `rdf:reifies <<( s p o )>>`; `isTriple(?t)` and `SUBJECT(<<( ?f sx:subject <urn:y> )>>)` work.
  Note 0.5 uses RDF 1.2 syntax: `<< >>` is a reifier, the triple term is `<<( )>>`.
- Transactions: each `load`/`update` is atomic in the Store; the journal append is one
  `transactionSync`. Store and journal are not jointly atomic: if the journal write throws after the
  Store mutation, memory is ahead of disk until the next eviction (fixable by journaling first).
- Incremental update: inserts/deletes are O(batch) in memory; the journal grows until compacted.

## 4. Limits & scale

What breaks first is **memory**, well before CPU or storage:

- wasm-bindgen's JS glue fails with `RangeError: Invalid array buffer length` (in
  `new Uint8Array(memory.buffer)` / `decodeText`) once the wasm memory is beyond ≈128–150 MB. At 45k
  facts (457k triples, 134 MB wasm) all queries work; at 50k facts (507k triples, 151 MB) the Store
  loads but **every query throws**, and afterwards the instance is poisoned (`attempted to take
ownership of Rust value while it was borrowed`, `null pointer passed to rust`). The isolate is not
  killed at 128 MB — ingest kept going to 913k triples / 247 MB before the isolate died (error 1101/HTML 500) — so failure is silent and partial, which is worse than a clean OOM.
- **Usable ceiling: ≈450k triples per DO** (~45k pipeline-rdf facts).
- `store.dump()` (compaction) fails already at 304k triples (needs the whole dump as one wasm string
  plus a JS copy). A chunked dump (per graph or via `match`) would be needed.
- Do **not** use `load({no_transaction:true})`: the bulk loader reserves ~170 MB of wasm memory even for
  10k triples.
- Multiple DO instances of one class can share an isolate and therefore one wasm memory / 128 MB
  budget; an aborted instance's Store is only freed by GC finalisation (mitigated: Stores keyed by DO id
  are `free()`d on re-init).
- Storage is a non-issue: ~9 B/triple gz journal.
- **Extrapolation to 10M triples (labelled extrapolation):** ~3 GB wasm memory and ~40 s cold start —
  impossible in one DO; would need sharding into ≥25 DOs.

**Amortising cold start/compaction:** not really possible. DO hibernation _discards_ in-memory state
(it is the opposite of keeping the isolate warm); a non-hibernating DO is evicted after roughly
70–140 s without requests, and on every deploy/runtime restart. So a ~1–4 s rebuild should be expected
after any idle minute. Keeping it warm would need a sub-minute alarm/keepalive (continuous duration
billing). Compaction only helps when the journal contains many UPDATEs/deletes; it doesn't speed up
replay of an insert-only journal, and it currently fails beyond ~300k triples.

## 5. Effort & risk

- ~225 LoC (`src/index.ts`), one dependency (`oxigraph` npm, prebuilt wasm, no Rust toolchain).
- Bundle 1.4 MB gzip.
- Risks: hard memory ceiling with silent failure mode; cold-start grows linearly; wasm-bindgen glue
  is module-global (one wasm instance per isolate shared across DO instances).
- Browser portability: excellent — the same `oxigraph/web.js` runs in the browser; persistence there
  would be the same journal in OPFS/wa-sqlite, with the same memory ceiling per tab (higher than 128 MB).

## 6. Verdict

| criterion                 | score |
| ------------------------- | ----- |
| query latency             | 5     |
| ingest throughput         | 4     |
| scale ceiling             | 1     |
| SPARQL coverage           | 5     |
| cold start                | 2     |
| implementation complexity | 5     |

Fastest and most complete SPARQL (22/22, UPDATE, RDF 1.2) for the least code, with sub-10 ms queries up
to ~100k triples. But it caps at ≈450k triples per DO with a silent wasm failure past ~130 MB and a
1–4 s replay after every eviction, so it only fits small per-space graphs or as a hot cache over a
SQLite-native store.

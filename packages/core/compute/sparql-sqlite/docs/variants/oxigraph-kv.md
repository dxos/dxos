# oxigraph-kv — the full Oxigraph Store, with DO SQLite as its sorted KV store

Every number below comes from the deployed worker `https://rdf-bench-oxigraph-kv.dxos.workers.dev`.
The benchmark run (`results/oxigraph-kv.json`, db `run-1791830907015`) ran on worker version
`e56a56f7-3fc4-40e7-896c-97d3a7652fb0`. The instantiate and cold-start probes ran on
`7a53121c-636b-4cb4-82c2-b5b7dcf28dd6`, which adds one `/micro` route. No local number is reported. This variant is
the comparison arm for [oxigraph-sqlite](oxigraph-sqlite.md).

## 1. Approach

`oxigraph/` is a vendored Oxigraph 0.5.11 with its storage layer re-targeted. In 0.5 the RocksDB quad store
(`storage/rocksdb.rs`, unchanged here) talks to RocksDB only through `storage/rocksdb_wrapper.rs`, which exposes Db,
ColumnFamily, Reader, Iter, Transaction and ReadableTransaction. That file is replaced (526 LoC) by one that maps all 12
column families onto `kv(cf INTEGER, k BLOB, v BLOB, PRIMARY KEY (cf, k)) WITHOUT ROWID` through synchronous JS imports:

- **Ordering:** SQLite BLOB order is memcmp then length, the same as RocksDB's bytewise comparator.
- **Prefix and range iterators:** each one is a lazy `SELECT k … WHERE cf=? AND k>=? AND k<? ORDER BY k` cursor. Its
  keys come back length-prefixed through a shared page in wasm memory, starting at 1 KB and growing to 256 KB.
- **Write-only transactions** (`load`/`extend`) buffer in wasm. At commit they flush as hex/JSON batches of at most
  900 KB each (`INSERT OR REPLACE … SELECT unhex(…) FROM json_each(?)`), because DO SQLite rejects a bound string over
  2 MB.
- **Readable transactions** (SPARQL UPDATE) write through, so they read their own writes.

Elsewhere the change is only cfg gates: `all(not(wasm), feature="rocksdb")` became `feature="rocksdb"`. `rocksdb` is now
a dependency-free feature, and `oxrocksdb-sys` is removed. The outer crate (`rs/`, 143 LoC) wraps `Store` for
`load_nquads`, `query` and `update`.

```
query:  SPARQL ─► wasm: Oxigraph Store (spareval + 16/17-byte hashed term encoding, DSPO/DPOS/DOSP/... indexes)
                    │ Reader::scan_prefix(cf, prefix) / get(id2str, hash)   (sync imports)
                    ▼
        JS host: SELECT k FROM kv WHERE cf=? AND k>=? AND k<? ORDER BY k   → [u16 len][key]* page in wasm memory
        DO SQLite: kv(cf, k BLOB, v BLOB) PK(cf,k) WITHOUT ROWID          (one B-tree for everything)

ingest: Quad[] ─► N-Quads text ─► wasm: oxttl parse, encode, 3 index keys + id2str per quad (buffered)
        ─► transactionSync { ≤900 KB JSON-hex batches → INSERT OR REPLACE INTO kv }
```

## 2. Numbers

### Per scale (harness run)

| facts   | triples   | ingest quads/s | median batch ms | dbBytes     | bytes/triple | cold start ms (harness) |
| ------- | --------- | -------------- | --------------- | ----------- | ------------ | ----------------------- |
| 1,000   | 10,128    | 20,796         | 534             | 2,330,624   | 230.1        | 243                     |
| 10,000  | 101,441   | 15,345         | 687             | 22,650,880  | 223.3        | 229                     |
| 100,000 | 1,014,923 | 6,365          | 1536            | 223,838,208 | 220.5        | 386                     |

Ping was 47.3 ms. The 100k-fact scale was loaded in full; at that scale `kv` holds 3,276,334 rows.

### Queries

Each cell is serverMs (wallMs), then correctness against `expected.json`.

| query        | 1,000 facts | 10,000 facts  | 100,000 facts   |
| ------------ | ----------- | ------------- | --------------- |
| Q1_lookup    | 1.5 (43) ✓  | 0.2 (45) ✓    | 0.1 (46) ✓      |
| Q2_entity    | 1.1 (42) ✓  | 7.8 (52) ✓    | 132.6 (165) ✓   |
| Q3_filtered  | 1.0 (45) ✓  | 10.0 (52) ✓   | 91.6 (123) ✓    |
| Q4_asof      | 0.7 (47) ✓  | 6.7 (52) ✓    | 70.1 (102) ✓    |
| Q5_aggregate | 2.1 (48) ✓  | 24.6 (64) ✓   | 218.9 (282) ✓   |
| Q6_join      | 1.4 (46) ✓  | 68.1 (152) ✓  | 8874.8 (8902) ✓ |
| Q8_text      | 3.7 (47) ✓  | 43.7 (68) ✓   | 363.9 (369) ✓   |
| Q9_optional  | 0.0 (45) ✓  | 2.9 (48) ✓    | 27.8 (69) ✓     |
| Q10_count    | 21.1 (63) ✓ | 214.0 (278) ✓ | 2258.4 (2336) ✓ |

**Q7** (code graph, 10k files): wall 75.4 ms, ✓ (1318 files). Code-graph ingest took 4676 ms.

### Bundle, memory, cold start

- **Bundle:** 3439 KiB total, **1110 KiB gzip**. The wasm alone is 3.49 MB raw, 1.11 MB gzip, and includes the
  oxttl/oxrdfio parsers.
- **Wasm memory:** 10.5 MB. Load buffers one batch's KV writes in wasm.
- **Wasm instantiate:** **19.2 ms** per instance (deployed slope over 40 instances).
- **Cold start:** probe measured 111–143 ms first request after `ctx.abort()` vs 50–64 ms warm, with the isolate (and
  wasm instance) reused. There is no replay or rebuild.

## 3. Capabilities

**Probes: 22/22.** Everything Oxigraph's Store supports is available: SPARQL 1.1 query (all forms), property paths,
named graphs, and SPARQL 1.1 UPDATE through `update()`, which writes through inside one `transactionSync`. UPDATE is
exported but not exercised, because the harness has no update endpoint. Deletes, `clear`, and per-graph operations
come from the Store as-is. RDF 1.2 is available by building the `rdf-12` feature.

Typed literals are stored by value (Oxigraph's encoding), so semantics match the oracle exactly.

**Transactions:** atomic per `transactionSync`. There are no MVCC snapshots: a reader sees the live DB, which is sound
because the DO is single-threaded. A ReadableTransaction dropped without commit cannot roll back by itself and relies
on the surrounding `transactionSync` throwing.

## 4. Limits & scale

- **Storage:** 220 bytes/triple, 2× oxigraph-sqlite. Three 49–51-byte index keys per default-graph quad plus id2str,
  all inside one table whose B-tree repeats `cf`.
- **Ingest:** blind writes need no read-before-write, yet it is the slowest path. 6.4k quads/s at 1M triples, because
  the write volume is about 3 index keys of 50 bytes, hex-encoded, plus string values.
- **Queries:** every scan ships ~50-byte keys instead of 4-byte ids. Q10 at 1M triples streams about 1M keys, which
  comes to 2.3 s. Oxigraph's planner issues the same pattern-per-binding loops as spareval, and nothing here is
  memoized, so Q6 at 1M triples takes 8.9 s.
- **Extrapolation to 10M triples (labelled extrapolation, linear from 1M):**

  | metric      | estimate                                       |
  | ----------- | ---------------------------------------------- |
  | DB size     | ~2.2 GB                                        |
  | full ingest | ~26 min at ~6k quads/s                         |
  | Q6          | ~90 s, inside the 300 s CPU limit but unusable |
  | Q10         | ~23 s                                          |

  Memory is not the limit.

## 5. Effort & risk

- **LoC:** 526 (wrapper), 143 (outer crate), 192 (TS host), and about 30 lines of cfg edits in the vendored crate.
- **Maintenance:** this vendors the `oxigraph` crate 0.5.11 (about 11.5k LoC of Rust; spareval and the other crates stay upstream) as a fork. The seam (`rocksdb_wrapper.rs`) is
  internal and unversioned; Oxigraph 0.4 had a different storage layout, so each upgrade means re-applying and
  re-checking the patch.
- **Toolchain:** same as oxigraph-sqlite. The wasm is larger (3.5 MB).
- **Browser portability:** as good as oxigraph-sqlite. Any synchronous SQLite (wa-sqlite OPFS in a worker, or sql.js)
  can back the same imports.

## 6. Verdict

| criterion                                | score (1–5) |
| ---------------------------------------- | ----------- |
| query latency                            | 2           |
| ingest throughput                        | 2           |
| scale ceiling                            | 3           |
| SPARQL coverage                          | 5           |
| cold start                               | 5           |
| implementation complexity (5 = simplest) | 2           |

The approach works: the unmodified Oxigraph quad store runs correctly (22/22 probes, all queries ✓) on SQLite-as-KV
with no memory ceiling or replay, and it brings UPDATE and value-based literal semantics for free. It loses to the
id-based `oxigraph-sqlite` on every measured axis: 4× slower ingest, 2× the storage, and 8× slower on Q6 at 1M triples.
It is also a fork of an unversioned internal API, so it is not the one to pick.

# Composer Search — Design

_Date: 2026-07-14. Companion to [`AUDIT.md`](./AUDIT.md) (current state) and
[`ROADMAP.md`](./ROADMAP.md) (sequencing). This document is the "why": the target
architecture and the decisions behind it._

## 1. Goals & principles

1. **Unify search behind one surface.** `Filter.text` (for queries) and the
   search UI (for humans) stay the entry points; multiple retrieval strategies sit
   behind them, not beside them.
2. **Local-first, then accelerated.** Search must work offline against local
   data; EDGE is an _accelerator and a scale tier_, never a hard dependency for
   the common case.
3. **Reuse the engine we already ship.** ECHO's FTS5 index, the `command-score`
   ranker, the `QueryBuilder` DSL, the `@dxos/pipeline` substrate, and feed/queue
   replication are all in-repo and under-used. Prefer wiring over building.
4. **Sync the vectors, not the index.** Embeddings replicate as bounded,
   append-only data; each peer (and EDGE) builds its own ANN. This keeps the CRDT
   clean and lets client and server use different index implementations.
5. **Tiered embedding.** A low-latency open-weight model runs locally for
   incremental/offline indexing; a higher-quality model runs on EDGE for bulk
   backfill — using the **same model family** so vectors are interchangeable.

## 2. The four search planes

One query surface, four retrieval planes. A query may hit one plane or fuse
several.

```
                         ┌─────────────────────────────────────────────┐
      Filter.text(q) ───►│              Search orchestration             │
      Search UI     ───►│  (Filter executor / plugin-search / agent)    │
                         └───┬───────────┬───────────────┬───────────┬──┘
                             │           │               │           │
                     ┌───────▼──┐  ┌─────▼─────┐  ┌───────▼──────┐ ┌──▼─────────┐
                     │ Lexical  │  │ Semantic  │  │ Structured / │ │ Agent /    │
                     │ (FTS5)   │  │ (vector)  │  │ symbolic     │ │ RAG        │
                     │ BM25     │  │ cosine ANN│  │ Filter + RDF │ │ tools      │
                     └───────┬──┘  └─────┬─────┘  └───────┬──────┘ └──┬─────────┘
                             │           │               │           │
                     ┌───────▼───────────▼───────────────▼───────────▼─────────┐
                     │        index-core (OPFS SQLite): FtsIndex, VectorIndex,   │
                     │        EntityMetaIndex, ReverseRefIndex  ·  IndexTracker  │
                     └───────────────────────────────────────────────────────────┘
```

- **Lexical (FTS5)** — exists today (§AUDIT 2.2). Wire the shipped consumers
  (`plugin-search`, `MailboxArticle`, agent tools) to it; restore ranking +
  highlighting.
- **Semantic (vector)** — new. A `VectorIndex` peer of `FtsIndex` in `index-core`,
  fed by embeddings (§4).
- **Structured / symbolic** — ECHO `Filter` predicates (type, props, tags,
  child-of, foreign keys) + the RDF FactStore for entity/relation queries and the
  fact→source bridge (§6).
- **Agent / RAG** — the `database.query` tool orchestrates the other three; adds a
  `searchKind: 'full-text' | 'vector' | 'hybrid'` input.

**Hybrid fusion.** When a query runs against more than one plane, results are
merged with **Reciprocal Rank Fusion** (RRF: `score = Σ 1/(k + rank_i)`, `k≈60`) —
it needs no score calibration between BM25 and cosine, which is exactly the
regime here. Fusion is a pure client-side function over ranked lists, testable in
isolation.

## 3. Query surface & result contract

- **`Filter.text(q, { type })`** stays the programmatic entry. `type: 'hybrid'` is
  added to `TextSearchOptions`; the executor plans a lexical select + a vector
  select and fuses. Unknown/unsupported `type` degrades to `full-text` (never
  empty) so callers are forward-compatible.
- **A single `SearchResult` shape** carries `{ dxn, object?, label, snippet?,
  score, matches: MatchSpan[], source: 'space' | 'global' | 'edge' }`.
  `MatchSpan` (`{ field, start, end }`) drives highlighting and is produced by the
  ranker, not the executor — highlighting is a UI concern computed from the query
  and the matched field, decoupled from whether the match came from FTS or vector.
- **`plugin-search` stops stringifying whole objects.** It consumes ranked
  `SearchResult`s from the executor and renders label + highlighted snippet. The
  `command-score` ranker (already in `react-ui-search`) is used for final label
  ordering / tie-breaking on top of the engine's BM25/cosine rank.

## 4. The vector subsystem (tiered, feed-synced)

The core of the "efficiently synced between client and edge" requirement.

### 4.1 Data model — embeddings as append-only feed entries

An `EmbeddingRecord` is written to a **dedicated per-space feed/queue** (the
`FEED_REPLICATOR`/`QUEUE_REPLICATOR` channel — **not** an Automerge document):

```ts
type EmbeddingRecord = {
  chunkId: string;        // stable id: `${objectDxn}:${field}:${chunkIndex}`
  objectDxn: string;      // source ECHO object / queue item
  field: string;          // which field/path was embedded
  span?: [number, number];// character span within the field (for snippet + citation)
  model: string;          // e.g. 'bge-m3' — vectors are only comparable within a model id
  dims: number;           // 768 | 1024
  vector: Float32Array;   // the embedding (stored as bytes)
  contentHash: string;    // source-content hash for incremental divergence detection
  createdAt: string;
};
```

**Why feeds, not Automerge (explicit decision):** dense float arrays are large and
opaque; putting them in the space's Automerge document tree would bloat CRDT
history and sync payloads with data that never merges. Feeds are append-only,
bounded, cheaply replicated, and — critically — usable from Cloudflare Worker
code, so EDGE can consume the same stream. Superseded embeddings (content changed)
are tombstoned by a later record for the same `chunkId`; compaction is a
background concern, not a query concern.

### 4.2 Indexing pipeline (`@dxos/pipeline`)

Indexing is authored as a `@dxos/pipeline` (`source → stages → sink`), the same
substrate `pipeline-rdf` and transcription use, with a `Stage.track` progress
stage feeding the app's progress panel:

```
changed objects ──► chunk ──► (skip if contentHash unchanged) ──► embed ──► write EmbeddingRecord to feed
   (IndexTracker cursor)      (field-aware, token-budgeted)      (tiered)     (sink)
```

- **`chunk`** — field-aware splitting with a token budget (~512 tokens for
  `bge`/EmbeddingGemma; up to ~4–8k for `bge-m3`/`qwen3` on the EDGE tier). Chunk
  boundaries are content-stable so `contentHash` gating is meaningful.
- **`embed`** — the tiered seam (§4.3).
- **sink** — append `EmbeddingRecord`s to the feed.

The `IndexTracker` cursor mechanism that already drives `FtsIndex` gates re-embed
work: only changed objects flow, and `contentHash` skips re-embedding unchanged
chunks.

### 4.3 Embedding tier (local + EDGE, open-weight)

| Tier | Model | Dims | When | Why |
|---|---|---|---|---|
| **Local** | EmbeddingGemma-300m or `bge-small` via `@xenova/transformers` (WASM/WebGPU) | 768 | incremental edits, offline | low latency, no network, private; already have the dep |
| **EDGE** | Workers AI `@cf/baai/bge-m3` or `@cf/qwen/qwen3-embedding-0.6b` | 1024 | bulk backfill, large imports, when online | quality + throughput; `$0.012–0.067/M` tokens; no extra keys |

The two tiers **must agree on a model id per index generation** — vectors are only
comparable within a model. The default pairing uses one dimension (768 local /
1024 EDGE) per named index; switching models triggers a background re-index
generation (the feed is versioned by `model`). EmbeddingGemma is available both in
`transformers.js` and on Workers AI, making it the cleanest single-model choice if
we want byte-identical behavior across tiers; `bge` is the pragmatic default given
the existing `@xenova/transformers` usage.

### 4.4 Index tier (client ANN + EDGE Vectorize)

- **Client**: a new `VectorIndex` in `index-core`, peer of `FtsIndex`, in the same
  OPFS SQLite. Two candidate backends, decided by benchmark (see
  [`ROADMAP.md`](./ROADMAP.md) M4): **`sqlite-vec`** (a SQLite extension → stays in
  the existing DB, supports metadata-filtered brute-force KNN in SQL, natural fit)
  or **`usearch`** (already used in `stories-brain`, HNSW ANN, separate index
  file). For per-space corpora (thousands–tens-of-thousands of chunks),
  metadata-filtered brute force in `sqlite-vec` is likely sufficient and simplest;
  `usearch`/HNSW is the scale fallback.
- **EDGE**: the same feed is mirrored into **Cloudflare Vectorize** (up to 10M
  vectors/index, ≤1,536 dims, `topK ≤ 50`). This is a server-side accelerator for
  the global/cross-space tier, **not** a client-syncable store (see §5).

### 4.5 Cloudflare Vectorize — can it be "synced client-side"?

**No — and it shouldn't be.** Vectorize is a Worker-bound managed service; there
is no client replica and no wire format to sync it down. The correct integration
is: embeddings are computed once (local or EDGE Workers AI), stored in the feed
(the source of truth that _does_ sync), and **each tier builds its own index** —
`VectorIndex` on the client, Vectorize on EDGE. Client and EDGE stay consistent
because they consume the same versioned vectors, not because they share an index.
Vectorize earns its place only at the scale where a per-user global index across
all spaces exceeds what the client can hold (§5, M6).

## 5. Cross-space / global search

The FTS executor caps one query to a single space (§AUDIT 2.2). Global search is
staged:

- **Near term — client fan-out + merge (M2).** Query each _loaded_ space's FTS in
  parallel and fuse with RRF. No core ECHO change; correct for the "search my open
  spaces" case; bounded by the number of open spaces. Results carry `source:
  'global'` and their originating space.
- **Medium term — lift the single-space invariant (optional).** Extend
  `FtsIndex`/executor to span spaces in one pass if fan-out proves insufficient.
- **Long term — per-user EDGE global index service (M6).** A per-user index on
  EDGE (FTS + Vectorize) covering _all_ spaces (including unopened ones), queried
  via `client.edge.query`. This is a **new EDGE service** whose worker lives in the
  external EDGE repo; this repo owns the client contract and the feed it consumes.
  Because indexes are derived from replicated data, the global index is populated
  from the spaces the user's identity already replicates to EDGE.

## 6. Structured & RDF plane

- **ECHO `Filter` predicates** cover type / property / tag / child-of / foreign-key
  filters today. The gap is the **in-memory `text-search` matcher** (returns
  `false`, §AUDIT 2.3): implement it so a `text-search` predicate can be _combined_
  with structural predicates (e.g. `type:Message AND "invoice"`), which also
  unblocks FTS+type composition.
- **RDF FactStore (GraphRAG)** is relevant to search as the _structured/semantic_
  bridge for "what do we know about X" and "messages from/about X" — the
  `stories-brain` **hybrid** skill (fact→source) is the strongest candidate there.
  Its near-term, search-moving goal is to **persist the FactStore and expose a
  fact-grounded search/answer path** — see §8.

## 7. Use-case mapping (a–e)

| Use case | Plane(s) | Approach | Milestone |
|---|---|---|---|
| **(a) Cross-space search** | lexical (+vector) | fan-out+merge → EDGE global index | M2 → M6 |
| **(b) Space full-text search** | lexical | wire `plugin-search` to `Filter.text` + ranking/highlight | **M1** |
| **(c) ECHO query text predicates** | lexical + structured | implement in-memory `text-search` matcher; enable FTS+type | M3 |
| **(d) Inline filtering (MailboxArticle)** | structured (+lexical) | apply the already-parsed `Filter` to the query | **M1** |
| **(e) Agent-based search** | agent (all planes) | add `searchKind: vector\|hybrid` to `database.query`; expose fact→source | M3 → M5 |

## 8. RDF FactStore — near-term implementation goal

**Goal:** move search forward with the FactStore by (1) making it durable and
(2) exposing a fact-grounded retrieval path in the search/agent surface — the
concrete, shippable step behind the "GraphRAG" direction the `stories-brain`
roadmap is still validating.

**Plan (sequenced; detailed tasks tracked in `TASKS.md` under the RDF milestone):**

1. **Persist the FactStore.** Switch `plugin-brain`'s per-space registry from
   `FactStore.makeMemory()` to `FactStore.layer` (the existing SQLite backend) on
   the OPFS SQLite client, so facts survive reload. Reuse `IndexTracker`-style
   cursors (`FeedCursors`) already present in `pipeline-rdf` for incremental
   extraction.
2. **Fact→source bridge as a first-class retrieval op.** Promote the
   `stories-brain` `hybrid` skill (`subject-index.ts`: find facts about a subject →
   follow `attribution.source` DXN → return the verbatim source object) into a
   shipped operation, so "messages from/about X" answers are grounded in real
   messages, not just facts.
3. **Surface it in search + agent.** Expose the fact→source path (a) as a result
   group in the search UI when the query resolves to a known entity, and (b) as an
   agent tool alongside `database.query`.
4. **Validate against the benchmark.** Gate expansion on the `brain-skill-eval`
   comparison (facts vs rag vs hybrid) the `stories-brain` roadmap defines — do
   not over-invest in RDF until it beats thread-RAG on a question class.

This deliberately uses **only shipped/experimental pieces already in-repo** (the
SQLite FactStore backend, the hybrid skill, the pipeline substrate) — no new
external dependency — and produces a user-visible search capability.

## 9. Leveraging `@dxos/pipeline`

Yes — the indexing/embedding flow is a textbook `@dxos/pipeline` use:

- **Source** = the `IndexTracker`-cursored stream of changed objects (the same
  mechanism `FtsIndex` uses).
- **Stages** = `chunk` → `contentHash`-filter → `embed` → (progress `track`).
- **Sink** = append to the embedding feed.

Back-pressure matters because local embedding is CPU-bound; `Stage.map`'s
`concurrency` and the `Overflow` policy give us throttling for free, and
`Stage.track` feeds the progress panel (the artifact this worktree's branch is
named for). This mirrors `pipeline-rdf`'s `FactPipeline` and the transcription
runtime, so the pattern is proven.

## 10. Key risks & decisions

| Decision | Choice | Rationale |
|---|---|---|
| Vector storage medium | **Feed/queue**, not Automerge | avoid CRDT bloat; CF-Worker-consumable; append-only |
| Client index backend | `sqlite-vec` (default) / `usearch` (scale) | stay in OPFS SQLite; brute-force is enough per-space |
| Embedding models | local `bge`/EmbeddingGemma + EDGE `bge-m3`/`qwen3` | open-weight, low-cost, dimension-compatible per generation |
| Vectorize | EDGE-only accelerator | no client replica exists; feed is the synced source of truth |
| Cross-space | fan-out now, EDGE service later | ship value without touching core echo; scale on EDGE |
| First shipped value | **wire existing FTS** (M1) | highest confidence, zero new infra, stale TODO |

**Open risks:** (1) FTS indexes whole-object JSON — noisy matches until per-field
indexing lands; mitigated short-term by client-side field-aware ranking. (2)
Tier model-drift — enforce a single `model` id per index generation. (3) Global
EDGE index depends on the external worker repo — this repo ships only the client
contract until that lands.

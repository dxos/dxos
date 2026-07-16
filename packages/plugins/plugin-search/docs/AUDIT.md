# Composer Search & Text Indexing — Audit

_Date: 2026-07-14. Scope: the state of search and text indexing across Composer as
it exists on `main` today. This is a factual snapshot; proposals live in
[`DESIGN.md`](./DESIGN.md) and [`ROADMAP.md`](./ROADMAP.md)._

## TL;DR

- **The shipped `plugin-search` does not use any index.** It pulls _every_
  non-`Text` object in the **active space** into the client and scans them with a
  case-insensitive `RegExp`. No ranking, no highlighting, single-space, and the
  web-search backend throws `Not implemented`.
- **ECHO already has a real full-text index** — SQLite **FTS5** (trigram
  tokenizer, BM25 ranking) that **runs client-side today** in OPFS/WASM SQLite via
  the client worker. `Filter.text(q, { type: 'full-text' })` routes to it. The
  plugin's _"re-enable full-text search when the indexer is available in all
  environments"_ TODO is **stale** — the indexer is available in the browser now.
- **Vector / semantic search is scaffolding only.** The query AST and
  `Filter.text` API accept `type: 'vector'`, but the executor is a
  `log.warn('Vector search is not supported')` stub. There is no vector table, no
  embedding generation, and no ANN index anywhere in ECHO or the shipped plugins.
- **The `MailboxArticle` search box parses a real ECHO `Filter` but never applies
  it** — only an in-memory sender-exclusion pass runs. Wiring the parsed filter
  into the query is a small, unblocked change.
- **The only vector code in the repo** lives in the `stories-brain` research
  harness (Ollama `nomic-embed-text` + `usearch`, in-memory), used to _benchmark_
  vector-RAG against the RDF FactStore. It is not wired into the app and its
  advantage is explicitly "not yet validated".

---

## 1. `plugin-search` (the shipped Composer search)

Location: `packages/plugins/plugin-search`.

### 1.1 What it does

Both search surfaces run the identical query. In
[`SearchDialog.tsx:33-37`](../src/containers/SearchDialog/SearchDialog.tsx) and
[`SearchArticle.tsx:21-25`](../src/containers/SearchArticle/SearchArticle.tsx):

```ts
// TODO(burdon): Re-enable full-text search when indexer is available in all environments.
const objects = useQuery(
  space?.db,
  query === undefined ? Query.select(Filter.nothing()) : Query.select(Filter.not(Filter.type(Text.Text))),
);
```

- Before input: `Filter.nothing()` → empty.
- On input: `Filter.not(Filter.type(Text.Text))` → **fetch every object in the
  space except `Text.Text`**. The query string is never sent to ECHO.

Matching is client-side. `SearchContextProvider`
([`useGlobalSearch.tsx:29-52`](../src/hooks/useGlobalSearch.tsx)) compiles the raw
query into a `RegExp` (`queryStringToMatch`, [`sync.ts:12-15`](../src/hooks/sync.ts)
— **no escaping**, the raw string is used as a regex) and
`filterObjectsSync` ([`sync.ts:45-77`](../src/hooks/sync.ts)) flattens each object
via `JSON.parse(JSON.stringify(object))`, keeps string fields, and scans them.

### 1.2 Gaps (from the code)

- **No server-side text filtering / no index use.** O(space-size) memory and CPU
  per keystroke; will not scale.
- **No ranking or highlighting in the plugin.** `filterObjectsSync` returns
  objects in iteration order. A `match` regex and `snippet` are carried on the
  result but never rendered as highlights. (Fuzzy ranking via `command-score`
  _does_ exist one layer down in `@dxos/react-ui-search`'s
  [`useSearchListResults.ts:87-97`](../../../ui/react-ui-search/src/components/SearchList/hooks/useSearchListResults.ts)
  — but the plugin's containers never call it, so it is dead code from the
  plugin's perspective.)
- **`filterObjectsSync` matching smell** ([`sync.ts:57-73`](../src/hooks/sync.ts)):
  the `.some()` callback ignores the per-field regex test and always returns
  `true`, emitting a result for the first field of every candidate. Multiple
  `TODO(thure)` / `TODO(burdon)` comments flag the semantics as wrong.
- **`JSON.parse(JSON.stringify(object))` field extraction is fragile**
  ([`sync.ts:96-107`](../src/hooks/sync.ts)) — wrapped in try/catch because TLDraw
  sketch documents throw.
- **Icon/type inference is hardcoded heuristics** (`getIcon`,
  [`sync.ts:18-38`](../src/hooks/sync.ts)): `email`→user, `website`→organization,
  `repo`→project.
- **No cross-space search** (`SearchArticle.tsx:19`
  `TODO(burdon): Option to query across spaces.`).
- **Web search is a stub**: `search/exa.ts:38` throws `Not implemented`;
  `useWebSearch` is `@deprecated`. `SearchArticle` still wires `webResults` in.
- **`dx.config.ts` / `PLUGIN.mdl` copy is aspirational** — they advertise a
  "full-text search engine" with "ranked results" and working Exa search; none of
  that is true in code.
- **Effectively no active tests.** `hooks/sync.test.ts` is a single skipped test;
  `search/exa.test.ts` is `describe.skip`.
- `docs/search.md` describes a different, unimplemented architecture (a Search
  service consuming an OUTBOUND queue via resolvers).

### 1.3 Surfaces & structure

- **Surfaces** (`react-surface.tsx`): the `SEARCH_DIALOG` command palette, an
  `AppSurface.SearchInput` slot, and a `Space` deck-companion (`SearchArticle`).
- **Operation**: `OpenSearch` (opens the dialog; keybinding `shift+meta+f`).
- **The global-filter side channel matters:** `GlobalFilterProvider` /
  `useGlobalFilteredObjects` (re-exported from `@dxos/react-ui-search`) let other
  views live-filter on the active query — `plugin-table` consumes it in
  `TableArticle.tsx:55` and `TableCard.tsx:34`.

---

## 2. ECHO indexing & query (the engine under the plugin)

Indexing lives in `@dxos/index-core`
(`packages/core/echo/index-core`); query execution in `@dxos/echo-host`
(`packages/core/echo/echo-host`). Everything is **SQLite-backed and runs
client-side** (in the client worker) — there is no server/edge indexer.

### 2.1 The index engine

`IndexEngine` ([`index-engine.ts`](../../../core/echo/index-core/src/index-engine.ts))
owns four indexes, each implementing the `Index` interface (`migrate()` +
`update(objects)`):

| Index             | Backing                                       | Purpose                                                              |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| `EntityMetaIndex` | `objectMeta` table                            | type / id / timestamp / relation / hierarchy queries — the workhorse |
| **`FtsIndex`**    | **FTS5 virtual table** (`tokenize='trigram'`) | full-text search + JSON snapshot store                               |
| `ReverseRefIndex` | `reverseRef` table                            | incoming-reference traversal                                         |
| `IndexTracker`    | `indexCursor` table                           | per-source incremental cursors (Automerge heads / queue positions)   |

Indexing is incremental and event-driven: `EchoHost._runUpdateIndexes` batches 50
objects per pass off `AutomergeDataSource` and `FeedDataSource`, triggered by
`documentsSaved` / `feedStore.onNewBlocks`, and invalidates affected queries via a
hint after each pass. The join key across tables is `objectMeta.recordId ==
ftsIndex.rowid == reverseRef.recordId`.

### 2.2 Full-text: what works and what doesn't

`FtsIndex.query`
([`fts-index.ts`](../../../core/echo/index-core/src/indexes/fts-index.ts)):

- Terms **≥ 3 chars** → FTS5 `MATCH` with **BM25** ranking (`ORDER BY rank DESC`).
- Any term **< 3 chars** → falls back to `LIKE '%term%'` **full-table scan**
  (trigram minimum), rank 1, no ranking.
- The whole object JSON is indexed as one `snapshot` column — **no per-field
  text indexing**, so matches can hit structural/key text, not just user content.

Query path: `Filter.text(...)` → `text-search` AST node → a `TextSelector`
**SelectStep** that calls `IndexEngine.queryText` → `FtsIndex.query` (BM25). Queue
results are hydrated from FTS snapshots; space results are loaded from Automerge
docs. Rank is threaded onto each result.

**Documented limitations (TODOs in `query-executor.ts` / `fts-index.ts`):**

- **Single space only** — `invariant(spaces.length <= 1, 'Multiple spaces are not
supported for full-text search')`.
- **FTS + type not combined** — `TODO(dmaretskyi): type + FTS queries would be
very common ... maybe chunk the fts index`; `TextSelector.typename` is always
  `null`.
- **No snippet/highlight** — `// nice to have matched text snippets/highlighting`.
- **`< 3` char terms scan the whole table.**
- **Conservative invalidation** — text-search / traversal / union / child-of
  queries are `isSimple=false` and **always re-execute** on any matching change.

### 2.3 In-memory text matching is unimplemented

Property predicates (`eq`/`in`/`range`/…) match in-memory in `FilterStep`. But the
generic `text-search` case in **all three** in-memory matchers returns `false`
with `// TODO: Implement text search.`
(`echo-host/src/filter/filter-match.ts:85-88` & `:176-179`;
`echo/src/internal/Filter/match.ts:257-259`). So `text-search` only works via the
FTS SelectStep — a `text-search` predicate applied as a _post-select_ filter drops
everything. And `contains` is array-membership, **not** substring text search.

### 2.4 Vector search is a stub

- AST models it: `FilterTextSearch.searchKind: Literal('full-text', 'vector')`.
- API accepts it: `Filter.text(text, { type?: 'full-text' | 'vector' })`
  ([`Filter.ts:207-225`](../../../core/echo/echo/src/Filter.ts)), with
  `// TODO(dmaretskyi): Hybrid search.` and `// TODO: ... the embedding should be
done on the query-executor side.`
- Executor **rejects it**: `query-executor.ts:862` — `if (searchKind ===
'vector') { log.warn('Vector search is not supported'); break; }` (returns
  empty).
- A grep for `vec0` / `sqlite-vec` / `embedding` / `cosine` across
  `packages/core/echo` finds only the FTS5 table and the two TODOs. **No vector
  table, no embeddings, no ANN.**

### 2.5 Storage

- Indexes live in **OPFS-backed WASM SQLite** in the browser (`@dxos/sql-sqlite`
  on `@effect/wa-sqlite`, dedicated worker), and `@effect/sql-sqlite-node` on
  node. Automerge docs are stored separately (`SqliteStorageAdapter`, replacing
  LevelDB). `reindex` / `setConfig` RPCs are now **deprecated no-ops** ("no longer
  needed with SQL-based indexing").

---

## 3. Filtering, mailbox & agent search

### 3.1 `MailboxArticle` — parsed filter is not applied

[`MailboxArticle.tsx:106-139`](../../plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx):
the search box (`QueryEditor`) parses text into an ECHO `Filter` via
`QueryBuilder` from `@dxos/echo-query`, storing it in `filter` state — but the
message query never references it:

```ts
const builder = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
useEffect(() => {
  const { filter } = builder.build(filterText);
  setFilter(filter);
}, [filterText, builder]);
// ...
const source = feed && Query.select(Filter.type(Message.Message)).from(feed); // `filter` never used here
```

The only filtering actually applied is `Mailbox.isFiltered` — an **in-memory,
sender-only** exclusion (regex on `sender.email`) driven by the persisted
`messageFilters` "Ignore sender" list (`types/Mailbox.ts:262-289`). The typed
filter's sole current effect is to gate the "save filter" button and be persisted
as a named subscription (`filters` array). The comment at `:118-121` explains the
"read the whole feed, sort/group client-side" design (thread ordering by
`max(created)` needs the full set).

**The `QueryBuilder` DSL** (`@dxos/echo-query`) already parses tags (`#tag` →
`Filter.tag`), full-text (barewords → `Filter.text`), `type:`, and `key:value`
property filters with `AND`/`OR`/`NOT` composition — so the parsing side of a
rich mailbox search is done; only the application is missing.

### 3.2 Agent search — full-text tool, vector plumbed but unused

The assistant exposes search as **Operations bundled into Skills as LLM tools**
(`packages/core/compute/assistant-toolkit`). The primary tool is
`org.dxos.function.database.query`
([`skills/database/operations/query.ts`](../../../core/compute/assistant-toolkit/src/skills/database/operations/query.ts)):
full-text (AND of `Filter.text(term, { type: 'full-text' })` per token) + optional
`typename` + `in:` (child-of) scoping + `includeQueues`. Companion tools: `Load`,
`SchemaList`, object/relation/tag CRUD, `ContextAdd/Remove`. A `QueryMemories`
tool does the same over `Memory` objects. `GetContext` returns the agent's own
plan/instructions/artifacts (not semantic retrieval).

So agent retrieval is an **agentic keyword-search-then-load loop**, not vector
RAG. A `vector` `searchKind` is plumbed through the AST and used _optionally_ by
transcript-extraction reference-linking (`assistant/src/extraction/quotes.ts`,
defaulting to `full-text`), but the agent's search tools request `full-text`.

---

## 4. Experimental: RDF FactStore & the vector harness

### 4.1 `pipeline-rdf` + `plugin-brain` (symbolic, shipped)

`@dxos/pipeline-rdf` (`packages/core/compute/pipeline-rdf`) extracts
subject–predicate–object **facts** from text via an LLM and stores them as RDF
(reified triples with FactBank factuality, PROV-O attribution, valid-time). The
`FactStore` service has a SQLite backend (`triples` table, direct structured
query; Comunica/SPARQL is node-only) and an in-memory N3 backend. Retrieval is
**symbolic** — entity-slug / predicate / source / confidence matching and
NL→SPARQL (`generateQuery`) — **there is no embedding or vector code**; the
normalize-predicates stage even notes "curated set vs embeddings ... deliberately
left" open.

`plugin-brain` (`packages/plugins/plugin-brain`) is **wired into Composer**
(`composer-app/src/plugin-defs.tsx:195`): a mailbox "Analyze" action populates a
**per-space, in-memory** `FactStore` (resets on reload), a `FactsCompanion` panel
displays facts, and `QueryFacts` / `SummarizeSubject` are exposed as agent tools.
A persistent backend is on its roadmap (`PLUGIN.mdl` F-1.4).

Built on `@dxos/pipeline` — a mature, generic Effect-`Stream` pipeline substrate
(`source → stages → sink`, back-pressured, with a `track` progress stage) also
used by `pipeline-email`, `pipeline-discord`, and the live `pipeline-transcription`
runtime.

### 4.2 `stories-brain` (the only vector code, research-only)

`packages/stories/stories-brain` is a Storybook + research harness. Its vector
path (`testing/harness/internal/`):

- **Embeddings**: local **Ollama `nomic-embed-text` (768-dim)** via raw `fetch`
  (`embeddings.ts`); `OLLAMA_ENDPOINT` default `http://localhost:11434`.
- **Index**: **`usearch`** `Index` (cosine, F32), in-memory, rebuilt per run
  (`vector.ts`). Exposed as an Effect `VectorStore` service.

It powers a `brain-skill-eval` test comparing four retrieval modes on "summarize
messages from _X_": `source` (Database), `facts` (Brain/RDF), `rag` (vector), and
`hybrid` (fact→source bridge — find facts about a subject, follow each fact's
`attribution.source` back to the verbatim message). `stories-brain/ROADMAP.md`
frames this as **GraphRAG vs vector-RAG vs hybrid** and states the FactStore's
advantage is **not yet validated** ("kill the FactStore if it doesn't beat
thread-RAG on some question class"). The eval is `skipIf` a private fixture, so it
never runs in CI.

Also present elsewhere (not brain): `@xenova/transformers` is already a repo
dependency, used by `@dxos/assistant` NER and a `plugin-transformer` embeddings
demo — precedent for in-browser embedding.

---

## 5. EDGE, sync & storage (relevant to a syncable index)

- **EDGE = Cloudflare Workers** (`*.dxos.workers.dev`), using Durable Objects
  (WebSocket hibernation, 1 MB message cap) and R2 (blobs). Services:
  `AUTOMERGE_REPLICATOR`, `SUBDUCTION_REPLICATOR`, `FEED_REPLICATOR`,
  `QUEUE_REPLICATOR`, `SWARM`, `SIGNAL`, `STATUS`, plus agents, functions
  (Workers-for-Platforms / Worker-Loader, invoked via
  `EdgeHttpClient.invokeFunction`), workflows, cron, and a one-shot `execQuery`.
  AI is **proxied** (Anthropic, BYOK) — **no embeddings endpoint**.
- **No Cloudflare Vectorize / D1 / KV / Workers AI is configured in this repo.**
  The EDGE worker source (where bindings would live) is a **separate repo**.
- **Sync** is Automerge (a DXOS fork of `automerge-repo`) with the newer
  **Subduction** byte-transport, replicated to EDGE over WebSocket
  (`EchoEdgeSubductionReplicator`, batched under the 1 MB cap). **Feeds/queues**
  (`FEED_REPLICATOR` / `QUEUE_REPLICATOR`, hypercore-style append-only) are a
  separate channel, explicitly noted as usable from Cloudflare Worker code.
- **Indexes are derived locally, never synced.** A syncable index must either be
  modeled as synced ECHO data and re-derived per peer, or replicated on its own
  channel.
- **Cross-space**: `client.spaces.query(...)` runs against the whole
  `client.graph` (Hypergraph), but the FTS executor caps a single query to one
  space. There is **no SDK "personal space"** anymore (the credential is
  deprecated); the app/`plugin-space` layer designates a default/personal space.
  A global index fits best at the `client.graph`/indexer tier or on EDGE.
- **Client storage**: OPFS-backed WASM SQLite is the primary persistent store
  (indexes + Automerge docs); legacy LevelDB/IndexedDB remain behind config
  drivers. **A vector index slots naturally into `index-core` as a peer of
  `FtsIndex`**, on the same OPFS SQLite and `IndexTracker` cursor mechanism.

---

## 6. Capability inventory (what we can build on)

| Capability                                      | Status                                | Location                          |
| ----------------------------------------------- | ------------------------------------- | --------------------------------- |
| Client-side FTS5 full-text index (BM25)         | **Ships, unused by plugin**           | `index-core` `FtsIndex`           |
| `Filter.text(q, {type:'full-text'})`            | **Works**                             | `echo` `Filter.ts`                |
| Fuzzy ranking (`command-score`)                 | Exists, dead code in plugin           | `react-ui-search`                 |
| Query-builder DSL (tags/text/type/props)        | **Works**                             | `echo-query` `QueryBuilder`       |
| Global-filter side channel                      | **Works** (tables consume it)         | `react-ui-search`                 |
| Vector `searchKind` seam                        | Stub (`log.warn`)                     | `echo` / `echo-host`              |
| Embeddings in-browser (`@xenova/transformers`)  | Used elsewhere                        | `assistant`, `plugin-transformer` |
| Vector index (`usearch`, cosine)                | Research harness only                 | `stories-brain`                   |
| RDF FactStore (symbolic + SQLite backend)       | Shipped (in-memory in app)            | `pipeline-rdf`, `plugin-brain`    |
| `@dxos/pipeline` streaming substrate + progress | **Mature**                            | `pipeline`                        |
| Feed/queue replication (CF-Worker-safe)         | **Ships**                             | `echo-host`, EDGE                 |
| EDGE functions / AI proxy                       | **Ships** (no embeddings endpoint)    | `edge-client`, EDGE               |
| Cloudflare Vectorize / Workers AI               | Not integrated (worker repo external) | —                                 |

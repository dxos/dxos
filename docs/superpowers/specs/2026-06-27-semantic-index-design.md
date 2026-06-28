# Semantic Index & Comprehension — Design

Date: 2026-06-27
Status: Draft for review (checkpoint before implementation). Updated 2026-06-28 — engine,
package name, predicate, and eval decisions resolved (§13); awaiting §5 model sign-off.
Author: agent (worktree `nervous-grothendieck-310d88`)

## 1. Problem & Goals

The ECHO graph holds typed objects: user-generated data (documents) and externally
synced feeds (Gmail, Discord, etc.). We want to **analyze text, extract structured
semantic facts within context, and use that structure to help an LLM answer questions
and complete tasks** — and to annotate source content with links to ECHO objects
(people, organizations, events).

The motivating example. An email from Alice on June 6: _"I think I'm probably going
to Paris next week."_ We want to record, separately:

- **Attribution** — Alice asserted this, on June 6, in this email (who / when / where).
- **Assertion** — Alice travels to Paris, on/around June 12 (the proposition).
- **Valence** — she is unsure ("probably"); epistemic, positive polarity.

### Hard requirements (from clarifying round)

1. The semantic graph is **NOT stored in ECHO**. It is internal to the index. It
   references ECHO objects (by DXN) but lives in its own store.
2. Typed access via **Effect Schema**. (Updated: typed-JSON serialization is _preferred,
   not required_ — a compact, performant third-party lib that runs browser + Workers is
   weighted higher. See §2.3.)
3. Must persist **in the browser** and the pipeline must run on **Cloudflare Workers**.
4. **Incremental** updates via a pipeline; the structure **holds conflicting facts**
   (by time or by attribution) without forcing resolution.
5. Prefer a **lightweight existing library/framework** for the ontology if one genuinely
   fits all the above; otherwise homegrown extraction.

### Non-goals (v1)

- Storing the semantic graph in ECHO.
- Vector / embedding search (designed-for, deferred — §8).
- Document-annotation UI, "concepts warranting research" → report/contact generation
  (future; the fact store is the substrate these will build on).
- Real connector credentials (fixtures-first; live path wired but exercised later).

## 2. Prior-Art Evaluation (task: "evaluate prior art for semantic data structures")

Full research log is summarized here; sources cited inline.

### 2.1 The triad maps onto established frameworks

| Our term      | Established framework                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Attribution   | **PROV-O** (W3C provenance): `agent`, `activity`, `generatedAtTime`, `wasDerivedFrom`.          |
| Assertion     | **RDF-star / RDF 1.2 triple terms** — a quoted triple `(s, p, o)` you can annotate.             |
| Valence       | **FactBank factuality** values + epistemic-modality literature; URW3 axis (epistemic/aleatory). |
| Conflict/time | **Bitemporal** modeling (valid-time vs transaction-time) + **named-graphs-per-source**.         |

### 2.2 Libraries considered, and why none is adopted as the runtime store

- **RDF-star JS stacks** (N3.js, `@rdfjs/*`, quadstore, Oxigraph WASM, Comunica):
  - Only `@rdfjs/data-model` + `@rdfjs/dataset` are _confirmably_ Workers-safe (pure,
    zero-dep) — but they are model+storage only (no query, no JSON-LD).
  - Every SPARQL option is unverified-to-blocked on Cloudflare Workers: quadstore has no
    persistent Workers backend; Oxigraph WASM init on Workers is unverified; Comunica's
    default HTTP actor statically imports `node:http`.
  - None serialize to **plain typed JSON** — they use RDF/JS term objects. This directly
    fails requirement (2). (quadstore additionally lacks RDF-star.)
- **PROV-O** is a _vocabulary_, not a library; no maintained TS builder. Mirror the term
  names in our types.
- **Epistemic modality**: no ratified ontology, no JS lib. **FactBank**
  (Saurí & Pustejovsky) gives a directly reusable discrete value set.
- **Claim extraction** (OpenIE, SRL/PropBank, AMR, FrameNet, DRT): all JVM/Python; no
  client-side JS engine. The realistic path is **LLM structured extraction** — model runs
  remotely, only JSON crosses the wire, the TS layer is schema + HTTP (Workers-clean). The
  formalisms become our _schema vocabulary_ (S-P-O ≈ ARG0/V/ARG1; allow nested claims for
  negation/modality, per DRT's lesson).
- **Lightweight non-RDF stores** (TinyBase, graphology, DataScript): TinyBase is the only
  one with _documented_ Workers + Durable-Objects support, but it is tabular, not a graph,
  and we already have a SQLite substrate (`@dxos/sql-sqlite`).

### 2.3 Library re-evaluation (typed-JSON demoted; reuse prioritized)

After the first round, the constraint was reweighted: typed-JSON serialization is **not**
a hard requirement; a performant, compact third-party library that runs in the browser
**and** on Cloudflare Workers is strongly preferred. That reopens the embeddable-store
question. Verified candidates (evidence + a local artifact spike):

| Candidate           | Browser | CF Workers                          | wasm (gzip)                  | Statement annotation  | Vec/FTS | Maint.                     |
| ------------------- | ------- | ----------------------------------- | ---------------------------- | --------------------- | ------- | -------------------------- |
| **Oxigraph**        | yes     | **yes (proven mechanically, §2.4)** | **~1.4 MB** (fits free tier) | **RDF-star** (native) | no      | active (monthly)           |
| Pure-JS RDF (N3.js) | yes     | likely (pure JS)                    | n/a (tiny)                   | RDF-star (parse)      | no      | active                     |
| CozoDB              | yes     | no (~12 MB, busts limit)            | ~12 MB                       | Datalog columns       | **yes** | dormant 2023               |
| Kuzu                | yes     | no (~11 MB; archived)               | ~11 MB                       | edge props            | yes     | **archived (Apple, 2025)** |

CozoDB/Kuzu are out for Workers (size + dead-project risk). Oxigraph is the standout: its
RDF-star model **is** exactly "annotate an assertion with attribution + valence," queryable
via SPARQL, and it is compact and maintained.

### 2.4 Oxigraph CF-Workers de-risk spike (evidence)

Ran against the published `oxigraph@0.5.x` artifact under V8 (Node), simulating the Workers
load path:

- `web_bg.wasm` **gzip = 1.4 MB** → under the **free** Workers limit (3 MB), well under paid.
- `web.js` exports **`initSync(module)`**; loading via `new WebAssembly.Module(bytes)` +
  `initSync` (no `fetch`, no `WebAssembly.instantiate`) **works** — the exact path workerd
  permits. Default async init _does_ use `fetch` (avoid it; use `initSync`).
- Only host imports needed: `crypto.getRandomValues`, `Date.now` — both on Workers.
- Stored and queried an RDF-star fact end-to-end: `<< ex:alice ex:travelsTo ex:paris >>
prov:wasAttributedTo ex:alice ; prov:generatedAtTime "2026-06-06" ; ex:factuality "PR+" ;
ex:confidence "0.6"` → SPARQL returned `alice, 2026-06-06, PR+, 0.6`.

Residual gap: a real `wrangler dev` smoke test (V8-in-Node ≠ workerd exactly). Cheap;
scheduled as build-order step 0. Constraints accepted: Oxigraph's JS build is **in-memory**
(we snapshot/persist ourselves, §6) and has **no FTS/vector** (sidecar, §8).

### 2.5 Comunica evaluation (SPARQL over a _swappable_ backend)

The RocksDB question exposed Oxigraph's real limit: its WASM `Store` is in-memory with **no
pluggable backend** (§6). **Comunica** — a modular JS SPARQL engine — is the inverse: it is
_only_ a query engine and runs SPARQL over **any RDF/JS `Source`** (a `match(s,p,o,g)`
method), so the backend is whatever you implement. Verified (research + a local spike):

- **Use the `@comunica/query-sparql-rdfjs` engine, not the full `query-sparql`.** The full
  engine statically imports `undici`/`node:http` (Workers-hostile); the rdfjs variant does
  not. Spike confirmed: `undici resolvable: false`; SPARQL ran in V8 without it.
- **Custom backend works (the decisive capability).** Spike: implemented `match()` over a
  plain array and ran `SELECT ?p ?v WHERE { <alice> ?p ?v }` → `factuality=PR+,
confidence=0.6`. Also ran SPARQL over an `N3.Store`. This is SPARQL over storage _we own_
  — SQLite (OPFS / DO-SQLite / better-sqlite3), or even an ECHO-queue-backed source.
- **Footprint:** `query-sparql-rdfjs` ≈ **347 KB min+gzip** (vs Oxigraph's 1.4 MB wasm);
  pure JS; MIT; actively maintained (v5.2.x, 2026).
- **Costs / risks:** (1) **Slower** than Oxigraph (compiled wasm) — a constant factor, and
  our queries are simple pattern lookups (facts about an entity / by source / as-of time),
  not heavy joins, so the gap is unlikely to bite. (2) **RDF-star is mid-migration**:
  ≤ v4.x = RDF-star, ≥ v5.x = RDF 1.2 triple terms — pin the version deliberately. (3)
  **Workers untested** (needs a `process.env` shim; no public precedent) — same class of
  residual gap as Oxigraph; retire with the step-0 spike. (4) An efficient SQLite-backed
  `Source` (indexed `match` + `countQuads` for planning) is real work we'd own.

### 2.6 Verdict (revised)

The two viable engines split exactly along the user's two signals — _"SPARQL is
compelling"_ and _"can storage be swapped out?"_:

|                     | **Oxigraph (wasm)**               | **Comunica `query-sparql-rdfjs`**    |
| ------------------- | --------------------------------- | ------------------------------------ |
| SPARQL              | yes (fast)                        | yes (slower, constant factor)        |
| RDF-star            | native                            | yes (version-pinned; →RDF 1.2 in v5) |
| Backend             | **fixed, in-memory only**         | **any `Source` you implement** ✅    |
| Durable / unbounded | snapshot whole graph; RAM-bounded | yes, via SQLite-backed `Source`      |
| Browser + Workers   | wasm 1.4 MB gz (load proven)      | 347 KB gz pure-JS (no undici proven) |
| Integration effort  | low                               | higher (build the SQLite `Source`)   |

**Recommendation: adopt Comunica `query-sparql-rdfjs` as the single SPARQL engine, over a
`SemanticStore` that exposes an RDF/JS `Source` backed by SQLite** (`@dxos/sql-sqlite` OPFS
in the browser, Durable-Object SQLite on Cloudflare, better-sqlite3 in Node). This directly
answers the storage-swap requirement, is durable and unbounded (no 128 MB RAM ceiling),
pure-JS (smaller, no wasm-load risk), and keeps one SPARQL query path. Oxigraph stays in
reserve as an optional **in-memory hot-tier accelerator** (drop-in fast `Source`/engine) if
query latency ever bites at small scale. The typed Effect-Schema facade and `Fact ↔
RDF-star` mapping (§5.1) are unchanged — only the engine/store underneath differs.

**DECIDED (2026-06-28):** Comunica `query-sparql-rdfjs` over a SQLite-backed `Source`.
Oxigraph is dropped from v1 (kept only as a possible future in-memory accelerator). This
supersedes the earlier Oxigraph-primary lean (§2.4).

## 3. `index-core` Evaluation (task: "build on it or start again?")

`@dxos/index-core` (`packages/core/echo/index-core/`) provides, today: SQLite-backed
FTS5 (trigram + BM25), `EntityMetaIndex` (type/space/time/parent), `ReverseRefIndex`
(who-references-what), `IndexTracker` (incremental cursors), over an Effect SQL layer
(`@dxos/sql-sqlite`) that already runs in the browser via wa-sqlite/OPFS.

**Decision: do not extend it; reuse its proven patterns in a new package.**

- `index-core` is coupled to ECHO data sources (automerge/queue cursors, `IndexerObject`,
  `spaceId`) and writes ECHO-shaped metadata — but requirement (1) forbids ECHO storage,
  and our records (facts with valence/attribution) are not ECHO objects.
- The store is **SQLite behind a Comunica `Source`** (§2.6, §6), so `index-core`'s patterns
  apply directly: the `@dxos/sql-sqlite` Effect SQL layer (browser OPFS + Node, mirror-able to
  Durable-Object SQLite on Cloudflare), FTS5 trigram+BM25 for the text path, and the
  `IndexTracker` cursor pattern for incremental re-indexing — reused, not extended.

## 4. Architecture Overview

New private package **`@dxos/semantic-index`** under `packages/core/compute/` (alongside
`extractor`, `ai`, `transcription-pipeline`). Namespace-export style per repo conventions.

```
text/messages ──▶ SemanticPipeline ──▶ Fact[] ──▶ SemanticStore ──▶ semanticQuery tool ──▶ LLM
   (fixtures /        (Chunk →            (typed     Comunica SPARQL     (Operation /
    connectors)        Extract →           facade)   over RDF/JS Source:  skill tool)
                       Link →                          Source.match() ──▶ SQLite
                       Reconcile →                      (OPFS browser /
                       Persist)                          DO-SQLite CF / node)
```

The `SemanticStore` is a typed facade; callers use the `Fact` API, never raw SPARQL. The
core path is pure Effect + `@dxos/ai` (HTTP) + Comunica (`query-sparql-rdfjs`) over a SQLite
`Source` — no Node-only deps (`-rdfjs` engine avoids `undici`) — so it runs unchanged in
browser and on Cloudflare Workers; persistence is the SQLite DB itself.

## 5. Data Model (Effect Schema)

RDF-star-shaped, PROV-O-named, FactBank-valued, bitemporal — all plain typed JSON.

```ts
// An entity mention; canonicalized to an ECHO object by DXN when possible.
Entity = {
  id: string;                 // index-local stable id
  kind: 'person' | 'org' | 'place' | 'event' | 'concept' | 'thing';
  label: string;              // canonical surface label
  aliases: string[];
  ref?: DXN;                  // link to ECHO object (Person/Organization/Event) if resolved
  // embedding?: Float32Array  // deferred (§8)
};

// The proposition — a quoted triple.
Assertion = {
  subject: { entity: string } | { literal: string };
  predicate: string;          // controlled-ish relation/verb
  object: { entity: string } | { literal: string };
  validFrom?: string;         // ISO; when the asserted state holds (≈ Jun 12)
  validTo?: string;
  quote?: string;             // source span text
};

// Epistemic valence (FactBank-derived) + continuous confidence.
Valence = {
  factuality: 'CT+' | 'CT-' | 'PR+' | 'PR-' | 'PS+' | 'PS-' | 'CTu' | 'Uu';
  polarity: '+' | '-' | '?';
  confidence?: number;        // 0..1 model confidence
  nature?: 'epistemic' | 'aleatory';
};

// Provenance (PROV-O names).
Attribution = {
  agent?: string;             // entity id of who asserted (Alice)
  source: DXN;                // the Message / Document it came from
  generatedAtTime: string;    // ISO; when asserted (Jun 6)
  wasDerivedFrom?: DXN[];
  span?: { start: number; end: number }; // char offsets in source text
};

// Append-only record. Conflict = many Facts; resolution is a QUERY-TIME concern.
Fact = {
  id: string;
  assertion: Assertion;
  valence: Valence;
  attribution: Attribution;
  recordedAt: string;         // ISO transaction-time
  extractor: { id: string; model: string; version: string };
  sourceHash: string;         // incremental divergence detection
};
```

The Alice example yields one `Fact`: assertion `(Alice, travelsTo, Paris)` with
`validFrom ≈ Jun 12`; valence `PR+`, `nature: epistemic`, `confidence ≈ 0.6`; attribution
`agent: Alice, source: <email DXN>, generatedAtTime: Jun 6`.

### 5.1 `Fact ↔ RDF-star` mapping (the facade's canonical translation)

Each `Fact` is one quoted triple plus annotation triples on it (verified working in §2.4):

```turtle
<< :alice :travelsTo :paris >>
    prov:wasAttributedTo   :alice ;            # Attribution.agent
    prov:wasDerivedFrom    <dxn:…email> ;      # Attribution.source
    prov:generatedAtTime   "2026-06-06"^^xsd:date ;   # Attribution.generatedAtTime
    sx:factuality          "PR+" ;            # Valence.factuality (FactBank)
    sx:confidence          0.6 ;              # Valence.confidence
    sx:nature              "epistemic" ;      # Valence.nature
    sx:validFrom           "2026-06-12"^^xsd:date ;   # Assertion.validFrom
    sx:recordedAt          "…"^^xsd:dateTime ;        # transaction time
    sx:factId              "…" .              # Fact.id
```

Entities are IRIs minted per index-local id; `Entity.ref` (DXN of an ECHO object) is a
`sx:echoRef` literal. Conflicting facts are simply multiple quoted triples (same s/p,
different o/valence/time); resolution is a SPARQL filter (`as-of` time × `according-to`
source), never a write-time merge. `sx:` is our small namespace; PROV terms are reused
verbatim so the graph is valid PROV-O and exportable as-is.

## 6. Storage (`SemanticStore`)

A typed Effect-service **facade** over **Comunica `query-sparql-rdfjs`**; callers use the
`Fact` API, the facade maps to/from RDF-star (§5.1) and SPARQL and never exposes raw SPARQL
at call sites:

```ts
SemanticStore {
  putFacts(facts: Fact[]): Effect<void>;              // → rows in the SQLite quad/annotation tables
  resolveEntity(input): Effect<Entity>;               // get-or-create by label/alias (extractor's Resolver pattern)
  query(q: SemanticQuery): Effect<Fact[]>;            // → SPARQL via Comunica over the Source
  cursor(source: DXN): Effect<string | undefined>;    // last sourceHash for incremental skip
  setCursor(source: DXN, hash: string): Effect<void>;
}
```

**Engine + backend (decided, §2.6).** A single SPARQL path: Comunica runs over a custom
RDF/JS `Source` whose `match(s, p, o, g)` and `countQuads` are answered from **SQLite**:

- The `Source` translates a quad pattern into an indexed SQL lookup; `countQuads` returns a
  cheap estimate so Comunica's planner orders joins well.
- **Storage tables** (own schema, not ECHO): a `quads` table (`s, p, o, g, objType` with
  indexes on each position) holding the RDF-star expansion of each `Fact` (§5.1), plus an
  `entities` table (`id, kind, label, ref`) and a `cursors` table (`source, sourceHash`).
  FTS5 over `o`/`label` for the text-match path.
- **Persistence is the DB itself** — no snapshot/restore, no RAM ceiling. Drivers per
  runtime, all behind the same `Source`:
  - **Browser** — `@dxos/sql-sqlite` (wa-sqlite + OPFS).
  - **Cloudflare** — Durable-Object SQLite (`ctx.storage.sql`), or D1.
  - **Node / fixtures** — `@dxos/sql-sqlite` (better-sqlite3); fixtures also dumped to
    N-Quads(-star) text for diffable round-trip tests.

This is the literal "swap the backend out" capability: the engine is fixed (Comunica), the
storage is ours and pluggable via the `Source`. (An in-memory `N3.Store` `Source` is the
trivial test/hot-path variant; Oxigraph could later slot in as a faster in-memory `Source`
if latency ever bites — neither is needed for v1.)

**Workers notes (retire in build step 0):** use the `-rdfjs` engine only (the full
`query-sparql` imports `undici`/`node:http`); shim `process.env` (Comunica reads it); confirm
the DO-SQLite `Source` path. Pin the Comunica version line for RDF-star vs RDF-1.2 semantics
(§2.5).

Conflict handling: facts are **append-only** quads/rows. A query for "what does X assert
about Y" returns all competing facts, each with its attribution and time; the caller (or the
LLM tool) resolves with `as-of <time>` × `according-to <source>` as a SPARQL filter. No
write-time merge — which is what local-first sync wants.

## 7. Pipeline (`SemanticPipeline`)

Input: a stream of `{ text, source: DXN, author?, date? }` (documents or messages).
Stages (each an isolated, testable unit; reuses `@dxos/ai` for LLM calls and the
structured-extraction approach proven in `@dxos/extractor`):

1. **Chunk** — split into analyzable windows (sentence/paragraph), deterministic.
2. **Extract** — `LanguageModel.generateObject({ schema: Fact-payload, prompt })` produces
   assertions + valence + attribution from chunk text + metadata. Prompt encodes the
   FactBank valence enum and PROV attribution fields. This is the heart of the system.
3. **Link** — map extracted mentions to index `Entity`s (get-or-create), and to ECHO
   objects via exact/FTS match (vector match deferred). Produces/updates `Entity.ref`.
4. **Reconcile** — append facts; flag supersession/conflict (same subject+predicate,
   differing object/valence/time) without deleting.
5. **Persist** — `SemanticStore.putFacts` + cursor update.

**Incremental**: keyed by `sourceHash` (the divergence pattern from the nlp-pos parser).
Unchanged source → skip. Changed source → re-extract and supersede prior facts from that
source (old facts retained with a `validTo`/superseded marker for audit).

The pipeline borrows the _philosophy_ of `@dxos/transcription-pipeline` (isolated stages,
Effect, model-per-stage) but is batch/document-oriented and writes to `SemanticStore`, not
ECHO — so it is a new pipeline, not a reuse of that runtime.

## 8. Vector / Semantic Search (deferred, designed-for)

v1 retrieval = structured SPARQL query (text matching via SPARQL `CONTAINS`/`REGEX` for
now; a dedicated FTS index is part of the deferred work). The store keeps an embedding seam:

- **Browser**: transformers.js (EmbeddingGemma-300m / bge-small) or skip.
- **Cloudflare**: Workers AI embeddings (`@cf/baai/bge-base-en-v1.5` 768-d, or
  `@cf/google/embeddinggemma-300m`) + **Vectorize** index, keyed by `Fact.id`/`Entity.id`.

Adding it later is additive: an `embed` stage after Extract, a `VectorIndex` alongside the
SQL store, and a hybrid rank in `query`.

## 9. Connector Test Harness (task)

`packages/core/compute/semantic-index/testing/harness/`:

- **`fetch`** — invoke `plugin-inbox` Gmail/JMAP sync and `plugin-discord` sync operations
  standalone (they are Effect-based and standalone-invokable), OR load saved fixtures.
- **`save`** — write fetched `Message[]` to typed-JSON files (`./temp/` or a fixtures dir).
- **`feed`** — run `SemanticPipeline` over the messages, persist to a `SemanticStore`, and
  dump the resulting `Fact[]` to typed-JSON.

**Fixtures-first**: ship a synthetic corpus as typed JSON (Alice/Paris-style emails, a
Discord thread with conflicting/uncertain statements) so the full loop runs with no creds.
Live connector path is wired but exercised when credentials are provided.

## 10. LLM Tool & Comprehension Test (tasks)

- **Tool**: a `semanticQuery` Operation/skill tool —
  `semanticQuery({ entity?, subject?, predicate?, asOf?, source?, minConfidence?, text? }) → Fact[]`,
  rendered as compact NL that preserves attribution + valence and _surfaces conflicts_
  ("Alice (email, Jun 6): probably travelling to Paris ~Jun 12 — unsure").
- **Eval** (both, per §13): (a) **expected-facts** — assert the pipeline extracts a known
  set of facts from the fixtures (deterministic precision/recall on extraction); (b)
  **LLM-judge ablation** — a fixed Q&A set answered with vs without the `semanticQuery` tool,
  judged for attribution correctness, respect for uncertainty, conflict surfacing, and fact
  recall. Use the repo's memoized-LLM fixtures for deterministic CI.

## 11. Package Layout

```
packages/core/compute/semantic-index/
  src/
    index.ts                 // namespace exports
    Fact.ts Entity.ts Assertion.ts Valence.ts Attribution.ts   // Effect Schema model
    SemanticStore.ts         // service + query types
    SemanticPipeline.ts      // stage composition
    errors.ts
    internal/
      sparql/ engine.ts mapping.ts   // Comunica engine; Fact↔RDF-star + SPARQL builders
      source/ sqlite-source.ts memory-source.ts   // RDF/JS Source.match over SQLite | N3.Store
      sqlite/ schema.ts driver.ts   // quad/entity/cursor tables; OPFS|DO|node drivers
      stages/ chunk.ts extract.ts link.ts reconcile.ts
    testing/
      index.ts                // TestLayer, fixtures
      harness/ fetch.ts save.ts feed.ts
  fixtures/ *.nq *.json       // synthetic corpus (N-Quads-star) + expected facts
  moon.yml package.json
```

`"private": true`. Dependencies: `@dxos/ai`, `@dxos/sql-sqlite`, `@dxos/echo` (DXN/Ref types
only), `effect`; external **`@comunica/query-sparql-rdfjs`** + **`n3`** (catalog; pin the
Comunica line for RDF-star vs RDF-1.2, §2.5). No ECHO storage dependency.

## 12. Build Order (for the implementation plan)

0. **Workers smoke test** — `wrangler dev`: import `@comunica/query-sparql-rdfjs`, shim
   `process.env`, run one SPARQL query over a DO-SQLite-backed `Source`. Retires the residual
   Workers gap (§2.5) before building on it. Cheap; do it first.
1. Package scaffold + Effect-Schema model + `Fact↔RDF-star` mapping + SQLite schema + the
   `SqliteSource` (`match`/`countQuads`) + Comunica wiring; `query`/`putFacts` round-trip
   (node driver). `MemorySource` for fast tests.
2. `SemanticPipeline` Extract stage against synthetic fixtures (memoized LLM) — the core loop.
3. Link + Reconcile + incremental `sourceHash` cursors.
4. Browser driver (OPFS) parity; FTS5 text path.
5. Connector harness (fixtures-first; live fetch wired).
6. `semanticQuery` tool + comprehension eval (expected-facts + LLM-judge ablation).
7. (Deferred) vector seam (Workers AI + Vectorize / browser transformers.js); DO-SQLite +
   Cloudflare worker entrypoint; optional Oxigraph in-memory hot `Source`.

## 13. Decisions & Remaining Review Items

Resolved 2026-06-28: **(1) Engine** = Comunica `query-sparql-rdfjs` over a SQLite-backed
`Source` (§2.6). **(2) Package** = `@dxos/semantic-index`. **(3) Predicates** = open strings
in v1 (normalization pass later). **(4) Eval** = both (hand-authored expected facts +
LLM-judge ablation).

Remaining: **(5)** Approve §5 (the `Fact` model + `Fact ↔ RDF-star` mapping) as-is, or
request changes — the highest-leverage thing to lock before implementation.

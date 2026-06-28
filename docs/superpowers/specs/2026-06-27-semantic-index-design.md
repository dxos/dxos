# Semantic Index & Comprehension — Design

Date: 2026-06-27
Status: Draft for review (checkpoint before implementation)
Author: agent (worktree `nervous-grothendieck-310d88`)

## 1. Problem & Goals

The ECHO graph holds typed objects: user-generated data (documents) and externally
synced feeds (Gmail, Discord, etc.). We want to **analyze text, extract structured
semantic facts within context, and use that structure to help an LLM answer questions
and complete tasks** — and to annotate source content with links to ECHO objects
(people, organizations, events).

The motivating example. An email from Alice on June 6: *"I think I'm probably going
to Paris next week."* We want to record, separately:

- **Attribution** — Alice asserted this, on June 6, in this email (who / when / where).
- **Assertion** — Alice travels to Paris, on/around June 12 (the proposition).
- **Valence** — she is unsure ("probably"); epistemic, positive polarity.

### Hard requirements (from clarifying round)

1. The semantic graph is **NOT stored in ECHO**. It is internal to the index. It
   references ECHO objects (by DXN) but lives in its own store.
2. Typed access via **Effect Schema**. (Updated: typed-JSON serialization is *preferred,
   not required* — a compact, performant third-party lib that runs browser + Workers is
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

| Our term     | Established framework                                                        |
| ------------ | --------------------------------------------------------------------------- |
| Attribution  | **PROV-O** (W3C provenance): `agent`, `activity`, `generatedAtTime`, `wasDerivedFrom`. |
| Assertion    | **RDF-star / RDF 1.2 triple terms** — a quoted triple `(s, p, o)` you can annotate. |
| Valence      | **FactBank factuality** values + epistemic-modality literature; URW3 axis (epistemic/aleatory). |
| Conflict/time| **Bitemporal** modeling (valid-time vs transaction-time) + **named-graphs-per-source**. |

### 2.2 Libraries considered, and why none is adopted as the runtime store

- **RDF-star JS stacks** (N3.js, `@rdfjs/*`, quadstore, Oxigraph WASM, Comunica):
  - Only `@rdfjs/data-model` + `@rdfjs/dataset` are *confirmably* Workers-safe (pure,
    zero-dep) — but they are model+storage only (no query, no JSON-LD).
  - Every SPARQL option is unverified-to-blocked on Cloudflare Workers: quadstore has no
    persistent Workers backend; Oxigraph WASM init on Workers is unverified; Comunica's
    default HTTP actor statically imports `node:http`.
  - None serialize to **plain typed JSON** — they use RDF/JS term objects. This directly
    fails requirement (2). (quadstore additionally lacks RDF-star.)
- **PROV-O** is a *vocabulary*, not a library; no maintained TS builder. Mirror the term
  names in our types.
- **Epistemic modality**: no ratified ontology, no JS lib. **FactBank**
  (Saurí & Pustejovsky) gives a directly reusable discrete value set.
- **Claim extraction** (OpenIE, SRL/PropBank, AMR, FrameNet, DRT): all JVM/Python; no
  client-side JS engine. The realistic path is **LLM structured extraction** — model runs
  remotely, only JSON crosses the wire, the TS layer is schema + HTTP (Workers-clean). The
  formalisms become our *schema vocabulary* (S-P-O ≈ ARG0/V/ARG1; allow nested claims for
  negation/modality, per DRT's lesson).
- **Lightweight non-RDF stores** (TinyBase, graphology, DataScript): TinyBase is the only
  one with *documented* Workers + Durable-Objects support, but it is tabular, not a graph,
  and we already have a SQLite substrate (`@dxos/sql-sqlite`).

### 2.3 Library re-evaluation (typed-JSON demoted; reuse prioritized)

After the first round, the constraint was reweighted: typed-JSON serialization is **not**
a hard requirement; a performant, compact third-party library that runs in the browser
**and** on Cloudflare Workers is strongly preferred. That reopens the embeddable-store
question. Verified candidates (evidence + a local artifact spike):

| Candidate | Browser | CF Workers | wasm (gzip) | Statement annotation | Vec/FTS | Maint. |
| --------- | ------- | ---------- | ----------- | -------------------- | ------- | ------ |
| **Oxigraph** | yes | **yes (proven mechanically, §2.4)** | **~1.4 MB** (fits free tier) | **RDF-star** (native) | no | active (monthly) |
| Pure-JS RDF (N3.js) | yes | likely (pure JS) | n/a (tiny) | RDF-star (parse) | no | active |
| CozoDB | yes | no (~12 MB, busts limit) | ~12 MB | Datalog columns | **yes** | dormant 2023 |
| Kuzu | yes | no (~11 MB; archived) | ~11 MB | edge props | yes | **archived (Apple, 2025)** |

CozoDB/Kuzu are out for Workers (size + dead-project risk). Oxigraph is the standout: its
RDF-star model **is** exactly "annotate an assertion with attribution + valence," queryable
via SPARQL, and it is compact and maintained.

### 2.4 Oxigraph CF-Workers de-risk spike (evidence)

Ran against the published `oxigraph@0.5.x` artifact under V8 (Node), simulating the Workers
load path:

- `web_bg.wasm` **gzip = 1.4 MB** → under the **free** Workers limit (3 MB), well under paid.
- `web.js` exports **`initSync(module)`**; loading via `new WebAssembly.Module(bytes)` +
  `initSync` (no `fetch`, no `WebAssembly.instantiate`) **works** — the exact path workerd
  permits. Default async init *does* use `fetch` (avoid it; use `initSync`).
- Only host imports needed: `crypto.getRandomValues`, `Date.now` — both on Workers.
- Stored and queried an RDF-star fact end-to-end: `<< ex:alice ex:travelsTo ex:paris >>
  prov:wasAttributedTo ex:alice ; prov:generatedAtTime "2026-06-06" ; ex:factuality "PR+" ;
  ex:confidence "0.6"` → SPARQL returned `alice, 2026-06-06, PR+, 0.6`.

Residual gap: a real `wrangler dev` smoke test (V8-in-Node ≠ workerd exactly). Cheap;
scheduled as build-order step 0. Constraints accepted: Oxigraph's JS build is **in-memory**
(we snapshot/persist ourselves, §6) and has **no FTS/vector** (sidecar, §8).

### 2.5 Verdict

**Adopt Oxigraph (RDF-star + SPARQL) as the semantic store + query engine, behind a typed
Effect-Schema facade.** The facade keeps the team's ergonomics (typed `Fact` API, no
hand-written SPARQL at call sites) and defines the canonical `Fact ↔ RDF-star` mapping;
Oxigraph provides storage, query, and standards-based RDF interop for free. FactBank values
and PROV-O terms become IRIs/literals in the graph. A SQLite-backed `SemanticStore` remains
a fallback for scale (§6). This honors the reuse priority while preserving typing.

## 3. `index-core` Evaluation (task: "build on it or start again?")

`@dxos/index-core` (`packages/core/echo/index-core/`) provides, today: SQLite-backed
FTS5 (trigram + BM25), `EntityMetaIndex` (type/space/time/parent), `ReverseRefIndex`
(who-references-what), `IndexTracker` (incremental cursors), over an Effect SQL layer
(`@dxos/sql-sqlite`) that already runs in the browser via wa-sqlite/OPFS.

**Decision: do not extend it; reuse its proven patterns in a new package.**

- `index-core` is coupled to ECHO data sources (automerge/queue cursors, `IndexerObject`,
  `spaceId`) and writes ECHO-shaped metadata — but requirement (1) forbids ECHO storage,
  and our records (facts with valence/attribution) are not ECHO objects.
- The **primary** store is now Oxigraph (§2.5, §6). `index-core` patterns still apply to the
  **fallback** SQLite-backed `SemanticStore` (for corpora too large for an in-memory graph):
  the `@dxos/sql-sqlite` Effect SQL layer (browser OPFS + Node, mirror-able to Durable-Object
  SQLite on Cloudflare), FTS5 trigram+BM25, and the `IndexTracker` cursor pattern for
  incremental re-indexing.

## 4. Architecture Overview

New private package **`@dxos/semantic-index`** under `packages/core/compute/` (alongside
`extractor`, `ai`, `transcription-pipeline`). Namespace-export style per repo conventions.

```
text/messages ──▶ SemanticPipeline ──▶ Fact[] ──▶ SemanticStore ──▶ semanticQuery tool ──▶ LLM
   (fixtures /        (Chunk →            (typed     facade over:        (Operation /
    connectors)        Extract →           facade)   • Oxigraph (RDF-     skill tool)
                       Link →                          star+SPARQL) ◀ primary
                       Reconcile →                    • Sqlite (scale fallback)
                       Persist)                       persist: snapshot bytes →
                                                       OPFS / file / R2 / DO-SQLite
```

The `SemanticStore` is a typed facade; callers use the `Fact` API, never raw SPARQL. The
core path is pure Effect + `@dxos/ai` (HTTP) + Oxigraph (wasm via `initSync`) — no Node-only
deps — so it runs unchanged in browser and on Cloudflare Workers.

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

A typed Effect-service **facade** over Oxigraph; callers use the `Fact` API, the facade
maps to/from RDF-star (§5.1) and SPARQL:

```ts
SemanticStore {
  putFacts(facts: Fact[]): Effect<void>;          // → RDF-star quads inserted
  resolveEntity(input): Effect<Entity>;           // get-or-create by label/alias (extractor's Resolver pattern)
  query(q: SemanticQuery): Effect<Fact[]>;        // → SPARQL; by entity/predicate/time/source/valence
  cursor(source: DXN): Effect<string | undefined>;// last sourceHash for incremental skip
  setCursor(source: DXN, hash: string): Effect<void>;
  snapshot(): Effect<Uint8Array>;                 // dump store → N-Quads(-star) bytes
  load(bytes: Uint8Array): Effect<void>;          // restore
}
```

**Engine**: Oxigraph `Store`, loaded via `initSync` (browser + Workers; §2.4). In-memory,
so persistence is explicit snapshot/restore:

- **Browser** — `snapshot()` bytes → OPFS (via `@dxos/sql-sqlite` OPFS pool or raw OPFS);
  debounced on write, loaded on open.
- **Node / fixtures** — bytes → file (this is the "serialize to a file" path; format is
  N-Quads-star, still plain text, diffable).
- **Cloudflare** — bytes → R2 or a Durable-Object SQLite blob; load into the DO's in-memory
  Oxigraph on first request, snapshot on alarm/idle.

**Fallback for scale** — `SqliteStore` (same interface, `@dxos/sql-sqlite` + FTS5,
index-core patterns) for corpora too large to hold in a 128 MB isolate as a live graph.
Selected per deployment; the pipeline and tool are unaware which backend is active.

Conflict handling: facts are **append-only** quads. A query for "what does X assert about
Y" returns all competing facts, each with its attribution and time; the caller (or the LLM
tool) resolves with `as-of <time>` × `according-to <source>` as a SPARQL filter. No
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

The pipeline borrows the *philosophy* of `@dxos/transcription-pipeline` (isolated stages,
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
  rendered as compact NL that preserves attribution + valence and *surfaces conflicts*
  ("Alice (email, Jun 6): probably travelling to Paris ~Jun 12 — unsure").
- **Eval**: a fixed Q&A set over the synthetic corpus + fixtures, run as an **ablation**
  (answer with vs without the tool), scored against expected answers (LLM-judge). Metrics:
  attribution correctness, respect for uncertainty, conflict surfacing, fact recall. Use
  the repo's memoized-LLM fixtures for deterministic CI.

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
      oxigraph/ engine.ts mapping.ts   // initSync load; Fact↔RDF-star + SPARQL
      stores/ oxigraph-store.ts sqlite-store.ts   // both implement SemanticStore
      persist/ opfs.ts file.ts r2.ts durable-object.ts   // snapshot sinks
      stages/ chunk.ts extract.ts link.ts reconcile.ts
    testing/
      index.ts                // TestLayer, fixtures
      harness/ fetch.ts save.ts feed.ts
  fixtures/ *.nq *.json       // synthetic corpus (N-Quads-star) + expected facts
  moon.yml package.json
```

`"private": true`. Dependencies: `@dxos/ai`, `@dxos/echo` (DXN/Ref types only), `effect`,
external **`oxigraph`** (catalog); `@dxos/sql-sqlite` only for the scale-fallback store.
No ECHO storage dependency. (Oxigraph's own N-Quads-star dump replaces the need for a
separate N3.js export adapter; add `n3` later only if streaming parse is required.)

## 12. Build Order (for the implementation plan)

0. **`wrangler dev` smoke test** of Oxigraph `initSync` + one SPARQL query — close the one
   residual gap (§2.4) before committing to the engine. Cheap; do it first.
1. Package scaffold + Effect-Schema model + `Fact↔RDF-star` mapping + `OxigraphStore`
   (`initSync` load, put/query, snapshot/restore round-trip).
2. `SemanticPipeline` Extract stage against synthetic fixtures (memoized LLM) — the core loop.
3. Link + Reconcile + incremental `sourceHash` cursors.
4. Persist sinks: OPFS (browser) + file (node). Parity tests.
5. Connector harness (fixtures-first; live fetch wired).
6. `semanticQuery` tool + ablation comprehension eval.
7. (Deferred) `SqliteStore` scale fallback; vector seam (Workers AI + Vectorize / browser
   transformers.js); `DurableObjectStore` + R2 persist; Cloudflare worker entrypoint.

## 13. Open Questions for Review

1. **Engine** — adopt **Oxigraph** (RDF-star + SPARQL behind a typed facade), per §2.5 and
   the spike (§2.4)? This is the central decision the reweighting unlocked.
2. **Package name** — `@dxos/semantic-index` (proposed) vs `@dxos/comprehension` vs other.
3. **Predicate vocabulary** — fully open strings (v1, simplest) vs a small controlled set
   the extractor must map to (better querying, more constraint). Proposed: open in v1, with
   a normalization pass later.
4. **Eval scoring** — LLM-judge (proposed) vs hand-authored exact expected-fact assertions
   vs both.
5. Anything in §5 (the model / RDF-star mapping) you want changed before I build — the
   highest-leverage thing to get right.

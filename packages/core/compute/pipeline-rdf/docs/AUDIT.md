# Audit

Survey of RDF / query / reasoning technologies relevant to `pipeline-rdf` — extracting facts to RDF
triples, persisting them, and querying/reasoning over them, in both Node and the browser.

## In use today

- **N3.js** (`n3`) — RDF/JS parser, serializer, and in-memory quad store (the `layerMemory` backend).
- **Comunica** (`@comunica/query-sparql-rdfjs`) — the SPARQL engine run over the memory and SQLite
  sources. Note: the SQLite path is Node/worker-only — Comunica does not run on the browser main thread.
- **sparqljs** — SPARQL 1.1 parser/generator (AST), used to build and parse queries.
- **`@dxos/sql-sqlite`** — the SQLite-backed triple store.

The recurring constraint below is the **browser gap**: a first-class SPARQL/reasoning story that runs in
the browser main thread (not just Node or a worker) — which is why several WASM candidates appear.

## References

- **EYE** — <https://github.com/eyereasoner/eye>. A high-performance reasoning engine for Notation3
  (N3) rules over RDF: forward/backward chaining, RDF Surfaces, and proof generation. The `eye-js`
  build compiles it to WASM for Node/browser.
- **LDkit** — <https://ldkit.io/docs/components/query-engine>. A TypeScript-first Linked Data toolkit:
  schema-defined, typed data access over SPARQL endpoints or in-memory quads via a query builder; built
  on Comunica + RDF/JS.
- **Comunica** — <https://comunica.dev>. A modular, extensible SPARQL 1.1 engine for JS (Node + browser)
  that federates queries across heterogeneous RDF sources (files, endpoints, RDF/JS stores). In use here.

## Candidates to evaluate

RDF/query/reasoning/graph libraries (JS or WASM), each with why it is worth a look for `pipeline-rdf`.
Excludes what is already in use (N3.js, Comunica, sparqljs).

1. **Oxigraph** — <https://github.com/oxigraph/oxigraph> (`oxigraph` npm). Rust SPARQL 1.1 triple store
   compiled to **WASM**; runs in the browser and Node. Directly addresses the browser-SPARQL gap that
   Comunica-over-SQLite cannot fill.
2. **quadstore** — <https://github.com/jacoscaz/quadstore>. RDF quad store over `abstract-level`
   (LevelDB in Node, **IndexedDB/OPFS in the browser**), with a Comunica binding for SPARQL — persistent
   RDF in the browser without a worker.
3. **eye-js** — <https://github.com/eyereasoner/eye-js> (`@eyereasoner/eye-js`). The WASM packaging of
   EYE (reference above) — the practical way to trial N3 rule reasoning in JS/browser.
4. **HyLAR-reasoner** — <https://github.com/ucbl/HyLAR-Reasoner>. Incremental RDFS/OWL reasoner in pure
   JS (browser-capable) — a lighter, dependency-free alternative to EYE for classification/entailment.
5. **rdflib.js** — <https://github.com/linkeddata/rdflib.js>. Mature RDF store + Turtle/N3/JSON-LD
   parsers and an update/patch model (the SolidOS stack) — an alternative to N3.js with richer I/O.
6. **jsonld.js** — <https://github.com/digitalbazaar/jsonld.js>. JSON-LD 1.1 processor
   (expand/compact/frame, `toRDF`/`fromRDF`) — for ingesting/emitting facts as JSON-LD for interop.
7. **@rdfjs/dataset + rdf-ext** — <https://github.com/rdfjs-base/dataset>,
   <https://github.com/rdf-ext/rdf-ext>. RDF/JS-spec dataset and term factories/utilities — standardize
   quad/term handling and set operations across the stages instead of ad-hoc shapes.
8. **wa-sqlite** — <https://github.com/rhashimoto/wa-sqlite>. SQLite compiled to WASM with an OPFS VFS —
   would let the existing SQLite triple backend (and its SPARQL path) run **in the browser**, not just
   Node/worker.
9. **graphology** — <https://github.com/graphology/graphology>. A general graph library (traversal,
   centrality, community detection) — run graph algorithms over the derived fact graph (`fact-graph`)
   beyond what SPARQL expresses conveniently.
10. **transformers.js** — <https://github.com/huggingface/transformers.js>
    (`@huggingface/transformers`). WASM/WebGPU embeddings + NER in the browser — for entity resolution
    (collapsing surface variants to canonical entities) and semantic search over facts, complementing
    the LLM extraction.

- TODO(burdon): https://allegrograph.com/

## Applications

Ways to use the fact store (and complementary ML techniques) to manage email and other messaging
platforms. Each idea names the concrete building blocks in this repo. Prerequisite shared by all:
a populated per-space `FactStore` (plugin-inbox `FactStoreRegistry` + `EnrichMailbox`
over a mailbox feed; the crawler for Discord).

1. **Grounded reply drafting** — implemented as plugin-inbox `GenerateReply`: thread context (same
   normalized subject from the feed) + `store.query({ entity })` for each participant → LLM drafts a
   reply that hedges by factuality code. Next step: a per-sender style model — extract
   register/tone facts (`alice — prefers — terse-replies`) from the user's own sent mail and inject
   them into the prompt so drafts match how the user actually writes to that person.
2. **Person/Organization dossiers** — implemented as plugin-brain `SummarizeSubject`; extend by
   contributing a facts companion filtered to `entity = subject` on `Person`/`Organization`
   articles, so opening a contact shows everything the corpus asserts about them (with per-fact
   `source` links back to the originating message via the attribution DXN).
3. **Commitment tracking (open loops)** — extraction already captures `validFrom`/`validTo` on
   assertions; add a normalization pass mapping promise-shaped predicates (`will-send`,
   `agreed-to`, `due-by`) onto a `commitment` predicate family. A daily routine queries facts whose
   `validTo` has passed with no matching completion fact (same subject+object, `delivered`/`done`)
   and surfaces an "outstanding commitments" digest — theirs to you and yours to them.
4. **Contradiction and change detection** — the FactViewer already flags same-subject+predicate
   groups with divergent objects (`react-ui-rdf` `groupFacts` `conflictedIds`). Promote
   this to a pipeline stage: on `putFacts`, detect a new fact contradicting a stored one
   (`CT+` vs `CT-`, or a changed literal like a meeting date) and emit a notification fact; the
   inbox can then badge the thread that changed the state of the world.
5. **Entity resolution** — slugs collapse casing but not aliases (`bob` vs `robert-smith` vs
   `rsmith@acme.com`). Run transformers.js (WASM embeddings, already in Candidates) over entity
   labels + their fact neighborhoods; cluster above a cosine threshold and write `same-as` facts
   rather than rewriting ids — queries then expand through `same-as` at read time (one hop in
   `query-builder`), keeping resolution reversible and attributable.
6. **Priority triage** — score inbound messages with features the substrate already yields:
   sender's fact-graph degree (`fact-graph` / graphology centrality), count of open commitment
   facts involving the sender (idea 3), thread recency from `EmailPipeline` stats, and factuality-
   weighted relationship strength. Start as a transparent linear score surfaced as a sortable
   column; graduate to a learned ranker once reply/ignore outcomes are logged as training facts.
7. **Discord support agent** — the crawler already extracts question facts from channels. Pipeline:
   index resolved support threads into the fact store (`question — answered-by — <message DXN>`);
   on a new question, embed + `QueryFacts` for similar prior questions and answer with citations,
   escalating to a human when confidence is low or contradictory facts exist (idea 4). Repeated
   questions with no stored answer become a ranked FAQ backlog for maintainers.
8. **Hybrid semantic search (structured RAG)** — SPARQL/`SemanticQuery` answers "what does alice
   work on", but not fuzzy asks. Embed each fact line (`subject — predicate — object`) with
   transformers.js and store vectors beside the triples table; retrieval = structured pre-filter
   (entity/source/minConfidence) → vector rerank → LLM synthesis citing fact ids — the same
   grounding contract as `SummarizeSubject`, so answers stay attributable.
9. **Meeting preparation briefs** — join calendar events (plugin-inbox `Calendar`) with the fact
   store: for each attendee, `SummarizeSubject` focused on "recent activity and open commitments";
   for the meeting topic, `QueryFacts` by entity. A routine (plugin-automation trigger) assembles
   the brief into a draft note N minutes before the event — the fact store turns prep from search
   into a query.
10. **Rule-based derivation (N3 reasoning)** — encode domain rules with eye-js (Candidates #3):
    `works-at(X, org) ∧ works-at(Y, org) → colleagues(X, Y)`, commitment supersession, org
    hierarchy transitivity. Run forward chaining as an `indexFactsStage` post-pass writing derived
    facts with `extractor.id = 'reasoner'` and `wasDerivedFrom` pointing at the premise fact ids —
    derived knowledge stays distinguishable from extracted knowledge, and deleting a premise can
    retract its conclusions.

||||||| e18c136120


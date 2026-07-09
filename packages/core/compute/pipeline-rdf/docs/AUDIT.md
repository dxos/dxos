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

# @dxos/semantic-index — Design

Extracts attributed propositions from text and answers SPARQL queries over them. The
semantic graph lives **outside ECHO** (it references ECHO objects by DXN) and runs in the
browser and on Cloudflare Workers.

Full design rationale and prior-art evaluation: `docs/superpowers/specs/2026-06-27-semantic-index-design.md`.

## Purpose

Given text — user documents and synced feed messages (Gmail, Discord) — extract structured
facts that capture **who said what, how certain they were, and when**, so an LLM can answer
questions and complete tasks with attribution and uncertainty intact.

Motivating example. Alice writes on June 6: _"I think I'm probably going to Paris next week."_
We record one fact with three separable parts:

- **Attribution** — Alice asserted it, on June 6, in this email (who / when / where).
- **Assertion** — Alice travels to Paris, on/around June 12 (the proposition).
- **Valence** — she is unsure ("probably"); epistemic, positive polarity.

## Data model

A **Fact** is the unit of storage: one extracted proposition plus its metadata.

| Part        | Fields                                                                                             | Grounded in         |
| ----------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| Assertion   | subject, predicate, object (entity-ref or literal), validFrom/validTo, quote                       | RDF triple          |
| Valence     | factuality (`CT+`/`PR+`/`PS+`/… 8 values), polarity, confidence (0–1), nature (epistemic/aleatory) | FactBank factuality |
| Attribution | agent, source (DXN), generatedAtTime, wasDerivedFrom, span                                         | PROV-O              |
| Provenance  | id, recordedAt (transaction time), extractor {id, model, version}, sourceHash                      | —                   |

An **Entity** is a mention (person/org/place/event/concept/thing) with a label, aliases, and
an optional `ref` (DXN of a canonical ECHO object once linked). Predicates are open strings
in v1; a controlled-vocabulary normalization pass is future work.

The model is defined with Effect Schema and is JSON-serializable. Conflicting or
time-varying facts are simply multiple Facts — never merged at write time.

## Storage & query engine

One SPARQL path: **Comunica (`@comunica/query-sparql-rdfjs`)** runs over a custom RDF/JS
`Source` whose `match()` reads **SQLite**. The backend is therefore swappable and durable:

- **Browser** — `@dxos/sql-sqlite` (wa-sqlite + OPFS).
- **Cloudflare** — Durable-Object SQLite, or D1.
- **Node / fixtures** — `@dxos/sql-sqlite` (better-sqlite3).

Persistence is the database itself — no whole-graph snapshot, no in-memory size ceiling.

Why Comunica over an embeddable store (e.g. Oxigraph): Oxigraph's WASM build is in-memory
with a fixed backend, so it cannot persist to or stream from storage we control. Comunica
queries any `Source` we implement, which is what makes the SQLite backend possible. The
trade is performance (a constant factor; our queries are simple per-entity/per-source/as-of
lookups, not heavy joins).

### Reification (storage shape)

Each Fact is stored as **plain RDF reification**: a Fact node with `sx:subject` /
`sx:predicate` / `sx:object` plus PROV-O attribution and `sx:` valence/metadata triples.
This is equivalent to the RDF-star quoted-triple form (used only as an export shape) but
avoids RDF-star vs RDF-1.2 version fragility and keeps the SQLite `Source` a simple
`(subject, predicate, object, objectType, graph)` table.

`sx:` is this package's namespace; PROV-O terms (`prov:wasAttributedTo`,
`prov:generatedAtTime`, `prov:wasDerivedFrom`) are reused verbatim, so the graph is valid
PROV-O and exportable as-is.

## Conflicting facts

Facts are append-only. A query for "what does X assert about Y" returns **all** competing
facts, each carrying its attribution and time. Resolution is a query-time concern —
`as-of <time>` × `according-to <source>` — never a write-time merge. This is what
local-first / CRDT sync wants, and it lets the LLM reason about disagreement explicitly.

## Pipeline

Incremental, document-oriented stages:

1. **Chunk** — split text into analyzable units.
2. **Extract** — schema-constrained LLM call (`@dxos/ai` `LanguageModel.generateObject`)
   producing assertions + valence + attribution. The heart of the system.
3. **Link** — resolve entity mentions (get-or-create), optionally to ECHO objects by DXN.
4. **Reconcile** — append facts; conflicting/superseding facts coexist.
5. **Persist** — write to the store; record a per-source `sourceHash` cursor.

Re-running on an unchanged source is a no-op (cursor match); a changed source re-extracts.
The pipeline is pure Effect + an HTTP LLM call + SQLite, so it runs unchanged in the browser
and on Workers.

## Retrieval / LLM tool

`semanticQuery({ entity?, subjectEntity?, predicate?, source?, minConfidence? })` returns
matching facts rendered as compact natural language that preserves attribution and
certainty and **surfaces conflicts**, e.g.:

> - alice (dxn:…:m1, 2026-06-06): alice travelsTo paris [probable, PR+]
> - bob (dxn:…:m2, 2026-06-07): alice travelsTo rome [certain, CT+]

### Example queries

All facts asserted about an entity (as subject or object):

```sparql
PREFIX sx: <https://dxos.org/semantic#>
SELECT ?fact ?p ?o WHERE {
  { SELECT DISTINCT ?fact WHERE {
      { ?fact sx:subject <https://dxos.org/semantic/entity/alice> }
      UNION
      { ?fact sx:object  <https://dxos.org/semantic/entity/alice> }
  } }
  ?fact ?p ?o .
}
```

What a specific source claims, above a confidence threshold (`according-to` + filter):

```sparql
PREFIX sx:   <https://dxos.org/semantic#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
SELECT ?fact ?subject ?predicate ?object ?factuality WHERE {
  ?fact prov:wasDerivedFrom "dxn:queue:space:m1" ;
        sx:subject   ?subject ;
        sx:predicate ?predicate ;
        sx:object    ?object ;
        sx:factuality ?factuality ;
        sx:confidence ?conf .
  FILTER(xsd:decimal(?conf) >= 0.5)
}
```

Surface a conflict — everyone's claim about where Alice travels, with who said it and when
(`as-of` / `according-to` resolution is applied by ordering/filtering these results):

```sparql
PREFIX sx:   <https://dxos.org/semantic#>
PREFIX prov: <http://www.w3.org/ns/prov#>
SELECT ?object ?agent ?when ?factuality WHERE {
  ?fact sx:subject   <https://dxos.org/semantic/entity/alice> ;
        sx:predicate "travelsTo" ;
        sx:object    ?object ;
        sx:factuality ?factuality ;
        prov:wasAttributedTo ?agent ;
        prov:generatedAtTime ?when .
}
ORDER BY DESC(?when)
```

## Status & deferred

v1 covers the model, reified SQLite store + Comunica query path, extraction pipeline,
fixtures-first harness, and the `semanticQuery` tool + comprehension eval. Deferred:
browser OPFS / Cloudflare worker entrypoint + `wrangler dev` verification, live connector
credentials, vector/embedding search (Workers AI + Vectorize / transformers.js) and a
dedicated FTS index, and entity canonicalization to ECHO objects.

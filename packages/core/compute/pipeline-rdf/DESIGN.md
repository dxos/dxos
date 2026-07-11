# @dxos/pipeline-rdf — Design

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
- **Factuality** — she is unsure ("probably"); epistemic, positive polarity.

## Data model

A **Fact** is the unit of storage: one extracted proposition plus its metadata.

| Part                    | Fields                                                                                                    | Grounded in         |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------------------- |
| Assertion               | subject, predicate, object (entity-ref or literal), validFrom/validTo, quote                              | RDF triple          |
| Factuality              | value (`CT+`/`PR+`/`PS+`/… 8 values), polarity, confidence (0–1), nature (epistemic/aleatory)             | FactBank factuality |
| Illocution _(optional)_ | force (assertive/directive/commissive/expressive), mood (declarative/interrogative/imperative), addressee | Searle speech acts  |
| Attribution             | agent, source (DXN), generatedAtTime, wasDerivedFrom, span                                                | PROV-O              |
| Provenance              | id, recordedAt (transaction time), extractor {id, model, version}, sourceHash                             | —                   |

An **Entity** is a mention (person/org/place/event/concept/thing) with a label, aliases, and
an optional `ref` (DXN of a canonical ECHO object once linked). Predicates are open strings
in v1 (see [Normalization](#normalization)). The **Illocution** is absent for a plain assertion (a
statement/notification) and present for questions/requests/promises — see
[Illocutions](#illocutions-speech-acts).

The model is defined with Effect Schema and is JSON-serializable. Conflicting or
time-varying facts are simply multiple Facts — never merged at write time.

### Factuality values

`factuality.value` is the author's committed epistemic stance, from **FactBank**: a modality (how
certain — `CT` certain, `PR` probable, `PS` possible) crossed with a polarity (`+` it holds, `-` it does
not), plus two special values when polarity or the whole commitment is unknown. `nature` further tags
the uncertainty as **epistemic** (limited knowledge — "I think") or **aleatory** (inherent chance —
"maybe it rains").

| value | modality    | polarity | reads as                                 | cue                                |
| ----- | ----------- | -------- | ---------------------------------------- | ---------------------------------- |
| `CT+` | certain     | positive | it is the case                           | plain assertion                    |
| `CT-` | certain     | negative | it is not the case                       | "not", "never", "no"               |
| `PR+` | probable    | positive | it probably is                           | "probably", "likely"               |
| `PR-` | probable    | negative | it probably is not                       | "probably not", "doubt"            |
| `PS+` | possible    | positive | it possibly is                           | "might", "maybe", "could"          |
| `PS-` | possible    | negative | it possibly is not                       | "might not"                        |
| `CTu` | certain     | unknown  | definitely one way, but which is unknown | "whether or not it holds"          |
| `Uu`  | uncommitted | —        | the author commits to nothing about it   | questions, requests, hypotheticals |

`Uu` is the value directive facts carry (see [Illocutions](#illocutions-speech-acts)): a question or
request states no truth, so its proposition is uncommitted rather than asserted.

## Illocutions (speech acts)

Not every utterance asserts a fact. _"The meeting is at 3"_ **informs**; _"can you move it?"_ **asks**;
_"please move it"_ **requests**. These are different **speech acts** — what the author is _doing_ with
the utterance — and the distinction is orthogonal to whether the propositional content is true. Without
this axis a question and a statement collapse into the same triple, and the store can't tell "what was I
told" from "what am I being asked".

The **Illocution** (optional on every Fact — absent ⇒ `assertive`, so existing facts are unchanged)
adds one axis, `{ force, mood?, addressee? }`, following Searle's illocutionary points minus
`declarative` (which does not occur in mail):

| force          | meaning                              | mail example             |
| -------------- | ------------------------------------ | ------------------------ |
| **assertive**  | inform / state (the default)         | "The meeting is at 3."   |
| **directive**  | get the addressee to act or answer   | requests and questions   |
| **commissive** | commit the author to a future action | "I'll send it tomorrow." |
| **expressive** | convey a psychological state         | "Thanks!"                |

`mood` sub-divides a directive without a second axis: **interrogative** ⇒ a **question** (seeks
information), **imperative** ⇒ a **request** (seeks action). `addressee` is who is asked to act/answer
(defaults to the recipient).

**Factuality interplay.** A directive's content is not asserted true, so it takes factuality `Uu`
(uncommitted): a question's proposition carries the sought unknown, a request's the not-yet-true action.
The propositional content is still a normal subject–predicate–object assertion (e.g. a request
_"please send the report"_ ⇒ subject `you`, predicate `send`, object `report`), so illocution reuses the
existing triple + grounding rules rather than adding a parallel representation. There is **no deontic
axis** — obligation/permission is left to reified `sx:` predicates if ever needed.

**Extraction.** The extractor classifies each proposition's force and mood in the **same pass** as the
assertion (no separate questions pipeline): non-assertive facts record an `illocution`, assertions omit
it. Grounding is unchanged — a question/request is emitted only when both subject and object are
concrete and named.

**N3 / storage mapping.** The illocutionary force reifies the propositional content as a quoted graph,
related to the source utterance by an `sx:` (speech-act) predicate — the same reification the store
already uses (see [Reification](#reification-storage-shape)):

```
:msg-42 sx:states   { :meeting :startsAt "15:00" } .   # assertive (default)
:msg-42 sx:asks     { :meeting :startsAt ?t } .        # directive / interrogative
:msg-42 sx:requests { :bob :send :report } .           # directive / imperative
```

So the graph stays a triple store; the speech act is a predicate over the message and the reified inner
triple, and the store can answer "what am I asked to do?" distinctly from "what was I told?".

## Normalization

Guiding rule: **normalize the join key, never the display.** Extraction stays cheap and
local; normalization is an improvable layer on top. The per-message Extract stage emits
surface forms plus a light slug; the deeper layers are corpus-aware passes that can improve
independently without re-extracting. Three layers, by increasing cost and context required:

1. **Entity lexical — done.** Subject/object surface forms are slugged to an entity id
   (`normalizeEntityId`: trim, lowercase, runs of non-alphanumerics → `-`), so `DXOS` / `dxos`
   collapse to one entity; the original surface is kept as `label` for display. Deterministic,
   per-mention.
2. **Predicate / relation — planned.** Predicates are stored verbatim today, so paraphrases
   don't match (`works at` ≠ `works for` ≠ `employed by`; a query for one misses the others).
   Mirror the entity split: keep the surface predicate for display **and** a normalized
   _relation key_ for matching, then query on the key. Start with deterministic
   lemmatize/stem, with a controlled-vocabulary mapping as a later refinement. The LLM must
   **not** be asked to invent a canonical predicate per call — independent calls would be
   inconsistent.
3. **Entity resolution / coreference — deferred.** Canonicalize aliases (`dmaretskyi` = `Dima`
   = a Person) and link to ECHO objects by DXN. This needs corpus-wide context, so it runs as
   a separate resolution pass over the accumulated store — the pattern `AgentRegistry` already
   uses for message authors, extended to subjects/objects.

## Storage & query engine

One SPARQL path: **Comunica (`@comunica/query-sparql-rdfjs`)** runs over a swappable RDF/JS
`Source`. `FactStore.query` → `buildSparql` → Comunica → `Source.match()` in every
configuration below; only the backend differs.

| Config                 | Source                                              | Persistence | Platform          |
| ---------------------- | --------------------------------------------------- | ----------- | ----------------- |
| **N3**                 | N3 `Store` (in-memory)                              | memory only | browser or node   |
| **SQLite (OPFS)**      | `makeSqliteSource` — wa-sqlite + OPFS (worker)      | persistent  | browser           |
| **SQLite (file / DO)** | `makeSqliteSource` — better-sqlite3 / Cloudflare DO | persistent  | node / Cloudflare |

For SQLite, persistence is the database itself — no whole-graph snapshot, no in-memory size
ceiling. N3 is fast and dependency-light but ephemeral (optionally snapshotted to
localStorage/IndexedDB).

Why Comunica over an embeddable store (e.g. Oxigraph): Oxigraph's WASM build is in-memory
with a fixed backend, so it cannot persist to or stream from storage we control. Comunica
queries any `Source` we implement, which is what makes the SQLite backend possible. The
trade is performance (a constant factor; our queries are simple per-entity/per-source/as-of
lookups, not heavy joins).

### Reification (storage shape)

Each Fact is stored as **plain RDF reification**: a Fact node with `sx:subject` /
`sx:predicate` / `sx:object` plus PROV-O attribution and `sx:` factuality/metadata triples.
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
   producing assertions + factuality + attribution. The heart of the system.
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

## Phase 2 — extraction accuracy & noise reduction

Phase 1 extracts open propositions: any subject/predicate/object the model finds. This maximizes
recall but admits noise — vague pronouns, non-entities, paraphrased predicates that don't join,
trivial or off-topic assertions. Phase 2 raises **precision** by constraining _what_ becomes a fact
and refining facts after extraction, while keeping the open path available.

The literature on LLM × knowledge-graph construction converges on the same levers: **open-ended
extraction introduces noise; schema-bounded extraction (typed entities + typed relations) and
multi-step refinement reduce it** ([LLM-empowered KG construction survey](https://arxiv.org/abs/2510.20345),
[GraphRAG](https://arxiv.org/abs/2404.16130), [KG construction for large-scale RAG](https://arxiv.org/abs/2507.03226)).

Three levers, smallest-change first:

1. **Typed entities (extract + filter by Term type).** Have the extractor classify each entity by a
   small closed type set — `Person`, `Organization`, `Project`, `Event`, `Place`, `Concept`, … — and
   keep (or surface) only typed entities, dropping junk like ids, dates-as-subjects, and filler.
   Carry the type on the entity `Term` (alongside `entity`/`label`); the entity column + graph can
   filter/colour by type. This is the single biggest noise reducer in the survey's findings, and it
   composes with the existing entity-resolution layer (a resolved entity carries a type).
2. **Typed predicates (relation schema / controlled vocabulary).** Constrain predicates to a curated
   relation set per domain (`worksFor`, `partOf`, `locatedIn`, `attended`, `mentions`, …) and map free
   verb phrases onto it (extends the Phase-1 predicate `relationKey`). Schema-guided generation —
   giving the model the entity-type and relation-type vocabulary up front — is what frameworks like
   KARMA use to "guarantee accurate entity normalization and relation classification within a fixed
   ontological boundary." Off-vocabulary relations are dropped or quarantined for review.
3. **Progressive multi-phase refinement.** Decompose extraction and add passes rather than asking one
   call to do everything (mirrors KGGEN's "detect entities, then generate relations" to cut the
   model's cognitive load): **extract → type → normalize → score/prune**. The normalize pass runs the
   deferred entity-resolution + predicate-canonicalization corpus-wide (see [Normalization](#normalization));
   the prune pass drops low-confidence / unsupported facts using the `factuality.confidence` already on
   each fact (probabilistic confidence is more robust than hard accept/reject —
   [Noise Mitigation for Entity Typing & Relation Extraction](https://arxiv.org/abs/1612.07495)). An
   optional LLM-as-judge verification step (refute-or-confirm against the source quote) gates the
   highest-stakes facts.

These are layers, not a rewrite: the open extractor stays the recall floor; typing + schema + pruning
trade recall for precision and are individually toggleable per source/domain.

### Proposed next milestone — "Typed extraction v1"

Deliver lever (1) end-to-end plus the measurement harness, since type is the highest-leverage filter
and unblocks the typed UI the story already wants (entity column / graph filtered by type):

- **Schema:** add an optional `type` (closed enum) to the entity `Term`; extractor emits it; `unknown`
  type is dropped (reuses the ground-the-subject/object guard).
- **Extraction:** extend `DEFAULT_EXTRACTION_RULES` + the payload schema to classify entities; keep it
  one call (type alongside subject/object) to avoid a second round-trip in v1.
- **Query/UI:** `SemanticQuery` gains a `type?` filter; the entity column groups/filters by type.
- **Measurement:** a labelled fixture (the Discord corpus + a hand-tagged gold set) with a
  precision/recall/F1 harness, so lever (2) and (3) can be evaluated against a baseline rather than by
  eyeball. Without this, "less noise" is unfalsifiable.

Sequenced after v1: relation-vocabulary mapping (lever 2), then the corpus-wide normalize/prune pass
(lever 3) gated on the F1 numbers.

## Glossary

- **Fact** — the unit of storage: one extracted proposition plus its metadata (Assertion + Factuality +
  optional Illocution + Attribution + Provenance).
- **Assertion** — the proposition itself: a subject–predicate–object **triple**, with optional
  valid-time (`validFrom`/`validTo`) and the source `quote`.
- **Term** — a subject or object: either an **entity reference** (`{ entity, label? }`) or a **literal**
  (`{ literal }`).
- **Entity** — a normalized mention (person/org/place/event/concept/thing). The `entity` slug is the
  join key (`DXOS` and `dxos` collapse); `label` keeps the display surface form.
- **Predicate** — the relation (a short verb phrase). Open strings in v1; a normalized **relation key**
  for matching paraphrases (`works at` = `employed by`) is planned.
- **Factuality** — the author's epistemic stance on the proposition: a **FactBank** value
  (`CT`/`PR`/`PS` × `±`, plus `CTu` polarity-unknown and `Uu` uncommitted), `polarity`, `confidence`
  (0–1), and `nature` (epistemic = knowledge, aleatory = chance).
- **Illocution** — the **speech act**: `force` (assertive/directive/commissive/expressive) + `mood`
  (declarative/interrogative/imperative) + `addressee`. Absent ⇒ assertive. `directive` = a question
  (interrogative) or request (imperative). See [Illocutions](#illocutions-speech-acts).
- **Attribution** — provenance of the assertion (PROV-O): `agent` (who asserted), `source` (the message
  DXN — where), `generatedAtTime` (when), optional `wasDerivedFrom` / `span`.
- **Provenance record** — bookkeeping fields: `id`, `recordedAt` (transaction time), `extractor`
  (`{ id, model, version }`), `sourceHash`.
- **Valid time vs transaction time** — `validFrom`/`validTo` is when the asserted _state_ holds;
  `recordedAt` is when the fact was _ingested_.
- **DXN** — a DXOS resource name; facts reference ECHO objects (messages, linked entities) by DXN
  instead of embedding them, so the graph lives outside ECHO.
- **Reification** — storing a statement as a node with `sx:subject`/`sx:predicate`/`sx:object` (plus
  metadata) rather than a bare triple, so a fact can carry attribution/factuality/illocution.
- **`sx:`** — this package's namespace for its own predicates (subject/predicate/object, factuality,
  speech acts). **PROV-O** terms are reused verbatim so the graph is valid provenance.
- **Source / `sourceHash`** — the origin document (DXN) and a content hash used as an incremental
  cursor: an unchanged source is a no-op, a changed one re-extracts.
- **as-of / according-to** — the two query-time conflict-resolution axes (state _at a time_ × _per a
  source_); conflicts are never merged at write time.
- **Comunica / Source** — the SPARQL engine (`@comunica/query-sparql-rdfjs`) and the swappable RDF/JS
  backend it queries (N3 in-memory, or SQLite over OPFS / file / Durable Object).

# Multi-model extraction benchmark

Accuracy + throughput comparison of `pipeline-rdf` fact extraction across local (Ollama) and edge
(Claude) models, scored against a 50-document gold corpus.

- Test: [`multi-model.bench.test.ts`](./multi-model.bench.test.ts)
- Corpus + scoring: [`multi-model.corpus.ts`](./multi-model.corpus.ts) — 50 single-proposition documents,
  each paired with its expected RDF fact(s).
- Run (opt-in; needs a running Ollama with the models pulled **and** edge credentials):

  ```bash
  RDF_BENCH=1 moon run pipeline-rdf:test -- src/testing/multi-model.bench.test.ts
  ```

  Env: `BENCH_ONLY=llama,haiku` (filter variants by name), `BENCH_LIMIT=10` (first N docs),
  `BENCH_OUT=/path/results.json` (results document; defaults to the package root `bench-results.json`).

## Results

Run 2026-07-07 · 50 docs · Ollama (local) vs edge Claude tiers.

| model            | backend | precision |   recall |       F1 | matched | facts | facts/doc | entities | predicates |    time | notes                      |
| ---------------- | ------- | --------: | -------: | -------: | ------: | ----: | --------: | -------: | ---------: | ------: | -------------------------- |
| **claude-opus**  | edge    |  **0.98** | **0.98** | **0.98** |   49/50 |    50 |      1.00 |       87 |         38 |    139s |                            |
| claude-haiku     | edge    |      0.88 |     0.88 |     0.88 |   44/50 |    50 |      1.00 |       88 |         37 |     63s |                            |
| **llama-3.2-3b** | ollama  |      0.74 |     0.64 |     0.69 |   32/50 |    43 |      0.86 |       79 |         33 | **31s** | best local; fastest        |
| qwen-2.5-7b      | ollama  |      0.75 |     0.06 |     0.11 |    3/50 |     4 |      0.08 |        8 |          4 |     34s | high precision, ~no recall |
| gemma-4-12b      | ollama  |         — |        — |        — |       — |     — |         — |        — |          — |       — | errored @ doc 5            |
| claude-sonnet    | edge    |         — |        — |        — |       — |     — |         — |        — |          — |       — | errored @ doc 19           |

`matched` is true positives against the 50 gold facts (one per doc). `time` is total wall-clock for
the variant's 50 documents (up to two LLM calls each). A predicted fact is a true positive when its
subject/object/predicate align (normalized, containment-tolerant) with the document's gold fact.

## Analysis

- **Accuracy tracks model power**: Opus (0.98 F1) ≫ Haiku (0.88) ≫ Llama-3.2-3b (0.69) ≫ Qwen (0.11).
- **claude-opus** is near-perfect (49/50) but the slowest (~2.8 s/doc).
- **claude-haiku** is the quality/speed sweet spot — full 0.88 across the board at ~1.3 s/doc, half Opus's latency.
- **llama-3.2-3b** is the best _local_ option and the **fastest overall** (~0.6 s/doc, 0.86 facts/doc,
  0.69 F1) — a genuinely usable 3B model for this task, though recall (0.64) trails the edge tiers.
- **qwen-2.5-7b** is a striking outlier: decent precision (0.75) but **near-zero recall (0.06)** — it
  extracts almost nothing (4 facts total across 50 docs), so it is poor here despite being larger than Llama.
- **Entity/predicate diversity** mirrors coverage: the full-coverage models surface ~80–90 entities and
  ~33–38 predicates; Qwen's near-empty output collapses to 8 entities / 4 predicates.

### Errored variants

Both are recorded as error rows (not test failures); the run tolerates a variant erroring mid-stream.

- **gemma-4-12b** — Ollama `HttpRequestError` at doc 5 (reproducible across runs; non-viable in this
  environment; also the slowest per-doc before failing).
- **claude-sonnet** — a transient edge `SemanticIndexError` at doc 19 (one document's extraction failed
  and propagated through the stream). A re-run typically completes; not a systematic failure.

## Method notes

- **strict mode**: edge models use the strict `generateObject` path; local models use `strict: false`
  (they reliably fail structured output, so each doc is a single `generateText` + lenient salvage).
- **degradation**: a failed extraction for a single document degrades to no facts rather than aborting,
  so a weak model yields low recall rather than an error (Qwen) — distinct from a transport/model error
  that fails the whole stream (Gemma, Sonnet).
- **matching leniency**: surfaces are lowercased, trimmed, and hyphen/whitespace-collapsed, then matched
  by equality or containment — so `is-a` ≈ `is a` and `Greek philosopher` ≈ `philosopher` count, while
  the wrong entities do not. This is a comparative metric; absolute values depend on this leniency.

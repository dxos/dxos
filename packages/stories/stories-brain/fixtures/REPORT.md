# Model-ladder experiment — REPORT

Where can open-weight models do a mailbox task as well as a cheap premier model (haiku)? Considering
**size × latency × accuracy**. Companion to `TEST-PLAN.md`. Private outputs are local-only under the
git-ignored `fixtures/local/results/`; this file (design + predictions + a scrubbed analysis) is
tracked.

## 1. Tonight's experiment

**Hypothesis (H0 — capability ladder):** the model tier required rises with task complexity.
Open weights ≤ ~20B match haiku on _extractive_ tasks (labeling) but fall below on _synthetic_ tasks
(thread summaries, drafts); the crossover rises monotonically with the synthesis/judgment demanded.

**Setup**

- **Contestants:** `llama-3.2-3b · qwen3-8b · gemma-4-12b · gpt-oss-20b · qwen3-30b · claude-haiku` (bar).
- **Grader:** `claude-opus` (scores summaries/drafts; never a contestant).
- **Corpus:** the private mailbox fixture; graded tasks over `LADDER_N` messages (small — every item
  is graded across every model).
- **Method:** each model is **warmed** once (cold VRAM load excluded), then items run serially
  model-by-model (no reload thrash); latency is p50/p95 + throughput; a generous `LLM_TIMEOUT` lets
  slow/reasoning models finish rather than time out and score as inaccurate.

**Graded tasks & metrics**

| Task                         | Metric                                                              |
| ---------------------------- | ------------------------------------------------------------------- |
| labeling (spam + topic tags) | agreement vs haiku — spam F1, tag Jaccard (deterministic, no judge) |
| message summary              | coverage + faithfulness (opus)                                      |
| thread summary               | coverage + faithfulness (opus)                                      |
| drafts (from the message)    | rubric 0–5: relevance / correctness / completeness / tone (opus)    |

## 2. Outputs

**Quantitative** — `fixtures/local/results/model-ladder.{md,json}`: per-task **accuracy × latency ×
size** matrix, a ✓ on each model within tolerance of the bar, and the **smallest-sufficient tier**
per task. `bench.log` + `progress.json` alongside.

**Qualitative artifacts** (local-only; produced by a single canonical model over a wider corpus slice
so they are not thin):

- **Topics** — `results/topics.md`: the mailbox's topics, each with a one-paragraph summary and the
  list of threads under it.
- **Sample drafts** — `results/drafts-sample.md`: 10 messages, each with the drafted reply.
- **User profiles** — `results/profiles.md`: 3 contacts, each a profile summary (who they are, what
  they discuss, the state of the relationship).

## 3. Predictions (pre-registered)

Bar = haiku; "clears" = within 95% of haiku's score.

| Task            | Predicted smallest-sufficient               | Reasoning                                                |
| --------------- | ------------------------------------------- | -------------------------------------------------------- |
| labeling        | **qwen3-8b** (maybe llama-3b)               | shallow classification; open weights saturate it.        |
| message summary | **gemma-12b**                               | llama-3b lags on faithfulness (small models pad/invent). |
| thread summary  | **gpt-oss-20b / qwen3-30b**, maybe none     | cross-message synthesis is where open weights break.     |
| drafts          | **premier (haiku) — no open weight clears** | correctness + tone under generation is hardest.          |

Cross-cutting:

- Crossover rises monotonically: labeling (3–8B) < summaries (12B) < threads (20–30B) < drafts (premier).
- Reasoning tax is **non-monotonic in size** (qwen3-8b slower than gpt-oss-20b — probe confirmed);
  reasoning hurts labeling (latency + JSON) more than it helps.
- `gpt-oss-20b` the best open all-rounder; `gemma-12b` wins the summary _frontier_ (non-reasoning → faster).
- Would **invalidate H0:** a 3B model matching haiku on drafts, or a 30B open model failing labeling.

## 4. Analysis

Run: 6 contestants × 4 tasks, N=25 messages, judge=opus, bar=haiku. Full matrix in
`results/model-ladder.md`. **N=25, one corpus, one judge, one run — directional, not definitive.**

### Verdict per task (bar = haiku; "clears" = ≥95% of bar)

| Task | Bar (haiku) | Best open weight | Clears? | Recommended |
| --- | --- | --- | --- | --- |
| labeling (agreement) | 1.00 | qwen3-30b 0.70 | ✗ (none close) | **haiku** |
| message summary (coverage) | 0.50 | qwen3-8b 0.46 / gpt-oss-20b 0.45 | ✗ (just under) | haiku, but open is a whisker away |
| thread summary (coverage) | 0.55 | gpt-oss-20b 0.46 | ✗ | **haiku** |
| **drafts (rubric)** | 0.98 | **gemma-12b 0.94 · qwen3-30b 0.94** | **✓** | **gemma-12b / qwen3-30b** (or gpt-oss-20b 0.91 for speed) |

### The surprise — H0 is inverted

**H0 predicted the crossover rises with task complexity** (labeling easiest → open OK; drafts hardest →
need premier). **The opposite happened:** open weights did **worst on labeling** (the "simplest" task)
and **best on drafts** (the "hardest"). Two reasons:

- **Metric shape, not capability.** Labeling is scored as *agreement with haiku*, so a model that
  labels reasonably but differently is punished; drafts are scored on *absolute quality* (rubric), which
  rewards genuine capability. Extractive-agreement is a harsher bar than generative-quality.
- **Drafting is a generation task open weights handle well.** gemma-12b and qwen3-30b match haiku's
  draft quality within tolerance, with **near-perfect correctness (0.99)** — they don't invent facts.

### Cross-cutting findings

- **Faithfulness is universally high (0.89–0.99)** across every open model and task — they do **not**
  hallucinate more than haiku. The gap on summaries is **coverage** (missing salient points), not fidelity.
- **Reasoning tax confirmed and non-monotonic** (as predicted): qwen3-8b is the *slowest* model on
  labeling/summaries (12–14 s) despite being the smallest; gemma-12b is shockingly slow on summaries
  (34–38 s p50) despite being non-reasoning. Latency does not track size.
- **gpt-oss-20b is the best open all-rounder** (prediction held): consistently near the top on accuracy
  with the best latency profile of the capable models (1.6–7.7 s) — the frontier pick when a fast open
  model is needed.
- **llama-3.2-3b** is fast (0.5 s) but too weak everywhere except as a draft baseline (0.74).

### Takeaway

Where open weights are ready **today**: **drafts** (gemma-12b / qwen3-30b clear the bar; gpt-oss-20b for
speed) and, at a small coverage discount, **message summaries** (gpt-oss-20b / qwen3-8b). Keep **premier
(haiku)** for **labeling** and **thread summaries**. Faithfulness is not the risk — coverage and
labeling-agreement are.

### Caveats / what would sharpen this

- Labeling uses *haiku-agreement*, not ground truth — a model can label well yet score low. A
  human-labeled spam/tag gold set would separate "different" from "wrong".
- Coverage gold sets are strict (haiku itself only scores 0.50) — the ceiling is low, compressing the
  spread. Worth calibrating the gold-set size.
- N=25, single run. Re-run at higher N and average across runs before acting on the draft result.

## 5. Next

- Topics
  - packages/core/compute/pipeline-email/src/types/Topic.ts
  - packages/core/compute/pipeline-email/src/corpus/digest.ts

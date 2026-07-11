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

## 4. Analysis (filled after the run)

_TBD — per-task verdict vs H0, recommended model per task, the accuracy-vs-latency frontier, the
reasoning-model tax, and any surprises. Kept generic (no private mailbox content)._

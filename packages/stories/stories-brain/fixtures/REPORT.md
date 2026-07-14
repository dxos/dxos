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

| Task                       | Bar (haiku) | Best open weight                    | Clears?        | Recommended                                               |
| -------------------------- | ----------- | ----------------------------------- | -------------- | --------------------------------------------------------- |
| labeling (agreement)       | 1.00        | qwen3-30b 0.70                      | ✗ (none close) | **haiku**                                                 |
| message summary (coverage) | 0.50        | qwen3-8b 0.46 / gpt-oss-20b 0.45    | ✗ (just under) | haiku, but open is a whisker away                         |
| thread summary (coverage)  | 0.55        | gpt-oss-20b 0.46                    | ✗              | **haiku**                                                 |
| **drafts (rubric)**        | 0.98        | **gemma-12b 0.94 · qwen3-30b 0.94** | **✓**          | **gemma-12b / qwen3-30b** (or gpt-oss-20b 0.91 for speed) |

### The surprise — H0 is inverted

**H0 predicted the crossover rises with task complexity** (labeling easiest → open OK; drafts hardest →
need premier). **The opposite happened:** open weights did **worst on labeling** (the "simplest" task)
and **best on drafts** (the "hardest"). Two reasons:

- **Metric shape, not capability.** Labeling is scored as _agreement with haiku_, so a model that
  labels reasonably but differently is punished; drafts are scored on _absolute quality_ (rubric), which
  rewards genuine capability. Extractive-agreement is a harsher bar than generative-quality.
- **Drafting is a generation task open weights handle well.** gemma-12b and qwen3-30b match haiku's
  draft quality within tolerance, with **near-perfect correctness (0.99)** — they don't invent facts.

### Cross-cutting findings

- **Faithfulness is universally high (0.89–0.99)** across every open model and task — they do **not**
  hallucinate more than haiku. The gap on summaries is **coverage** (missing salient points), not fidelity.
- **Reasoning tax confirmed and non-monotonic** (as predicted): qwen3-8b is the _slowest_ model on
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

- Labeling uses _haiku-agreement_, not ground truth — a model can label well yet score low. A
  human-labeled spam/tag gold set would separate "different" from "wrong".
- Coverage gold sets are strict (haiku itself only scores 0.50) — the ceiling is low, compressing the
  spread. Worth calibrating the gold-set size.
- N=25, single run. Re-run at higher N and average across runs before acting on the draft result.

## 5. Next

### Product direction (from review)

- **Sender-type triage first.** Classify each sender as **person vs organization** (e.g. an Anthropic
  invoice is org). Cheap, and it gates everything downstream.
- **Only draft replies to people** (extend `Mailbox.isReplyable`: person AND not no-reply/unsubscribe).
- **Minimize summarization for non-people** — a one-line label ("this is a bill") instead of a full
  summary; reserve real summarization budget for person mail.
- **Default draft `Instructions`** — the current drafts are too flowery ("if I may be so bold"). Ship a
  default Instructions object: plain, direct, concise; no obsequious hedging.

### Pipeline-stage audit (which stages use an LLM → which model)

Verified across the product pipelines. **`—` = deterministic (no LLM).** Model recommendations lean on
§4 (tested: summarize, draft, labeling) and are marked **needs-eval** where tonight didn't measure the
stage (fact extraction, person/org classification).

| Pipeline                            | Stage                                                                                                    | LLM?                        | Model / note                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| **Gmail sync** (plugin-inbox)       | fetch · dedup · decode-body · map-to-message · collect-stats · resolve-contact · record-threads · commit | **no**                      | — (keep the sync path 100% deterministic → fast foreground)                             |
|                                     | on-arrival extractors (optional)                                                                         | opt                         | small/local (`@dxos/extractor`); off by default                                         |
| **EmailPipeline** (pipeline-email)  | summarize (per message)                                                                                  | **yes**                     | haiku; open close (gpt-oss-20b) at a coverage discount                                  |
|                                     | extract-contacts (actors) · stats · build-threads                                                        | **no**                      | —                                                                                       |
|                                     | extract-facts                                                                                            | **yes**                     | **needs-eval** (structured extraction — not measured in §4)                             |
| **Fact pipeline** (runFactPipeline) | facts-dedup · commit                                                                                     | **no**                      | —                                                                                       |
|                                     | extract-facts-unit                                                                                       | **yes**                     | **needs-eval**                                                                          |
| **pipeline-rdf** (extract)          | extract-chunk (propositions)                                                                             | **yes**                     | **needs-eval**                                                                          |
|                                     | normalize-predicates · index-facts                                                                       | **no**                      | —                                                                                       |
| **Corpus** (pipeline-email/corpus)  | cluster-threads                                                                                          | **no**                      | — (Jaccard; fix hash/number tokenizer, see §topics)                                     |
|                                     | summarize-topics · narrate-digest                                                                        | **yes**                     | small/haiku (cheap prose over a deterministic skeleton)                                 |
|                                     | materialize-topics · build-digest · rollups · ledger                                                     | **no**                      | —                                                                                       |
| **Proposed (from review)**          | classify-sender (person/org)                                                                             | **yes (cheap) / heuristic** | small/local — gates all downstream                                                      |
|                                     | tag/label (spam, topic)                                                                                  | **yes**                     | haiku (open weak on labeling-agreement, §4)                                             |
|                                     | draft (people only)                                                                                      | **yes**                     | gemma-12b / qwen3-30b clear the bar (§4); gpt-oss-20b for speed; + default Instructions |

**Structural takeaway:** sync has **zero** LLM stages, so the foreground (sync + cheap labeling) is
already fast; **all** LLM cost lives in batchable enrichment (summarize / facts / topics / drafts).

### Design issues

- **Model-per-stage representation.** A declarative **model policy**: `stageId → model DXN`, resolved at
  runtime, overridable per run, defaults seeded from the §4 ladder. (Mirrors `ExtractOptions.model` /
  the harness `ModelVariant` — generalize it to a policy map so routing isn't hard-coded per stage.)
- **Latency — two-tier.** Foreground: sync + `classify-sender` + `tag` (deterministic or a small/fast
  model) → the inbox is usable immediately. Background: **prioritized batching** of summarize / facts /
  draft, gated by labels (skip non-people summaries; draft only replyable person mail; batch by
  priority signal). The audit shows this split is natural — the deterministic stages are exactly the
  foreground ones.
- **Efficient execution.** Per-message LLM stages (tag + summarize + facts) currently live in separate
  passes that each re-read the message; group them into **one per-message LLM pass** (shared context,
  one prompt or one session) to cut both latency and token cost. Sync stays a separate, LLM-free path.

### Topics work (clustering quality — see §topics)

- `packages/core/compute/pipeline-email/src/corpus/topics.ts` — strip hex/numeric tokens in `tokenize`;
  normalize subjects (drop trailing hashes/ids) before tokenizing so near-identical automated mail
  collapses to one topic instead of ~11.
- `packages/core/compute/pipeline-email/src/types/Topic.ts` · `.../corpus/digest.ts`

## 6. Active Topics experiment (2026-07-13)

Spec: `agents/superpowers/specs/2026-07-13-active-topics-experiment-design.md`. Over the private
fixture (495 msgs, `ACTIVE_TOP=8`, owner `rich@braneframe.com`/`rich@dxos.org`): cluster → deterministic
activity score → LLM confidence → active/suggested split → populate (status/facts/tasks/drafts).

**Shakedown fixes (found by running):** (1) recency was measured vs wall-clock but the fixture is a
historical snapshot → anchor "now" to the corpus's latest message; (2) `buildThreads` now accepts
multiple owner aliases so replies from either address count as "from the owner".

**Run 1 (no automated down-weight):** the active list was dominated by automated action-notices —
Grafana deletion, 1Password sign-in alert, DigitalOcean cert renewal — all high-confidence (deadlines)
but no-reply (drafts skipped). Only 2/8 active topics had drafts. Pure receipts were correctly buried
in suggestions (anthropic receipts at 33%, 68 threads collapsed to one topic).

**Intervention — automated/no-reply down-weight (×0.35):** a topic whose every non-owner sender is a
no-reply/role address is down-weighted so relationship topics rank above notices.

**Run 2 (with down-weight):** active list flipped to real person/team topics — product discussions,
an interview, an event tomorrow, overdue invoices, consulting payments — **5/8 now carry drafts**. The
automated notices dropped out of active ("been client down" → 35% suggested). Clear win.

**Remaining (next iterations, not blockers):**

- Labels are keyword-salad ("crabnebula inv ltd", "ama hsc tokenizing") — add a cheap LLM label pass
  for active topics.
- Facts occasionally empty (e.g. "eric interview ries") — fact extraction misses short person threads.
- `personEmails` isn't wired (no contacts loaded) so the person-linked signal is off; wiring contacts
  would sharpen ranking further.
- The activity model still leans on `awaiting-mine`, which fires for every unanswered inbound thread;
  contact-linkage + open-item signals should carry more weight once contacts are wired.

Reports: `fixtures/local/results/active-topics/{index.md,<topic>.md,active-topics.json}` (git-ignored).

# stories-brain research tasks

Outstanding work for the mailbox-feed research harness (`src/test/harness/*`, tests in `src/test/*`).
Results/fixtures are local-only under the git-ignored `fixtures/local/`.

## Overnight model-ladder experiment

**Goal:** per task, find the smallest open-weight model that matches a cheap premier model (haiku) —
measuring **size × latency × accuracy**. Hypothesis (H0, capability ladder): model tier required
rises with task complexity; open weights ≤ ~20B match haiku on extractive tasks (labeling,
categorization) but fall below on synthetic tasks (thread/topic summaries, drafts).

**Setup:** contestants = llama-3.2-3b · qwen3-8b · gemma-4-12b · gpt-oss-20b · qwen3-30b ·
**haiku (bar)**; **grader = opus** (summaries/drafts only, never a contestant). Scope-B tasks:
(a) labeling, (b) categorization, (c) summaries [message/thread], (d1) drafts-from-knowledge.

### Tasks

- [x] Update `pipeline-email/scripts/pull-models.sh` to the modern ladder.
- [x] **Catalog + ladder** — added `qwen3-8b` / `qwen3-30b` to `Model.ts`; wired the 5-tier
      `LOCAL_VARIANTS` in `models.ts`. Validated via `ladder-probe.test.ts`: all 5 local models
      resolve + parse JSON. Warm latency (trivial prompt): llama-3b 192ms, gpt-oss-20b 1.4s,
      gemma-12b 2.4s, qwen3-30b 3.4s, qwen3-8b 4.2s (reasoning tax is non-monotonic in size).
- [x] **Timing capture** — `internal/ladder.ts` `runLadder`: warms each model (excludes cold load),
      runs items serially model-by-model (no VRAM thrash), reports p50/p95/mean + throughput.
- [x] **Grading layer** (`internal/grade.ts`): labeling → deterministic agreement vs the reference
      (spam F1, tag Jaccard); summaries → coverage + faithfulness (reuses `judge.ts`); drafts →
      0–5 rubric (relevance/correctness/completeness/tone). Bench: `model-ladder.bench.test.ts`.
- [ ] **Categorization bench** — DEFERRED (labeling/summaries/drafts landed). Group messages/threads
      into topics; cluster agreement vs haiku. (The topics _artifact_ now uses the corpus pipeline.)
- [x] **`overnight.mjs` driver** + `overnight` moon task — non-interactive, reuses `bench --stats`.
      `generateText` gained retry+backoff, a generous `LLM_TIMEOUT`, and `catchAllCause` (a defect —
      @effect/ai ParseError while constructing its own AiError — was crashing the run mid-way).
- [x] **RAN** (2026-07-11, N=25, opus judge). Results: `results/model-ladder.md` +
      `topics.md` / `profiles.md` / `drafts-sample.md`. **Analysis + audit → `fixtures/REPORT.md`.**
      Headline: **H0 inverted** — open weights strongest on _drafts_ (gemma-12b/qwen3-30b clear the
      bar), weakest on _labeling_; faithfulness universally high; gpt-oss-20b best all-rounder.

## Next — model routing & sender-type triage (from REPORT §5)

**Direction:** triage by sender type first, spend LLM effort only where it pays off. Sync is 100%
deterministic (no LLM) → foreground stays fast; all LLM cost is batchable enrichment.

- [x] **`classify-sender` (person/org) stage + ground-truth eval** — shipped. Stage
      (`pipelines/classify-sender.ts`): `uniqueSenders` (per-sender dedup), `classifySenderHeuristic`
      (deterministic role-address/company/person-name signals + confidence), `classifySender` (LLM),
      `classifySenderHybrid` (heuristic-when-confident-else-LLM). Scorer `scoreSenders` in `grade.ts`
      (accuracy + per-class/macro F1 + directional confusion). Eval `classify-sender.bench.test.ts`:
      a bootstrap test seeds a candidate gold set via the strong model → human reviews + promotes to
      `fixtures/local/sender-labels.json` → the eval scores heuristic / hybrid / each model vs gold.
      Deterministic unit test (`classify-sender.test.ts`, 8 cases) passes in CI; build+lint+fmt clean.
      **To run the measurement:** bootstrap over the private corpus, review labels, re-run the eval.
- [ ] **`Mailbox.isReplyable` → person-only** — draft replies only to people (person AND not
      no-reply/unsubscribe).
- [ ] **Minimize non-people summarization** — one-line label ("this is a bill") instead of a full
      summary for org mail; reserve summary budget for person mail.
- [ ] **Default draft `Instructions`** — plain/direct/concise, no obsequious hedging ("if I may be so
      bold"). Ship the object + re-score drafts with it.
- [ ] **Model-policy map** — declarative `stageId → model DXN`, overridable per run, defaults seeded
      from the ladder (generalize `ExtractOptions.model`).
- [ ] **Two-tier latency** — foreground (sync + classify + tag) vs background prioritized batching of
      summarize/facts/draft, gated by labels.
- [ ] **Single per-message LLM pass** — fold tag + summarize + facts into one pass (shared context) to
      cut latency + tokens.
- [x] **Topics clustering fix** (`corpus/topics.ts`) — `tokenize` now drops id tokens (pure numbers,
      hex hashes, digit-heavy codes) via `isIdToken`, gated by a `dropIdTokens` option (default true);
      short version tokens (`q4`, `v2`) are kept. Subjects are already reply-prefix/whitespace-
      normalized at threading time (`internal/threading.ts` `normalizeSubject`), so the per-message
      invoice/order ids were the remaining fragmenter. Tests: automated invoices with unique hashes
      now collapse to one topic; ids no longer leak into keywords. Full pipeline-email suite green.
- [x] **eval-only cleanup** — `analyze-results.mjs` now counts graded-row schemas (`model-ladder`,
      `classify-sender`): `primaryCount` falls back to `r.n ?? r.scored ?? rows.length` (was summing
      only `facts`/`processed` → false EMPTY), and both are added to `NON_FEED_TESTS` (capped/unique-
      sender corpora, so `< feedCount` isn't PARTIAL). Verified end-to-end on synthetic results → OK.

Risks: reasoning models (qwen3, gpt-oss) → higher latency + may break strict JSON (parse leniently).
Ollama up during runs; opus/haiku need `.env` (`moon run stories-brain:env` renders it via 1Password).

## Bugs

- [x] **`subject-facts` returned 0 for Nicole.** Fixed: the subject index now matches by
      token-substring over entity slug + label (e.g. `gudmand` ⊂ `ngudmand`) instead of exact slug,
      and reports `exactSlugFacts` so the mismatch is surfaced. (factCount 7 for Nicole.)
- [x] **No-clobber convention.** `LIMIT`-ed iteration runs now write to `results/partial/`, so
      canonical full-feed results are never overwritten. (Restore of `tags`/`summarize-messages`
      full-feed re-runs separately.)

## Analysis

- [x] **Results-analyzer** (`scripts/analyze-results.mjs`) — reads `results/*.json` + `.md` +
      `progress.json`, prints a status table, and flags EMPTY / ERROR / PARTIAL; exits non-zero on
      problems. Wired into `run-suite.mjs`. (Quality scoring is still the separate LLM-judge task.)

## Requested follow-ups

- [x] **Use `@dxos/markdown` `htmlToMarkdown` in `pickBody`** — already satisfied: harness `pickBody`
      (`fixture.ts`) calls `@dxos/markdown` `normalizeText` (turndown), not a regex `stripHtml` (the
      remaining `stripHtml` lives only in the unrelated plugin-feed/plugin-magazine). No change needed.
      Benchmark (`html-to-markdown.bench.test.ts`) confirms it's ~free (99 msgs, ~4.1 ms/msg, HTML→15%).
- [ ] **Summary prompt tweak** — drop the "The email…" preamble, make summaries terser, use bullet
      lists (`summarize-messages` + `summarize-threads`).
- [ ] **New "draft responses" test** — generate draft replies to messages.
- [ ] **Speech-act axis in `@dxos/pipeline-rdf`** — add illocutionary `force`
      (assertive/directive/commissive) + deontic modality (reified `sx:` predicates; reuse `Uu`
      factuality for questions), and reshape `extract-questions` to distinguish **questions/requests
      vs notifications**. Retire the lexical `owes` convention in `pipeline-email/corpus/ledger.ts`.
- [x] **Benchmark native `text/html` vs `text/plain` email input** — `html-vs-text.bench.test.ts`
      (fact extraction, one model, messages carrying both MIME parts). Result (qwen, N=10): the html
      part is 8.08× larger, 2.25× slower, and yields slightly fewer facts (33 vs 36). Prefer the
      native plain part; strip HTML only as fallback (`pickBody` / `body: 'auto'`).
- [x] **Benchmark html→markdown throughput** — `html-to-markdown.bench.test.ts` over `@dxos/markdown`
      `htmlToMarkdown`. Result: 99 msgs, ~4.1 ms/msg, ~9.8M chars/sec, HTML→15% (structured markdown,
      negligible cost).

## Deferred / tracked

- [ ] **Reactive Progress browser panel + EDGE sink** — build the subscribable React panel + EDGE
      sink on the core `@dxos/pipeline` `Progress` service. (Spawned task chip `task_96c8b142`.)
- [ ] **`tags` → `.md`** via `renderResponse` (tags are JSON-only today).
- [ ] **Fix `text/plain` capture bug.** ~7 messages have a degenerate plain block (literal `"False"`)
      — a serialization bug in the ArchiveModule download or the Gmail→Message mapper for messages
      lacking a plain part. Fix upstream so `body: 'plain'` isn't silently empty for them.

## FINDINGS next-steps (`fixtures/local/results/FINDINGS.md`)

- [ ] **LLM-judge scorer** for the brain-vs-rag eval (replace the saturated `subjectMentions`).
- [ ] **Fact→source bridge inside `SummarizeSubject`** (return source message DXNs). The `hybrid`
      skill mode does this; the stock brain op does not.
- [ ] **Sender-scoped retrieval tool** in the Database skill (the gap that sank the haiku baseline).
- [ ] **Prompt-type comparison** — add analytical prompts that play to the fact store's strengths and
      compare per prompt-type (not just "summarize messages from X").

## Process

- [ ] **Submit the PR.** All research-harness work is uncommitted on
      `claude/mailboxsync-feed-export-4feb3d`.

## Done (structure)

- [x] Folded the directive prompt into the owned `plugin-brain/skills/brain.ts` (procedure: call
      SummarizeSubject first, don't give up before both tools empty); removed the `brain-v2` variant.
- [x] `test/` vs `testing/` split: harness (infra) → `src/testing/harness/` (`skills/`, `internal/`,
      `pipelines/` + core); `.test.ts` files stay in `src/test/`.
- [x] `defs.ts` — single source of truth for all env knobs/defaults (`SUBJECT`, models, `LIMIT`,
      fixture/result paths, `SAMPLES`, `SKILL_MODES`, …); every test + harness module reads from it.

## Done

- [x] Phase 1 multi-model pipeline benchmark harness (tags, summaries, contacts, facts, questions) +
      results JSON + `LIMIT`/`MODELS` env knobs; FactStore disk save/load.
- [x] Phase 2/3 agent harness (`runAgentEval`) + `brain` / `brain-v2` / `rag` / `hybrid` skill modes,
      compared in `brain-skill-eval`.
- [x] RAG skill (USearch + ollama `nomic-embed-text`); Fact→source bridge (`hybrid` mode).
- [x] HTML stripped at message load (clean prose for summaries/embeddings/display).
- [x] Incremental sister `.md` per test; relative paths + result arrays in JSON.
- [x] Pipeline `Progress` service + `Stage.track` + `ProgressReporter` sinks + `run-suite.mjs`
      orchestrator (shared `progress.json`, seeded manifest).
- [x] Live progress for the manual-loop tests (`extract-facts`, `html-vs-text`, `brain-vs-rag`) via a
      plain `trackProgress` helper + `onMessage` hooks — every test now reports to `progress.json`.
- [x] MIME body selection: `pickBody` (prefer native `text/plain`, else stripped `text/html`), collapse
      to one clean block at load, and `loadFixtureMessages({ body: 'auto' | 'html' | 'plain' })`.
      Re-based the benchmark as native `text/html` vs `text/plain`.

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
- [ ] **Timing capture** — per-item `durationMs` → p50/p95/mean + throughput per (task,model); warm
      each local model once before timing (cold VRAM load ≈ 10–30s); record JSON-parse-failure rate.
      (Warmup + latency + jsonOk pattern established in `ladder-probe.test.ts`.)
- [ ] **Grading layer** (generalize `judge.ts`): labeling → deterministic agreement vs haiku
      (spam/noreply F1, tag Jaccard; noreply also vs header gold); summaries → coverage + faithfulness
      (opus); drafts-KB → rubric 0–5 + blind pairwise vs haiku (opus).
- [ ] **Categorization bench** (new) — group messages/threads into topics; cluster agreement vs haiku.
- [ ] **`overnight.mjs` driver** — non-interactive, retry+backoff (no silent empty-on-error), warmup,
      streams `progress.json`, writes `overnight-report.md` (accuracy × latency × size + verdict +
      recommended tier per task).
- [ ] **Runtime + token/cost estimate** — print for approval BEFORE launch.

Risks: reasoning models (qwen3, gpt-oss) → higher latency + may break strict JSON (parse leniently,
record failure rate; `/no_think` sensitivity = future experiment). Ollama up all night; opus/haiku
need `DX_ANTHROPIC_API_KEY`. Do NOT launch until the estimate is approved.

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

- [ ] **Use `@dxos/markdown` `htmlToMarkdown` in `pickBody`** instead of the regex `stripHtml`.
      Benchmark (`html-to-markdown.bench.test.ts`) shows it's ~free: 99 msgs, ~4.1 ms/msg, ~9.8M
      chars/sec, compressing HTML to 15% — structured markdown at negligible cost.
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

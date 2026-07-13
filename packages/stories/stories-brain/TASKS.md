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
- [x] **`Mailbox.isReplyable` → person-only** — extended in `plugin-inbox/types/Mailbox.ts`: added
      `isOrgSender` (deterministic strong-signal role-localpart / org-name check, errs toward person so
      real individuals aren't suppressed); `isReplyable` now returns false for no-reply/unsubscribe/
      mailer-daemon OR an org sender, and accepts an optional `{ senderClass }` so the background
      classify-sender result overrides the heuristic (no-reply gate still wins). 4 tests in
      `Mailbox.test.ts`; full plugin-inbox suite green. FOLLOW-UP: pass the classify-sender class into
      `isReplyable({ senderClass })` at the product draft-creation call site.
- [x] **Minimize non-people summarization** — `pipelines/summarize.ts`: `labelMessage` (one-line
      category label, cheaper prompt), `summaryKindFor` (pure routing, reuses `Mailbox.isReplyable` so
      summarize + reply agree on "person"), and `summarizeTriaged` (full summary for people, label for
      org/bulk). `SummaryResult` gains `kind: 'summary' | 'label'`; `senderClass` overrides the
      heuristic. 3 routing tests (`summarize-triage.test.ts`); build/lint/fmt clean.
- [x] **Default draft `Instructions`** — shipped `DEFAULT_DRAFT_INSTRUCTIONS` (plain/direct, no
      obsequious hedging) in `pipelines/draft.ts`; `draftReply` applies it by default (omit → default;
      `''` opts out; a custom string overrides). Extracted a pure `buildDraftPrompt` + unit test
      (`draft-instructions.test.ts`). `DRAFT_INSTRUCTIONS` env still overrides. **Re-score** = run
      `draft-responses.bench.test.ts` over the corpus (needs models).
- [x] **Model-policy map** — `harness/model-policy.ts`: `StageId` (the 7 LLM stages), `ModelPolicy`
      (`stage → variant name`), `DEFAULT_MODEL_POLICY` seeded from §4/§5, `resolveModel`/`resolveModelName`
      (default ← per-run policy ← `MODEL_POLICY` env; substring match vs `ALL_VARIANTS`; throws on typo).
      Unit test (`model-policy.test.ts`, 8 cases: every default resolves, override precedence, env parse).
      FOLLOW-UP: migrate single-run tests off `OLLAMA_MODEL`/`ARTIFACT_MODEL` onto `resolveModel(stage)` —
      deferred because it changes those tests' default model (deliberate step, not silent).
- [ ] **Two-tier latency** — foreground (sync + classify + tag) vs background prioritized batching of
      summarize/facts/draft, gated by labels.
- [x] **Single per-message LLM pass** — `pipelines/enrich.ts`: `enrichMessage` folds tag + spam +
      triage-appropriate summary/label + salient facts into ONE model call (message read once).
      Pure `buildEnrichPrompt` (summary vs label by triage `kind`) + `parseEnrichResponse` (lenient
      JSON, spam inference/dedup, degrades to empty) are unit-tested (`enrich.test.ts`, 7 cases). The
      structured RDF fact pipeline stays separate. Latency/token comparison vs 3 passes = a bench run.
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

## Next phase: Topics pipeline (productization)

**Direction:** turn the research topics work into a product feature — tag messages, cluster into
`Topic` objects with summaries, run it from the mailbox UI with a progress meter, and browse the
result. Reuses `@dxos/pipeline-email` corpus (`buildThreads`→`clusterThreads`→`summarizeTopics`→
`materializeTopics`), the #12171 progress-monitor capability, and the `InboxCapabilities.MailboxAction`
toolbar-injection seam. First real consumer of the incremental design (`DESIGN.md`) — one-shot v1 will
hit the operation max-run-time on large mailboxes; bound it now, generalize later.

### Decisions (locked)

1. **Orchestration** — a headless **`@dxos/pipeline-email` runnable**; the plugin-inbox operation wraps it.
2. **Tagger** — **promote the research tagger** (free-form multi-tag + spam) into pipeline-email; the
   runnable returns per-message tag results, the operation applies them via `Mailbox.applyTag`.
3. **Progress key** — distinct **`${mailboxUri}#topics`** via an exported `createTopicsProgressKey(mailbox)`
   helper (following `createSyncProgressKey` in `sync.ts` — one factory ties producer + consumer +
   tests together); `MailboxArticle` also subscribes so the inline statusbar meter shows the run.
4. **Model routing** — **promote the `model-policy` map to a product package** (prerequisite; move it
   out of the stories-brain harness with product-appropriate variants) and resolve stage→model there.
5. **Scale** — **one-shot, resumable-lite**: idempotent, skip messages/threads already tagged /
   materialized so re-invoking the toolbar action resumes. Full trigger/cursor incremental (`DESIGN.md`)
   is a later phase.

### Tasks

- [x] **(prereq) Promote `model-policy` map** — `pipeline-email/model-policy.ts` (Anthropic tiers,
      `resolveModel`); unit-tested.
- [x] **(prereq) Promote the tagger** — `pipeline-email/stages/tag.ts` (`tagMessage` + pure
      `parseTagResult`, model via the policy); unit-tested.
- [x] **Topics runnable** — `pipeline-email/topics-pipeline.ts` `runTopicsPipeline`: tag → buildThreads
      → clusterThreads → summarizeTopics → materializeTopics; LLM steps injected (pure/testable);
      idempotent (limit / skipMessage / skipTopic) + progress hook. Unit-tested with stubs.
- [x] **`AnalyzeTopics` operation** — `plugin-inbox/operations/analyze/analyze-topics.ts`: wires the
      runnable to AiService, applies tags via `Mailbox.applyTag`, persists Topics, registers the
      `${mailboxUri}#topics` monitor (`createTopicsProgressKey`). Registered in the handler set.
- [x] **Mailbox → Topic `Relation`** — each Topic persisted with an `AnchoredTo` relation (source=Topic,
      target=Mailbox). ⚠️ REVIEW: idiomatic AnchoredTo direction (Topic anchored to Mailbox), not the
      literal "Mailbox ⇒ Topic".
- [x] **Toolbar menu option** — `InboxCapabilities.MailboxAction` "Analyze Topics" contributed from
      `InboxPlugin` (auto-renders in the extract dropdown).
- [x] **`MailboxArticle` inline meter** — subscribes to `${mailboxUri}#topics` too; shows whichever
      run (sync/topics) is active.
- [x] **App-graph node** — Topics node under the mailbox (peer of Drafts) in `app-graph-builder.ts`.
- [x] **`TopicsArticle`** — `react-ui-mosaic` stack of Topic cards (label, summary, thread/participant
      count); wired via a react-surface. `Topic` schema registered in the plugin.
- [x] **`TopicsModule`** (stories-inbox) — renders the Topics article surface; registered in
      `testing/modules.tsx` + a column in `MailboxSync.stories.tsx`.

**All 9 tasks landed (build/lint/fmt/tests green).** Verified to build + unit-test level; end-to-end
(running AnalyzeTopics to see real topics) needs models + the storybook. Follow-ups: scope the Topics
query to the mailbox via the AnchoredTo relation; confirm the relation direction.

### Follow-ups (open)

- [ ] **Re-sync creates duplicate messages after deleting the connection.** Deleting the connection
      and syncing again re-imports every message as a duplicate. The mailbox must retain the previous
      sync state (cursor / seen-message set) independent of the connection lifecycle, and the sync
      operation must dedup so re-syncing never creates duplicates. (plugin-inbox Gmail sync + cursor.)

## Next phase: Topics quality + triage v2 (from live review 2026-07-12)

**Direction:** first pass shipped Topics but quality/utility is low — most mail is _bulk_ (receipts,
login notices) that needs no action, and topics get created for senders with no relationship. Tighten
triage, make topics opt-in suggestions rather than eager objects, and finish the master/detail UI.

### Tagging & triage

- [x] **`bulk` tag for no-action mail** — `pipeline-email/stages/tag.ts`: `classifyBulk` (pure —
      subject + sender local part; `'action'` for invoices/payment-requests wins over any bulk signal,
      so they're never bulk) + `applyBulkTag` (adds `bulk` the model missed, strips it from action
      mail). `tagMessage` folds the deterministic gate over the LLM tags; `TagResult` gains `bulk`.
      Prompt updated. 13 tests in `tag.test.ts` (incl. the user's examples). Build clean.
- [x] **Only topic Person senders** — `runTopicsPipeline` gains a `keepTopic?(draft)` predicate
      (applied to fresh clusters before summarization); `analyze-topics.ts` queries `Person` records,
      builds a lowercased email set, and keeps a topic only when a participant matches (bulk/org-only
      threads dropped). Tagging is unaffected. Test in `topics-pipeline.test.ts`; both packages build.

### Topic suggestions (opt-in)

- [ ] **Lightweight topic suggestions on Mailbox** → detailed as **Phase B** in the Topics UX v2 plan
      below (spec `agents/superpowers/specs/2026-07-12-topics-ux-v2-design.md`).
- [ ] **Message → "Create Topic" menu** → detailed as **Phase C** in the Topics UX v2 plan below
      (single-thread seed in v1).

### UI

- [x] **Fix "Ignore sender" menu item** — root cause: `DraftsArticle` (and any consumer not handling
      `ignore-sender`) still rendered the item, so it no-oped there. `MessageStack` now gates the item
      behind an `enableIgnoreSender` prop (default off); only `MailboxArticle` — which handles the
      action and DOES add the `messageFilters` filter (verified) — sets it. Added a `ph--prohibit`
      icon. `Card.Menu` / `TileMenuItem` / `ToolbarMenuItem` gained an optional `icon` field.
- [x] **Delete option on topic card** — `TopicsArticle` `TopicTile` gains a `Card.Menu` "Delete topic"
      item (`ph--trash` icon) → `space.db.remove(topic)`. New `topics.delete.label` translation. Verified
      by a storybook play test (`Topics.stories.tsx` — seeds two topics, deletes one, asserts removal).
      FOLLOW-UP: also remove the `AnchoredTo` relation when deleting (currently orphaned).
- [ ] **`TopicArticle` + master/detail** → detailed as **Phase A** in the Topics UX v2 plan below.

## Topics UX v2 — implementation plan

> Spec: `agents/superpowers/specs/2026-07-12-topics-ux-v2-design.md`. Build order **A → B → C**; each
> phase is a separate commit, build/lint/fmt clean with its storybook play test green. TDD where a pure
> unit exists. Single-file test runs: `pnpm --filter <pkg> exec vitest run --project=node <file>`;
> storybook: `pnpm --filter @dxos/stories-inbox exec vitest run --project=storybook <file>`.

### Phase 0 — shared model (prereq for A/B)

- [x] **Extract `TopicProps`** — done in `pipeline-email/src/types/Topic.ts`; `Topic` extends it.
      `deriveThreadId`/`normalizeSubject` now exported from the package index too. Tests green.
- [x] **Add `Mailbox.topicSuggestions`** — `Schema.optional(Schema.Array(TopicProps))` added; builds green.

### Phase A — `TopicArticle` master/detail

- [x] **`resolveTopicThreads` helper (pure, tested)** — `TopicArticle/resolve-threads.ts`: groups
      messages by `deriveThreadId`, returns only the topic's referenced threads in order, omits threads
      with no messages. 2 unit tests green. (Wired into the live feed = the follow-up below.)
- [x] **`TopicArticle` container** — `TopicArticle/TopicArticle.tsx`: renders the topic's stored fields
      (summary, keyword chips via `Row.Tags`, participants, questions/tasks/thread-subject list
      sections). Self-contained (no cross-object resolution in v1).
- [x] **react-surface + master→detail wiring** — added `AppSurface.object(Article, Topic)` → `TopicArticle`;
      `TopicsArticle` card current-change calls `useShowItem` with `linkedSegment('topic')` (companion in
      simple mode; deck-peer path is a follow-up).
- [x] **Storybook play test** — `Topics.stories.tsx` `Detail` + `DetailTest`: renders `TopicArticle` for a
      seeded topic and asserts summary, keyword chip, participants, question, task. 4/4 storybook tests green.
- [x] **Commit** `feat(inbox): TopicArticle master/detail`.
- [ ] **FOLLOW-UP (A)**: wire `resolveTopicThreads` to live feed messages + click a thread → open it in
      the mailbox; add a deck-peer topic path so multi-mode opens a plank. Needs the running deck to verify.

### Phase B — topic suggestions

- [x] **Suggestion classify/order (pure, tested)** — `analyze/suggestions.ts` `orderSuggestions`:
      drops bulk-majority clusters (`isBulkCluster`), flags person-linked (`isPersonLinked`), sorts
      person-first (stable), dedups by label vs existing. 3 unit tests.
- [x] **`AnalyzeTopics` writes suggestions** — pipeline now returns `topicDrafts` (not materialized);
      the operation computes bulk-thread ids from this run's tags + person emails, calls `orderSuggestions`,
      appends to `mailbox.topicSuggestions` (deduped vs existing Topics + suggestions). `keepTopic` hard
      gate dropped. Output schema `{ tagged, suggestions }`. Builds green.
- [x] **`TopicsArticle` "Suggested" section** — `SuggestionCard` (Accept/Dismiss menu) above the topics;
      Accept → `Obj.make(Topic, …)` + `AnchoredTo` + splice; Dismiss → splice. New translations
      `topics.suggested.title` / `accept` / `dismiss`.
- [x] **Storybook play test** — `Topics.stories.tsx` `SuggestionsTest`: Accept one (→ Topic, suggestion
      gone), Dismiss the other (section gone). 5/5 storybook tests green.
- [x] **Commit** `feat(inbox): opt-in topic suggestions`.

### Phase C — Create Topic from message

- [x] **`enableCreateTopic` gate + menu item** — `MessageStack.tsx`: prop + "Create Topic" tile menu
      item (`ph--stack`) emitting `create-topic`; `MailboxArticle` sets the prop and handles it
      (invokes the op with `{ spaceId }`, then opens the topic via `useShowItem`).
- [x] **`CreateTopicFromMessage` operation** — `analyze/create-topic-from-message.ts`: gathers the
      message's thread (siblings by `deriveThreadId`), `clusterThreads` → one draft, LLM `summary`
      (`resolveModel('summarize-topic')`), persists `Topic` + `AnchoredTo`, returns `{ topicId }`.
      Registered in the handler set; output schema `{ topicId }`. FACT EXTRACTION deferred (follow-up).
- [x] **Storybook play test** — `CreateTopic.stories.tsx` (mock `AiService`): click "Create Topic" →
      operation runs → a Topic card appears. Caught + fixed a missing `{ spaceId }` on the invoke.
- [x] **Commit** `feat(inbox): create topic from message`.
- [ ] **FOLLOW-UP (C)**: run fact extraction on the thread's messages inside the operation (reuse the
      fact stage) once the product fact pipeline is wired.

### Follow-ups (landed)

- [x] **Questions + tasks per topic** — `Topic` gains `questions` / `tasks`; `clusterThreads` rolls
      them up (deduped) from each member thread's `openQuestions` / `actionItems`; `TopicsArticle` shows
      the counts. (Threads carry the fields but aren't populated until thread-level extraction runs, so
      topics inherit whatever the threads have.)
- [x] **Mailbox sync filters** — `Mailbox.syncFilters.skipSenders` (email/domain substrings) + a
      `shouldSkipSender` helper; the Gmail sync `map-to-message` stage drops matching senders before the
      attachment fetch (never committed to the feed). Unit-tested. FOLLOW-UP: a settings/toolbar UI to
      edit the skip list (currently set programmatically on the Mailbox).

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

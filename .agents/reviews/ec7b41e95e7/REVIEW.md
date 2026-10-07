---
branch: claude/resume-plugin-projects-7558db
commit: ec7b41e95e75ceca94f96583f3920269a933875a
base: 7654298d4575594a6abf017ccbbd6e98cc7ce647
mode: fast
createdAt: 2026-10-07T08:23:49.605Z
isFinalized: true
groups: 357
rules: [bounded-live-state, consistent-file-naming-within-folder, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, no-casts, private-new-packages, structured-logging-not-console, test-real-scenario-not-narrower-proxy]
reviewId: ec7b41e95e7
---

_6 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ec7b41e95e7-1 - ignored - private-new-packages - packages/common/datalog/package.json:1
- ec7b41e95e7-2 - ignored - private-new-packages - packages/core/compute/brain/package.json:1
- ec7b41e95e7-3 - resolved - bounded-live-state - packages/core/compute/brain/src/GoalRules.ts:117
- ec7b41e95e7-4 - ignored - structured-logging-not-console - packages/core/compute/crawler/src/Demo.test.ts:56
- ec7b41e95e7-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/stages/topics.ts:44
- ec7b41e95e7-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57
- ec7b41e95e7-7 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/pipeline.test.ts:267
- ec7b41e95e7-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:170
- ec7b41e95e7-9 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:138
- ec7b41e95e7-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:572
- ec7b41e95e7-11 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- ec7b41e95e7-12 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- ec7b41e95e7-13 - ignored - errors-extend-base-error - packages/plugins/plugin-brain/src/operations/generate-reply.ts:13
- ec7b41e95e7-14 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/operations/generate-reply.ts:83
- ec7b41e95e7-15 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54

## Issues

# ERROR ec7b41e95e7-1 private-new-packages `packages/common/datalog/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.96. The likeliest place is lines 1-12 (`{`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ec7b41e95e7-2 private-new-packages `packages/core/compute/brain/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.95. The likeliest place is lines 1-12 (`{`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ec7b41e95e7-3 bounded-live-state `packages/core/compute/brain/src/GoalRules.ts:117`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.83. The likeliest place is lines 117-128 (`const insert: Engine.Entry[] = [];`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-4 structured-logging-not-console `packages/core/compute/crawler/src/Demo.test.ts:56`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 56-67 (`console.log(heading('Crawl'));`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/stages/topics.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 44-55 (`export const extractTopics = (options?: TopicOptions): Effect.Effect<TopicRep...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 57-68 (`export const answerOpenQuestions = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-7 flat-layer-composition `packages/core/compute/pipeline-rdf/src/pipeline.test.ts:267`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 267-278 (`const ai = countingAiService({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-8 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:170`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 170-181 (`{ timeout, interval: 2_000 },`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-9 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:138`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 138-143 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:572`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 572-595 (`const recordedQuotes = (chat: Chat.Chat) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-11 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ec7b41e95e7-12 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ec7b41e95e7-13 errors-extend-base-error `packages/plugins/plugin-brain/src/operations/generate-reply.ts:13`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.87. The likeliest place is lines 13-22 (`import { FactStore, type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ec7b41e95e7-14 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/operations/generate-reply.ts:83`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 83-94 (`export const generateReply = (options: {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ec7b41e95e7-15 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7654298d4575594a6abf017ccbbd6e98cc7ce647`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 15 violations written to fragments, 452 uncertain, 3524 clean, 0 unanswered
- left for an agentic reviewer: 73 batch(es)

```text
requests: 1631 (316 verdicts re-asked with context the model requested)
estimated input tokens: 9533269
billed input tokens: 8885834 (cost $0.3732)
measured chars per token: 3.22
```

### Dismissals

- ec7b41e95e7-1 — user decision: `@dxos/datalog` is intentionally public.
- ec7b41e95e7-2 — user decision: `@dxos/brain` is intentionally public.
- ec7b41e95e7-4 — pre-existing on main (`console.log` demo output); this PR only switched the object-term check to `kind === 'entity'`.
- ec7b41e95e7-5 — pre-existing on main (`extractTopics` hand-wrapped gen); this PR only switched `entityId` to the `kind` tag and reused `RDF.termValue`.
- ec7b41e95e7-6 — pre-existing on main (`answerOpenQuestions` hand-wrapped gen); this PR only replaced the local `termValue` with `RDF.termValue`.
- ec7b41e95e7-7 — pre-existing on main (the `countingAiService` layer setup); this PR only switched assertions and `testFact` to the `kind`-tagged `Term`.
- ec7b41e95e7-8 — pre-existing on main (`replies` helper wrapping `Effect.gen`); this PR only added the `ExtractionPass` schema and typed facts as `RDF.Fact`.
- ec7b41e95e7-9 — pre-existing on main (the scripted AI service in `TestLayer`); this PR only registered the `FactEntry.ExtractionPass` schema, no narrowing introduced.
- ec7b41e95e7-10 — pre-existing on main (`recordedQuotes` hand-wrapped gen); this PR only changed its return to read the per-fact `FactEntry.fact`.
- ec7b41e95e7-11 — pre-existing on main (story file naming in `FactsCompanion/`); this PR only added the `kind` tag to the story's fact terms.
- ec7b41e95e7-12 — pre-existing on main (`as any` LanguageModel stub); this PR only added the `kind` tag to `ALICE_FACT` terms.
- ec7b41e95e7-13 — pre-existing on main (`GenerateReplyError` via `Data.TaggedClass`); this PR only switched `factLine` to the `kind` tag.
- ec7b41e95e7-14 — pre-existing on main (`generateReply` hand-wrapped gen); this PR only switched `factLine` to the `kind` tag.
- ec7b41e95e7-15 — pre-existing on main (`as any` LanguageModel stub in `textAiService`); this PR only added the `kind` tag to `makeFact` terms.

### Resolutions

- ec7b41e95e7-3 (resolved) — `GoalRules` kept every fact for the goal's life. It now holds a bounded working memory: each `update` retires facts past `assertion.validTo`, then the oldest (by `generatedAtTime`, then arrival) beyond `MAX_FACTS` (named, documented, overridable via `maxFacts`), retracting them from the engine and the text/entity indexes without waking and never retiring the facts behind `achieved`. Sub-goals stay hard-capped by `MAX_SUBGOALS` with a typed `CapacityError` (`BaseError.extend`). Covered by `GoalRules.test.ts` (`working memory`).

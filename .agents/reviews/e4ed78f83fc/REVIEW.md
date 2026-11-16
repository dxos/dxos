---
branch: dm/discord-extraction
commit: e4ed78f83fcc3f80f78a28a7b5d51a4e8050fe10
base: 2fb32b94c1b318fe288bdb3f7844630b74c0ab51
mode: fast
createdAt: 2026-11-16T19:52:47.919Z
isFinalized: true
groups: 560
rules: [bounded-live-state, comment-hygiene, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, minimal-precise-tests, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, no-unused-new-api, one-test-suite-per-module, operations-resolve-database-from-service, per-test-mutable-fixtures, ref-collections-via-query, retries-via-schedule-with-evidence, story-for-new-ui-component, structured-logging-not-console, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: e4ed78f83fc
---

_8 error(s), 79 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e4ed78f83fc-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/AiUsage.ts:87
- e4ed78f83fc-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/ai/src/index.ts:1
- e4ed78f83fc-3 - ignored - namespace-export-with-internal-hiding - packages/core/compute/ai/src/index.ts:13
- e4ed78f83fc-4 - ignored - retries-via-schedule-with-evidence - packages/core/compute/assistant-evals/src/claude-harness.ts:261
- e4ed78f83fc-5 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/claude-harness.ts:440
- e4ed78f83fc-6 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- e4ed78f83fc-7 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/runner.ts:576
- e4ed78f83fc-8 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-evals/src/Usage.ts:1
- e4ed78f83fc-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:31
- e4ed78f83fc-10 - ignored - operations-resolve-database-from-service - packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:56
- e4ed78f83fc-11 - ignored - flat-layer-composition - packages/core/compute/compute/src/AiMetering.test.ts:41
- e4ed78f83fc-12 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute/src/AiMetering.ts:13
- e4ed78f83fc-13 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute/src/index.ts:1
- e4ed78f83fc-14 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute/src/index.ts:13
- e4ed78f83fc-15 - ignored - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:53
- e4ed78f83fc-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Trace.ts:53
- e4ed78f83fc-17 - ignored - comment-hygiene - packages/core/compute/crawler/src/testing/index.ts:271
- e4ed78f83fc-18 - ignored - no-casts - packages/core/compute/crawler/src/testing/index.ts:283
- e4ed78f83fc-19 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/pipeline.ts:34
- e4ed78f83fc-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57
- e4ed78f83fc-21 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/stages/topics.ts:26
- e4ed78f83fc-22 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/topics.ts:88
- e4ed78f83fc-23 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/pipeline-rdf/src/stages/closed-ontology.test.ts:25
- e4ed78f83fc-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:113
- e4ed78f83fc-25 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35
- e4ed78f83fc-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61
- e4ed78f83fc-27 - ignored - no-casts - packages/core/compute/pipeline-rdf/src/testing/index.ts:65
- e4ed78f83fc-28 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/testing/system-one.live.test.ts:43
- e4ed78f83fc-29 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:68
- e4ed78f83fc-30 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/brain.test.ts:96
- e4ed78f83fc-31 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:209
- e4ed78f83fc-32 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:69
- e4ed78f83fc-33 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:164
- e4ed78f83fc-34 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:302
- e4ed78f83fc-35 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:57
- e4ed78f83fc-36 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-brain/src/types/BrainOperation.ts:41
- e4ed78f83fc-37 - ignored - no-unused-new-api - packages/plugins/plugin-discord/src/testing/channel-scan.ts:37
- e4ed78f83fc-38 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:144
- e4ed78f83fc-39 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-export.test.ts:87
- e4ed78f83fc-40 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-discord/src/testing/discord-export.ts:132
- e4ed78f83fc-41 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/discord-export.ts:132
- e4ed78f83fc-42 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/discord-export.ts:580
- e4ed78f83fc-43 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/facts-cli.ts:98
- e4ed78f83fc-44 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/facts-cli.ts:147
- e4ed78f83fc-45 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:44
- e4ed78f83fc-46 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:59
- e4ed78f83fc-47 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/build.ts:146
- e4ed78f83fc-48 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/classify.ts:155
- e4ed78f83fc-49 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/insights/faq.ts:70
- e4ed78f83fc-50 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/testing/insights/faq.ts:94
- e4ed78f83fc-51 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/faq.ts:107
- e4ed78f83fc-52 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-discord/src/testing/insights/faq.ts:119
- e4ed78f83fc-53 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/insights/profiles.ts:108
- e4ed78f83fc-54 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/profiles.ts:145
- e4ed78f83fc-55 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-discord/src/testing/insights/profiles.ts:157
- e4ed78f83fc-56 - ignored - bounded-live-state - packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101
- e4ed78f83fc-57 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101
- e4ed78f83fc-58 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-discord/src/testing/metering.ts:53
- e4ed78f83fc-59 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/reextract.test.ts:71
- e4ed78f83fc-60 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-finance/src/index.ts:1
- e4ed78f83fc-61 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-finance/src/index.ts:1
- e4ed78f83fc-62 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/pipeline/annotate.ts:90
- e4ed78f83fc-63 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/pipeline/pipeline.ts:110
- e4ed78f83fc-64 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-finance/src/pipeline/pipeline.ts:148
- e4ed78f83fc-65 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/sources/edgar.ts:241
- e4ed78f83fc-66 - ignored - error-messages-carry-context - packages/plugins/plugin-finance/src/sources/house.ts:20
- e4ed78f83fc-67 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/sources/ingest.ts:52
- e4ed78f83fc-68 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-finance/src/sources/text-item.ts:80
- e4ed78f83fc-69 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/store/finance-space.ts:62
- e4ed78f83fc-70 - ignored - test-asserts-real-behavior - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177
- e4ed78f83fc-71 - ignored - minimal-precise-tests - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177
- e4ed78f83fc-72 - ignored - structured-logging-not-console - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:249
- e4ed78f83fc-73 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-finance/src/testing/metering.ts:53
- e4ed78f83fc-74 - ignored - structured-logging-not-console - packages/plugins/plugin-finance/src/testing/report.ts:16
- e4ed78f83fc-75 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/testing/report.ts:132
- e4ed78f83fc-76 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-magazine/src/FeedParser.ts:1
- e4ed78f83fc-77 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-magazine/src/index.ts:1
- e4ed78f83fc-78 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-magazine/src/index.ts:1
- e4ed78f83fc-79 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:70
- e4ed78f83fc-80 - ignored - error-messages-carry-context - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:92
- e4ed78f83fc-81 - ignored - no-casts - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:104
- e4ed78f83fc-82 - ignored - ref-collections-via-query - packages/plugins/plugin-sheet/src/operations/add-chart.test.ts:40
- e4ed78f83fc-83 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/testing/playground.ts:133
- e4ed78f83fc-84 - ignored - bounded-live-state - packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:57
- e4ed78f83fc-85 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:101
- e4ed78f83fc-86 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/TypeFilter/TypeFilter.tsx:36
- e4ed78f83fc-87 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/VirtualList/VirtualList.tsx:37

## Issues

# WARN e4ed78f83fc-1 no-try-catch-in-effect-code `packages/core/compute/ai/src/AiUsage.ts:87`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 87-97 (`const json = (value: unknown): unknown => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-2 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.89. The likeliest place is lines 1-12 (`export * as AiModelResolver from './AiModelResolver.ts';`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-3 namespace-export-with-internal-hiding `packages/core/compute/ai/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.86. The likeliest place is lines 13-23 (`export * as Model from './Model.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-4 retries-via-schedule-with-evidence `packages/core/compute/assistant-evals/src/claude-harness.ts:261`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 261-272 (`if (!unbound || Date.now() > deadline) {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-5 flat-layer-composition `packages/core/compute/assistant-evals/src/claude-harness.ts:440`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 440-451 (`const aiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiS...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-6 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-7 flat-layer-composition `packages/core/compute/assistant-evals/src/runner.ts:576`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 576-587 (`)`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-8 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-evals/src/Usage.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-11 (`import { reportTrace, shouldReportTrace } from 'evalite/traces';`, location confidence 0.57). Judged with added `public-api` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-9 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 31-42 (`export const extractProperNouns = (text: string) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-10 operations-resolve-database-from-service `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:56`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.96. The likeliest place is lines 56-67 (`export const enrichTranscriptMessage = (message: Message.Message, { db }: { d...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-11 flat-layer-composition `packages/core/compute/compute/src/AiMetering.test.ts:41`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 41-50 (`const setup = () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-12 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/AiMetering.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 13-19 (`import * as Trace from './Trace.ts';`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-13 namespace-export-with-internal-hiding `packages/core/compute/compute/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-12 (`export * from './trajectory/index.ts';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-14 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 13-27 (`export * as FunctionsAiError from './FunctionsAiError.ts';`, location confidence 0.78). Judged with added `importers` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-15 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-17 comment-hygiene `packages/core/compute/crawler/src/testing/index.ts:271`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.89. The likeliest place is lines 271-282 (`export const deterministicAiService = (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-18 no-casts `packages/core/compute/crawler/src/testing/index.ts:283`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 283-294 (`generateObject: (request: { prompt: unknown }) =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-19 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/pipeline.ts:34`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.90. The likeliest place is lines 34-45 (`export type RunOptions = {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-20 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 57-68 (`export const answerOpenQuestions = (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-21 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/stages/topics.ts:26`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.90. The likeliest place is lines 26-33 (`export type TopicsOptions = {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-22 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/topics.ts:88`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 88-99 (`const persistTopic = (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-23 test-real-scenario-not-narrower-proxy `packages/core/compute/pipeline-rdf/src/stages/closed-ontology.test.ts:25`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 25-36 (`describe('closed ontology', () => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-24 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:113`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 113-128 (`const factContext = (options: ExtractOptions | undefined) =>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-25 bounded-live-state `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 35-44 (`const ontology = (options?.ontology ?? Vocabularies.DEFAULT).include(yield* s...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 61-72 (`export const indexFactsBatch = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-27 no-casts `packages/core/compute/pipeline-rdf/src/testing/index.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 65-76 (`generateText: () => Effect.succeed({ text: '', content: [] }),`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-28 flat-layer-composition `packages/core/compute/pipeline-rdf/src/testing/system-one.live.test.ts:43`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 43-54 (`const layer = () =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-29 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:68`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 68-71 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-30 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/brain.test.ts:96`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.80. The likeliest place is lines 96-105 (`return { parts: [watchWork(refs, 'alice', 'Bob')] };`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-31 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:209`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.89. The likeliest place is lines 209-224 (`outcome,`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-32 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:69`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 69-83 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-33 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:164`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.84. The likeliest place is lines 164-187 (`describe('TriggerRegistry', () => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-34 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:302`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 302-325 (`const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-35 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 57-70 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-36 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-brain/src/types/BrainOperation.ts:41`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.90. The likeliest place is lines 41-52 (`pageSize: Schema.optional(`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-37 no-unused-new-api `packages/plugins/plugin-discord/src/testing/channel-scan.ts:37`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.86. The likeliest place is lines 37-48 (`export const classify = (channel: ScannedChannel, latest: readonly ScannedMes...`, location confidence 0.90). Judged with added `diff, importers, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-38 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:144`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 144-155 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-39 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-export.test.ts:87`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 87-98 (`console.log(`ontology: ${process.env.DISCORD_VOCABULARIES ?? 'all vocabularie...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-40 retries-via-schedule-with-evidence `packages/plugins/plugin-discord/src/testing/discord-export.ts:132`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.81. The likeliest place is lines 132-143 (`const makeClient = (authorization: string) => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-41 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/discord-export.ts:132`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 132-143 (`const makeClient = (authorization: string) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-42 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/discord-export.ts:580`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 580-591 (`console.log(` ↳ ${thread.name} (${thread.id})`);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-43 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/facts-cli.ts:98`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 98-102 (`console.log(line(row));`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-44 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/facts-cli.ts:147`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 147-158 (`const runSparql = (path: string) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-45 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:44`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 44-49 (`const announcements = db`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-46 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:59`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 59-70 (`const program = Effect.gen(function* () {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-47 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/build.ts:146`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 146-157 (`roles.some((role) => FORMER_ROLES.has(role)) ? 1 : 0,`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-48 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/classify.ts:155`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 155-166 (`),`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-49 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/insights/faq.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 70-81 (`const groupProduct = (product: string, group: readonly Item[]) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-50 flat-layer-composition `packages/plugins/plugin-discord/src/testing/insights/faq.ts:94`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 94-106 (`Effect.provide(AiService.languageModel(DEFAULT_MODEL, { thinking: true })),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-51 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/faq.ts:107`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 107-118 (`const program = Effect.forEach(products, ([product, group]) => groupProduct(p...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-52 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-discord/src/testing/insights/faq.ts:119`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 119-131 (`}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-53 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/insights/profiles.ts:108`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 108-119 (`const profile = (person: Person) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-54 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/profiles.ts:145`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 145-156 (`const program = Effect.forEach(people, profile, { concurrency: 4, discard: tr...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-55 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-discord/src/testing/insights/profiles.ts:157`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 157-166 (`Effect.provide(metering.layer),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-56 bounded-live-state `packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.85. The likeliest place is lines 101-111 (`productsOf(feed.source, title) ?? null,`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-57 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 101-111 (`productsOf(feed.source, title) ?? null,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-58 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-discord/src/testing/metering.ts:53`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.81. The likeliest place is lines 53-64 (`export const costReport = (events: Iterable<Trace.Event>, messages: number): ...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-59 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/reextract.test.ts:71`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 71-82 (`const questions = result.facts.filter((fact) => fact.extractor.id === 'extrac...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-60 namespace-export-with-internal-hiding `packages/plugins/plugin-finance/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.92. The likeliest place is lines 1-7 (`export * as FinancePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-61 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-finance/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-7 (`export * as FinancePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-62 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/pipeline/annotate.ts:90`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 90-101 (`export const linkTickers = (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-63 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/pipeline/pipeline.ts:110`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 110-121 (`export const extractFacts = (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-64 namespace-brand-key-prefixing `packages/plugins/plugin-finance/src/pipeline/pipeline.ts:148`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 148-158 (`const extractorFor = (stage: string, model: string): Extractor => ({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-65 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/sources/edgar.ts:241`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 241-252 (`export const insiderTrades = (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-66 error-messages-carry-context `packages/plugins/plugin-finance/src/sources/house.ts:20`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 20-31 (`export const unzip = (archive: Uint8Array): Map<string, Uint8Array> => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-67 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/sources/ingest.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 52-63 (`export const ingest = (options: IngestOptions = {}): Effect.Effect<SourceResu...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-68 no-try-catch-in-effect-code `packages/plugins/plugin-finance/src/sources/text-item.ts:80`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 80-91 (`export const hostOf = (link: string): string | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-69 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/store/finance-space.ts:62`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 62-79 (`export const feedFor = (source: string): Effect.Effect<Feed.Feed, never, Data...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-70 test-asserts-real-behavior `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 177-188 (`log(...costReport(events, 0));`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-71 minimal-precise-tests `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.80. The likeliest place is lines 177-188 (`log(...costReport(events, 0));`, location confidence 0.35). Judged with added `diff, pr` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-72 structured-logging-not-console `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:249`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 249-260 (`);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-73 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-finance/src/testing/metering.ts:53`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.87. The likeliest place is lines 53-64 (`export const costReport = (events: Iterable<Trace.Event>, items: number): str...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-74 structured-logging-not-console `packages/plugins/plugin-finance/src/testing/report.ts:16`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 16-26 (`export const runLog = (path: string) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-75 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/testing/report.ts:132`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 132-143 (`export const crossSourceReport = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-76 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/FeedParser.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.88. The likeliest place is lines 1-9 (`export { fetchRss, parseFeed } from './operations/sources/rss.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-77 namespace-export-with-internal-hiding `packages/plugins/plugin-magazine/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as MagazinePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-78 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-8 (`export * as MagazinePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-79 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-79 (`export const fetchRss: FeedFetcher = (url, options) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-80 error-messages-carry-context `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:92`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 92-103 (`const channel = parsed.rss?.channel ?? parsed.feed;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-81 no-casts `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 104-115 (`const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-82 ref-collections-via-query `packages/plugins/plugin-sheet/src/operations/add-chart.test.ts:40`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.81. The likeliest place is lines 40-51 (`expect(sheet.charts).toHaveLength(1);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-83 error-messages-carry-context `packages/stories/stories-assistant/src/testing/playground.ts:133`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 133-144 (`const invoke = async <I, O>(`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e4ed78f83fc-84 bounded-live-state `packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:57`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 57-68 (`const listener = (read: readonly RDF.Fact[]) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-85 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:101`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 101-112 (`const rows = useMemo<Row[]>(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-86 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/TypeFilter/TypeFilter.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 36-47 (`export const TypeFilter = ({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4ed78f83fc-87 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/VirtualList/VirtualList.tsx:37`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 37-48 (`export const VirtualList = Util.composable<HTMLDivElement, VirtualListProps>(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2fb32b94c1b318fe288bdb3f7844630b74c0ab51`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 87 violations written to fragments, 798 uncertain, 4913 clean, 0 unanswered
- left for an agentic reviewer: 132 batch(es)

```text
requests: 2317 (496 verdicts re-asked with context the model requested)
estimated input tokens: 16029680
billed input tokens: 15105066 (cost $0.6344)
measured chars per token: 3.18
```

### Triage notes

- Resolved: e4ed78f83fc-44, -49, -53 and -63 now define their Effect functions with `Effect.fn`.
- Ignored, console output: -43, -46, -47, -48, -51, -54 and -57 are command-line scripts whose console output is their interface.
- Ignored, platform boundary: -45, -52 and -55 run their program with `EffectEx.runPromise` once, at the top of a script; -50 provides each call's model where the call is made.
- Ignored, bounded by the input: -56 and -84 hold rows read from a finite fact store or table, and the story or script exits with them.
- Ignored, intended reads: -82 tests the handler's direct effect on `sheet.charts`; -71 logs the cost report the test exists to print.
- Ignored, false positives: -12 imports a namespace module as a namespace, as the rule asks; -83 is a one-line change on this branch to code it did not author.

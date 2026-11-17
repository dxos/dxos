---
branch: dm/discord-extraction
commit: 8c81e18a3a9a971c6fa452004a24224425f669a7
base: 2fb32b94c1b318fe288bdb3f7844630b74c0ab51
mode: fast
createdAt: 2026-11-16T21:02:48.950Z
isFinalized: true
groups: 560
rules: [bounded-live-state, comment-hygiene, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, no-unused-new-api, one-test-suite-per-module, operations-resolve-database-from-service, per-test-mutable-fixtures, ref-collections-via-query, retries-via-schedule-with-evidence, story-for-new-ui-component, structured-logging-not-console, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, vendor-code-in-vendor-extension, workaround-is-documented-and-removable]
reviewId: 8c81e18a3a9
---

_8 error(s), 82 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8c81e18a3a9-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/AiUsage.ts:87
- 8c81e18a3a9-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/ai/src/index.ts:1
- 8c81e18a3a9-3 - ignored - namespace-export-with-internal-hiding - packages/core/compute/ai/src/index.ts:13
- 8c81e18a3a9-4 - ignored - retries-via-schedule-with-evidence - packages/core/compute/assistant-evals/src/claude-harness.ts:249
- 8c81e18a3a9-5 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/claude-harness.ts:440
- 8c81e18a3a9-6 - ignored - vendor-code-in-vendor-extension - packages/core/compute/assistant-evals/src/Observe.ts:82
- 8c81e18a3a9-7 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- 8c81e18a3a9-8 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/runner.ts:576
- 8c81e18a3a9-9 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-evals/src/Usage.ts:1
- 8c81e18a3a9-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:31
- 8c81e18a3a9-11 - ignored - operations-resolve-database-from-service - packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:56
- 8c81e18a3a9-12 - ignored - flat-layer-composition - packages/core/compute/compute/src/AiMetering.test.ts:41
- 8c81e18a3a9-13 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute/src/index.ts:1
- 8c81e18a3a9-14 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute/src/index.ts:13
- 8c81e18a3a9-15 - ignored - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:53
- 8c81e18a3a9-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Trace.ts:53
- 8c81e18a3a9-17 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute/src/Trace.ts:438
- 8c81e18a3a9-18 - ignored - comment-hygiene - packages/core/compute/crawler/src/testing/index.ts:271
- 8c81e18a3a9-19 - ignored - no-casts - packages/core/compute/crawler/src/testing/index.ts:283
- 8c81e18a3a9-20 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/pipeline.ts:34
- 8c81e18a3a9-21 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57
- 8c81e18a3a9-22 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/stages/topics.ts:26
- 8c81e18a3a9-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/topics.ts:88
- 8c81e18a3a9-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:113
- 8c81e18a3a9-25 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35
- 8c81e18a3a9-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61
- 8c81e18a3a9-27 - ignored - no-casts - packages/core/compute/pipeline-rdf/src/testing/index.ts:65
- 8c81e18a3a9-28 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/testing/system-one.live.test.ts:43
- 8c81e18a3a9-29 - ignored - namespace-brand-key-prefixing - packages/core/compute/pipeline/src/Stage.test.ts:15
- 8c81e18a3a9-30 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:68
- 8c81e18a3a9-31 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/brain.test.ts:96
- 8c81e18a3a9-32 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:140
- 8c81e18a3a9-33 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:161
- 8c81e18a3a9-34 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:69
- 8c81e18a3a9-35 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:164
- 8c81e18a3a9-36 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:254
- 8c81e18a3a9-37 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:302
- 8c81e18a3a9-38 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- 8c81e18a3a9-39 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-brain/src/index.ts:1
- 8c81e18a3a9-40 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:57
- 8c81e18a3a9-41 - ignored - flat-layer-composition - packages/plugins/plugin-brain/src/operations/operations.test.ts:57
- 8c81e18a3a9-42 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-brain/src/types/BrainOperation.ts:41
- 8c81e18a3a9-43 - ignored - no-unused-new-api - packages/plugins/plugin-discord/src/testing/channel-scan.ts:37
- 8c81e18a3a9-44 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:144
- 8c81e18a3a9-45 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-export.test.ts:87
- 8c81e18a3a9-46 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-discord/src/testing/discord-export.ts:132
- 8c81e18a3a9-47 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/discord-export.ts:132
- 8c81e18a3a9-48 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/discord-export.ts:580
- 8c81e18a3a9-49 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/facts-cli.ts:98
- 8c81e18a3a9-50 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:44
- 8c81e18a3a9-51 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:59
- 8c81e18a3a9-52 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/build.ts:146
- 8c81e18a3a9-53 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/classify.ts:155
- 8c81e18a3a9-54 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/faq.ts:110
- 8c81e18a3a9-55 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-discord/src/testing/insights/faq.ts:122
- 8c81e18a3a9-56 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/profiles.ts:148
- 8c81e18a3a9-57 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-discord/src/testing/insights/profiles.ts:160
- 8c81e18a3a9-58 - ignored - bounded-live-state - packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101
- 8c81e18a3a9-59 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101
- 8c81e18a3a9-60 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-discord/src/testing/metering.ts:53
- 8c81e18a3a9-61 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/reextract.test.ts:83
- 8c81e18a3a9-62 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-finance/src/index.ts:1
- 8c81e18a3a9-63 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-finance/src/index.ts:1
- 8c81e18a3a9-64 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/pipeline/annotate.ts:90
- 8c81e18a3a9-65 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-finance/src/pipeline/pipeline.ts:147
- 8c81e18a3a9-66 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/pipeline/pipeline.ts:158
- 8c81e18a3a9-67 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/sources/edgar.ts:241
- 8c81e18a3a9-68 - ignored - error-messages-carry-context - packages/plugins/plugin-finance/src/sources/house.ts:20
- 8c81e18a3a9-69 - ignored - workaround-is-documented-and-removable - packages/plugins/plugin-finance/src/sources/http.ts:18
- 8c81e18a3a9-70 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/sources/ingest.ts:52
- 8c81e18a3a9-71 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-finance/src/sources/text-item.ts:80
- 8c81e18a3a9-72 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/store/finance-space.ts:62
- 8c81e18a3a9-73 - ignored - test-asserts-real-behavior - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177
- 8c81e18a3a9-74 - ignored - structured-logging-not-console - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:249
- 8c81e18a3a9-75 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-finance/src/testing/metering.ts:53
- 8c81e18a3a9-76 - ignored - structured-logging-not-console - packages/plugins/plugin-finance/src/testing/report.ts:16
- 8c81e18a3a9-77 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/testing/report.ts:132
- 8c81e18a3a9-78 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-finance/src/types/index.ts:1
- 8c81e18a3a9-79 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-magazine/src/FeedParser.ts:1
- 8c81e18a3a9-80 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-magazine/src/index.ts:1
- 8c81e18a3a9-81 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-magazine/src/index.ts:1
- 8c81e18a3a9-82 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:70
- 8c81e18a3a9-83 - ignored - error-messages-carry-context - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:92
- 8c81e18a3a9-84 - ignored - no-casts - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:104
- 8c81e18a3a9-85 - ignored - ref-collections-via-query - packages/plugins/plugin-sheet/src/operations/add-chart.test.ts:40
- 8c81e18a3a9-86 - ignored - bounded-live-state - packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:57
- 8c81e18a3a9-87 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:101
- 8c81e18a3a9-88 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:103
- 8c81e18a3a9-89 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/TypeFilter/TypeFilter.tsx:36
- 8c81e18a3a9-90 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/VirtualList/VirtualList.tsx:37

## Issues

# WARN 8c81e18a3a9-1 no-try-catch-in-effect-code `packages/core/compute/ai/src/AiUsage.ts:87`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 87-97 (`const json = (value: unknown): unknown => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-2 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-12 (`export * as AiModelResolver from './AiModelResolver.ts';`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-3 namespace-export-with-internal-hiding `packages/core/compute/ai/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 13-23 (`export * as Model from './Model.ts';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-4 retries-via-schedule-with-evidence `packages/core/compute/assistant-evals/src/claude-harness.ts:249`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 249-260 (`const createEdgeAgent = async (client: Client): Promise<void> => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-5 flat-layer-composition `packages/core/compute/assistant-evals/src/claude-harness.ts:440`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 440-451 (`const aiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiS...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-6 vendor-code-in-vendor-extension `packages/core/compute/assistant-evals/src/Observe.ts:82`

System One judges this a likely violation of `vendor-code-in-vendor-extension` (Vendor-specific mapping lives in the vendor's extension, not a generic package), p=0.80. The likeliest place is lines 82-93 (`distinctId: DISTINCT_ID,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-7 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-8 flat-layer-composition `packages/core/compute/assistant-evals/src/runner.ts:576`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 576-587 (`)`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-9 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-evals/src/Usage.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-11 (`import { reportTrace, shouldReportTrace } from 'evalite/traces';`, location confidence 0.53). Judged with added `public-api` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-10 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 31-42 (`export const extractProperNouns = (text: string) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-11 operations-resolve-database-from-service `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:56`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.96. The likeliest place is lines 56-67 (`export const enrichTranscriptMessage = (message: Message.Message, { db }: { d...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-12 flat-layer-composition `packages/core/compute/compute/src/AiMetering.test.ts:41`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 41-50 (`const setup = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-13 namespace-export-with-internal-hiding `packages/core/compute/compute/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-12 (`export * from './trajectory/index.ts';`, location confidence 0.92). Judged with added `imports, public-api, siblings` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-14 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 13-27 (`export * as FunctionsAiError from './FunctionsAiError.ts';`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-15 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-17 no-try-catch-in-effect-code `packages/core/compute/compute/src/Trace.ts:438`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 438-461 (`export const mergeSinks = (sinks: readonly Sink[]): Sink => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-18 comment-hygiene `packages/core/compute/crawler/src/testing/index.ts:271`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 271-282 (`export const deterministicAiService = (`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-19 no-casts `packages/core/compute/crawler/src/testing/index.ts:283`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 283-294 (`generateObject: (request: { prompt: unknown }) =>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-20 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/pipeline.ts:34`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.87. The likeliest place is lines 34-45 (`export type RunOptions = {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-21 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 57-68 (`export const answerOpenQuestions = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-22 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/stages/topics.ts:26`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.90. The likeliest place is lines 26-33 (`export type TopicsOptions = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-23 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/topics.ts:88`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 88-99 (`const persistTopic = (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-24 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:113`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 113-128 (`const factContext = (options: ExtractOptions | undefined) =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-25 bounded-live-state `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.83. The likeliest place is lines 35-44 (`const ontology = (options?.ontology ?? Vocabularies.DEFAULT).include(yield* s...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 61-72 (`export const indexFactsBatch = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-27 no-casts `packages/core/compute/pipeline-rdf/src/testing/index.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 65-76 (`generateText: () => Effect.succeed({ text: '', content: [] }),`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-28 flat-layer-composition `packages/core/compute/pipeline-rdf/src/testing/system-one.live.test.ts:43`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 43-54 (`const layer = () =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-29 namespace-brand-key-prefixing `packages/core/compute/pipeline/src/Stage.test.ts:15`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 15-26 (`describe('Stage.map', () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-30 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:68`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 68-71 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-31 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/brain.test.ts:96`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.80. The likeliest place is lines 96-105 (`return { parts: [watchWork(refs, 'alice', 'Bob')] };`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-32 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:140`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 140-150 (`],`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-33 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:161`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 161-172 (`const makeScript =`, location confidence 0.42). Judged with added `imports, test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-34 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:69`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 69-83 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-35 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:164`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 164-187 (`describe('TriggerRegistry', () => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-36 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:254`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 254-277 (`const makeScript =`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-37 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:302`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 302-325 (`const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-38 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-10 (`export * as BrainPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-39 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.89. The likeliest place is lines 1-10 (`export * as BrainPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-40 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 57-70 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-41 flat-layer-composition `packages/plugins/plugin-brain/src/operations/operations.test.ts:57`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 57-70 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-42 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-brain/src/types/BrainOperation.ts:41`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.90. The likeliest place is lines 41-52 (`pageSize: Schema.optional(`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-43 no-unused-new-api `packages/plugins/plugin-discord/src/testing/channel-scan.ts:37`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.87. The likeliest place is lines 37-48 (`export const classify = (channel: ScannedChannel, latest: readonly ScannedMes...`, location confidence 0.91). Judged with added `diff, importers, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-44 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:144`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 144-155 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-45 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-export.test.ts:87`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 87-98 (`console.log(`ontology: ${process.env.DISCORD_VOCABULARIES ?? 'all vocabularie...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-46 retries-via-schedule-with-evidence `packages/plugins/plugin-discord/src/testing/discord-export.ts:132`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.84. The likeliest place is lines 132-143 (`const makeClient = (authorization: string) => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-47 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/discord-export.ts:132`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 132-143 (`const makeClient = (authorization: string) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-48 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/discord-export.ts:580`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 580-591 (`console.log(` ↳ ${thread.name} (${thread.id})`);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-49 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/facts-cli.ts:98`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 98-102 (`console.log(line(row));`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-50 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:44`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 44-49 (`const announcements = db`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-51 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/blog-facts.ts:59`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 59-70 (`const program = Effect.gen(function* () {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-52 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/build.ts:146`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 146-157 (`roles.some((role) => FORMER_ROLES.has(role)) ? 1 : 0,`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-53 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/classify.ts:155`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 155-166 (`),`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-54 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/faq.ts:110`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 110-121 (`const program = Effect.forEach(products, ([product, group]) => groupProduct(p...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-55 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-discord/src/testing/insights/faq.ts:122`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 122-134 (`}`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-56 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/profiles.ts:148`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 148-159 (`const program = Effect.forEach(people, profile, { concurrency: 4, discard: tr...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-57 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-discord/src/testing/insights/profiles.ts:160`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 160-169 (`Effect.provide(metering.layer),`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-58 bounded-live-state `packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 101-111 (`productsOf(feed.source, title) ?? null,`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-59 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/insights/timeline.ts:101`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 101-111 (`productsOf(feed.source, title) ?? null,`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-60 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-discord/src/testing/metering.ts:53`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.82. The likeliest place is lines 53-64 (`export const costReport = (events: Iterable<Trace.Event>, messages: number): ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-61 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/reextract.test.ts:83`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 83-96 (`for (const predicate of minted) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-62 namespace-export-with-internal-hiding `packages/plugins/plugin-finance/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.92. The likeliest place is lines 1-7 (`export * as FinancePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-63 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-finance/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-7 (`export * as FinancePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-64 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/pipeline/annotate.ts:90`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 90-101 (`export const linkTickers = (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-65 namespace-brand-key-prefixing `packages/plugins/plugin-finance/src/pipeline/pipeline.ts:147`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 147-157 (`const extractorFor = (stage: string, model: string): Extractor => ({`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-66 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/pipeline/pipeline.ts:158`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 158-169 (`const annotateBatch = (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-67 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/sources/edgar.ts:241`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 241-252 (`export const insiderTrades = (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-68 error-messages-carry-context `packages/plugins/plugin-finance/src/sources/house.ts:20`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.92. The likeliest place is lines 20-31 (`export const unzip = (archive: Uint8Array): Map<string, Uint8Array> => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-69 workaround-is-documented-and-removable `packages/plugins/plugin-finance/src/sources/http.ts:18`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.81. The likeliest place is lines 18-21 (`export const BROWSER_USER_AGENT =`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-70 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/sources/ingest.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 52-63 (`export const ingest = (options: IngestOptions = {}): Effect.Effect<SourceResu...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-71 no-try-catch-in-effect-code `packages/plugins/plugin-finance/src/sources/text-item.ts:80`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 80-91 (`export const hostOf = (link: string): string | undefined => {`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-72 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/store/finance-space.ts:62`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 62-79 (`export const feedFor = (source: string): Effect.Effect<Feed.Feed, never, Data...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-73 test-asserts-real-behavior `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.86. The likeliest place is lines 177-188 (`log(...costReport(events, 0));`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-74 structured-logging-not-console `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:249`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 249-260 (`);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-75 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-finance/src/testing/metering.ts:53`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.86. The likeliest place is lines 53-64 (`export const costReport = (events: Iterable<Trace.Event>, items: number): str...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-76 structured-logging-not-console `packages/plugins/plugin-finance/src/testing/report.ts:16`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 16-26 (`export const runLog = (path: string) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-77 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/testing/report.ts:132`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 132-143 (`export const crossSourceReport = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-78 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-finance/src/types/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Finance from './Finance.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-79 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/FeedParser.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.90. The likeliest place is lines 1-9 (`export { fetchRss, parseFeed } from './operations/sources/rss.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-80 namespace-export-with-internal-hiding `packages/plugins/plugin-magazine/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as MagazinePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-81 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.88. The likeliest place is lines 1-8 (`export * as MagazinePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-82 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 70-79 (`export const fetchRss: FeedFetcher = (url, options) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-83 error-messages-carry-context `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:92`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 92-103 (`const channel = parsed.rss?.channel ?? parsed.feed;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-84 no-casts `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 104-115 (`const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-85 ref-collections-via-query `packages/plugins/plugin-sheet/src/operations/add-chart.test.ts:40`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.82. The likeliest place is lines 40-51 (`expect(sheet.charts).toHaveLength(1);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8c81e18a3a9-86 bounded-live-state `packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:57`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 57-68 (`const listener = (read: readonly RDF.Fact[]) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-87 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:101`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 101-112 (`const rows = useMemo<Row[]>(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-88 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 103-114 (`(predicate == null || fact.assertion.predicate === predicate),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-89 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/TypeFilter/TypeFilter.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 36-47 (`export const TypeFilter = ({`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8c81e18a3a9-90 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/VirtualList/VirtualList.tsx:37`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 37-48 (`export const VirtualList = Util.composable<HTMLDivElement, VirtualListProps>(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2fb32b94c1b318fe288bdb3f7844630b74c0ab51`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 90 violations written to fragments, 823 uncertain, 4925 clean, 0 unanswered
- left for an agentic reviewer: 133 batch(es)

```text
requests: 2352 (506 verdicts re-asked with context the model requested)
estimated input tokens: 16174101
billed input tokens: 15249049 (cost $0.6405)
measured chars per token: 3.18
```

### Triage notes

- Resolved: 8c81e18a3a9-66, `annotateBatch` is defined with `Effect.fn`.
- Ignored, the package's existing barrel shape: -38, -39 and -78 flag `index.ts` barrels whose `export * as` / `export *` lines follow the form the package used before this branch; the new `RemoteFactStorePlugin` subpath is a namespace module, as `dxos-subpath-exports` lint requires.
- Ignored, untouched or one-line changes on this branch: -6, -17, -33, -36 and -41 point at code this branch did not change or changed by one line unrelated to the rule.
- Ignored, judged by reading: -29 names a test's brand key as the rule asks; -69 documents its workaround in the comment above it; -88 keeps only rendering state in the component.

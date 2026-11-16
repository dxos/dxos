---
branch: dm/discord-extraction
commit: fb0f2f595423a42854afdb5d266633be299b7d39
base: 4514d15b93cbe377a2bfb6d78e2c9f8aafd3594c
mode: fast
createdAt: 2026-11-16T14:16:12.174Z
isFinalized: true
groups: 498
rules: [bounded-live-state, comment-hygiene, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-try-catch-in-effect-code, no-unused-new-api, one-test-suite-per-module, operations-resolve-database-from-service, per-test-mutable-fixtures, retries-via-schedule-with-evidence, story-for-new-ui-component, structured-logging-not-console, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: fb0f2f59542
---

_9 error(s), 68 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fb0f2f59542-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/AiUsage.ts:87
- fb0f2f59542-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/ai/src/index.ts:1
- fb0f2f59542-3 - ignored - namespace-export-with-internal-hiding - packages/core/compute/ai/src/index.ts:13
- fb0f2f59542-4 - ignored - retries-via-schedule-with-evidence - packages/core/compute/assistant-evals/src/claude-harness.ts:249
- fb0f2f59542-5 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/claude-harness.ts:440
- fb0f2f59542-6 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- fb0f2f59542-7 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/runner.ts:576
- fb0f2f59542-8 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-evals/src/Usage.ts:1
- fb0f2f59542-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:31
- fb0f2f59542-10 - ignored - operations-resolve-database-from-service - packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:56
- fb0f2f59542-11 - ignored - flat-layer-composition - packages/core/compute/compute/src/AiMetering.test.ts:41
- fb0f2f59542-12 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute/src/index.ts:1
- fb0f2f59542-13 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute/src/index.ts:13
- fb0f2f59542-14 - ignored - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:53
- fb0f2f59542-15 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Trace.ts:53
- fb0f2f59542-16 - ignored - comment-hygiene - packages/core/compute/crawler/src/testing/index.ts:271
- fb0f2f59542-17 - ignored - no-casts - packages/core/compute/crawler/src/testing/index.ts:283
- fb0f2f59542-18 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/pipeline.ts:34
- fb0f2f59542-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57
- fb0f2f59542-20 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/stages/topics.ts:26
- fb0f2f59542-21 - ignored - flat-layer-composition - packages/core/compute/pipeline-discord/src/stages/topics.ts:71
- fb0f2f59542-22 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/topics.ts:88
- fb0f2f59542-23 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/pipeline-rdf/src/stages/closed-ontology.test.ts:25
- fb0f2f59542-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:113
- fb0f2f59542-25 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35
- fb0f2f59542-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61
- fb0f2f59542-27 - ignored - no-casts - packages/core/compute/pipeline-rdf/src/testing/index.ts:65
- fb0f2f59542-28 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/testing/system-one.live.test.ts:43
- fb0f2f59542-29 - ignored - namespace-brand-key-prefixing - packages/core/compute/pipeline/src/Stage.test.ts:15
- fb0f2f59542-30 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:68
- fb0f2f59542-31 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/brain.test.ts:96
- fb0f2f59542-32 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:209
- fb0f2f59542-33 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:69
- fb0f2f59542-34 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:164
- fb0f2f59542-35 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:254
- fb0f2f59542-36 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:302
- fb0f2f59542-37 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:57
- fb0f2f59542-38 - ignored - flat-layer-composition - packages/plugins/plugin-brain/src/operations/operations.test.ts:57
- fb0f2f59542-39 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-brain/src/types/BrainOperation.ts:1
- fb0f2f59542-40 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-brain/src/types/BrainOperation.ts:41
- fb0f2f59542-41 - ignored - no-unused-new-api - packages/plugins/plugin-discord/src/testing/channel-scan.ts:37
- fb0f2f59542-42 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:144
- fb0f2f59542-43 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-export.test.ts:87
- fb0f2f59542-44 - resolved - errors-extend-base-error - packages/plugins/plugin-discord/src/testing/discord-export.ts:92
- fb0f2f59542-45 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-discord/src/testing/discord-export.ts:117
- fb0f2f59542-46 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/testing/discord-export.ts:117
- fb0f2f59542-47 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/discord-export.ts:239
- fb0f2f59542-48 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-discord/src/testing/metering.ts:53
- fb0f2f59542-49 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/reextract.test.ts:71
- fb0f2f59542-50 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-finance/src/index.ts:1
- fb0f2f59542-51 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-finance/src/index.ts:1
- fb0f2f59542-52 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/pipeline/annotate.ts:90
- fb0f2f59542-53 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-finance/src/pipeline/pipeline.ts:148
- fb0f2f59542-54 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/sources/edgar.ts:203
- fb0f2f59542-55 - ignored - error-messages-carry-context - packages/plugins/plugin-finance/src/sources/house.ts:20
- fb0f2f59542-56 - resolved - errors-extend-base-error - packages/plugins/plugin-finance/src/sources/http.ts:14
- fb0f2f59542-57 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/sources/ingest.ts:64
- fb0f2f59542-58 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-finance/src/sources/text-item.ts:80
- fb0f2f59542-59 - resolved - errors-extend-base-error - packages/plugins/plugin-finance/src/store/finance-space.ts:13
- fb0f2f59542-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/store/finance-space.ts:62
- fb0f2f59542-61 - ignored - test-asserts-real-behavior - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177
- fb0f2f59542-62 - ignored - structured-logging-not-console - packages/plugins/plugin-finance/src/testing/finance-run.test.ts:249
- fb0f2f59542-63 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-finance/src/testing/metering.ts:53
- fb0f2f59542-64 - ignored - structured-logging-not-console - packages/plugins/plugin-finance/src/testing/report.ts:16
- fb0f2f59542-65 - ignored - no-unused-new-api - packages/plugins/plugin-finance/src/testing/report.ts:16
- fb0f2f59542-66 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-finance/src/testing/report.ts:132
- fb0f2f59542-67 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-finance/src/types/index.ts:1
- fb0f2f59542-68 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-magazine/src/FeedParser.ts:1
- fb0f2f59542-69 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-magazine/src/index.ts:1
- fb0f2f59542-70 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-magazine/src/index.ts:1
- fb0f2f59542-71 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:70
- fb0f2f59542-72 - ignored - error-messages-carry-context - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:92
- fb0f2f59542-73 - ignored - no-casts - packages/plugins/plugin-magazine/src/operations/sources/rss.ts:104
- fb0f2f59542-74 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:101
- fb0f2f59542-75 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:103
- fb0f2f59542-76 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/TypeFilter/TypeFilter.tsx:36
- fb0f2f59542-77 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/VirtualList/VirtualList.tsx:37

## Issues

# WARN fb0f2f59542-1 no-try-catch-in-effect-code `packages/core/compute/ai/src/AiUsage.ts:87`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 87-97 (`const json = (value: unknown): unknown => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-2 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-12 (`export * as AiModelResolver from './AiModelResolver.ts';`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-3 namespace-export-with-internal-hiding `packages/core/compute/ai/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 13-23 (`export * as Model from './Model.ts';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-4 retries-via-schedule-with-evidence `packages/core/compute/assistant-evals/src/claude-harness.ts:249`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.89. The likeliest place is lines 249-260 (`const createEdgeAgent = async (client: Client): Promise<void> => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-5 flat-layer-composition `packages/core/compute/assistant-evals/src/claude-harness.ts:440`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 440-451 (`const aiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiS...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-6 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-7 flat-layer-composition `packages/core/compute/assistant-evals/src/runner.ts:576`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 576-587 (`)`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-8 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-evals/src/Usage.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-11 (`import { reportTrace, shouldReportTrace } from 'evalite/traces';`, location confidence 0.53). Judged with added `public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-9 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 31-42 (`export const extractProperNouns = (text: string) =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-10 operations-resolve-database-from-service `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts:56`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.95. The likeliest place is lines 56-67 (`export const enrichTranscriptMessage = (message: Message.Message, { db }: { d...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-11 flat-layer-composition `packages/core/compute/compute/src/AiMetering.test.ts:41`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 41-50 (`const setup = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-12 namespace-export-with-internal-hiding `packages/core/compute/compute/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-12 (`export * from './trajectory/index.ts';`, location confidence 0.94). Judged with added `imports, public-api, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-13 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 13-27 (`export * as FunctionsAiError from './FunctionsAiError.ts';`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-14 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-15 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-16 comment-hygiene `packages/core/compute/crawler/src/testing/index.ts:271`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 271-282 (`export const deterministicAiService = (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-17 no-casts `packages/core/compute/crawler/src/testing/index.ts:283`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 283-294 (`generateObject: (request: { prompt: unknown }) =>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-18 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/pipeline.ts:34`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.89. The likeliest place is lines 34-45 (`export type RunOptions = {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-19 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/answer-questions.ts:57`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 57-68 (`export const answerOpenQuestions = (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-20 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/stages/topics.ts:26`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.92. The likeliest place is lines 26-33 (`export type TopicsOptions = {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-21 flat-layer-composition `packages/core/compute/pipeline-discord/src/stages/topics.ts:71`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 71-82 (`export const summarizeSegment = (`, location confidence 0.86). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-22 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/topics.ts:88`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 88-99 (`const persistTopic = (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-23 test-real-scenario-not-narrower-proxy `packages/core/compute/pipeline-rdf/src/stages/closed-ontology.test.ts:25`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.83. The likeliest place is lines 25-36 (`describe('closed ontology', () => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-24 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:113`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 113-128 (`const factContext = (options: ExtractOptions | undefined) =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-25 bounded-live-state `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 35-44 (`const ontology = (options?.ontology ?? Vocabularies.DEFAULT).include(yield* s...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 61-72 (`export const indexFactsBatch = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-27 no-casts `packages/core/compute/pipeline-rdf/src/testing/index.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 65-76 (`generateText: () => Effect.succeed({ text: '', content: [] }),`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-28 flat-layer-composition `packages/core/compute/pipeline-rdf/src/testing/system-one.live.test.ts:43`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 43-54 (`const layer = () =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-29 namespace-brand-key-prefixing `packages/core/compute/pipeline/src/Stage.test.ts:15`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 15-26 (`describe('Stage.map', () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-30 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:68`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 68-71 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-31 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/brain.test.ts:96`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.81. The likeliest place is lines 96-105 (`return { parts: [watchWork(refs, 'alice', 'Bob')] };`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-32 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:209`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.89. The likeliest place is lines 209-224 (`outcome,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-33 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:69`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 69-83 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-34 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:164`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 164-187 (`describe('TriggerRegistry', () => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-35 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:254`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 254-277 (`const makeScript =`, location confidence 0.46). Judged with added `imports, test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-36 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:302`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 302-325 (`const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-37 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 57-70 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-38 flat-layer-composition `packages/plugins/plugin-brain/src/operations/operations.test.ts:57`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 57-70 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.68). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-39 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-brain/src/types/BrainOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-40 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-brain/src/types/BrainOperation.ts:41`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.87. The likeliest place is lines 41-52 (`pageSize: Schema.optional(`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-41 no-unused-new-api `packages/plugins/plugin-discord/src/testing/channel-scan.ts:37`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.83. The likeliest place is lines 37-48 (`export const classify = (channel: ScannedChannel, latest: readonly ScannedMes...`, location confidence 0.91). Judged with added `diff, importers, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-42 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:144`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 144-155 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-43 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-export.test.ts:87`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 87-98 (`console.log(`ontology: ${process.env.DISCORD_VOCABULARIES ?? 'all vocabularie...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-44 errors-extend-base-error `packages/plugins/plugin-discord/src/testing/discord-export.ts:92`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 92-107 (`const CHANNEL_TYPES: Record<number, string> = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-45 retries-via-schedule-with-evidence `packages/plugins/plugin-discord/src/testing/discord-export.ts:117`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.84. The likeliest place is lines 117-128 (`const makeClient = (authorization: string) => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-46 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/testing/discord-export.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 117-128 (`const makeClient = (authorization: string) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-47 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/discord-export.ts:239`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 239-250 (`const printScan = (samples: readonly ChannelSample[]) => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-48 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-discord/src/testing/metering.ts:53`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.81. The likeliest place is lines 53-64 (`export const costReport = (events: Iterable<Trace.Event>, messages: number): ...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-49 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/reextract.test.ts:71`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 71-82 (`const questions = result.facts.filter((fact) => fact.extractor.id === 'extrac...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-50 namespace-export-with-internal-hiding `packages/plugins/plugin-finance/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-7 (`export * as FinancePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-51 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-finance/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-7 (`export * as FinancePlugin from '#meta';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-52 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/pipeline/annotate.ts:90`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 90-101 (`export const linkTickers = (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-53 namespace-brand-key-prefixing `packages/plugins/plugin-finance/src/pipeline/pipeline.ts:148`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 148-158 (`const extractorFor = (stage: string, model: string): Extractor => ({`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-54 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/sources/edgar.ts:203`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 203-214 (`export const insiderTrades = (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-55 error-messages-carry-context `packages/plugins/plugin-finance/src/sources/house.ts:20`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 20-31 (`export const unzip = (archive: Uint8Array): Map<string, Uint8Array> => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-56 errors-extend-base-error `packages/plugins/plugin-finance/src/sources/http.ts:14`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.98. The likeliest place is lines 14-19 (`export class SourceError extends Data.TaggedError('SourceError')<{`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-57 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/sources/ingest.ts:64`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 64-75 (`feedName: string,`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-58 no-try-catch-in-effect-code `packages/plugins/plugin-finance/src/sources/text-item.ts:80`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 80-91 (`export const hostOf = (link: string): string | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-59 errors-extend-base-error `packages/plugins/plugin-finance/src/store/finance-space.ts:13`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 13-21 (`import { Config } from '@dxos/config';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-60 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/store/finance-space.ts:62`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 62-79 (`export const feedFor = (source: string): Effect.Effect<Feed.Feed, never, Data...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-61 test-asserts-real-behavior `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:177`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 177-188 (`log(...costReport(events, 0));`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-62 structured-logging-not-console `packages/plugins/plugin-finance/src/testing/finance-run.test.ts:249`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 249-260 (`);`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-63 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-finance/src/testing/metering.ts:53`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.85. The likeliest place is lines 53-64 (`export const costReport = (events: Iterable<Trace.Event>, items: number): str...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-64 structured-logging-not-console `packages/plugins/plugin-finance/src/testing/report.ts:16`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 16-26 (`export const runLog = (path: string) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-65 no-unused-new-api `packages/plugins/plugin-finance/src/testing/report.ts:16`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.80. The likeliest place is lines 16-26 (`export const runLog = (path: string) => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-66 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-finance/src/testing/report.ts:132`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 132-143 (`export const crossSourceReport = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-67 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-finance/src/types/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Finance from './Finance.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-68 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/FeedParser.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.90. The likeliest place is lines 1-9 (`export { fetchRss, parseFeed } from './operations/sources/rss.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-69 namespace-export-with-internal-hiding `packages/plugins/plugin-magazine/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-8 (`export * as MagazinePlugin from '#meta';`, location confidence 1.00). Judged with added `imports, public-api, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-70 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.90. The likeliest place is lines 1-8 (`export * as MagazinePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-71 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-79 (`export const fetchRss: FeedFetcher = (url, options) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-72 error-messages-carry-context `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:92`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 92-103 (`const channel = parsed.rss?.channel ?? parsed.feed;`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fb0f2f59542-73 no-casts `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 104-115 (`const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-74 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:101`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 101-112 (`const rows = useMemo<Row[]>(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-75 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 103-114 (`(predicate == null || fact.assertion.predicate === predicate),`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-76 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/TypeFilter/TypeFilter.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 36-47 (`export const TypeFilter = ({`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN fb0f2f59542-77 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/VirtualList/VirtualList.tsx:37`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 37-48 (`export const VirtualList = Util.composable<HTMLDivElement, VirtualListProps>(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- Resolved: the three error classes this branch added (`ExportError`, `SourceError`, `SpaceNotLoaded`) now extend `BaseError.extend`.
- Ignored, older code: `errors-extend-base-error` in `assistant-evals/src/runner.ts` and the `no-casts` hits in the crawler and pipeline-rdf test helpers, plugin-brain's test and magazine's `rss.ts` are casts and classes that predate this branch; the pipeline-rdf helper's `as any` was only re-indented.
- Ignored, style on new code: `effect-fn-not-hand-wrapped-gen`, `flat-layer-composition`, `import-as-namespace-is-all-or-nothing`, `namespace-export-with-internal-hiding`, `namespace-brand-key-prefixing` and `keep-parallel-apis-structurally-aligned` are restructurings that change no behaviour; left for a cleanup pass rather than widening this PR.
- Ignored, intended: `structured-logging-not-console` hits are the run harnesses' printed reports (crawl-export, reextract, finance-run, report.ts, the exporter's progress line), which are command-line output, not logs.
- Ignored, covered: `story-for-new-ui-component` (`TypeFilter`, `VirtualList`) are exercised by the `EntityBrowser` and `FactViewer` `Large` stories; `no-unused-new-api` hits are used by the run harnesses.
- Ignored, not a violation on inspection or out of scope: the remaining single-shot verdicts (operations resolving databases, try/catch at a JSON boundary, test-fixture style, bounded live state over the ontology's predicate list, error-message context).

### System One pass

- model: jev-latest
- base for context: `4514d15b93cbe377a2bfb6d78e2c9f8aafd3594c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 77 violations written to fragments, 690 uncertain, 4238 clean, 0 unanswered
- left for an agentic reviewer: 123 batch(es)

```text
requests: 1985 (450 verdicts re-asked with context the model requested)
estimated input tokens: 14029267
billed input tokens: 13220301 (cost $0.5553)
measured chars per token: 3.18
```

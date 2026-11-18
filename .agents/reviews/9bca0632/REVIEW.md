---
branch: dm/affectionate-mendel-1htqdr
commit: 9bca063287c70e49e3fba3d6b0fb38f64fbc55f6
base: 28a98e7fa926558dfa6fc543357412d7d090e39f
mode: fast
createdAt: 2026-11-17T15:22:30.903Z
isFinalized: true
groups: 854
rules: [bounded-live-state, comment-hygiene, consistent-file-naming-within-folder, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, log-fire-and-forget-rejections, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-native-form-controls, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-test-suite-per-module, operations-resolve-database-from-service, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, private-new-packages, reactive-state-via-atom-bridge, reuse-shared-test-layer, state-owned-once, subpath-lint-not-adhoc-entrypoints, test-asserts-real-behavior, test-at-owning-package, test-real-scenario-not-narrower-proxy, toolbars-are-menu-actions, use-context-scoped-cancellation, workaround-is-documented-and-removable, workerd-variant-imports-conditioned-barrel]
reviewId: 9bca0632
---

_13 error(s), 91 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9bca0632-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/brain/src/Oracle.ts:121
- 9bca0632-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/brain/src/Vocabulary.ts:1
- 9bca0632-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/stages/topics.ts:45
- 9bca0632-4 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:19
- 9bca0632-5 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-email/src/fact-pipeline.ts:28
- 9bca0632-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/fact-pipeline.ts:52
- 9bca0632-7 - ignored - workaround-is-documented-and-removable - packages/core/compute/pipeline-email/src/fact-pipeline.ts:103
- 9bca0632-8 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/pipeline.test.ts:13
- 9bca0632-9 - ignored - workaround-is-documented-and-removable - packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts:47
- 9bca0632-10 - ignored - namespace-export-with-internal-hiding - packages/core/compute/pipeline-rdf/src/index.ts:1
- 9bca0632-11 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-query.ts:57
- 9bca0632-12 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.test.ts:41
- 9bca0632-13 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.ts:118
- 9bca0632-14 - ignored - no-try-catch-in-effect-code - packages/core/compute/pipeline-rdf/src/internal/sparql/sparql-to-query.ts:73
- 9bca0632-15 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/pipeline.test.ts:356
- 9bca0632-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:108
- 9bca0632-17 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35
- 9bca0632-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61
- 9bca0632-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/store/fact-store-http.ts:93
- 9bca0632-20 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/pipeline-rdf/src/store/fact-store-memory.ts:116
- 9bca0632-21 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/pipeline-rdf/src/store/index.ts:1
- 9bca0632-22 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/pipeline-rdf/src/testing/harness/generate-facts.test.ts:42
- 9bca0632-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/testing/harness/generate-facts.ts:17
- 9bca0632-24 - resolved - no-try-catch-in-effect-code - packages/core/compute/sparql-sqlite/src/effect-driver.ts:46
- 9bca0632-25 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/sparql-sqlite/src/Exchange.ts:1
- 9bca0632-26 - resolved - error-messages-carry-context - packages/core/compute/sparql-sqlite/src/Exchange.ts:106
- 9bca0632-27 - ignored - no-lint-suppression-to-pass - packages/core/compute/sparql-sqlite/src/program.ts:53
- 9bca0632-28 - ignored - flat-layer-composition - packages/core/compute/sparql-sqlite/src/QuadStore.test.ts:25
- 9bca0632-29 - ignored - bounded-live-state - packages/core/compute/sparql-sqlite/src/QuadStore.ts:255
- 9bca0632-30 - ignored - bounded-live-state - packages/core/compute/sparql-sqlite/src/store.ts:316
- 9bca0632-31 - ignored - private-new-packages - packages/core/echo/echo-memory-sqlite/package.json:1
- 9bca0632-32 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory-sqlite/src/index.ts:1
- 9bca0632-33 - resolved - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory-sqlite/src/LocalRdfStore.ts:1
- 9bca0632-34 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:125
- 9bca0632-35 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:355
- 9bca0632-36 - ignored - private-new-packages - packages/core/echo/echo-memory/package.json:1
- 9bca0632-37 - ignored - subpath-lint-not-adhoc-entrypoints - packages/core/echo/echo-memory/package.json:13
- 9bca0632-38 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory/src/Fact.ts:1
- 9bca0632-39 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-memory/src/MemoryQuery.ts:41
- 9bca0632-40 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-memory/src/Vocab.ts:1
- 9bca0632-41 - ignored - no-casts - packages/core/protocols/src/FeedProtocol.ts:503
- 9bca0632-42 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:105
- 9bca0632-43 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:249
- 9bca0632-44 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:68
- 9bca0632-45 - resolved - flat-layer-composition - packages/plugins/plugin-agent/src/brain/BrainMemory.test.ts:27
- 9bca0632-46 - resolved - reuse-shared-test-layer - packages/plugins/plugin-agent/src/brain/BrainMemory.test.ts:27
- 9bca0632-47 - resolved - reuse-shared-test-layer - packages/plugins/plugin-agent/src/brain/BrainWire.test.ts:87
- 9bca0632-48 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:223
- 9bca0632-49 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.tsx:511
- 9bca0632-50 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:54
- 9bca0632-51 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/compose-update.ts:62
- 9bca0632-52 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-agent/src/operations/invite-agent.test.ts:95
- 9bca0632-53 - ignored - reuse-shared-test-layer - packages/plugins/plugin-agent/src/operations/invite-agent.test.ts:233
- 9bca0632-54 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/members.test.ts:31
- 9bca0632-55 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/modes.test.ts:80
- 9bca0632-56 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:82
- 9bca0632-57 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:386
- 9bca0632-58 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:386
- 9bca0632-59 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/types/FactFeed.ts:1
- 9bca0632-60 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/types/MemoryOperation.ts:1
- 9bca0632-61 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-brain/dx.config.ts:84
- 9bca0632-62 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:72
- 9bca0632-63 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:27
- 9bca0632-64 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:53
- 9bca0632-65 - ignored - no-native-form-controls - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:89
- 9bca0632-66 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:113
- 9bca0632-67 - ignored - empty-container-uses-empty - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:170
- 9bca0632-68 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:203
- 9bca0632-69 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/use-query-log.ts:11
- 9bca0632-70 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-brain/src/operations/analyze-mailbox.test.ts:42
- 9bca0632-71 - ignored - test-at-owning-package - packages/plugins/plugin-brain/src/operations/analyze-mailbox.test.ts:53
- 9bca0632-72 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/operations/facts.ts:91
- 9bca0632-73 - ignored - flat-layer-composition - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:50
- 9bca0632-74 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:119
- 9bca0632-75 - ignored - errors-extend-base-error - packages/plugins/plugin-brain/src/operations/generate-reply.ts:13
- 9bca0632-76 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/operations/generate-reply.ts:84
- 9bca0632-77 - ignored - flat-layer-composition - packages/plugins/plugin-brain/src/operations/generate-reply.ts:144
- 9bca0632-78 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:63
- 9bca0632-79 - ignored - flat-layer-composition - packages/plugins/plugin-brain/src/operations/operations.test.ts:63
- 9bca0632-80 - ignored - no-module-level-object-caches - packages/plugins/plugin-brain/src/QueryLog.ts:34
- 9bca0632-81 - ignored - state-owned-once - packages/plugins/plugin-brain/src/QueryLog.ts:34
- 9bca0632-82 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-brain/src/QueryLog.ts:43
- 9bca0632-83 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-brain/src/types/BrainOperation.ts:41
- 9bca0632-84 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:275
- 9bca0632-85 - ignored - prefer-branded-types-over-raw-primitives - packages/sdk/client-services/src/internal/rdf/fact-feed.ts:39
- 9bca0632-86 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/rdf/fact-feed.ts:63
- 9bca0632-87 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/rdf/space-memories.ts:43
- 9bca0632-88 - ignored - flat-layer-composition - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:25
- 9bca0632-89 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:187
- 9bca0632-90 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:549
- 9bca0632-91 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:86
- 9bca0632-92 - ignored - no-casts - packages/sdk/client/src/client/client.ts:432
- 9bca0632-93 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:600
- 9bca0632-94 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:768
- 9bca0632-95 - ignored - use-context-scoped-cancellation - packages/stories/stories-agent/src/testing/back-index.ts:106
- 9bca0632-96 - ignored - no-try-catch-in-effect-code - packages/stories/stories-brain/src/modules/EntitiesModule.tsx:21
- 9bca0632-97 - ignored - bounded-live-state - packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:57
- 9bca0632-98 - ignored - log-fire-and-forget-rejections - packages/stories/stories-brain/src/stories/Pipeline.stories.tsx:289
- 9bca0632-99 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- 9bca0632-100 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- 9bca0632-101 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:86
- 9bca0632-102 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/list-questions.test.ts:59
- 9bca0632-103 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:96
- 9bca0632-104 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-brain/src/testing/harness/pipelines/questions.ts:57

## Issues

# WARN 9bca0632-1 no-try-catch-in-effect-code `packages/core/compute/brain/src/Oracle.ts:121`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 121-128 (`} catch (error) {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-2 import-as-namespace-is-all-or-nothing `packages/core/compute/brain/src/Vocabulary.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-9 (`import { Ontology, Predicate } from '@dxos/echo-memory';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/stages/topics.ts:45`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.94. The likeliest place is lines 45-56 (`export const extractTopics = (options?: TopicOptions): Effect.Effect<TopicRep...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-4 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:19`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.88. The likeliest place is lines 19-33 (`export type ExtractQuestionsOptions = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-5 operations-resolve-database-from-service `packages/core/compute/pipeline-email/src/fact-pipeline.ts:28`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.87. The likeliest place is lines 28-34 (`export type EmailFactPipelineOptions = {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/fact-pipeline.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 52-63 (`): Effect.Effect<EmailFactPipelineResult> =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-7 workaround-is-documented-and-removable `packages/core/compute/pipeline-email/src/fact-pipeline.ts:103`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.82. The likeliest place is lines 103-114 (`let cursorKey = Cursor.parseKey(cursor.max);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-8 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/pipeline.test.ts:13`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 13-22 (`import { EmailPipeline } from './pipeline.ts';`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-9 workaround-is-documented-and-removable `packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts:47`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.80. The likeliest place is lines 47-54 (`{ concurrency },`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-10 namespace-export-with-internal-hiding `packages/core/compute/pipeline-rdf/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-13 (`export * from './errors.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-11 flat-layer-composition `packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-query.ts:57`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 57-71 (`export const generateQuery = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-12 test-real-scenario-not-narrower-proxy `packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.test.ts:41`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 41-52 (`it.effect(`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-13 flat-layer-composition `packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.ts:118`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 118-129 (`export const generateSparql = (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-14 no-try-catch-in-effect-code `packages/core/compute/pipeline-rdf/src/internal/sparql/sparql-to-query.ts:73`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 73-84 (`export const parseSparqlToQuery = (sparql: string): SemanticQuery => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-15 flat-layer-composition `packages/core/compute/pipeline-rdf/src/pipeline.test.ts:356`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 356-367 (`}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:108`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 108-123 (`const factContext = (options: ExtractOptions | undefined) =>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-17 bounded-live-state `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:35`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 35-44 (`const ontology = (options?.ontology ?? Vocabularies.DEFAULT).include(yield* s...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-18 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 61-72 (`export const indexFactsBatch = (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-19 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/store/fact-store-http.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 93-104 (`export const make = (baseUrl: string): FactStoreApi => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-20 declare-optional-services-with-noop-layers `packages/core/compute/pipeline-rdf/src/store/fact-store-memory.ts:116`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.92. The likeliest place is lines 116-123 (`export const layer: Layer.Layer<FactStore, never, MemoryService.MemoryService...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

Ignored: false positive: the RdfStore is read with serviceOption because only TriG export/import need it; the layer works without one.

# WARN 9bca0632-21 import-as-namespace-is-all-or-nothing `packages/core/compute/pipeline-rdf/src/store/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-13 (`export * from './fact-graph.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-22 test-real-scenario-not-narrower-proxy `packages/core/compute/pipeline-rdf/src/testing/harness/generate-facts.test.ts:42`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 42-53 (`const STUB_PAYLOADS: readonly unknown[] = [`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-23 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/testing/harness/generate-facts.ts:17`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 17-25 (`export const generateFacts = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-24 no-try-catch-in-effect-code `packages/core/compute/sparql-sqlite/src/effect-driver.ts:46`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 46-59 (`const step = <A, E>(program: Program<A>, toFailure: (error: unknown) => E | u...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Resolved: step uses Effect.try and maps the caught value through the error channel.

# WARN 9bca0632-25 import-as-namespace-is-all-or-nothing `packages/core/compute/sparql-sqlite/src/Exchange.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-12 (`import { type BlankNode, DataFactory, type Literal, type NamedNode, Parser, t...`, location confidence 0.71). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

Ignored: the lowercase `./exchange` subpath keeps n3 out of the root barrel; the repo subpath lint requires a PascalCase subpath to be re-exported from the barrel, which would pull n3 in. Consumers read it as a namespace.

# WARN 9bca0632-26 error-messages-carry-context `packages/core/compute/sparql-sqlite/src/Exchange.ts:106`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 106-119 (`);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

Resolved: a TriG writer failure now names the quad count and keeps the cause.

# WARN 9bca0632-27 no-lint-suppression-to-pass `packages/core/compute/sparql-sqlite/src/program.ts:53`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.86. The likeliest place is lines 53-57 (`export function* pure<A>(value: A): Program<A> {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

Ignored: a Program must be a generator, and `pure` is the one that yields no statement; the suppression is the identity case.

# WARN 9bca0632-28 flat-layer-composition `packages/core/compute/sparql-sqlite/src/QuadStore.test.ts:25`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 25-29 (`const openStore = (options: QuadStore.Options) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: each replica needs its own private database, so the layer is built per call by design.

# ERROR 9bca0632-29 bounded-live-state `packages/core/compute/sparql-sqlite/src/QuadStore.ts:255`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 255-266 (`export const memoryLog = (): QuadLog => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `memoryLog` is a test log; bounding it would drop batches a replica must replay.

# ERROR 9bca0632-30 bounded-live-state `packages/core/compute/sparql-sqlite/src/store.ts:316`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 316-327 (`this.#approxCount += idRows.length;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

Ignored: false positive: `#approxCount` is a counter, not a collection.

# ERROR 9bca0632-31 private-new-packages `packages/core/echo/echo-memory-sqlite/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.97. The likeliest place is lines 1-12 (`{`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the user decided echo-memory and echo-memory-sqlite are public; first publish is done by the user.

# WARN 9bca0632-32 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory-sqlite/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-8 (`export * as LocalRdfStore from './LocalRdfStore.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

Ignored: false positive: the barrel re-exports each namespace module under its own name.

# WARN 9bca0632-33 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory-sqlite/src/LocalRdfStore.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-15 (`import * as Effect from 'effect/Effect';`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

Resolved: LocalRdfStore reads Exchange as a namespace (`Exchange.encode`), not destructured members.

# WARN 9bca0632-34 no-try-catch-in-effect-code `packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:125`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 125-138 (`const compiles = (rules: Evaluator.Subscription): boolean => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `compiles` is a synchronous filter over the evaluator's throwing compile, not Effect code.

# WARN 9bca0632-35 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-memory-sqlite/src/RdfMemory.ts:355`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 355-366 (`const push = (facts: readonly Fact.Fact[], quiet?: readonly string[]) =>`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `push` is an Effect.fnUntraced.

# ERROR 9bca0632-36 private-new-packages `packages/core/echo/echo-memory/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.97. The likeliest place is lines 1-12 (`{`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the user decided echo-memory and echo-memory-sqlite are public; first publish is done by the user.

# WARN 9bca0632-37 subpath-lint-not-adhoc-entrypoints `packages/core/echo/echo-memory/package.json:13`

System One judges this a likely violation of `subpath-lint-not-adhoc-entrypoints` (Expose a package's modules as namespaces via the subpath lint, not hand-added entry points), p=0.80. The likeliest place is lines 13-24 (`"sideEffects": false,`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

Ignored: per-module subpaths are deliberate: workerd-reachable packages import port modules by subpath to keep n3 out (D-48).

# WARN 9bca0632-38 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory/src/Fact.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-27 (`import * as Schema from 'effect/Schema';`, location confidence 0.36). Judged with added `importers` context after a first pass of 0.68. This is a single-shot classifier: confirm against the rule before acting.

Ignored: false positive: Fact.ts carries the directive, its name, the barrel alias and namespace imports agree.

# WARN 9bca0632-39 namespace-brand-key-prefixing `packages/core/echo/echo-memory/src/MemoryQuery.ts:41`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 41-73 (`export type SparqlRow = Schema.Schema.Type<typeof SparqlRow>;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

Ignored: false positive: every brand is prefixed `@dxos/echo-memory/`.

# WARN 9bca0632-40 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-memory/src/Vocab.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-80 (`import { DataFactory } from 'n3';`, location confidence 0.55). Judged with added `importers` context after a first pass of 0.63. This is a single-shot classifier: confirm against the rule before acting.

Ignored: false positive: Vocab.ts carries the directive, its name, the barrel alias and namespace imports agree.

# ERROR 9bca0632-41 no-casts `packages/core/protocols/src/FeedProtocol.ts:503`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 503-512 (`export const isWellKnownNamespace = (namespace: string) =>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-42 flat-layer-composition `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:105`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 105-116 (`const stack = (peer: Peer) =>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-43 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:249`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 249-260 (`Effect.gen(function* () {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-44 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:68`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.88. The likeliest place is lines 68-71 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-45 flat-layer-composition `packages/plugins/plugin-agent/src/brain/BrainMemory.test.ts:27`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 27-34 (`const makeBrain = Effect.gen(function* () {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Resolved: tests take the memory from the shared `freshMemory` in testing.ts.

# WARN 9bca0632-46 reuse-shared-test-layer `packages/plugins/plugin-agent/src/brain/BrainMemory.test.ts:27`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.82. The likeliest place is lines 27-34 (`const makeBrain = Effect.gen(function* () {`, location confidence 0.97). Judged with added `siblings, similar` context after a first pass of 0.51. This is a single-shot classifier: confirm against the rule before acting.

Resolved: tests take the memory from the shared `freshMemory` in testing.ts.

# WARN 9bca0632-47 reuse-shared-test-layer `packages/plugins/plugin-agent/src/brain/BrainWire.test.ts:87`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.86. The likeliest place is lines 87-96 (`const setup = Effect.gen(function* () {`, location confidence 0.84). Judged with added `siblings, similar` context after a first pass of 0.60. This is a single-shot classifier: confirm against the rule before acting.

Resolved: tests take the memory from the shared `freshMemory` in testing.ts.

# WARN 9bca0632-48 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:223`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 223-227 (`const brain = makeTestBrain({ now: () => Date.now() + offset });`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

Ignored: one memory stands in for every space and is reset after each test; the offset is reset with it.

# WARN 9bca0632-49 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.tsx:511`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 511-522 (`const AgentKnowledgeGraph = ({ nodes, edges }: AgentKnowledgeGraphProps) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-50 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:54`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.93. The likeliest place is lines 54-65 (`const read = async () => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-51 flat-layer-composition `packages/plugins/plugin-agent/src/operations/compose-update.ts:62`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 62-69 (`export const composeUpdate = (props: ComposeUpdateProps): Effect.Effect<strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-52 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-agent/src/operations/invite-agent.test.ts:95`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 95-106 (`const inSpace =`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-53 reuse-shared-test-layer `packages/plugins/plugin-agent/src/operations/invite-agent.test.ts:233`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 233-242 (`const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.78). Judged with added `siblings, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-54 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/members.test.ts:31`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.82. The likeliest place is lines 31-45 (`describe('resolveTerms', () => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-55 flat-layer-composition `packages/plugins/plugin-agent/src/operations/modes.test.ts:80`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 80-88 (`const TestLayer = AssistantTestLayer({`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-56 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:82`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.82. The likeliest place is lines 82-86 (`const brain = makeTestBrain();`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

Ignored: shared fixture state predates this PR; only the memory setup changed here.

# WARN 9bca0632-57 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:386`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.82. The likeliest place is lines 386-409 (`describe('end-of-turn triggers', () => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-58 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:386`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 386-409 (`describe('end-of-turn triggers', () => {`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-59 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/types/FactFeed.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-60 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/types/MemoryOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-61 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-brain/dx.config.ts:84`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.83. The likeliest place is lines 84-95 (`BrainSurface.Facts,`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-62 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:72`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.88. The likeliest place is lines 72-76 (`export const Default: Story = {};`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-63 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:27`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.94. The likeliest place is lines 27-38 (`export const useFacts = (client: Client, spaceId: SpaceId | undefined): Fact....`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-64 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 53-64 (`refresh();`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-65 no-native-form-controls `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:89`

System One judges this a likely violation of `no-native-form-controls` (Edit objects with the schema-driven `Form`, never a native input), p=0.86. The likeliest place is lines 89-100 (`{/* Outside the toolbar, which treats its children as controls. */}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-66 toolbars-are-menu-actions `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:113`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 113-124 (`label={t('memory-import.button')}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-67 empty-container-uses-empty `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:170`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.88. The likeliest place is lines 170-181 (`{entries.length === 0 ? (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-68 no-styling-wrapper-divs `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:203`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 203-214 (`<div className='flex items-center gap-2 text-sm text-description'>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-69 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/use-query-log.ts:11`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 11-16 (`export const useQueryLog = (registry: FactStoreRegistry, spaceId: string): re...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-70 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-brain/src/operations/analyze-mailbox.test.ts:42`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 42-52 (`generatedAtTime: '2026-06-06T00:00:00.000Z',`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the test drives the operation through its Promise harness, which this PR did not introduce.

# WARN 9bca0632-71 test-at-owning-package `packages/plugins/plugin-brain/src/operations/analyze-mailbox.test.ts:53`

System One judges this a likely violation of `test-at-owning-package` (Test behavior in the lowest package that implements it, not through a plugin), p=0.86. The likeliest place is lines 53-64 (`describe('runFactPipeline', () => {`, location confidence 0.84). Judged with added `imports, test` context after a first pass of 0.66. This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-72 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/operations/facts.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 91-102 (`export const queryResolvedFacts = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `queryResolvedFacts` is an Effect.fnUntraced.

# WARN 9bca0632-73 flat-layer-composition `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:50`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 50-61 (`const capturingAiService = (text: string): { layer: Layer.Layer<AiService.AiS...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-74 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 119-130 (`const feed = mailbox.feed.target!;`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-75 errors-extend-base-error `packages/plugins/plugin-brain/src/operations/generate-reply.ts:13`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 13-23 (`import { Fact, MemoryQuery, MemoryService } from '@dxos/echo-memory';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-76 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/operations/generate-reply.ts:84`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 84-95 (`export const generateReply = (options: {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-77 flat-layer-composition `packages/plugins/plugin-brain/src/operations/generate-reply.ts:144`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 144-154 (`});`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-78 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 63-76 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-79 flat-layer-composition `packages/plugins/plugin-brain/src/operations/operations.test.ts:63`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 63-76 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-80 no-module-level-object-caches `packages/plugins/plugin-brain/src/QueryLog.ts:34`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.94. The likeliest place is lines 34-42 (`type Log = { entries: readonly Entry[]; readonly listeners: Set<() => void> };`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

Ignored: deliberate (plugin-brain D-8): the log is weak-keyed by the memory instance, the only key an operation shares with the view; entries die with the memory.

# WARN 9bca0632-81 state-owned-once `packages/plugins/plugin-brain/src/QueryLog.ts:34`

System One judges this a likely violation of `state-owned-once` (Track state on the record that owns it, not in a side-table), p=0.91. The likeliest place is lines 34-42 (`type Log = { entries: readonly Entry[]; readonly listeners: Set<() => void> };`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

Ignored: deliberate (plugin-brain D-8): the memory instance is the one owner the operation and the view share.

# WARN 9bca0632-82 inject-dependencies-via-constructor `packages/plugins/plugin-brain/src/QueryLog.ts:43`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.89. The likeliest place is lines 43-52 (`const logOf = (memory: MemoryService.Service): Log => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

Ignored: deliberate (plugin-brain D-8): an operation cannot receive the registry, so the log is reached by the memory it is given.

# WARN 9bca0632-83 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-brain/src/types/BrainOperation.ts:41`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.87. The likeliest place is lines 41-52 (`pageSize: Schema.optional(`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-84 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:275`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 275-287 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-85 prefer-branded-types-over-raw-primitives `packages/sdk/client-services/src/internal/rdf/fact-feed.ts:39`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.83. The likeliest place is lines 39-50 (`export type FactFeedOptions = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: feed ids are plain strings across FeedProtocol; a brand here would cast at every call into the feed store.

# WARN 9bca0632-86 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/rdf/fact-feed.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 63-74 (`read: (cursor) =>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `factFeedLog` is an Effect.fnUntraced.

# WARN 9bca0632-87 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/rdf/space-memories.ts:43`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 43-54 (`export const SpaceMemoriesLayer: Layer.Layer<SpaceMemories, never, EchoHostSe...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `held` is an Effect.fnUntraced with its provides as pipeline steps.

# WARN 9bca0632-88 flat-layer-composition `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:25`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 25-49 (`import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the test builds replicas with private stores per peer; a single flat layer would share one.

# ERROR 9bca0632-89 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:187`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 187-210 (`});`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-90 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:549`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 549-572 (`});`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-91 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:86`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 86-97 (`export const registerReplicator = <Self>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-92 no-casts `packages/sdk/client/src/client/client.ts:432`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 432-455 (`.map((space) =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-93 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:600`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.85. The likeliest place is lines 600-623 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-94 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:768`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 768-791 (`this._statusUpdate.emit(status);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-95 use-context-scoped-cancellation `packages/stories/stories-agent/src/testing/back-index.ts:106`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 106-115 (`});`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-96 no-try-catch-in-effect-code `packages/stories/stories-brain/src/modules/EntitiesModule.tsx:21`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 21-34 (`const toOntology = (entries: readonly Ontology.Entry[]): Ontology.Ontology => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# ERROR 9bca0632-97 bounded-live-state `packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:57`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 57-68 (`const listener = (read: readonly Fact.Fact[]) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-98 log-fire-and-forget-rejections `packages/stories/stories-brain/src/stories/Pipeline.stories.tsx:289`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.96. The likeliest place is lines 289-300 (`const handleLoadDataset = useCallback(`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-99 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.93. The likeliest place is lines 116-127 (`{`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-100 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.94. The likeliest place is lines 200-207 (`}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-101 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:86`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 86-91 (`} finally {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-102 test-asserts-real-behavior `packages/stories/stories-brain/src/test/list-questions.test.ts:59`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 59-71 (`body: questions.length ? questions.map(renderFact).join('\n') : '_(none — reg...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-103 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:96`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 96-107 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

# WARN 9bca0632-104 effect-fn-not-hand-wrapped-gen `packages/stories/stories-brain/src/testing/harness/pipelines/questions.ts:57`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 57-68 (`export const extractQuestions = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: code not written by this PR (merged from main or untouched beyond an import update); out of scope.

## Appendix

### System One pass

- model: jev-latest
- base for context: `28a98e7fa926558dfa6fc543357412d7d090e39f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 104 violations written to fragments, 1176 uncertain, 8042 clean, 0 unanswered
- left for an agentic reviewer: 163 batch(es)

```text
requests: 3667 (769 verdicts re-asked with context the model requested)
estimated input tokens: 25762087
billed input tokens: 24203011 (cost $1.0165)
measured chars per token: 3.19
```

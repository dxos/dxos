---
branch: dm/pensive-shannon-yysj9j
commit: 953b2ceac9a70ac5050339b0953ea9a1873654f4
base: full
mode: default
createdAt: 2026-10-14T08:15:05.945Z
isFinalized: true
groups: 105
rules: [avoid-full-collection-scans, barrel-imports-not-internal-paths, batch-queries-not-n-plus-1, bounded-live-state, business-logic-out-of-ui, co-locate-tightly-coupled-code, collapse-branches-via-identity-element, collect-dead-entities, comment-hygiene, consistent-field-and-list-ordering, consistent-file-naming-within-folder, consistent-private-field-convention, construct-populated-dont-mutate-after, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, dont-recompute-in-reactive-closures, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, fix-root-cause-not-symptom, flat-layer-composition, follow-existing-lazy-loading-pattern, functions-before-classes, harness-script-hygiene, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, intents-not-coordinates, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, key-chords-live-in-the-table, layout-only-wrapper-invisible-to-a11y, leaf-owns-its-subscription, lifecycle-owned-by-its-resource, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-bare-ref-schema-alias, no-casts, no-compat-shims, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-impossible-state-handling, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-native-form-controls, no-pointless-indirection, no-precision-loss-on-generic-refactor, no-premature-abstraction, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, obj-update-push, options-object-with-defaults, parent-ref-backs-parent-pointer, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, reuse-existing-mechanism, reuse-shared-test-layer, schema-declare-and-brand, schema-field-uses-platform-reference-mechanism, schema-persists-source-not-derived-duplicate, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, standalone-service-accessor, state-owned-once, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 953b2cea
---

_58 error(s), 646 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 953b2cea-1 - resolved - harness-script-hygiene - .agents/skills/agentic-review/lib/store.ts:141
- 953b2cea-2 - resolved - harness-script-hygiene - .agents/skills/agentic-review/scripts/system-one.ts:235
- 953b2cea-3 - resolved - no-trivial-wrappers-over-official-apis - packages/apps/composer-app/scripts/score-perf.ts:63
- 953b2cea-4 - resolved - event-handler-naming-convention - packages/apps/composer-app/src/main.tsx:653
- 953b2cea-5 - resolved - consistent-field-and-list-ordering - packages/apps/composer-app/src/plugin-defs.core.tsx:139
- 953b2cea-6 - resolved - consistent-field-and-list-ordering - packages/apps/composer-app/src/plugin-defs.tsx:306
- 953b2cea-7 - resolved - consistent-field-and-list-ordering - packages/apps/composer-app/src/plugin-defs.tsx:312
- 953b2cea-8 - resolved - consistent-field-and-list-ordering - packages/apps/composer-app/src/plugin-defs.tsx:316
- 953b2cea-9 - resolved - consistent-field-and-list-ordering - packages/apps/composer-app/src/plugin-defs.tsx:347
- 953b2cea-10 - resolved - no-casts - packages/apps/testbench-app/src/components/Error.tsx:14
- 953b2cea-11 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:68
- 953b2cea-12 - resolved - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:87
- 953b2cea-13 - resolved - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:88
- 953b2cea-14 - resolved - deprecated-tag-must-be-accurate - packages/common/async/src/event-emitter.ts:19
- 953b2cea-15 - ignored - no-casts - packages/common/async/src/events.ts:304
- 953b2cea-16 - ignored - namespace-export-with-internal-hiding - packages/common/async/src/index.ts:1
- 953b2cea-17 - ignored - no-sleep-in-test - packages/common/async/src/mutex.test.ts:75
- 953b2cea-18 - resolved - no-casts - packages/common/async/src/mutex.ts:108
- 953b2cea-19 - ignored - deprecated-tag-must-be-accurate - packages/common/async/src/observable-value.ts:12
- 953b2cea-20 - resolved - no-sleep-in-test - packages/common/async/src/persistent-lifecycle.test.ts:55
- 953b2cea-21 - ignored - no-env-vars-in-low-level-modules - packages/common/async/src/track-leaks.ts:8
- 953b2cea-22 - resolved - no-sleep-in-test - packages/common/crx-protocol/src/testing/conformance.test.ts:31
- 953b2cea-23 - ignored - deprecated-tag-must-be-accurate - packages/common/crypto/src/random.ts:17
- 953b2cea-24 - ignored - namespace-export-with-internal-hiding - packages/common/debug/src/index.ts:1
- 953b2cea-25 - ignored - structured-logging-not-console - packages/common/debug/src/log-method.ts:14
- 953b2cea-26 - ignored - structured-logging-not-console - packages/common/debug/src/timeout-warning.ts:18
- 953b2cea-27 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:7
- 953b2cea-28 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:12
- 953b2cea-29 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:19
- 953b2cea-30 - resolved - comment-hygiene - packages/common/diagram/src/ui.ts:7
- 953b2cea-31 - ignored - no-casts - packages/common/effect-atom-solid/src/hooks/useAtomSet.ts:47
- 953b2cea-32 - resolved - no-casts - packages/common/effect-atom-solid/src/hooks/useAtomSuspense.ts:55
- 953b2cea-33 - ignored - no-casts - packages/common/effect-zod/src/effect-to-zod.ts:52
- 953b2cea-34 - resolved - no-casts - packages/common/effect/src/Hook.ts:79
- 953b2cea-35 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/index.ts:6
- 953b2cea-36 - resolved - no-casts - packages/common/effect/src/internal/async-task-tagging.ts:27
- 953b2cea-37 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/internal/index.ts:6
- 953b2cea-38 - ignored - no-precision-loss-on-generic-refactor - packages/common/effect/src/internal/json-path.ts:122
- 953b2cea-39 - ignored - no-casts - packages/common/feed-store/src/hypercore-wrapper.ts:172
- 953b2cea-40 - ignored - no-casts - packages/common/feed-store/src/hypercore-wrapper.ts:245
- 953b2cea-41 - ignored - namespace-export-with-internal-hiding - packages/common/feed-store/src/index.ts:1
- 953b2cea-42 - resolved - no-impossible-state-handling - packages/common/hypercore/src/crypto.ts:39
- 953b2cea-43 - ignored - no-casts - packages/common/hypercore/src/iterator.ts:22
- 953b2cea-44 - ignored - no-sleep-in-test - packages/common/hypercore/src/replicate.test.ts:309
- 953b2cea-45 - ignored - no-sleep-in-test - packages/common/hypercore/src/replicate.test.ts:378
- 953b2cea-46 - ignored - schema-declare-and-brand - packages/common/keys/src/DXN.ts:31
- 953b2cea-47 - ignored - no-casts - packages/common/keys/src/DXN.ts:222
- 953b2cea-48 - ignored - schema-declare-and-brand - packages/common/keys/src/EID.ts:48
- 953b2cea-49 - ignored - no-casts - packages/common/keys/src/EID.ts:170
- 953b2cea-50 - ignored - schema-declare-and-brand - packages/common/keys/src/URI.ts:13
- 953b2cea-51 - ignored - no-casts - packages/common/keys/src/URI.ts:34
- 953b2cea-52 - resolved - no-casts - packages/common/log/src/context.ts:297
- 953b2cea-53 - resolved - no-casts - packages/common/log/src/decorators.ts:24
- 953b2cea-54 - resolved - no-casts - packages/common/log/src/experimental/ownership.ts:77
- 953b2cea-55 - ignored - namespace-export-with-internal-hiding - packages/common/log/src/index.ts:1
- 953b2cea-56 - resolved - no-casts - packages/common/log/src/log.ts:207
- 953b2cea-57 - ignored - no-env-vars-in-low-level-modules - packages/common/log/src/processors/file-processor.ts:87
- 953b2cea-58 - resolved - no-casts - packages/common/random-access-storage/src/browser/idb-storage.ts:70
- 953b2cea-59 - ignored - no-casts - packages/common/random-access-storage/src/browser/web-fs.ts:252
- 953b2cea-60 - resolved - no-casts - packages/common/random-access-storage/src/common/memory-storage.ts:50
- 953b2cea-61 - resolved - deprecated-tag-must-be-accurate - packages/common/random-access-storage/src/common/storage.ts:12
- 953b2cea-62 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:340
- 953b2cea-63 - resolved - effect-fn-not-hand-wrapped-gen - packages/common/sql-sqlite/src/OpfsWorker.ts:69
- 953b2cea-64 - ignored - no-casts - packages/common/sql-sqlite/src/OpfsWorker.ts:77
- 953b2cea-65 - resolved - effect-fn-not-hand-wrapped-gen - packages/common/sql-sqlite/src/SqlMigrations.ts:50
- 953b2cea-66 - resolved - test-asserts-real-behavior - packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:264
- 953b2cea-67 - resolved - bounded-live-state - packages/common/tracing/src/buffering-backend.ts:88
- 953b2cea-68 - resolved - no-casts - packages/common/tracing/src/diagnostics-channel.ts:71
- 953b2cea-69 - resolved - no-impossible-state-handling - packages/common/tracing/src/diagnostics-channel.ts:83
- 953b2cea-70 - ignored - namespace-export-with-internal-hiding - packages/common/tracing/src/index.ts:1
- 953b2cea-71 - resolved - consistent-private-field-convention - packages/common/tracing/src/trace-processor.ts:20
- 953b2cea-72 - ignored - schema-declare-and-brand - packages/common/util/src/id.ts:15
- 953b2cea-73 - ignored - namespace-export-with-internal-hiding - packages/common/util/src/index.ts:1
- 953b2cea-74 - ignored - consistent-file-naming-within-folder - packages/common/util/src/Position.test.ts:1
- 953b2cea-75 - ignored - no-sleep-in-test - packages/common/web-context-solid/src/consumer.test.tsx:103
- 953b2cea-76 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/Wire.ts:28
- 953b2cea-77 - ignored - inject-dependencies-via-constructor - packages/core/compute/agent-code-mode/src/WorkerdHostWorker.ts:19
- 953b2cea-78 - ignored - consistent-file-naming-within-folder - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:1
- 953b2cea-79 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/mcp-servers.ts:52
- 953b2cea-80 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/ai/src/AiPreprocessor.ts:410
- 953b2cea-81 - ignored - effect-requirement-type-not-erased - packages/core/compute/ai/src/testing/tools.test.ts:52
- 953b2cea-82 - resolved - namespace-brand-key-prefixing - packages/core/compute/ai/src/tools/tool.ts:7
- 953b2cea-83 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-e2e/src/harness.ts:174
- 953b2cea-84 - resolved - comment-hygiene - packages/core/compute/assistant-evals/src/evals/web-search.eval.ts:19
- 953b2cea-85 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:60
- 953b2cea-86 - ignored - effect-requirement-type-not-erased - packages/core/compute/assistant-evals/src/Scorer.ts:217
- 953b2cea-87 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/Scorer.ts:225
- 953b2cea-88 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/agent/operations/index.ts:10
- 953b2cea-89 - ignored - dependency-direction - packages/core/compute/assistant-toolkit/src/testing/plugins.tsx:13
- 953b2cea-90 - resolved - consistent-private-field-convention - packages/core/compute/assistant/src/request/AiRequest.ts:188
- 953b2cea-91 - resolved - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/request/AiRequest.ts:504
- 953b2cea-92 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:122
- 953b2cea-93 - ignored - inject-dependencies-via-constructor - packages/core/compute/assistant/src/session/AiContext.ts:71
- 953b2cea-94 - resolved - consistent-private-field-convention - packages/core/compute/assistant/src/session/AiContext.ts:99
- 953b2cea-95 - resolved - consistent-private-field-convention - packages/core/compute/assistant/src/session/AiSession.ts:88
- 953b2cea-96 - ignored - effect-requirement-type-not-erased - packages/core/compute/assistant/src/tool-runtime/services.ts:153
- 953b2cea-97 - resolved - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/tool-runtime/services.ts:157
- 953b2cea-98 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:106
- 953b2cea-99 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Chat.ts:224
- 953b2cea-100 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Chat.ts:265
- 953b2cea-101 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Chat.ts:286
- 953b2cea-102 - resolved - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:16
- 953b2cea-103 - resolved - no-trivial-wrappers-over-official-apis - packages/core/compute/brain/src/CompilePrompt.ts:372
- 953b2cea-104 - resolved - bounded-live-state - packages/core/compute/compute-hyperformula/src/functions/async-function.ts:143
- 953b2cea-105 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:1
- 953b2cea-106 - ignored - consistent-file-naming-within-folder - packages/core/compute/compute-runtime/src/LayerStack.test.ts:1
- 953b2cea-107 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/LayerStack.ts:42
- 953b2cea-108 - ignored - no-env-vars-in-low-level-modules - packages/core/compute/compute-runtime/src/node-shell.ts:56
- 953b2cea-109 - ignored - effect-requirement-type-not-erased - packages/core/compute/compute-runtime/src/OperationProcess.ts:100
- 953b2cea-110 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessHandle.ts:684
- 953b2cea-111 - resolved - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessManager.ts:82
- 953b2cea-112 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:598
- 953b2cea-113 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:293
- 953b2cea-114 - resolved - no-trivial-wrappers-over-official-apis - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:338
- 953b2cea-115 - resolved - standalone-service-accessor - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:564
- 953b2cea-116 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- 953b2cea-117 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:61
- 953b2cea-118 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Credential.ts:97
- 953b2cea-119 - resolved - namespace-brand-key-prefixing - packages/core/compute/compute/src/Process.ts:32
- 953b2cea-120 - resolved - construct-populated-dont-mutate-after - packages/core/compute/compute/src/types/Project.ts:108
- 953b2cea-121 - resolved - construct-populated-dont-mutate-after - packages/core/compute/compute/src/types/Project.ts:114
- 953b2cea-122 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.ts:305
- 953b2cea-123 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.ts:322
- 953b2cea-124 - ignored - schema-persists-source-not-derived-duplicate - packages/core/compute/compute/src/types/Trigger.ts:64
- 953b2cea-125 - ignored - state-owned-once - packages/core/compute/compute/src/types/TriggerEvent.ts:54
- 953b2cea-126 - resolved - reuse-shared-test-layer - packages/core/compute/conductor/src/compiler/fiber-compiler.test.ts:39
- 953b2cea-127 - resolved - no-impossible-state-handling - packages/core/compute/conductor/src/compiler/fiber-compiler.ts:242
- 953b2cea-128 - resolved - reuse-shared-test-layer - packages/core/compute/conductor/src/nodes/gpt/gpt.test.ts:29
- 953b2cea-129 - resolved - no-mixed-promise-effect-lifecycle - packages/core/compute/conductor/src/nodes/registry.ts:346
- 953b2cea-130 - resolved - deprecated-tag-must-be-accurate - packages/core/compute/conductor/src/sequence/Sequence.ts:26
- 953b2cea-131 - resolved - reuse-shared-test-layer - packages/core/compute/conductor/src/tests/gpt.test.ts:27
- 953b2cea-132 - resolved - reuse-shared-test-layer - packages/core/compute/conductor/src/tests/streaming.test.ts:30
- 953b2cea-133 - resolved - reuse-shared-test-layer - packages/core/compute/conductor/src/types/compute.test.ts:23
- 953b2cea-134 - resolved - deprecated-tag-must-be-accurate - packages/core/compute/conductor/src/types/graph.ts:53
- 953b2cea-135 - resolved - reuse-shared-test-layer - packages/core/compute/conductor/src/workflow/workflow.test.ts:39
- 953b2cea-136 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/Crawler.ts:58
- 953b2cea-137 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/Crawler.ts:207
- 953b2cea-138 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/crawler/src/index.ts:5
- 953b2cea-139 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/stages/topics.ts:44
- 953b2cea-140 - ignored - flat-layer-composition - packages/core/compute/crawler/src/StateStore.test.ts:115
- 953b2cea-141 - resolved - comment-hygiene - packages/core/compute/crawler/src/testing/index.ts:18
- 953b2cea-142 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/edge-compute/src/EdgeProcessManager.ts:43
- 953b2cea-143 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor-lib/src/contact-extractor.ts:29
- 953b2cea-144 - resolved - construct-populated-dont-mutate-after - packages/core/compute/extractor-lib/src/contact.ts:67
- 953b2cea-145 - ignored - errors-extend-base-error - packages/core/compute/extractor/src/dispatch.ts:15
- 953b2cea-146 - ignored - consistent-file-naming-within-folder - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:1
- 953b2cea-147 - ignored - namespace-export-with-internal-hiding - packages/core/compute/extractor/src/index.ts:1
- 953b2cea-148 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:28
- 953b2cea-149 - resolved - error-messages-carry-context - packages/core/compute/functions-runtime-cloudflare/src/internal/service-container.ts:61
- 953b2cea-150 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/queues-api.ts:20
- 953b2cea-151 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/space-proxy.ts:15
- 953b2cea-152 - resolved - structured-logging-not-console - packages/core/compute/functions-testing/src/testing/util.ts:48
- 953b2cea-153 - ignored - schema-field-uses-platform-reference-mechanism - packages/core/compute/link/src/Cursor.ts:38
- 953b2cea-154 - ignored - setter-must-not-own-transaction - packages/core/compute/link/src/Cursor.ts:195
- 953b2cea-155 - ignored - setter-must-not-own-transaction - packages/core/compute/link/src/Cursor.ts:211
- 953b2cea-156 - ignored - setter-must-not-own-transaction - packages/core/compute/link/src/Cursor.ts:225
- 953b2cea-157 - ignored - setter-must-not-own-transaction - packages/core/compute/link/src/Cursor.ts:268
- 953b2cea-158 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/link/src/Cursor.ts:646
- 953b2cea-159 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-client/src/McpToolkit.ts:57
- 953b2cea-160 - resolved - prefer-branded-types-over-raw-primitives - packages/core/compute/mcp-server/src/internal/space.ts:96
- 953b2cea-161 - ignored - prefer-branded-types-over-raw-primitives - packages/core/compute/mcp-server/src/McpServer.ts:65
- 953b2cea-162 - resolved - jsdoc-non-obvious-identifiers - packages/core/compute/mcp-server/src/McpServer.ts:313
- 953b2cea-163 - resolved - jsdoc-non-obvious-identifiers - packages/core/compute/mcp-server/src/McpServer.ts:494
- 953b2cea-164 - resolved - no-mixed-promise-effect-lifecycle - packages/core/compute/mcp-server/src/McpServer.ts:964
- 953b2cea-165 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/nlp/src/parse.ts:34
- 953b2cea-166 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/nlp/src/segment.ts:159
- 953b2cea-167 - ignored - namespace-export-with-internal-hiding - packages/core/compute/pipeline-discord/src/index.ts:1
- 953b2cea-168 - resolved - comment-hygiene - packages/core/compute/pipeline-discord/src/stages/topics.test.ts:5
- 953b2cea-169 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/corpus/digest.test.ts:34
- 953b2cea-170 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/corpus/topics.test.ts:24
- 953b2cea-171 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/corpus/topics.test.ts:36
- 953b2cea-172 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/corpus/topics.test.ts:42
- 953b2cea-173 - ignored - namespace-export-with-internal-hiding - packages/core/compute/pipeline-email/src/index.ts:1
- 953b2cea-174 - resolved - comment-hygiene - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:406
- 953b2cea-175 - ignored - errors-extend-base-error - packages/core/compute/pipeline-email/src/testing/parquet.ts:15
- 953b2cea-176 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/topics-pipeline.test.ts:46
- 953b2cea-177 - ignored - schema-field-uses-platform-reference-mechanism - packages/core/compute/pipeline-email/src/types/Thread.ts:22
- 953b2cea-178 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/pipeline-rdf/src/index.ts:5
- 953b2cea-179 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/pipeline-rdf/src/store/index.ts:7
- 953b2cea-180 - ignored - errors-extend-base-error - packages/core/echo/blob/src/s3/s3-client.ts:26
- 953b2cea-181 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/blob/src/s3/s3-uri.ts:92
- 953b2cea-182 - resolved - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/automerge-retention.test.ts:57
- 953b2cea-183 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/echo.bench.ts:54
- 953b2cea-184 - resolved - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:151
- 953b2cea-185 - resolved - consistent-file-naming-within-folder - packages/core/echo/echo-client-e2e/src/Obj.updateFrom.test.ts:1
- 953b2cea-186 - resolved - inline-obj-parent - packages/core/echo/echo-client-e2e/src/parent.test.ts:135
- 953b2cea-187 - ignored - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/query.test.ts:1208
- 953b2cea-188 - resolved - inline-obj-parent - packages/core/echo/echo-client-e2e/src/query.test.ts:4303
- 953b2cea-189 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:36
- 953b2cea-190 - resolved - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/sync-refresh.test.ts:56
- 953b2cea-191 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:106
- 953b2cea-192 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:724
- 953b2cea-193 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:1
- 953b2cea-194 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:313
- 953b2cea-195 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:275
- 953b2cea-196 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:36
- 953b2cea-197 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1
- 953b2cea-198 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/core-db/entity-manager.ts:81
- 953b2cea-199 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/core-db/entity-manager.ts:652
- 953b2cea-200 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2082
- 953b2cea-201 - resolved - comment-hygiene - packages/core/echo/echo-client/src/core-db/object-core.ts:184
- 953b2cea-202 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:93
- 953b2cea-203 - resolved - namespace-brand-key-prefixing - packages/core/echo/echo-client/src/core-db/types.ts:24
- 953b2cea-204 - resolved - comment-hygiene - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:117
- 953b2cea-205 - resolved - error-messages-carry-context - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:467
- 953b2cea-206 - resolved - comment-hygiene - packages/core/echo/echo-client/src/echo-handler/echo-proxy-target.ts:62
- 953b2cea-207 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/errors.ts:33
- 953b2cea-208 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/feed/feed-handle.ts:75
- 953b2cea-209 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:722
- 953b2cea-210 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/hypergraph.ts:75
- 953b2cea-211 - resolved - error-messages-carry-context - packages/core/echo/echo-client/src/hypergraph.ts:550
- 953b2cea-212 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/hypergraph.ts:927
- 953b2cea-213 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-client/src/index.ts:1
- 953b2cea-214 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:22
- 953b2cea-215 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:25
- 953b2cea-216 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:28
- 953b2cea-217 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:34
- 953b2cea-218 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:35
- 953b2cea-219 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:36
- 953b2cea-220 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:50
- 953b2cea-221 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:53
- 953b2cea-222 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:58
- 953b2cea-223 - ignored - dont-leak-internal-api-through-public-surface - packages/core/echo/echo-client/src/index.ts:60
- 953b2cea-224 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo-client/src/proxy-db/database.ts:84
- 953b2cea-225 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/proxy-db/database.ts:308
- 953b2cea-226 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/proxy-db/database.ts:1130
- 953b2cea-227 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/query/query-api-stall.test.ts:67
- 953b2cea-228 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/testing/echo-test-builder.ts:109
- 953b2cea-229 - resolved - deprecated-tag-must-be-accurate - packages/core/echo/echo-generator/src/data.ts:25
- 953b2cea-230 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:748
- 953b2cea-231 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:266
- 953b2cea-232 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353
- 953b2cea-233 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:649
- 953b2cea-234 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-host/src/automerge/automerge-host.ts:68
- 953b2cea-235 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1801
- 953b2cea-236 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/document-lease.ts:430
- 953b2cea-237 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/automerge/mesh-echo-replicator-connection.ts:44
- 953b2cea-238 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- 953b2cea-239 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:85
- 953b2cea-240 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/db-host/echo-host.ts:1
- 953b2cea-241 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/db-host/feed-data-source.ts:53
- 953b2cea-242 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:24
- 953b2cea-243 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:41
- 953b2cea-244 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- 953b2cea-245 - resolved - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:54
- 953b2cea-246 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:1
- 953b2cea-247 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:713
- 953b2cea-248 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:171
- 953b2cea-249 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:670
- 953b2cea-250 - resolved - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:849
- 953b2cea-251 - ignored - batch-queries-not-n-plus-1 - packages/core/echo/echo-host/src/query/query-executor.ts:1009
- 953b2cea-252 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-planner.ts:66
- 953b2cea-253 - ignored - no-trivial-wrappers-over-official-apis - packages/core/echo/echo-host/src/query/sql/compile.test.ts:225
- 953b2cea-254 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/echo-host/src/query/sql/compile.ts:770
- 953b2cea-255 - ignored - inject-dependencies-via-constructor - packages/core/echo/echo-panproto/src/lens/registry.ts:14
- 953b2cea-256 - ignored - inject-dependencies-via-constructor - packages/core/echo/echo-panproto/src/runner.ts:25
- 953b2cea-257 - resolved - deprecated-tag-must-be-accurate - packages/core/echo/echo-protocol/src/document-structure.ts:76
- 953b2cea-258 - resolved - jsdoc-non-obvious-identifiers - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:21
- 953b2cea-259 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-protocol/src/index.ts:1
- 953b2cea-260 - ignored - import-as-namespace-is-all-or-nothing - packages/core/echo/echo-protocol/src/query/index.ts:5
- 953b2cea-261 - ignored - errors-extend-base-error - packages/core/echo/echo-sqlite/src/errors.ts:9
- 953b2cea-262 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-sqlite/src/testing/database.bench.ts:46
- 953b2cea-263 - resolved - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:515
- 953b2cea-264 - resolved - options-object-with-defaults - packages/core/echo/echo/src/Hypergraph.ts:82
- 953b2cea-265 - ignored - no-trivial-wrappers-over-official-apis - packages/core/echo/echo/src/internal/common/proxy/change.test.ts:15
- 953b2cea-266 - resolved - errors-extend-base-error - packages/core/echo/echo/src/internal/common/proxy/errors.ts:8
- 953b2cea-267 - resolved - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/make-object.ts:149
- 953b2cea-268 - resolved - comment-hygiene - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:361
- 953b2cea-269 - ignored - name-for-general-behavior - packages/core/echo/echo/src/internal/common/types/model-symbols.ts:5
- 953b2cea-270 - resolved - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:53
- 953b2cea-271 - resolved - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/JsonSchema/json-schema-type.ts:66
- 953b2cea-272 - ignored - name-for-general-behavior - packages/core/echo/echo/src/internal/Obj/common.ts:11
- 953b2cea-273 - resolved - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:645
- 953b2cea-274 - resolved - error-messages-carry-context - packages/core/echo/echo/src/Migration.ts:131
- 953b2cea-275 - ignored - name-for-general-behavior - packages/core/echo/echo/src/Query.ts:727
- 953b2cea-276 - ignored - keep-parallel-apis-structurally-aligned - packages/core/echo/echo/src/Relation.ts:363
- 953b2cea-277 - ignored - keep-parallel-apis-structurally-aligned - packages/core/echo/echo/src/Relation.ts:379
- 953b2cea-278 - ignored - keep-parallel-apis-structurally-aligned - packages/core/echo/echo/src/Relation.ts:445
- 953b2cea-279 - ignored - keep-parallel-apis-structurally-aligned - packages/core/echo/echo/src/Relation.ts:521
- 953b2cea-280 - ignored - schema-persists-source-not-derived-duplicate - packages/core/echo/echo/src/View.ts:75
- 953b2cea-281 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/feed/src/feed-store.ts:572
- 953b2cea-282 - resolved - jsdoc-non-obvious-identifiers - packages/core/echo/feed/src/feed-store.ts:715
- 953b2cea-283 - ignored - deferred-callback-owns-its-context - packages/core/echo/feed/src/sync-client.ts:45
- 953b2cea-284 - ignored - deferred-callback-owns-its-context - packages/core/echo/feed/src/sync-client.ts:204
- 953b2cea-285 - ignored - deferred-callback-owns-its-context - packages/core/echo/feed/src/sync-client.ts:379
- 953b2cea-286 - ignored - deferred-callback-owns-its-context - packages/core/echo/feed/src/sync-client.ts:426
- 953b2cea-287 - ignored - deferred-callback-owns-its-context - packages/core/echo/feed/src/sync-server.ts:37
- 953b2cea-288 - ignored - deferred-callback-owns-its-context - packages/core/echo/feed/src/sync-server.ts:58
- 953b2cea-289 - ignored - deferred-callback-owns-its-context - packages/core/echo/index-core/src/data-source.ts:60
- 953b2cea-290 - ignored - deferred-callback-owns-its-context - packages/core/echo/index-core/src/index-engine.ts:350
- 953b2cea-291 - ignored - deferred-callback-owns-its-context - packages/core/echo/index-core/src/index-engine.ts:502
- 953b2cea-292 - ignored - deferred-callback-owns-its-context - packages/core/echo/index-core/src/index-engine.ts:593
- 953b2cea-293 - ignored - deferred-callback-owns-its-context - packages/core/echo/index-core/src/index-engine.ts:695
- 953b2cea-294 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/indexes/reverse-ref-index.ts:128
- 953b2cea-295 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/migrations/entity-meta/0004_queue_position.sql:13
- 953b2cea-296 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/migrations/reverse-ref/0001_init.sql:10
- 953b2cea-297 - resolved - name-for-general-behavior - packages/core/halo/credentials/src/credentials/signing.ts:52
- 953b2cea-298 - ignored - namespace-export-with-internal-hiding - packages/core/halo/credentials/src/index.ts:1
- 953b2cea-299 - resolved - error-messages-carry-context - packages/core/halo/credentials/src/state-machine/member-state-machine.ts:95
- 953b2cea-300 - ignored - namespace-export-with-internal-hiding - packages/core/halo/halo-react/src/index.ts:1
- 953b2cea-301 - ignored - deprecated-tag-must-be-accurate - packages/core/mesh/edge-client/src/base-http-client.ts:447
- 953b2cea-302 - ignored - consistent-private-field-convention - packages/core/mesh/edge-client/src/edge-client.ts:118
- 953b2cea-303 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:375
- 953b2cea-304 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/errors.ts:7
- 953b2cea-305 - ignored - namespace-export-with-internal-hiding - packages/core/mesh/edge-client/src/index.ts:1
- 953b2cea-306 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/service/edge-service.ts:38
- 953b2cea-307 - resolved - deprecated-tag-must-be-accurate - packages/core/mesh/messaging/src/signal-manager/edge-signal-manager.ts:63
- 953b2cea-308 - resolved - deprecated-tag-must-be-accurate - packages/core/mesh/messaging/src/signal-methods.ts:63
- 953b2cea-309 - ignored - namespace-export-with-internal-hiding - packages/core/mesh/network-manager/src/index.ts:1
- 953b2cea-310 - ignored - no-env-vars-in-low-level-modules - packages/core/mesh/network-manager/src/swarm/connection.ts:379
- 953b2cea-311 - ignored - no-trivial-wrappers-over-official-apis - packages/core/mesh/network-manager/src/transport/webrtc/testing/rtc-proxy-worker.ts:24
- 953b2cea-312 - ignored - name-for-general-behavior - packages/core/mesh/rpc-tunnel/src/ports/worker.ts:23
- 953b2cea-313 - resolved - error-messages-carry-context - packages/core/mesh/rpc/src/rpc.ts:477
- 953b2cea-314 - ignored - consistent-file-naming-within-folder - packages/core/mesh/rpc/src/RpcRouter.test.ts:1
- 953b2cea-315 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/mesh/rpc/src/RpcRouter.ts:120
- 953b2cea-316 - ignored - deprecated-tag-must-be-accurate - packages/core/mesh/rpc/src/service.ts:171
- 953b2cea-317 - ignored - no-compat-shims - packages/core/protocols/src/edge/edge-deprecated.ts:15
- 953b2cea-318 - resolved - comment-hygiene - packages/core/protocols/src/edge/edge-deprecated.ts:22
- 953b2cea-319 - ignored - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- 953b2cea-320 - ignored - namespace-service-layers - packages/devtools/cli-util/src/services/command-config.ts:23
- 953b2cea-321 - ignored - import-as-namespace-is-all-or-nothing - packages/devtools/cli-util/src/util/index.ts:10
- 953b2cea-322 - resolved - effect-fn-not-hand-wrapped-gen - packages/devtools/cli-util/src/util/space.ts:25
- 953b2cea-323 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli-util/src/util/space.ts:39
- 953b2cea-324 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:242
- 953b2cea-325 - ignored - avoid-full-collection-scans - packages/devtools/cli/src/commands/chat/non-interactive.ts:39
- 953b2cea-326 - ignored - functions-before-classes - packages/devtools/cli/src/commands/chat/processor.ts:37
- 953b2cea-327 - ignored - deprecated-tag-must-be-accurate - packages/devtools/cli/src/commands/function/deploy/echo.ts:56
- 953b2cea-328 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/commands/repl.ts:97
- 953b2cea-329 - ignored - import-as-namespace-is-all-or-nothing - packages/devtools/cli/src/util/index.ts:13
- 953b2cea-330 - resolved - no-pointless-indirection - packages/devtools/devtools/src/components/MasterDetailTable.tsx:32
- 953b2cea-331 - resolved - no-pointless-indirection - packages/devtools/devtools/src/components/MasterDetailTable.tsx:89
- 953b2cea-332 - resolved - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:156
- 953b2cea-333 - ignored - co-locate-tightly-coupled-code - packages/devtools/devtools/src/components/Tree.tsx:1
- 953b2cea-334 - resolved - no-pointless-indirection - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:159
- 953b2cea-335 - resolved - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:45
- 953b2cea-336 - resolved - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:54
- 953b2cea-337 - resolved - no-pointless-indirection - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:35
- 953b2cea-338 - resolved - no-pointless-indirection - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:44
- 953b2cea-339 - resolved - no-pointless-indirection - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:97
- 953b2cea-340 - ignored - reactive-state-via-atom-bridge - packages/devtools/devtools/src/hooks/useStats.ts:154
- 953b2cea-341 - ignored - reactive-state-via-atom-bridge - packages/devtools/devtools/src/hooks/useSwarmTrace.ts:43
- 953b2cea-342 - resolved - no-impossible-state-handling - packages/e2e/blade-runner/src/replicants/echo-replicant.ts:101
- 953b2cea-343 - resolved - no-impossible-state-handling - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:113
- 953b2cea-344 - resolved - consistent-private-field-convention - packages/e2e/composer-e2e/src/playwright/app-manager.ts:216
- 953b2cea-345 - ignored - namespace-export-with-internal-hiding - packages/e2e/perf-harness/src/index.ts:1
- 953b2cea-346 - resolved - lifecycle-owned-by-its-resource - packages/e2e/rpc-tunnel-e2e/src/test-client.ts:68
- 953b2cea-347 - ignored - structured-logging-not-console - packages/experimental/discord-worker/src/worker.ts:235
- 953b2cea-348 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:253
- 953b2cea-349 - resolved - standalone-service-accessor - packages/plugins/plugin-agent/src/operations/list-triggers.ts:18
- 953b2cea-350 - resolved - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:129
- 953b2cea-351 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:374
- 953b2cea-352 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-assistant/src/components/ConnectorAuthMenu/ConnectorAuthMenu.stories.tsx:68
- 953b2cea-353 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-assistant/src/components/index.ts:9
- 953b2cea-354 - resolved - layout-only-wrapper-invisible-to-a11y - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:88
- 953b2cea-355 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-assistant/src/containers/IntegrationPrompt/IntegrationPrompt.tsx:20
- 953b2cea-356 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-assistant/src/containers/PluginPrompt/PluginPrompt.tsx:17
- 953b2cea-357 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-assistant/src/containers/PluginUrlPrompt/PluginUrlPrompt.tsx:19
- 953b2cea-358 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:69
- 953b2cea-359 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.tsx:159
- 953b2cea-360 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-assistant/src/hooks/useChatKeymap.ts:12
- 953b2cea-361 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:17
- 953b2cea-362 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/hooks/useDebug.ts:28
- 953b2cea-363 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:94
- 953b2cea-364 - resolved - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-assistant/src/hooks/useSkillRegistry.test.tsx:22
- 953b2cea-365 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-assistant/src/operations/bind-chat-context.ts:28
- 953b2cea-366 - resolved - jsdoc-non-obvious-identifiers - packages/plugins/plugin-assistant/src/types/AssistantCapabilities.ts:90
- 953b2cea-367 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.stories.tsx:72
- 953b2cea-368 - ignored - errors-extend-base-error - packages/plugins/plugin-atproto/src/errors.ts:8
- 953b2cea-369 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:118
- 953b2cea-370 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:128
- 953b2cea-371 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-attention/src/testing.ts:5
- 953b2cea-372 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:94
- 953b2cea-373 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:127
- 953b2cea-374 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-blogger/src/operations/index.ts:12
- 953b2cea-375 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-bluesky/src/operations/index.ts:16
- 953b2cea-376 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:151
- 953b2cea-377 - ignored - story-for-new-ui-component - packages/plugins/plugin-bookmarks/src/components/Summary/Summary.tsx:1
- 953b2cea-378 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-bookmarks/src/containers/BookmarkCard/BookmarkCard.stories.tsx:16
- 953b2cea-379 - resolved - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-brain/src/capabilities/fact-store.ts:74
- 953b2cea-380 - ignored - standalone-service-accessor - packages/plugins/plugin-brain/src/operations/query-facts.ts:37
- 953b2cea-381 - resolved - consistent-private-field-convention - packages/plugins/plugin-calls/src/calls/call-manager.ts:1
- 953b2cea-382 - resolved - namespace-brand-key-prefixing - packages/plugins/plugin-calls/src/calls/types.ts:56
- 953b2cea-383 - resolved - no-impossible-state-handling - packages/plugins/plugin-calls/src/calls/util/calls-service.ts:361
- 953b2cea-384 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:108
- 953b2cea-385 - resolved - no-pointless-indirection - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:101
- 953b2cea-386 - resolved - no-pointless-indirection - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:77
- 953b2cea-387 - resolved - no-pointless-indirection - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsivePanel.tsx:26
- 953b2cea-388 - ignored - errors-extend-base-error - packages/plugins/plugin-chess-com/src/errors.ts:7
- 953b2cea-389 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:37
- 953b2cea-390 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:76
- 953b2cea-391 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:93
- 953b2cea-392 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:103
- 953b2cea-393 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-chess/src/containers/ChessCard/ChessCard.stories.tsx:20
- 953b2cea-394 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:99
- 953b2cea-395 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:27
- 953b2cea-396 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-cloudflare/src/services/index.ts:5
- 953b2cea-397 - ignored - no-env-vars-in-low-level-modules - packages/plugins/plugin-code/src/agent-helper/server.ts:350
- 953b2cea-398 - resolved - reuse-shared-test-layer - packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:103
- 953b2cea-399 - resolved - reuse-shared-test-layer - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:172
- 953b2cea-400 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/components/CodeToolbar/CodeToolbar.tsx:1
- 953b2cea-401 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-computer/src/vite-plugin/index.ts:11
- 953b2cea-402 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:46
- 953b2cea-403 - ignored - story-for-new-ui-component - packages/plugins/plugin-connector/src/components/CreateConnectionPanel/CreateConnectionPanel.tsx:1
- 953b2cea-404 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:1
- 953b2cea-405 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:30
- 953b2cea-406 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- 953b2cea-407 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:189
- 953b2cea-408 - ignored - story-for-new-ui-component - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:1
- 953b2cea-409 - ignored - story-for-new-ui-component - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:1
- 953b2cea-410 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- 953b2cea-411 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:68
- 953b2cea-412 - resolved - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:166
- 953b2cea-413 - ignored - fix-root-cause-not-symptom - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:46
- 953b2cea-414 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:100
- 953b2cea-415 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:123
- 953b2cea-416 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-deck/src/url/index.ts:9
- 953b2cea-417 - resolved - jsdoc-non-obvious-identifiers - packages/plugins/plugin-deck/src/util/layout.ts:13
- 953b2cea-418 - resolved - no-bare-ref-schema-alias - packages/plugins/plugin-deepseek/src/skills/operations/definitions.ts:12
- 953b2cea-419 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:70
- 953b2cea-420 - resolved - standalone-service-accessor - packages/plugins/plugin-discord/src/capabilities/connector.ts:60
- 953b2cea-421 - ignored - story-for-new-ui-component - packages/plugins/plugin-discord/src/components/DiscordSetup/DiscordSetup.tsx:1
- 953b2cea-422 - resolved - obj-update-push - packages/plugins/plugin-discord/src/operations/admin/bind-channel.ts:97
- 953b2cea-423 - resolved - no-pointless-indirection - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:61
- 953b2cea-424 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- 953b2cea-425 - ignored - schema-persists-source-not-derived-duplicate - packages/plugins/plugin-explorer/src/types/Graph.ts:15
- 953b2cea-426 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-file-system/src/capabilities/app-graph-builder.ts:38
- 953b2cea-427 - resolved - comment-hygiene - packages/plugins/plugin-file-system/src/capabilities/state/markdown-documents.ts:141
- 953b2cea-428 - ignored - story-for-new-ui-component - packages/plugins/plugin-file/src/components/FileInput/FileInput.tsx:1
- 953b2cea-429 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-game/src/components/CreateGamePanel.tsx:1
- 953b2cea-430 - ignored - errors-extend-base-error - packages/plugins/plugin-game/src/util/load-game.ts:11
- 953b2cea-431 - ignored - story-for-new-ui-component - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:1
- 953b2cea-432 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:103
- 953b2cea-433 - ignored - story-for-new-ui-component - packages/plugins/plugin-github/src/components/PullRequestFiles/PullRequestFiles.tsx:1
- 953b2cea-434 - ignored - story-for-new-ui-component - packages/plugins/plugin-github/src/components/PullRequestOverview/PullRequestOverview.tsx:1
- 953b2cea-435 - ignored - story-for-new-ui-component - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:1
- 953b2cea-436 - ignored - story-for-new-ui-component - packages/plugins/plugin-github/src/components/WalkthroughView/WalkthroughView.tsx:1
- 953b2cea-437 - resolved - no-invented-theme-tokens - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:217
- 953b2cea-438 - resolved - no-invented-theme-tokens - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:259
- 953b2cea-439 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-github/src/GitHubPlugin.workerd.test.ts:1
- 953b2cea-440 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-github/src/hooks/useSyncPullRequest.ts:20
- 953b2cea-441 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/services/index.ts:5
- 953b2cea-442 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-github/src/stories/PullRequestArticle.stories.tsx:24
- 953b2cea-443 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-github/src/stories/PullRequestsArticle.stories.tsx:26
- 953b2cea-444 - resolved - jsdoc-non-obvious-identifiers - packages/plugins/plugin-google/src/apis/GoogleContacts/api.ts:74
- 953b2cea-445 - resolved - comment-hygiene - packages/plugins/plugin-google/src/operations/mail/sync/tag-push.test.ts:209
- 953b2cea-446 - ignored - errors-extend-base-error - packages/plugins/plugin-heygen/src/services/heygen-provider-types.ts:60
- 953b2cea-447 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:141
- 953b2cea-448 - ignored - errors-extend-base-error - packages/plugins/plugin-higgsfield/src/services/higgsfield-provider-types.ts:62
- 953b2cea-449 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:273
- 953b2cea-450 - ignored - parent-ref-backs-parent-pointer - packages/plugins/plugin-ibkr/src/sync.ts:61
- 953b2cea-451 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-illustrator/src/components/CreateDrawingPanel.tsx:1
- 953b2cea-452 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-illustrator/src/components/SceneSvg.tsx:1
- 953b2cea-453 - ignored - no-hand-rolled-lists - packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:85
- 953b2cea-454 - resolved - errors-extend-base-error - packages/plugins/plugin-illustrator/src/util/load-drawing.ts:12
- 953b2cea-455 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:638
- 953b2cea-456 - ignored - story-for-new-ui-component - packages/plugins/plugin-inbox/src/components/Initialize/Initialize.tsx:1
- 953b2cea-457 - ignored - story-for-new-ui-component - packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx:1
- 953b2cea-458 - ignored - story-for-new-ui-component - packages/plugins/plugin-inbox/src/components/RelatedEvents/RelatedEvents.tsx:1
- 953b2cea-459 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:62
- 953b2cea-460 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:199
- 953b2cea-461 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:35
- 953b2cea-462 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:1
- 953b2cea-463 - ignored - functions-before-classes - packages/plugins/plugin-inbox/src/testing/builder.ts:97
- 953b2cea-464 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:86
- 953b2cea-465 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:53
- 953b2cea-466 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- 953b2cea-467 - ignored - errors-extend-base-error - packages/plugins/plugin-library/src/operations/http.ts:15
- 953b2cea-468 - resolved - comment-hygiene - packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:110
- 953b2cea-469 - resolved - no-impossible-state-handling - packages/plugins/plugin-magazine/src/operations/fetch-article-content.ts:22
- 953b2cea-470 - resolved - errors-extend-base-error - packages/plugins/plugin-magazine/src/operations/sources/feed-fetcher.ts:20
- 953b2cea-471 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-magazine/src/stories/MagazineCurate.stories.tsx:41
- 953b2cea-472 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:365
- 953b2cea-473 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx:49
- 953b2cea-474 - ignored - dont-recompute-in-reactive-closures - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:252
- 953b2cea-475 - resolved - layout-only-wrapper-invisible-to-a11y - packages/plugins/plugin-meeting/src/containers/MeetingsList/MeetingsList.tsx:79
- 953b2cea-476 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-meeting/src/containers/MeetingsList/MeetingsList.tsx:80
- 953b2cea-477 - resolved - dont-recompute-in-reactive-closures - packages/plugins/plugin-messenger/src/capabilities/inbox-materializer.ts:38
- 953b2cea-478 - resolved - structured-logging-not-console - packages/plugins/plugin-native/src/capabilities/ollama.ts:377
- 953b2cea-479 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:356
- 953b2cea-480 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:370
- 953b2cea-481 - resolved - co-locate-tightly-coupled-code - packages/plugins/plugin-navtree/src/components/types.ts:14
- 953b2cea-482 - resolved - co-locate-tightly-coupled-code - packages/plugins/plugin-navtree/src/components/types.ts:25
- 953b2cea-483 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:49
- 953b2cea-484 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:400
- 953b2cea-485 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:885
- 953b2cea-486 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:918
- 953b2cea-487 - ignored - reuse-existing-mechanism - packages/plugins/plugin-onboarding/src/credentials/util.ts:24
- 953b2cea-488 - resolved - comment-hygiene - packages/plugins/plugin-onboarding/src/samples/bramble/roast-log.ts:77
- 953b2cea-489 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:183
- 953b2cea-490 - ignored - dont-recompute-in-reactive-closures - packages/plugins/plugin-pipeline/src/hooks/usePipelineBoardModel.ts:48
- 953b2cea-491 - resolved - no-pointless-indirection - packages/plugins/plugin-presenter/src/components/Markdown/Panel.tsx:39
- 953b2cea-492 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:23
- 953b2cea-493 - resolved - event-handler-naming-convention - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:38
- 953b2cea-494 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:1
- 953b2cea-495 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:44
- 953b2cea-496 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:135
- 953b2cea-497 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:154
- 953b2cea-498 - resolved - comment-hygiene - packages/plugins/plugin-registry/src/commands/registry/util.ts:41
- 953b2cea-499 - ignored - no-hand-rolled-lists - packages/plugins/plugin-registry/src/components/DisableDependentsAlert/DisableDependentsAlert.tsx:50
- 953b2cea-500 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:47
- 953b2cea-501 - resolved - jsdoc-non-obvious-identifiers - packages/plugins/plugin-registry/src/containers/RegistryArticle/RegistryArticle.tsx:19
- 953b2cea-502 - ignored - standalone-service-accessor - packages/plugins/plugin-registry/src/operations/enable-plugins.ts:16
- 953b2cea-503 - resolved - effect-requirement-type-not-erased - packages/plugins/plugin-registry/src/util/assets.ts:44
- 953b2cea-504 - resolved - effect-requirement-type-not-erased - packages/plugins/plugin-registry/src/util/assets.ts:138
- 953b2cea-505 - resolved - effect-requirement-type-not-erased - packages/plugins/plugin-registry/src/util/resolve.ts:73
- 953b2cea-506 - resolved - effect-requirement-type-not-erased - packages/plugins/plugin-registry/src/util/resolve.ts:150
- 953b2cea-507 - resolved - effect-requirement-type-not-erased - packages/plugins/plugin-registry/src/util/resolve.ts:208
- 953b2cea-508 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.stories.tsx:18
- 953b2cea-509 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:67
- 953b2cea-510 - resolved - subscribe-where-you-read - packages/plugins/plugin-routine/src/containers/SkillArticle/SkillArticle.tsx:26
- 953b2cea-511 - resolved - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:35
- 953b2cea-512 - resolved - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:32
- 953b2cea-513 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-sample/src/components/RelatedItemsList.tsx:1
- 953b2cea-514 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:1
- 953b2cea-515 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts:51
- 953b2cea-516 - ignored - inline-obj-parent - packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts:30
- 953b2cea-517 - ignored - no-bare-ref-schema-alias - packages/plugins/plugin-script/src/skills/functions/definitions.ts:14
- 953b2cea-518 - ignored - fix-root-cause-not-symptom - packages/plugins/plugin-script/src/templates/commentary.ts:128
- 953b2cea-519 - ignored - fix-root-cause-not-symptom - packages/plugins/plugin-script/src/templates/commentary.ts:143
- 953b2cea-520 - ignored - flat-layer-composition - packages/plugins/plugin-script/src/templates/discord.ts:108
- 953b2cea-521 - resolved - no-native-form-controls - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:72
- 953b2cea-522 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:82
- 953b2cea-523 - resolved - deprecated-tag-must-be-accurate - packages/plugins/plugin-search/src/hooks/useWebSearch.ts:28
- 953b2cea-524 - resolved - test-asserts-real-behavior - packages/plugins/plugin-search/src/search/exa.test.ts:67
- 953b2cea-525 - resolved - no-premature-abstraction - packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx:485
- 953b2cea-526 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:312
- 953b2cea-527 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:484
- 953b2cea-528 - ignored - comment-hygiene - packages/plugins/plugin-sequencer/src/util/lead-sheet.ts:8
- 953b2cea-529 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-sheet/src/model/sheet-model.ts:140
- 953b2cea-530 - ignored - errors-extend-base-error - packages/plugins/plugin-sheet/src/types/SheetUtil.ts:26
- 953b2cea-531 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-sidekick/src/components/ActionItems.tsx:15
- 953b2cea-532 - ignored - co-locate-tightly-coupled-code - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:14
- 953b2cea-533 - resolved - layout-only-wrapper-invisible-to-a11y - packages/plugins/plugin-sidekick/src/containers/SidekickArticle/SidekickArticle.tsx:18
- 953b2cea-534 - ignored - dont-recompute-in-reactive-closures - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:250
- 953b2cea-535 - ignored - dont-recompute-in-reactive-closures - packages/plugins/plugin-space/src/capabilities/dashboard.ts:41
- 953b2cea-536 - resolved - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-space/src/commands/database/remove.ts:28
- 953b2cea-537 - resolved - effect-requirement-type-not-erased - packages/plugins/plugin-space/src/commands/space/join/join.ts:49
- 953b2cea-538 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:123
- 953b2cea-539 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:22
- 953b2cea-540 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:22
- 953b2cea-541 - resolved - layout-only-wrapper-invisible-to-a11y - packages/plugins/plugin-space/src/containers/ImportSpaceDialog/ImportSpaceDialog.tsx:83
- 953b2cea-542 - ignored - no-hand-rolled-lists - packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx:34
- 953b2cea-543 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:76
- 953b2cea-544 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-space/src/hooks/useEdgeStatus.ts:26
- 953b2cea-545 - ignored - avoid-full-collection-scans - packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:36
- 953b2cea-546 - ignored - fix-root-cause-not-symptom - packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:64
- 953b2cea-547 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-space/src/migrations/settings-space.ts:98
- 953b2cea-548 - ignored - no-precision-loss-on-generic-refactor - packages/plugins/plugin-space/src/operations/add-relation.ts:44
- 953b2cea-549 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-space/src/operations/add-type.ts:45
- 953b2cea-550 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:184
- 953b2cea-551 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:64
- 953b2cea-552 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:85
- 953b2cea-553 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:56
- 953b2cea-554 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/generate.test.ts:120
- 953b2cea-555 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:84
- 953b2cea-556 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:103
- 953b2cea-557 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:163
- 953b2cea-558 - resolved - consistent-file-naming-within-folder - packages/plugins/plugin-tasks/src/components/Journal/Journal.stories.tsx:20
- 953b2cea-559 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:37
- 953b2cea-560 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:290
- 953b2cea-561 - resolved - inline-obj-parent - packages/plugins/plugin-tasks/src/util/task-order.test.ts:109
- 953b2cea-562 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:45
- 953b2cea-563 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:138
- 953b2cea-564 - resolved - no-pointless-indirection - packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:227
- 953b2cea-565 - ignored - functions-before-classes - packages/plugins/plugin-tldraw/src/model/RecordBuilder.ts:170
- 953b2cea-566 - resolved - options-object-with-defaults - packages/plugins/plugin-transcription/src/types/TranscriptionCapabilities.ts:42
- 953b2cea-567 - resolved - no-pointless-indirection - packages/plugins/plugin-transformer/src/components/Voice/Voice.tsx:21
- 953b2cea-568 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:204
- 953b2cea-569 - resolved - follow-existing-lazy-loading-pattern - packages/plugins/plugin-trip/src/capabilities/index.ts:36
- 953b2cea-570 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/capabilities/marker-provider.tsx:131
- 953b2cea-571 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:58
- 953b2cea-572 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:51
- 953b2cea-573 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:266
- 953b2cea-574 - ignored - functions-before-classes - packages/plugins/plugin-trip/src/testing/builder.ts:75
- 953b2cea-575 - resolved - setter-must-not-own-transaction - packages/plugins/plugin-trip/src/types/Segment.ts:204
- 953b2cea-576 - resolved - setter-must-not-own-transaction - packages/plugins/plugin-trip/src/types/Segment.ts:218
- 953b2cea-577 - resolved - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-video/src/capabilities/app-graph-builder.ts:32
- 953b2cea-578 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:27
- 953b2cea-579 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:73
- 953b2cea-580 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/containers/ZenArticle/ZenArticle.tsx:18
- 953b2cea-581 - ignored - comment-hygiene - packages/reflect/introspect-mcp/src/server/server.test.ts:86
- 953b2cea-582 - resolved - barrel-imports-not-internal-paths - packages/sdk/app-framework/src/testing/react.tsx:15
- 953b2cea-583 - resolved - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:93
- 953b2cea-584 - resolved - barrel-imports-not-internal-paths - packages/sdk/app-framework/src/ui/hooks/useActivationSignal.ts:10
- 953b2cea-585 - resolved - barrel-imports-not-internal-paths - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:23
- 953b2cea-586 - resolved - barrel-imports-not-internal-paths - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:25
- 953b2cea-587 - resolved - barrel-imports-not-internal-paths - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:15
- 953b2cea-588 - ignored - consistent-private-field-convention - packages/sdk/app-graph/src/AppGraphBuilder.ts:239
- 953b2cea-589 - ignored - no-compat-shims - packages/sdk/app-graph/src/AppGraphBuilder.ts:282
- 953b2cea-590 - ignored - consistent-file-naming-within-folder - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:1
- 953b2cea-591 - ignored - setter-must-not-own-transaction - packages/sdk/app-toolkit/src/echo/AppSpace.ts:97
- 953b2cea-592 - ignored - setter-must-not-own-transaction - packages/sdk/app-toolkit/src/echo/AppSpace.ts:147
- 953b2cea-593 - resolved - deprecated-tag-must-be-accurate - packages/sdk/app-toolkit/src/echo/AppSpace.ts:252
- 953b2cea-594 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-toolkit/src/index.ts:1
- 953b2cea-595 - resolved - construct-populated-dont-mutate-after - packages/sdk/app-toolkit/src/types/AppSettings.ts:42
- 953b2cea-596 - ignored - no-precision-loss-on-generic-refactor - packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.ts:187
- 953b2cea-597 - ignored - test-asserts-real-behavior - packages/sdk/client-e2e/src/client.test.ts:134
- 953b2cea-598 - ignored - namespace-export-with-internal-hiding - packages/sdk/client-protocol/src/index.ts:1
- 953b2cea-599 - resolved - collapse-branches-via-identity-element - packages/sdk/client-protocol/src/Rpc.ts:64
- 953b2cea-600 - resolved - deprecated-tag-must-be-accurate - packages/sdk/client-protocol/src/space.ts:133
- 953b2cea-601 - resolved - schema-declare-and-brand - packages/sdk/client-protocol/src/space.ts:178
- 953b2cea-602 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- 953b2cea-603 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:95
- 953b2cea-604 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:130
- 953b2cea-605 - ignored - name-for-general-behavior - packages/sdk/client-services/src/internal/identity/identity-manager.ts:132
- 953b2cea-606 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:616
- 953b2cea-607 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-recovery-manager.ts:361
- 953b2cea-608 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:398
- 953b2cea-609 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/invitations/invitation-host-extension.ts:299
- 953b2cea-610 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:668
- 953b2cea-611 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:161
- 953b2cea-612 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/layer-specs.ts:447
- 953b2cea-613 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:49
- 953b2cea-614 - ignored - test-asserts-real-behavior - packages/sdk/client-services/src/internal/space/space-manager.browser.test.ts:32
- 953b2cea-615 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157
- 953b2cea-616 - resolved - consistent-private-field-convention - packages/sdk/client/src/invitations/invitations-proxy.ts:275
- 953b2cea-617 - ignored - errors-extend-base-error - packages/sdk/client/src/services/agent-hosting-provider.ts:39
- 953b2cea-618 - ignored - barrel-imports-not-internal-paths - packages/sdk/examples/src/stories/examples.stories.tsx:12
- 953b2cea-619 - resolved - event-handler-naming-convention - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:12
- 953b2cea-620 - resolved - consistent-private-field-convention - packages/sdk/observability/src/extensions/otel/metrics.ts:81
- 953b2cea-621 - resolved - consistent-private-field-convention - packages/sdk/observability/src/extensions/otel/traces-browser.ts:40
- 953b2cea-622 - ignored - reactive-state-via-atom-bridge - packages/sdk/react-client/src/client/useClientStatus.ts:10
- 953b2cea-623 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/annotations/atproto-record.ts:6
- 953b2cea-624 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/annotations/factory.ts:5
- 953b2cea-625 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:612
- 953b2cea-626 - ignored - reactive-state-via-atom-bridge - packages/sdk/shell/src/panels/IdentityPanel/useEdgeAgentsHandlers.ts:47
- 953b2cea-627 - ignored - fix-root-cause-not-symptom - packages/sdk/shell/src/panels/JoinPanel/JoinPanel.tsx:217
- 953b2cea-628 - ignored - schema-field-uses-platform-reference-mechanism - packages/sdk/types/src/types/Message.ts:42
- 953b2cea-629 - ignored - name-for-general-behavior - packages/sdk/types/src/types/Pipeline.ts:20
- 953b2cea-630 - ignored - inject-dependencies-via-constructor - packages/sdk/types/src/types/TaskMigration.ts:66
- 953b2cea-631 - ignored - consistent-file-naming-within-folder - packages/sdk/versioning/src/Branch.test.ts:1
- 953b2cea-632 - resolved - collapse-branches-via-identity-element - packages/sdk/worker-framework/src/internal/rpc.ts:76
- 953b2cea-633 - resolved - collapse-branches-via-identity-element - packages/sdk/worker-framework/src/internal/rpc.ts:145
- 953b2cea-634 - resolved - consistent-file-naming-within-folder - packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx:88
- 953b2cea-635 - resolved - no-invented-theme-tokens - packages/stories/stories-agent/src/modules/ConversationModule.tsx:81
- 953b2cea-636 - resolved - no-invented-theme-tokens - packages/stories/stories-agent/src/modules/DiscordBotModule.tsx:122
- 953b2cea-637 - resolved - obj-update-push - packages/stories/stories-agent/src/testing/discord.ts:116
- 953b2cea-638 - resolved - obj-update-push - packages/stories/stories-agent/src/testing/support-team.ts:123
- 953b2cea-639 - ignored - namespace-export-with-internal-hiding - packages/ui/react-primitives/react-hooks/src/index.ts:1
- 953b2cea-640 - resolved - no-invented-theme-tokens - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:134
- 953b2cea-641 - ignored - name-for-general-behavior - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:26
- 953b2cea-642 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/About/About.tsx:5
- 953b2cea-643 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Breadcrumbs/Breadcrumbs.tsx:5
- 953b2cea-644 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/ControlFrame/ControlFrame.tsx:11
- 953b2cea-645 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/ControlFrame/ControlFrame.tsx:82
- 953b2cea-646 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Grid/Grid.tsx:5
- 953b2cea-647 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/LatticeGrid/LatticeGrid.tsx:5
- 953b2cea-648 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:5
- 953b2cea-649 - resolved - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:172
- 953b2cea-650 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:7
- 953b2cea-651 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/PartEditor/PartEditor.tsx:46
- 953b2cea-652 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/AlignField.tsx:6
- 953b2cea-653 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/ClassField.tsx:5
- 953b2cea-654 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:5
- 953b2cea-655 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:6
- 953b2cea-656 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/Properties.tsx:15
- 953b2cea-657 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/SceneField.tsx:5
- 953b2cea-658 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:5
- 953b2cea-659 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:11
- 953b2cea-660 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:78
- 953b2cea-661 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:10
- 953b2cea-662 - ignored - no-trivial-wrappers-over-official-apis - packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:77
- 953b2cea-663 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:14
- 953b2cea-664 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:721
- 953b2cea-665 - ignored - intents-not-coordinates - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1370
- 953b2cea-666 - resolved - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/SceneView/useSceneKeys.ts:155
- 953b2cea-667 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:12
- 953b2cea-668 - resolved - barrel-imports-not-internal-paths - packages/ui/react-ui-canvas/src/model/registry.ts:21
- 953b2cea-669 - resolved - no-trivial-wrappers-over-official-apis - packages/ui/react-ui-canvas/src/playwright/demo.spec.ts:32
- 953b2cea-670 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:28
- 953b2cea-671 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:268
- 953b2cea-672 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:372
- 953b2cea-673 - ignored - co-locate-tightly-coupled-code - packages/ui/react-ui-form/src/components/FieldEditor.tsx:1
- 953b2cea-674 - ignored - co-locate-tightly-coupled-code - packages/ui/react-ui-form/src/components/Form.tsx:1
- 953b2cea-675 - ignored - errors-extend-base-error - packages/ui/react-ui-form/src/components/layout/parser.ts:30
- 953b2cea-676 - ignored - co-locate-tightly-coupled-code - packages/ui/react-ui-form/src/components/ObjectForm.tsx:1
- 953b2cea-677 - ignored - co-locate-tightly-coupled-code - packages/ui/react-ui-form/src/components/ViewEditor.tsx:1
- 953b2cea-678 - resolved - no-pointless-indirection - packages/ui/react-ui-gameboard/src/components/Gameboard/Square.tsx:75
- 953b2cea-679 - resolved - extract-non-rendering-logic-from-component - packages/ui/react-ui-graph/src/components/Graph/Graph.tsx:179
- 953b2cea-680 - resolved - no-premature-abstraction - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- 953b2cea-681 - ignored - co-locate-tightly-coupled-code - packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:1
- 953b2cea-682 - resolved - consistent-file-naming-within-folder - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:71
- 953b2cea-683 - ignored - themed-primitives-take-classNames - packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:54
- 953b2cea-684 - resolved - no-pointless-indirection - packages/ui/react-ui-pickers/src/components/EmojiPicker/EmojiPicker.tsx:52
- 953b2cea-685 - resolved - no-pointless-indirection - packages/ui/react-ui-pickers/src/components/EmojiPicker/EmojiPicker.tsx:117
- 953b2cea-686 - resolved - no-pointless-indirection - packages/ui/react-ui-pickers/src/components/PickerButton/PickerButton.tsx:53
- 953b2cea-687 - resolved - no-pointless-indirection - packages/ui/react-ui-query/src/components/QueryEditor/query-extension.ts:340
- 953b2cea-688 - resolved - no-pointless-indirection - packages/ui/react-ui-search/src/components/SearchList/hooks/useSearchListResults.ts:47
- 953b2cea-689 - resolved - error-messages-carry-context - packages/ui/react-ui-table/src/util/dynamic-table.ts:49
- 953b2cea-690 - resolved - no-trivial-wrappers-over-official-apis - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:24
- 953b2cea-691 - resolved - no-pointless-indirection - packages/ui/react-ui-thread/src/command.ts:40
- 953b2cea-692 - resolved - consistent-private-field-convention - packages/ui/react-ui-transcription/src/capture/media-stream-recorder.ts:147
- 953b2cea-693 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-transcription/src/index.ts:1
- 953b2cea-694 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-virtual/src/index.ts:1
- 953b2cea-695 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- 953b2cea-696 - resolved - options-object-with-defaults - packages/ui/react-ui/src/next/components/Container/Container.tsx:104
- 953b2cea-697 - resolved - no-pointless-indirection - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:59
- 953b2cea-698 - ignored - inject-dependencies-via-constructor - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:241
- 953b2cea-699 - ignored - errors-extend-base-error - packages/ui/ui-template/src/model.ts:184
- 953b2cea-700 - ignored - errors-extend-base-error - packages/ui/ui-template/src/parser.ts:21
- 953b2cea-701 - ignored - errors-extend-base-error - packages/ui/ui-template/src/system.ts:171
- 953b2cea-702 - resolved - options-object-with-defaults - packages/ui/ui-theme/src/plugins/ThemePlugin.ts:136
- 953b2cea-703 - ignored - name-for-general-behavior - packages/ui/ui-theme/src/util/hash-styles.ts:186
- 953b2cea-704 - ignored - namespace-export-with-internal-hiding - packages/ui/ui-types/src/index.ts:1

## Issues

# WARN 953b2cea-1 harness-script-hygiene `.agents/skills/agentic-review/lib/store.ts:141`

`(group as { ruleId: unknown }).ruleId` is a cast used to silence the type checker, directly after an `'ruleId' in group` check. Use a small type-guard or read the property from a `Record<string, unknown>` narrowed value instead of casting.

# WARN 953b2cea-2 harness-script-hygiene `.agents/skills/agentic-review/scripts/system-one.ts:235`

`JSON.parse(...) as GroupsManifest` casts untrusted file contents to silence the type checker, so a malformed or stale groups manifest fails later with an unrelated error. Parse into `unknown` and validate with a type guard (as `store.ts` does for the same manifest), per the rule against casts.

# WARN 953b2cea-3 no-trivial-wrappers-over-official-apis `packages/apps/composer-app/scripts/score-perf.ts:63`

`relative` only forwards to `path.relative(APP_ROOT, file)`. Inline `path.relative(APP_ROOT, file)` at the call sites.

# WARN 953b2cea-4 event-handler-naming-convention `packages/apps/composer-app/src/main.tsx:653`

`submitReport` is a callback handed to the `onSubmitReport` prop, but the handler itself lacks the `handle` prefix. Rename to `handleReportSubmit` per the `event-handler-naming-convention` rule.

# WARN 953b2cea-5 consistent-field-and-list-ordering `packages/apps/composer-app/src/plugin-defs.core.tsx:139`

`NativePlugin.make()` follows `OnboardingPlugin` although the surrounding core plugin registry is alphabetical. Move it to between `MessengerPlugin` and `NavTreePlugin` (keeping its conditional).

# WARN 953b2cea-6 consistent-field-and-list-ordering `packages/apps/composer-app/src/plugin-defs.tsx:306`

`QaPlugin.make()` is listed between `PresenterPlugin` and `ProjectsPlugin`, breaking the alphabetical ordering of the `getPlugins` registry. Move it after `ProjectsPlugin.make()` (before `ReviewPlugin`), per the flat-registry alphabetical convention.

# WARN 953b2cea-7 consistent-field-and-list-ordering `packages/apps/composer-app/src/plugin-defs.tsx:312`

`SidekickPlugin.make()` is placed before `SheetPlugin.make()` in the alphabetically ordered `getPlugins` list. Reorder so `SheetPlugin` precedes `SidekickPlugin`.

# WARN 953b2cea-8 consistent-field-and-list-ordering `packages/apps/composer-app/src/plugin-defs.tsx:316`

`TypeSafePlugin.make()` sits before `TasksPlugin.make()`, out of alphabetical order in the registry. Move it after `TranscriptionPlugin` (or to the position matching its name), keeping the list sorted.

# WARN 953b2cea-9 consistent-field-and-list-ordering `packages/apps/composer-app/src/plugin-defs.tsx:347`

`AgentPlugin.make()` is in the `experimental` list between `IdeogramPlugin` and `IrohBeaconPlugin`, but the rest of the list is alphabetical. Move it to the top of the list (before `BloggerPlugin`); the same misplacement exists in the matching profile-key list near line 165.

# ERROR 953b2cea-10 no-casts `packages/apps/testbench-app/src/components/Error.tsx:14`

`(error as any)?.stack`. Narrow with `error instanceof Error`. Violates the no-casts rule.

# WARN 953b2cea-11 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:68`

`setValue` setter wraps a single property assignment in its own `Obj.update`, so editing several fields yields one transaction each. Fix: mutate within a caller-owned update.

# ERROR 953b2cea-12 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:87`

`(object as any)[property]`. Type the property key as `keyof` the object type. Violates the no-casts rule.

# WARN 953b2cea-13 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:88`

Leftover `console.log` debug calls (lines 88, 92, 130) in a module that already imports and uses `log` from `@dxos/log` (line 108), so it mixes both APIs. Replace with `log.info`/`log.debug` structured calls; the invitation `subscribe` callback at line 92 fires on every state change and should be `debug`.

# WARN 953b2cea-14 deprecated-tag-must-be-accurate `packages/common/async/src/event-emitter.ts:19`

`addListener` is tagged `@deprecated` with no replacement. Name the replacement (e.g. `onEvent`) in the tag, or replace the tag with a TODO if none exists.

# ERROR 953b2cea-15 no-casts `packages/common/async/src/events.ts:304`

`return this as any` erases the return type. Type the method's return to `this`/the real event type so no cast is needed. Violates the no-casts rule.

# WARN 953b2cea-16 namespace-export-with-internal-hiding `packages/common/async/src/index.ts:1`

This barrel blanket-re-exports 22 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-17 no-sleep-in-test `packages/common/async/src/mutex.test.ts:75`

`sleep(10)` to synchronize with queued async work (also lines 173, 180). Use a `Trigger` to sequence the test. Rule: no-sleep-in-test.

# ERROR 953b2cea-18 no-casts `packages/common/async/src/mutex.ts:108`

`(globalThis as any).mochaExecutor` is an `as any` cast. Declare the global (e.g. `declare global`/typed `globalThis` interface) instead. Violates the no-casts rule.

# WARN 953b2cea-19 deprecated-tag-must-be-accurate `packages/common/async/src/observable-value.ts:12`

`ObservableValue` and the related Cancellable* types (lines 22, 60, 67, 78) carry a bare `@deprecated`. Name the replacement API (Effect streams / `Event`) or use a TODO.

# WARN 953b2cea-20 no-sleep-in-test `packages/common/async/src/persistent-lifecycle.test.ts:55`

`sleep(10)` before awaiting a trigger; the real sleep is unnecessary. Remove it or use `TestClock`/fake timers. Rule: no-sleep-in-test.

# WARN 953b2cea-21 no-env-vars-in-low-level-modules `packages/common/async/src/track-leaks.ts:8`

The low-level async module reads `process.env.DX_TRACK_LEAKS` at import time to enable tracking. Expose an explicit enable option/function and have the top-level bootstrap decide from the environment.

# WARN 953b2cea-22 no-sleep-in-test `packages/common/crx-protocol/src/testing/conformance.test.ts:31`

`setTimeout(…, 0)` used to wait for a message to be delivered. Use a `Trigger` resolved by the receiver, or `waitForCondition`. Rule: no-sleep-in-test.

# WARN 953b2cea-23 deprecated-tag-must-be-accurate `packages/common/crypto/src/random.ts:17`

`createId` is `@deprecated` with no replacement; the adjacent `TODO(burdon): Remove.` shows no migration path is named. Name the replacement id helper or drop the tag.

# WARN 953b2cea-24 namespace-export-with-internal-hiding `packages/common/debug/src/index.ts:1`

This barrel blanket-re-exports 16 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-25 structured-logging-not-console `packages/common/debug/src/log-method.ts:14`

The `logMethod` decorator prints every call, rejection and throw with `console.log`, so it spams on each decorated method invocation and uses the wrong API. Use `log` from `@dxos/log` at `debug`/`trace` level (and `log.catch`/`log.warn` for the rejected/thrown paths).

# WARN 953b2cea-26 structured-logging-not-console `packages/common/debug/src/timeout-warning.ts:18`

Timeout warning emitted with `console.warn` (eslint-disabled). Use `log.warn` from `@dxos/log` with structured `{ context, timeout }` fields.

# WARN 953b2cea-27 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:7`

The barrel re-exports `./aesthetics.ts` as the namespace `Aesthetics`, but the module has a lowercase filename and no `// @import-as-namespace` directive. Rename it to `Aesthetics.ts`, add the directive under the copyright header, and update the barrel.

# WARN 953b2cea-28 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:12`

`export * as DxSvg from './dx-svg.ts'` exports a namespace from a hyphenated filename with no directive. Rename the file to `DxSvg.ts` and add `// @import-as-namespace`; the same applies to `mermaid-engine.ts`, `semantic-engine.ts`, `semantic-place.ts`, `semantic-route.ts` and `uml-*.ts` on lines 15 and 22-32.

# WARN 953b2cea-29 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:19`

`export * as Rules from './rules.ts'` (and `Scene`, `View`, `Layout`, `Ports`, `Score`, `Ui`, `Uml`, `Nudge`, `Mermaid`, `Objective`, `Appeal`, `Architecture`, `Diagnostics`, `Semantic` on lines 8-27) re-exports lowercase files as namespaces without the directive. Capitalize each filename and add the directive.

# WARN 953b2cea-30 comment-hygiene `packages/common/diagram/src/ui.ts:7`

The comment says "Phase 1 scope", a rollout-phase label. Describe the current supported behavior (a single ...) without the phase number.

# ERROR 953b2cea-31 no-casts `packages/common/effect-atom-solid/src/hooks/useAtomSet.ts:47`

`(value as any)(registry.get(atom))` call cast. Narrow with the proper updater function type. Violates the no-casts rule.

# ERROR 953b2cea-32 no-casts `packages/common/effect-atom-solid/src/hooks/useAtomSuspense.ts:55`

`(next as any).waiting` cast. Narrow the result union so `waiting` is accessible. Violates the no-casts rule.

# ERROR 953b2cea-33 no-casts `packages/common/effect-zod/src/effect-to-zod.ts:52`

`prop.ast as unknown as AnyAst` double cast. Narrow with a type guard or fix the AST type. Violates the no-casts rule.

# ERROR 953b2cea-34 no-casts `packages/common/effect/src/Hook.ts:79`

`undefined as any` for `_Data`. Use a properly typed variance marker. Violates the no-casts rule.

# WARN 953b2cea-35 import-as-namespace-is-all-or-nothing `packages/common/effect/src/index.ts:6`

`export * as DynamicRuntime from './dynamic-runtime.ts'` re-exports a hyphenated, lowercase file with no `@import-as-namespace` directive. Rename to `DynamicRuntime.ts` and add the directive.

# ERROR 953b2cea-36 no-casts `packages/common/effect/src/internal/async-task-tagging.ts:27`

`(console as any).createTask` and `(span as any)[runInTask]` casts. Declare a typed interface for `console.createTask` and the span extension. Violates the no-casts rule.

# WARN 953b2cea-37 import-as-namespace-is-all-or-nothing `packages/common/effect/src/internal/index.ts:6`

`export * as SchemaAST from './schema-ast.ts'`: the namespace name differs from the filename and the module has no directive. Rename the file to `SchemaAST.ts` or align the names, and add the directive.

# WARN 953b2cea-38 no-precision-loss-on-generic-refactor `packages/common/effect/src/internal/json-path.ts:122`

`getValue` declares a generic `T extends object` yet returns `any`, and `setValue` takes `value: any`; the generic is not used to relate the path to the result. Return `unknown` (or a type parameter for the expected value, e.g. `<V = unknown>`) and type `value` to match, so callers keep type precision instead of silently receiving `any`.

# ERROR 953b2cea-39 no-casts `packages/common/feed-store/src/hypercore-wrapper.ts:172`

`(this._hypercore as any).on(...)` silences the type-checker. Add the missing `on`/`off` to the hypercore type declaration. Violates the no-casts rule.

# ERROR 953b2cea-40 no-casts `packages/common/feed-store/src/hypercore-wrapper.ts:245`

Double `as any` on `_putBuffer` and its bound function. Extend the hypercore typings with `_putBuffer` rather than casting. Violates the no-casts rule.

# WARN 953b2cea-41 namespace-export-with-internal-hiding `packages/common/feed-store/src/index.ts:1`

This barrel blanket-re-exports 7 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-42 no-impossible-state-handling `packages/common/hypercore/src/crypto.ts:39`

`invariant(signer)` already guarantees `signer`, yet `signer.sign.bind(signer!)` uses a non-null assertion. Remove the `!`.

# ERROR 953b2cea-43 no-casts `packages/common/hypercore/src/iterator.ts:22`

`stream as any` passed to `wrap`. Type the stream as a compatible readable. Violates the no-casts rule.

# WARN 953b2cea-44 no-sleep-in-test `packages/common/hypercore/src/replicate.test.ts:309`

Fixed `sleep(1_000)` to wait for replication. Wait on a replication event with a `Trigger` or `waitForCondition`. Rule: no-sleep-in-test.

# WARN 953b2cea-45 no-sleep-in-test `packages/common/hypercore/src/replicate.test.ts:378`

Fixed `sleep(1000)` to wait for async replication. Replace with an event-driven wait (`Trigger`/`waitForCondition`). Rule: no-sleep-in-test.

# WARN 953b2cea-46 schema-declare-and-brand `packages/common/keys/src/DXN.ts:31`

`DXN` is a hand-rolled `URI.URI & { readonly __DXN: unique symbol }` brand. Use `Brand.Brand<'DXN'>` instead of the unique-symbol intersection.

# ERROR 953b2cea-47 no-casts `packages/common/keys/src/DXN.ts:222`

`as unknown as Schema.Codec<DXN, DXN>` is the double-cast escape hatch. Fix the schema's declared type at its source. Violates the no-casts rule.

# WARN 953b2cea-48 schema-declare-and-brand `packages/common/keys/src/EID.ts:48`

`EID` is a hand-rolled `URI.URI & { readonly __EID: unique symbol }` brand. Use `Brand.Brand<'EID'>` instead of the unique-symbol intersection.

# ERROR 953b2cea-49 no-casts `packages/common/keys/src/EID.ts:170`

`as unknown as Schema.Codec<EID, EID>` double cast. Fix the schema type at its source. Violates the no-casts rule.

# WARN 953b2cea-50 schema-declare-and-brand `packages/common/keys/src/URI.ts:13`

`URI` is a hand-rolled `string & { readonly __URI: unique symbol }` brand. Use Effect's `Brand.Brand<'URI'>` (`string & Brand.Brand<'URI'>`), with `Brand.nominal`/`Brand.refined` replacing the unchecked `make` cast.

# ERROR 953b2cea-51 no-casts `packages/common/keys/src/URI.ts:34`

`as unknown as Schema.Codec<URI, URI>` double cast. Fix the schema type at its source. Violates the no-casts rule.

# ERROR 953b2cea-52 no-casts `packages/common/log/src/context.ts:297`

`(rawContext as any).context` and `(entry.error as any).context`. Narrow with a type guard. Violates the no-casts rule.

# ERROR 953b2cea-53 no-casts `packages/common/log/src/decorators.ts:24`

`this as any` passed as `S`. Type the decorator's `this` parameter properly. Violates the no-casts rule.

# ERROR 953b2cea-54 no-casts `packages/common/log/src/experimental/ownership.ts:77`

Many `(this as any)` / `(globalThis as any)` casts for ownership scope. Declare a typed global/interface for these symbol-keyed fields. Violates the no-casts rule.

# WARN 953b2cea-55 namespace-export-with-internal-hiding `packages/common/log/src/index.ts:1`

This barrel blanket-re-exports 9 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# ERROR 953b2cea-56 no-casts `packages/common/log/src/log.ts:207`

`(globalThis as any).DX_LOG`. Declare `DX_LOG` on a global interface. Violates the no-casts rule.

# WARN 953b2cea-57 no-env-vars-in-low-level-modules `packages/common/log/src/processors/file-processor.ts:87`

`getLogFilePath` reads `LOG_FILE` and `HOME` inline to build the default `FILE_PROCESSOR`, though `createFileProcessor` takes `pathOrFd` explicitly. Resolve the path in the bootstrap layer and pass it in rather than reading the environment inside the log module.

# ERROR 953b2cea-58 no-casts `packages/common/random-access-storage/src/browser/idb-storage.ts:70`

Repeated `(file as any).destroyed/unlinked/closed/deletable` assignments. Define a file interface with these fields. Violates the no-casts rule.

# ERROR 953b2cea-59 no-casts `packages/common/random-access-storage/src/browser/web-fs.ts:252`

`as any as RandomAccessStorage` double cast. Make the object literal satisfy the interface. Violates the no-casts rule.

# ERROR 953b2cea-60 no-casts `packages/common/random-access-storage/src/common/memory-storage.ts:50`

`(file as any).length` cast. Type the file with its `length` property. Violates the no-casts rule.

# WARN 953b2cea-61 deprecated-tag-must-be-accurate `packages/common/random-access-storage/src/common/storage.ts:12`

`StorageType.CHROME`, `FIREFOX` and `WEBFS` (lines 16, 21) are bare `@deprecated`. State which storage type callers should use instead.

# ERROR 953b2cea-62 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:340`

`as unknown as WasmSqliteClient.SqliteClient` double cast. Build the client so it satisfies the type. Violates the no-casts rule.

# WARN 953b2cea-63 effect-fn-not-hand-wrapped-gen `packages/common/sql-sqlite/src/OpfsWorker.ts:69`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# ERROR 953b2cea-64 no-casts `packages/common/sql-sqlite/src/OpfsWorker.ts:77`

`vfs as any` passed to `vfs_register`. Type the VFS to match the expected interface. Violates the no-casts rule.

# WARN 953b2cea-65 effect-fn-not-hand-wrapped-gen `packages/common/sql-sqlite/src/SqlMigrations.ts:50`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-66 test-asserts-real-behavior `packages/common/sql-sqlite/src/testing/sqlite-effect-idb.browser.test.ts:264`

The update, delete and verification assertions are commented out, so the test does not verify that the updated or deleted rows are persisted. Restore the update/delete steps with their `expect` calls.

# ERROR 953b2cea-67 bounded-live-state `packages/common/tracing/src/buffering-backend.ts:88`

`BufferingTracingBackend.startSpan` pushes every span into `#pending` with no maximum. If no real backend ever registers and `drain` is never called, the buffer grows for the life of the process. Add a named, documented cap (for example `MAX_BUFFERED_SPANS`) enforced before the push, and drop-and-count or raise a typed error rather than growing silently.

# ERROR 953b2cea-68 no-casts `packages/common/tracing/src/diagnostics-channel.ts:71`

`(this._serveChannel as any).unref` casts. Use a typed channel handle exposing `unref`. Violates the no-casts rule.

# WARN 953b2cea-69 no-impossible-state-handling `packages/common/tracing/src/diagnostics-channel.ts:83`

`invariant(this._serveChannel)` at the top of `serve`, then `this._serveChannel!.postMessage` is used. Hold the channel in a local const after the invariant and drop the `!`.

# WARN 953b2cea-70 namespace-export-with-internal-hiding `packages/common/tracing/src/index.ts:1`

This barrel blanket-re-exports 7 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-71 consistent-private-field-convention `packages/common/tracing/src/trace-processor.ts:20`

Class `TraceProcessor` mixes `#activeBackend`/`#bufferingBackend` with `private _instanceTag` (line 56) for the same kind of internal state. Pick one convention for the whole class; per the rule, convert `_instanceTag` to `#instanceTag` (or revert the `#` fields).

# WARN 953b2cea-72 schema-declare-and-brand `packages/common/util/src/id.ts:15`

`Id` is a hand-rolled `string & { readonly __id: unique symbol }` brand. Use `Brand.Brand<'Id'>` (with `Brand.refined` for the well-formedness check) instead.

# WARN 953b2cea-73 namespace-export-with-internal-hiding `packages/common/util/src/index.ts:1`

This barrel blanket-re-exports 65 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-74 consistent-file-naming-within-folder `packages/common/util/src/Position.test.ts:1`

Test file is PascalCase while the other ~36 test files in this folder are lowercase kebab-case. Rename to `position.test.ts` per the rule on lowercase kebab-case test files.

# WARN 953b2cea-75 no-sleep-in-test `packages/common/web-context-solid/src/consumer.test.tsx:103`

Waits 50ms with `setTimeout` to assert that something did not update. Flush deterministically (e.g. microtask/effect flush) or use `waitForCondition`. Rule: no-sleep-in-test.

# ERROR 953b2cea-76 errors-extend-base-error `packages/core/compute/agent-code-mode/src/Wire.ts:28`

`WireError` uses `Data.TaggedError`. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-77 inject-dependencies-via-constructor `packages/core/compute/agent-code-mode/src/WorkerdHostWorker.ts:19`

Host handlers are held in a module-level global `Map` mutated by `registerHost` from other modules. Inject a handler registry via constructor/options rather than a global mutable registry.

# WARN 953b2cea-78 consistent-file-naming-within-folder `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:1`

Capitalized test filename next to kebab-case siblings (agent-process, mcp-servers, redelivery). Rename to `agent-service.test.ts`.

# WARN 953b2cea-79 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/mcp-servers.ts:52`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-80 effect-fn-not-hand-wrapped-gen `packages/core/compute/ai/src/AiPreprocessor.ts:410`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-81 effect-requirement-type-not-erased `packages/core/compute/ai/src/testing/tools.test.ts:52`

`handlersFor(...)` is cast `as Effect.Effect<any, never, ToolExecutionService>`, hiding the real success/requirement types. Remove the cast and thread the actual types.

# WARN 953b2cea-82 namespace-brand-key-prefixing `packages/core/compute/ai/src/tools/tool.ts:7`

`Schema.brand('ToolId')` uses a bare brand key with no module-path prefix, so it can collide with any other `ToolId` brand. Namespace it, e.g. `Schema.brand('@dxos/ai/ToolId')`, as `Feed.Cursor` and `Trace.RuntimeName` already do.

# WARN 953b2cea-83 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-e2e/src/harness.ts:174`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-84 comment-hygiene `packages/core/compute/assistant-evals/src/evals/web-search.eval.ts:19`

The comment cites "TESTING.md Phase 2", a planning-phase number. Describe what the scorer does and remove the phase reference.

# ERROR 953b2cea-85 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:60`

`EvalTimeoutError` uses `Data.TaggedError` (also `AgentRunFailure` at line 82). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-86 effect-requirement-type-not-erased `packages/core/compute/assistant-evals/src/Scorer.ts:217`

The result of two `provideService` calls is cast `as Effect.Effect<A, E, Exclude<R, Run | Memo>>`; `provideService` already yields that type, so the cast only masks drift. Remove the cast.

# WARN 953b2cea-87 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/Scorer.ts:225`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-88 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/agent/operations/index.ts:10`

`export * as AgentSkillOperations from './definitions.ts'`: namespace and filename disagree, no directive. The same pattern repeats across the sibling skills (alarm, chat-context, delegation, memory, planning, skill-manager, websearch). Rename each `definitions.ts` to the namespace name and add the directive.

# WARN 953b2cea-89 dependency-direction `packages/core/compute/assistant-toolkit/src/testing/plugins.tsx:13`

The core/compute package `@dxos/assistant-toolkit` imports UI-layer packages (`@dxos/react-ui-syntax-highlighter`, `@dxos/react-ui/Card`) and `@dxos/app-toolkit/AppSurface` to render test surfaces, and exports this module via its `./testing` entry. A core/compute package should not depend on UI libraries for a convenience. Fix: move these UI-rendering test plugins into the consuming layer (a plugin or app testing package) and keep only non-UI fixtures in assistant-toolkit.

# WARN 953b2cea-90 consistent-private-field-convention `packages/core/compute/assistant/src/request/AiRequest.ts:188`

Class `Request` declares `private _history/_pending/_started/_ended/_observer` alongside `#unresolvedTools`, `#announcement` and `#reportUnresolvedTool`. Same-role mutable state is split across two privacy conventions; use one for the whole class.

# WARN 953b2cea-91 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/request/AiRequest.ts:504`

`throw new Error('No toolkit provided')` inside `Effect.gen` becomes an untyped defect. Use `return yield* Effect.fail(...)` with a typed error (rule: no-mixed-promise-effect-lifecycle).

# WARN 953b2cea-92 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:122`

`ArtifactDiffResolver` is read with `Effect.serviceOption`, which the in-code TODO admits is not represented in the type system. Declare it as a requirement and provide a noop resolver layer.

# WARN 953b2cea-93 inject-dependencies-via-constructor `packages/core/compute/assistant/src/session/AiContext.ts:71`

Per-feed binding write counts are kept in a module-level `Map<string, number>` keyed by feed id, accessed via loose `bindingWriteCount(feed)` / `countBindingWrite(feed)` helpers. Store the counter on the Binder (which already owns the feed) instead of in a global map.

# WARN 953b2cea-94 consistent-private-field-convention `packages/core/compute/assistant/src/session/AiContext.ts:99`

Class `Binder` mixes `private _skills/_objects/_registry/_feed/_runtime/_hold` with `#bindingsQuery/#readWrites/#bound/#pending/#heldGeneration`. Use a single convention across the class.

# WARN 953b2cea-95 consistent-private-field-convention `packages/core/compute/assistant/src/session/AiSession.ts:88`

Class `Session` has `readonly #instructions` next to `private readonly _feed/_runtime/_binder/_sessionStore`, which are the same kind of injected readonly dependency. Make them all `#` or all `_`.

# WARN 953b2cea-96 effect-requirement-type-not-erased `packages/core/compute/assistant/src/tool-runtime/services.ts:153`

`makeHandler` returns `Effect.Effect<unknown, any, any>`, erasing both error and requirement channels of tool handlers. Thread a generic `<R>` (or the concrete requirement) instead of `any`.

# WARN 953b2cea-97 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/tool-runtime/services.ts:157`

`throw new Error` inside an `Effect.fn` generator for provider-defined tools. Replace with `yield* Effect.fail(...)` using a typed error.

# WARN 953b2cea-98 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:106`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-99 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Chat.ts:224`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-100 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Chat.ts:265`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-101 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Chat.ts:286`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-102 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:16`

`createArtifactElement` is bare `@deprecated`. Name the replacement for the artifact tag.

# WARN 953b2cea-103 no-trivial-wrappers-over-official-apis `packages/core/compute/brain/src/CompilePrompt.ts:372`

`isKind`, `isDriver` and `isAchievement` (lines 372-376) each only forward to `Schema.is(X)(value)`. Use `Schema.is(Kind)` and the like directly at the call sites, or one shared guard, instead of three renaming wrappers.

# ERROR 953b2cea-104 bounded-live-state `packages/core/compute/compute-hyperformula/src/functions/async-function.ts:143`

`_cache` gets a new entry per distinct `invocationKey` (function name plus args) and is never evicted; the TTL only decides whether to refetch, not whether to drop the entry (it is only cleared wholesale at line 106). A sheet that changes arguments over time grows the cache without bound. Add a named, documented `MAX_CACHE_ENTRIES` and evict the oldest entry (or reject with a typed error) before the `set` here and at line 149.

# WARN 953b2cea-105 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:1`

This barrel blanket-re-exports 7 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-106 consistent-file-naming-within-folder `packages/core/compute/compute-runtime/src/LayerStack.test.ts:1`

Folder mixes PascalCase test files (13 such: LayerStack, ProcessManager, TriggerManager, ...) with kebab-case ones (process-store, protocol, trace-buffer). Pick one convention; tests should be lowercase kebab-case, so rename the PascalCase ones.

# WARN 953b2cea-107 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/LayerStack.ts:42`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-108 no-env-vars-in-low-level-modules `packages/core/compute/compute-runtime/src/node-shell.ts:56`

The shell service spawns children with `{ ...process.env, ...options.env }`, reading the environment inline. Resolve the base environment at the composition root and pass it into the layer/service as a parameter.

# WARN 953b2cea-109 effect-requirement-type-not-erased `packages/core/compute/compute-runtime/src/OperationProcess.ts:100`

The handler effect is cast `as Effect.Effect<Output, never, never>` after `Effect.orDie`, hiding the handler's remaining service requirement instead of providing it. Provide the required services (or thread `R` through the process type) and remove the cast.

# ERROR 953b2cea-110 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessHandle.ts:684`

`requestSubmitOutput` appends every output to `#outputs` for replay in `subscribeOutputs` (line 324). The array is never bounded, so a long-running process that emits outputs retains all of them until the handle is released. Add a named, documented maximum retained outputs, enforced at this push, with a typed error or an explicit documented eviction policy.

# ERROR 953b2cea-111 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessManager.ts:82`

`FINISHED_PROCESS_RETENTION = 200` caps the `#finished` list of terminated process snapshots (evicted via `shift()` in `#release`), which is the correct bounded shape. However, the retention constant has no comment saying why 200 was chosen, which the `collect-dead-entities` rule flags. Fix: add a one-clause comment stating the constraint behind the number (for example, how many finished processes the process tree UI needs to show).

# ERROR 953b2cea-112 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:598`

`spawn` admits a process into `#handles` (also on the restore path at line 788) with no check against a maximum number of live processes. Only the finished list is capped (`FINISHED_PROCESS_RETENTION`); the live set grows with every spawn that has not exited. Add a named, documented `MAX_LIVE_PROCESSES` constant and fail `spawn` with a typed domain error when `#handles.size` reaches it, per the bounded-live-state rule.

# WARN 953b2cea-113 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:293`

`layer` reads `RemoteOperationInvoker.Service` with `Effect.serviceOption`, and its signature requires only `Process.ManagerService`. Declare `RemoteOperationInvoker.Service` and provide a `layerNoop` on hosts without remote invocation.

# WARN 953b2cea-114 no-trivial-wrappers-over-official-apis `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:338`

`registryLayer` only wraps `Layer.succeed(Registry.AtomRegistry, Registry.make())` and is called many times in the test. Inline the `Layer.succeed(...)` call so the layer being provided is visible in each test.

# WARN 953b2cea-115 standalone-service-accessor `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:564`

`const registry = yield* Registry.AtomRegistry; registry.update(...)` is retyped at lines 564, 611, 649, 674 and 1427. Add a local helper wrapping the tag lookup and `update`, and call it at each site.

# WARN 953b2cea-116 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

`TriggerStateStore` is a `Context.Service` subclass with `static layerKv`, which forces callers to spell `TriggerStateStore.TriggerStateStore.layerKv`. Export `layerKv` as a module-level `const` beside the tag and leave the class body empty, per the namespace-service-layers rule.

# WARN 953b2cea-117 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:61`

`static layerMemory` on the `TriggerStateStore` service class repeats the namespace at call sites. Move it to a module-level `const layerMemory`. The `static getState`/`saveState` accessors (lines 35-38) should likewise become module-level accessors built on `Context.Service.use`.

# WARN 953b2cea-118 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Credential.ts:97`

`getApiKey` is typed `Effect<..., never, ...>` yet throws inside `Effect.gen`, hiding the failure from the error channel. Use `Effect.fail` with a typed error and widen E.

# WARN 953b2cea-119 namespace-brand-key-prefixing `packages/core/compute/compute/src/Process.ts:32`

`Schema.brand('ProcessId')` is an unqualified brand key. Use a module-scoped key such as `Schema.brand('@dxos/compute/Process/ID')`, matching the convention in `Trace.ts`.

# WARN 953b2cea-120 construct-populated-dont-mutate-after `packages/core/compute/compute/src/types/Project.ts:108`

`Project.make` builds the project with `Obj.make` and then attaches `taskSet` via a follow-up `Obj.update`. The refs are known before construction, so compute `taskSet` (and `outline`) first and pass `{ ...props, taskSet: props.taskSet ?? Ref.make(TaskSet.make()) }` into the single `Obj.make` call instead of mutating afterwards (rule: construct-populated-dont-mutate-after).

# WARN 953b2cea-121 construct-populated-dont-mutate-after `packages/core/compute/compute/src/types/Project.ts:114`

The `outline` ref is likewise assigned through a separate `Obj.update` right after `Obj.make`. Build `Outline.make({ name: props.name })` up front and include `outline: props.outline ?? Ref.make(outline)` in the initial `Obj.make` props.

# WARN 953b2cea-122 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.ts:305`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-123 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.ts:322`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-124 schema-persists-source-not-derived-duplicate `packages/core/compute/compute/src/types/Trigger.ts:64`

`SubscriptionSpec.query` persists both `raw` (the query grammar string) and `ast` (the parsed AST), which is always computable from the grammar source, so the two can disagree. Persist only the canonical source and derive the other form on read, per the rule (`specSubscription` already writes only `ast`, showing `raw` is not authoritative).

# WARN 953b2cea-125 state-owned-once `packages/core/compute/compute/src/types/TriggerEvent.ts:54`

`SubscriptionEvent` carries the changed object twice: `subject` (a `Ref` that already identifies the object) and the deprecated `changedObjectId`, which `trigger-dispatcher.ts:958` fills in by hand alongside `subject` on every fire. This is two fields serving one purpose after a migration (state-owned-once). Fix: migrate the remaining reader (`Automation.stories.tsx:104`, `{{event.changedObjectId}}`) to derive the id from `subject`, then delete `changedObjectId` from the schema and the dispatcher.

# WARN 953b2cea-126 reuse-shared-test-layer `packages/core/compute/conductor/src/compiler/fiber-compiler.test.ts:39`

Hand-rolls an Operation.Service stub (all methods die with 'not available in test') that is repeated across conductor tests and already exists as the no-service branch of the shared test runtime in compute-hyperformula's testing/test-runtime.ts. Violates reuse-shared-test-layer; extract one shared layer in the conductor testing/ module (next to TestRuntime), import it here, and delete the local copy (it also removes the 'as any' cast).

# WARN 953b2cea-127 no-impossible-state-handling `packages/core/compute/conductor/src/compiler/fiber-compiler.ts:242`

`invariant(this._topology, ...)` already guarantees presence, yet `this._topology!` is used right after (same pattern repeats at lines 252, 262, 289, 411, 517). Rely on the invariant and drop the non-null assertions, per no-impossible-state-handling.

# WARN 953b2cea-128 reuse-shared-test-layer `packages/core/compute/conductor/src/nodes/gpt/gpt.test.ts:29`

Hand-rolls an Operation.Service stub (all methods die with 'not available in test') that is repeated across conductor tests and already exists as the no-service branch of the shared test runtime in compute-hyperformula's testing/test-runtime.ts. Violates reuse-shared-test-layer; extract one shared layer in the conductor testing/ module (next to TestRuntime), import it here, and delete the local copy (it also removes the 'as any' cast).

# WARN 953b2cea-129 no-mixed-promise-effect-lifecycle `packages/core/compute/conductor/src/nodes/registry.ts:346`

`throw new Error` inside `Effect.gen` when the function is not specified. Use `yield* Effect.fail(...)` with a typed error.

# WARN 953b2cea-130 deprecated-tag-must-be-accurate `packages/core/compute/conductor/src/sequence/Sequence.ts:26`

`Sequence` type is bare `@deprecated`. Name the type that supersedes it.

# WARN 953b2cea-131 reuse-shared-test-layer `packages/core/compute/conductor/src/tests/gpt.test.ts:27`

Hand-rolls an Operation.Service stub (all methods die with 'not available in test') that is repeated across conductor tests and already exists as the no-service branch of the shared test runtime in compute-hyperformula's testing/test-runtime.ts. Violates reuse-shared-test-layer; extract one shared layer in the conductor testing/ module (next to TestRuntime), import it here, and delete the local copy (it also removes the 'as any' cast).

# WARN 953b2cea-132 reuse-shared-test-layer `packages/core/compute/conductor/src/tests/streaming.test.ts:30`

Hand-rolls an Operation.Service stub (all methods die with 'not available in test') that is repeated across conductor tests and already exists as the no-service branch of the shared test runtime in compute-hyperformula's testing/test-runtime.ts. Violates reuse-shared-test-layer; extract one shared layer in the conductor testing/ module (next to TestRuntime), import it here, and delete the local copy (it also removes the 'as any' cast).

# WARN 953b2cea-133 reuse-shared-test-layer `packages/core/compute/conductor/src/types/compute.test.ts:23`

Hand-rolls an Operation.Service stub (all methods die with 'not available in test') that is repeated across conductor tests and already exists as the no-service branch of the shared test runtime in compute-hyperformula's testing/test-runtime.ts. Violates reuse-shared-test-layer; extract one shared layer in the conductor testing/ module (next to TestRuntime), import it here, and delete the local copy (it also removes the 'as any' cast).

# WARN 953b2cea-134 deprecated-tag-must-be-accurate `packages/core/compute/conductor/src/types/graph.ts:53`

`enabled` is bare `@deprecated`, and the adjacent TODO says only 'Reuse `value`'. Name the replacement field in the tag.

# WARN 953b2cea-135 reuse-shared-test-layer `packages/core/compute/conductor/src/workflow/workflow.test.ts:39`

Hand-rolls an Operation.Service stub (all methods die with 'not available in test') that is repeated across conductor tests and already exists as the no-service branch of the shared test runtime in compute-hyperformula's testing/test-runtime.ts. Violates reuse-shared-test-layer; extract one shared layer in the conductor testing/ module (next to TestRuntime), import it here, and delete the local copy (it also removes the 'as any' cast).

# WARN 953b2cea-136 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/Crawler.ts:58`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-137 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/Crawler.ts:207`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-138 import-as-namespace-is-all-or-nothing `packages/core/compute/crawler/src/index.ts:5`

`export * as Type from './types.ts'`: namespace `Type` and filename `types` disagree and `types.ts` has no directive. Rename the file to `Type.ts` and add `// @import-as-namespace`.

# WARN 953b2cea-139 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/stages/topics.ts:44`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-140 flat-layer-composition `packages/core/compute/crawler/src/StateStore.test.ts:115`

`Effect.provide(StateStore.layerSql), Effect.provide(shared)` are chained provides collapsible into a single `Effect.provide(Layer.provide(StateStore.layerSql, shared))` or `Layer.mergeAll`. The same pattern repeats at line 121.

# WARN 953b2cea-141 comment-hygiene `packages/core/compute/crawler/src/testing/index.ts:18`

`// --- Fixture shape ... ---` style section separators (also lines 39, 116, 272) are decoration. Delete them, or split the file into modules, per the comment-hygiene rule.

# WARN 953b2cea-142 declare-optional-services-with-noop-layers `packages/core/compute/edge-compute/src/EdgeProcessManager.ts:43`

The `getEdgeClient?: () => EdgeHttpClient` option is a thunk returning a service, so the wiring sits outside the layer graph. Require `EdgeHttpClientService` in the layer signature and provide a noop layer for the stub (same at line 100).

# WARN 953b2cea-143 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor-lib/src/contact-extractor.ts:29`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-144 construct-populated-dont-mutate-after `packages/core/compute/extractor-lib/src/contact.ts:67`

The contact is created with `Obj.make(Person.Person, { emails: [...] })` and `fullName` is then set via `Obj.update` when `actor.name` is present. Both values are known at construction, so pass `...(actor.name ? { fullName: actor.name } : {})` into the `Obj.make` call.

# ERROR 953b2cea-145 errors-extend-base-error `packages/core/compute/extractor/src/dispatch.ts:15`

`NoMatchingExtractorError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-146 consistent-file-naming-within-folder `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:1`

Capitalized test filename beside lowercase siblings (getOrCreate, signature). Rename to lowercase kebab-case (`extraction-template.test.ts`).

# WARN 953b2cea-147 namespace-export-with-internal-hiding `packages/core/compute/extractor/src/index.ts:1`

This barrel blanket-re-exports 10 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-148 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:28`

`FunctionsClient` is bare `@deprecated`. Name the replacement client.

# WARN 953b2cea-149 error-messages-carry-context `packages/core/compute/functions-runtime-cloudflare/src/internal/service-container.ts:61`

`'Invalid queue EID'` (also line 81) does not include the `queue` value. Interpolate the EID.

# WARN 953b2cea-150 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/queues-api.ts:20`

`QueuesAPI` and `QueuesAPIImpl` (line 28) are bare `@deprecated`. Name the replacement (feed API?).

# WARN 953b2cea-151 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/space-proxy.ts:15`

`SpaceProxy` is bare `@deprecated`. Name the replacement.

# WARN 953b2cea-152 structured-logging-not-console `packages/core/compute/functions-testing/src/testing/util.ts:48`

`onProgress` callback calls `console.log` on every sync progress update (also `console.log/error` at lines 103-130), i.e. a frequent callback logged via the wrong API. Use `log.debug`/`log.info` from `@dxos/log` with structured state.

# WARN 953b2cea-153 schema-field-uses-platform-reference-mechanism `packages/core/compute/link/src/Cursor.ts:38`

`ExternalSpec.externalId` is a custom field holding the remote system's foreign id (board, calendar or channel id). External-system ids should use `Obj.Meta.foreignKeys` (as the neighbouring `snapshots` comment already does for per-item ids) instead of a bespoke field; move it to a foreign key on the cursor or target object.

# WARN 953b2cea-154 setter-must-not-own-transaction `packages/core/compute/link/src/Cursor.ts:195`

`writeSnapshot` wraps its write in its own `Obj.update`, so it cannot be batched with other cursor writes (`writeSyncState` exists only because of this). Fix: have the setter mutate an open draft cursor and let callers own the update.

# WARN 953b2cea-155 setter-must-not-own-transaction `packages/core/compute/link/src/Cursor.ts:211`

`rebindSource` is a setter that opens and closes its own `Obj.update`, blocking batching with other cursor writes. Fix: mutate a passed-in draft directly.

# WARN 953b2cea-156 setter-must-not-own-transaction `packages/core/compute/link/src/Cursor.ts:225`

`writeToken` opens its own `Obj.update` for a single field write, forcing one transaction per field. Fix: operate on an already-open draft and let the caller batch.

# WARN 953b2cea-157 setter-must-not-own-transaction `packages/core/compute/link/src/Cursor.ts:268`

`clearToken` opens its own `Obj.update` for one field, forcing separate transactions. Fix: mutate an open draft; the caller wraps the batch.

# WARN 953b2cea-158 effect-fn-not-hand-wrapped-gen `packages/core/compute/link/src/Cursor.ts:646`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-159 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-client/src/McpToolkit.ts:57`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-160 prefer-branded-types-over-raw-primitives `packages/core/compute/mcp-server/src/internal/space.ts:96`

`qualifyRefs` takes `spaceId: string` although this module already uses `SpaceId` (`resolveId` returns it). Type the parameter as `SpaceId`; `resolveId` at line 35 also accepts a raw `string | undefined` where a validated boundary is acceptable, but `qualifyRefs` is internal.

# WARN 953b2cea-161 prefer-branded-types-over-raw-primitives `packages/core/compute/mcp-server/src/McpServer.ts:65`

`spaceId?: string` on the server options (also in `internal/script.ts:33`, `internal/script-isolate.ts:30`) names a space id but is untyped. Use `SpaceId`, unless this is deliberately the unvalidated tool-input boundary.

# WARN 953b2cea-162 jsdoc-non-obvious-identifiers `packages/core/compute/mcp-server/src/McpServer.ts:313`

`SkillListing.skillToken` is an opaque token with no doc comment; its referent (the token loadSkill issues, which must be passed back to invokeOperation) is not inferable from name or type. Add JSDoc per jsdoc-non-obvious-identifiers.

# WARN 953b2cea-163 jsdoc-non-obvious-identifiers `packages/core/compute/mcp-server/src/McpServer.ts:494`

`InvokeArguments.skillToken` (and the sibling `key: string` at line 491, which is an operation key rather than a skill key) are undocumented even though the schema descriptions elsewhere in this file explain them. Carry the same explanation onto the type as JSDoc.

# WARN 953b2cea-164 no-mixed-promise-effect-lifecycle `packages/core/compute/mcp-server/src/McpServer.ts:964`

`throw new Error` inside `Effect.gen` for the tool name collision. Use `yield* Effect.fail(...)` (or `Effect.die` if a defect is intended) instead of throwing.

# WARN 953b2cea-165 effect-fn-not-hand-wrapped-gen `packages/core/compute/nlp/src/parse.ts:34`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-166 effect-fn-not-hand-wrapped-gen `packages/core/compute/nlp/src/segment.ts:159`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-167 namespace-export-with-internal-hiding `packages/core/compute/pipeline-discord/src/index.ts:1`

This barrel blanket-re-exports 8 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-168 comment-hygiene `packages/core/compute/pipeline-discord/src/stages/topics.test.ts:5`

The header says "ECHO integration for phase 3", naming a migration phase. Describe what the test covers instead.

# WARN 953b2cea-169 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/corpus/digest.test.ts:34`

The assertion on `digest.topTopics` is commented out, so the digest's topics are never verified. Restore the `expect`.

# WARN 953b2cea-170 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/corpus/topics.test.ts:24`

The assertions on the clustered drafts are commented out, so the "clusters related threads" test verifies only the draft count. Restore the commented `expect` calls (participants, keywords, thread ids) or replace them with working ones.

# WARN 953b2cea-171 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/corpus/topics.test.ts:36`

The test "every thread lands in exactly one topic" has its only assertion commented out, so it verifies nothing. Restore the `expect(assigned.sort()).toEqual(...)` assertion.

# WARN 953b2cea-172 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/corpus/topics.test.ts:42`

The test "deterministic summary concatenates thread summaries; label from top keywords" has all assertions commented out, so it passes regardless of behavior. Restore the summary and label assertions.

# WARN 953b2cea-173 namespace-export-with-internal-hiding `packages/core/compute/pipeline-email/src/index.ts:1`

This barrel blanket-re-exports 9 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-174 comment-hygiene `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:406`

The comment says "Corpus layer (phase 3)", naming a migration phase rather than current behavior. Drop the phase number.

# ERROR 953b2cea-175 errors-extend-base-error `packages/core/compute/pipeline-email/src/testing/parquet.ts:15`

`ParquetReadError` uses `Data.TaggedError`. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-176 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/topics-pipeline.test.ts:46`

The assertion that each topic draft carries the stub summary is commented out, so the test does not verify that summarization output is applied. Restore the `expect` on `draft.summary`.

# WARN 953b2cea-177 schema-field-uses-platform-reference-mechanism `packages/core/compute/pipeline-email/src/types/Thread.ts:22`

`Thread.messageIds` is an array of plain strings identifying the member messages of the thread. If these identify ECHO Message objects, they should be `Schema.Array(Ref.Ref(Message))`; if they are provider message ids, they belong in `meta.foreignKeys` on the Message objects rather than a parallel string list that can drift from the canonical objects.

# WARN 953b2cea-178 import-as-namespace-is-all-or-nothing `packages/core/compute/pipeline-rdf/src/index.ts:5`

`export * as RDF from './types/index.ts'` exports a namespace whose source module is named `types`, with no directive. Align the name with the module (e.g. `RDF/`) and add the directive.

# WARN 953b2cea-179 import-as-namespace-is-all-or-nothing `packages/core/compute/pipeline-rdf/src/store/index.ts:7`

`export * as FactStoreLive from './fact-store-live.ts'` uses a hyphenated lowercase filename and no directive. Rename it to `FactStoreLive.ts` and add the directive.

# ERROR 953b2cea-180 errors-extend-base-error `packages/core/echo/blob/src/s3/s3-client.ts:26`

`S3RequestError` extends `Error` directly (same for `S3NetworkError` and `S3TimeoutError` below). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-181 prefer-branded-types-over-raw-primitives `packages/core/echo/blob/src/s3/s3-uri.ts:92`

`objectKey` takes `spaceId: string` for a space-scoped path. Use `SpaceId` so a content hash cannot be passed in its place.

# WARN 953b2cea-182 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/automerge-retention.test.ts:57`

Retry loop with a 1s real-time `setTimeout` to wait for documents to load. Use `waitForCondition` or a query subscription instead. Rule: no-sleep-in-test.

# WARN 953b2cea-183 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/echo.bench.ts:54`

`ensureEcho`/`ensureSeed` lazily memoize database creation and seeding (SEED_COUNT + DELETE_POOL inserts) inside every measured `bench` body, so first-call init cost is folded into the reported numbers (relying on the warmup call to absorb it). Move one-time setup into a `beforeAll`/`beforeEach` hook (or module-level setup awaited before registration) per the rule.

# WARN 953b2cea-184 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:151`

`child` is made with `Obj.make(TestSchema.Task, ...)` and then parented to the already-existing `loser`. Use `[Obj.Parent]: loser` in the `Obj.make` props instead of `Obj.setParent(child, loser)`.

# WARN 953b2cea-185 consistent-file-naming-within-folder `packages/core/echo/echo-client-e2e/src/Obj.updateFrom.test.ts:1`

Capitalized, dotted test filename in a folder where every other test file is lowercase kebab-case. Rename to `obj-update-from.test.ts`.

# WARN 953b2cea-186 inline-obj-parent `packages/core/echo/echo-client-e2e/src/parent.test.ts:135`

`child` is made after `parent` and immediately parented with `Obj.setParent(child, parent)`. Use `[Obj.Parent]: parent` in the `Obj.make` props instead.

# WARN 953b2cea-187 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/query.test.ts:1208`

Many `sleep(20)`/`sleep(1100)` calls to separate timestamps (lines 1210-1576). Inject a controllable clock or set timestamps explicitly instead of real sleeps. Rule: no-sleep-in-test.

# WARN 953b2cea-188 inline-obj-parent `packages/core/echo/echo-client-e2e/src/query.test.ts:4303`

`child` and `archived` are made after `parent` and immediately parented with `Obj.setParent`. Pass `[Obj.Parent]: parent` in each `Obj.make` call instead.

# WARN 953b2cea-189 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:36`

`ensureState` lazily memoizes runtime creation and seeding and is awaited inside each measured bench function, folding one-time init into the benchmark. Perform this setup in a `beforeAll`/`beforeEach` hook instead of memoizing it in the measured body.

# WARN 953b2cea-190 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/sync-refresh.test.ts:56`

Busy-poll loop sleeping 10ms between checks to wait for async state. Replace with `waitForCondition` or a query subscription plus `Trigger`. Rule: no-sleep-in-test.

# WARN 953b2cea-191 consistent-private-field-convention `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:106`

Class `DocHandleProxy` has a single `#url` field among ~25 `private _x` fields (`_doc`, `_state`, `_documentId`, ...). Rename `#url` to `_url` (or migrate the rest) so the class holds one convention.

# WARN 953b2cea-192 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:724`

`sleep(10)` to let an unhandled rejection surface. Use `waitForCondition` or a deterministic flush; the macrotask exception does not require 10ms. Rule: no-sleep-in-test.

# WARN 953b2cea-193 consistent-private-field-convention `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:1`

Class `RepoProxy` has `#inbox`, `#inboxHead`, `#draining` while ~60 other fields use `private _x` (`_handles`, `_pendingAddIds`, `_diskFlushes`). Unify the privacy convention.

# WARN 953b2cea-194 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:313`

`_waitForObjectLink` arms a raw `setTimeout(settle, ROOT_LINK_WAIT_TIMEOUT)` with no tie to the client's context, so the timer survives client disposal. Use the ctx-scoped scheduler (`scheduleTask(this._ctx, settle, ...)`) per rule `use-context-scoped-cancellation`.

# WARN 953b2cea-195 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:275`

A 2.5s real `setTimeout` to simulate a slow load. Use a `Trigger` the test releases, or `TestClock`. Rule: no-sleep-in-test.

# WARN 953b2cea-196 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:36`

`LoadObjectProps` brands `spaceId` as `SpaceId` but leaves `objectId` as `string` in the same type. Use `EntityId` for `objectId` so a swapped argument is caught.

# WARN 953b2cea-197 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1`

Class `EntityManager` mixes `#closed/#generation/#linkedObjectIds/#lifetimeEnded` with a large set of `private _x` fields (`_objects`, `_currentBranches`, `_branchStore`). Hold one convention for the whole class.

# WARN 953b2cea-198 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/core-db/entity-manager.ts:81`

`ObjectDocumentLoaded.objectId` and `ObjectUnavailable.objectId` (line 89) are bare `string`, while `EntityId` is already imported in this file. Type them as `EntityId`; the same applies to the many `objectId: string` parameters (for example lines 477, 503, 1107, 1126, 1597, 2026).

# WARN 953b2cea-199 use-context-scoped-cancellation `packages/core/echo/echo-client/src/core-db/entity-manager.ts:652`

The inactivity timeout is a raw `setTimeout` not owned by any context; if the manager is disposed while the load is pending, the timer still fires and rejects or resolves later. Schedule it with the ctx-aware scheduler (`scheduleTask(this._ctx, ...)`) so disposal cancels it.

# WARN 953b2cea-200 use-context-scoped-cancellation `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2082`

Raw `setTimeout` inside a handler registered on `this._ctx` has no tie to that context's disposal, so the deferred `_dropSatisfactionRequest` can run after the entity manager is disposed. Use `scheduleTask(this._ctx, ...)` from `@dxos/async` so it is cancelled with the context (rule `use-context-scoped-cancellation`).

# WARN 953b2cea-201 comment-hygiene `packages/core/echo/echo-client/src/core-db/object-core.ts:184`

Ruled `// ----` banner separator (also at line 188) is decoration. Remove it.

# WARN 953b2cea-202 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:93`

`sleep(200)` to let a link change round-trip; repeated in this file (lines 168, 231, 284, 354, 429, 475). Wait on a query subscription or `waitForCondition`. Rule: no-sleep-in-test.

# WARN 953b2cea-203 namespace-brand-key-prefixing `packages/core/echo/echo-client/src/core-db/types.ts:24`

`Brand.Brand<'TargetKey'>` uses a bare brand string. Prefix it with the owning module path, e.g. `'@dxos/echo-client/TargetKey'`.

# WARN 953b2cea-204 comment-hygiene `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:117`

"Maybe have been set by `create`." is tentative, musing language that gives no settled reasoning. State definitively when the value is already set, or remove it.

# WARN 953b2cea-205 error-messages-carry-context `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:467`

`'Invalid path'` omits the offending path. Interpolate the path (and target id).

# WARN 953b2cea-206 comment-hygiene `packages/core/echo/echo-client/src/echo-handler/echo-proxy-target.ts:62`

Ruled `// ----` banner separator lines (62 and 66) are decoration. Remove them.

# WARN 953b2cea-207 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/errors.ts:33`

`RepoClosedError` context types `spaceId` as `string`; use `SpaceId` from `@dxos/keys`. `DocumentUnavailableError` (line 19) likewise takes `documentId: string` where the automerge `DocumentId` type exists.

# WARN 953b2cea-208 consistent-private-field-convention `packages/core/echo/echo-client/src/feed/feed-handle.ts:75`

Class `FeedHandle` uses `private _ctx/_spaceId/_feedId/_pollingHandlers/_parentEntity` and `#appendScheduler/#cores/#dirtyCores/#inFlight/#objects` for the same role of internal state. Pick one.

# WARN 953b2cea-209 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:722`

`FeedHandle` owns `this._ctx` but schedules the reconnect with a raw `setTimeout` and a hand-managed `#reconnectTimer`, cancelled only in one explicit path. Use `scheduleTask(this._ctx, ..., delay)` so disposal cancels it automatically and remove the manual timer bookkeeping.

# WARN 953b2cea-210 consistent-private-field-convention `packages/core/echo/echo-client/src/hypergraph.ts:75`

Class `HypergraphImpl` mixes `private _databases/_registry/_queryContexts` with `#queryResultCache/#loadOpTable/#spaceBackends/#blobManager`. Use one privacy convention for fields.

# WARN 953b2cea-211 error-messages-carry-context `packages/core/echo/echo-client/src/hypergraph.ts:550`

`'Unsupported URI kind'` omits the `uri` that failed to parse. Interpolate the offending uri into the message.

# WARN 953b2cea-212 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/hypergraph.ts:927`

`ObjectDiagnostic` types `objectId` and `spaceId` as bare `string`, though `EntityId` and `SpaceId` are already imported in this file. Type them as `EntityId` and `SpaceId` (and `recordObjectDiagnostic`'s `objectId` parameter at line 949) per `prefer-branded-types-over-raw-primitives`.

# WARN 953b2cea-213 namespace-export-with-internal-hiding `packages/core/echo/echo-client/src/index.ts:1`

This barrel blanket-re-exports 11 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-214 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:22`

`InitRootProxyFn` is an internal callback type for wiring root proxies exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-215 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:25`

`META_NAMESPACE` is an internal Automerge document key constant exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-216 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:28`

`objectIsUpdated` is an internal change-detection predicate exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-217 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:34`

`createArrayMethodError` is an internal error factory exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-218 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:35`

`createPropertyDeleteError` is an internal error factory exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-219 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:36`

`createPropertySetError` is an internal error factory exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-220 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:50`

`findObjectWithForeignKey` is an internal lookup helper exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-221 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:53`

`getDXNWithSpaceKey` is an internal DXN helper exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-222 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:58`

`initEchoReactiveObjectRootProxy` is an internal proxy initializer exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-223 dont-leak-internal-api-through-public-surface `packages/core/echo/echo-client/src/index.ts:60`

`matchKeys` is an internal foreign-key predicate exported from the package root, but no code outside `echo-client` imports it. Stop exporting it from the public entry point (or move it behind an `/internal` subpath) so the package can change it freely, per `dont-leak-internal-api-through-public-surface`.

# WARN 953b2cea-224 deprecated-tag-must-be-accurate `packages/core/echo/echo-client/src/proxy-db/database.ts:84`

`pendingBatch` (lines 84, 1243) and `spaceKey` (line 87) have bare `@deprecated` tags. Name the replacements (e.g. `spaceId` for `spaceKey`).

# WARN 953b2cea-225 consistent-private-field-convention `packages/core/echo/echo-client/src/proxy-db/database.ts:308`

Class `DatabaseImpl` mixes `private _hypergraph/_rootUrl/_reactiveSchemaQuery` with `#feedService/#runtime/#feeds/#retiredFeeds`. Unify.

# WARN 953b2cea-226 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/proxy-db/database.ts:1130`

`loadObjectCoreById`, `getObjectDocumentId`, `getCurrentBranch` and `listBranches` (lines 1063-1083) accept `objectId: string` where `EntityId` exists. Narrow the parameters to `EntityId`.

# WARN 953b2cea-227 no-sleep-in-test `packages/core/echo/echo-client/src/query/query-api-stall.test.ts:67`

`sleep(500)` as a negative-assertion window for an unresolved query. Prefer a deterministic signal or a `Trigger` race. Rule: no-sleep-in-test.

# WARN 953b2cea-228 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/testing/echo-test-builder.ts:109`

`_branchStoreFor(spaceId: string)` and the `_branchStores` map keyed by `string` carry a space id as a bare string. Type the key and parameter as `SpaceId`.

# WARN 953b2cea-229 deprecated-tag-must-be-accurate `packages/core/echo/echo-generator/src/data.ts:25`

`TestSchemaType` and `testSchemas` (line 35), plus `TestObjectGenerator` in generator.ts:23, are bare `@deprecated`. Name the replacement generator.

# WARN 953b2cea-230 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:748`

`sleep(NO_TRAFFIC_WINDOW_MS)` real-time waits (also 907, 937). Use a deterministic signal or virtual time. Rule: no-sleep-in-test.

# WARN 953b2cea-231 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:266`

`sleep(100)` waiting for a share-policy debounce to fire. Use a `Trigger`/`waitForCondition` or fake timers. Rule: no-sleep-in-test.

# WARN 953b2cea-232 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353`

`sleep(500)` before asserting `resynced`. Replace with `waitForCondition` on the expected state. Rule: no-sleep-in-test.

# WARN 953b2cea-233 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:649`

`sleep(1_500)` real-time wait in a test. Replace with a `Trigger`/`waitForCondition` or virtual time. Rule: no-sleep-in-test.

# WARN 953b2cea-234 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-host/src/automerge/automerge-host.ts:68`

`RootDocumentSpaceKeyProvider` and `_getContainingSpaceForDocument(documentId: string)` take a raw string for an automerge document id. Use the `DocumentId` type already used across the automerge code.

# WARN 953b2cea-235 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1801`

The replication-lease expiry uses a raw `setTimeout` with manual `clearTimeout` and no tie to the host's context disposal, so it can fire after the host is closed. Use `scheduleTask(this._ctx, ...)` from `@dxos/async`.

# WARN 953b2cea-236 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/document-lease.ts:430`

The eviction timer is a raw `setTimeout` managed by `#clearTimer` instead of being scoped to an owning context. Schedule it through the ctx-aware scheduler so disposal cancels it automatically.

# WARN 953b2cea-237 consistent-private-field-convention `packages/core/echo/echo-host/src/automerge/mesh-echo-replicator-connection.ts:44`

Class `MeshReplicatorConnection` has `#closed` next to `private _remotePeerId` and `private _isEnabled`, all simple state flags. Use one convention.

# WARN 953b2cea-238 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-239 consistent-private-field-convention `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:85`

Class `DocumentsSynchronizer` has `#sendUpdatesPaused` while `_syncStates/_pendingUpdates/_pendingRequesting/_sendUpdatesJob` are `private _x`; the sibling `_sendUpdatesJob` and `#sendUpdatesPaused` describe the same update-sending state. Unify.

# WARN 953b2cea-240 consistent-private-field-convention `packages/core/echo/echo-host/src/db-host/echo-host.ts:1`

Class `EchoHost` mixes ~30 `private _x` fields (`_automergeHost`, `_indexEngine`, ...) with `#ftsFlushDeadline/#ftsFlushGeneration/#indexTransactionLimits/#syncFeed`. Pick one convention.

# WARN 953b2cea-241 consistent-private-field-convention `packages/core/echo/echo-host/src/db-host/feed-data-source.ts:53`

Class `FeedDataSource` has `#passReads` beside `private _feedNamespaces/_feedStore/_runtime/_getSpaceIds`. Use one convention for fields.

# WARN 953b2cea-242 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:24`

Repeated ruled `// ----` banner separators (lines 24, 89, 164, 206, 270, 321, 360, 397, 449, 487 and their pairs) are decoration. Use `describe` blocks to name the sections and delete the banners.

# WARN 953b2cea-243 comment-hygiene `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:41`

`// Phase 1: Create...` / `// Phase 2: Restore...` (also lines 84, 314, 337) are numbered step labels that narrate rather than carry rationale. Drop the numbering or the comments.

# WARN 953b2cea-244 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-245 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:54`

`throw new Error('SQLite quick check failed')` inside an Effect generator. Use `yield* Effect.fail(...)` with a typed error.

# WARN 953b2cea-246 consistent-private-field-convention `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:1`

Class `EchoEdgeSubductionReplicator` mixes `#pendingFrames/#pendingBytes/#flushTimer/#firstFrameSent` with many `private _x` (`_connections`, `_mutex`, `_ctx`). Unify.

# WARN 953b2cea-247 use-context-scoped-cancellation `packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts:713`

The batch flush timer is a raw `setTimeout` while the replicator already has `this._ctx`; it relies on manual `clearTimeout` calls rather than context disposal. Use the ctx-aware scheduler (`scheduleTask(this._ctx, ...)`) so the flush is cancelled on dispose.

# WARN 953b2cea-248 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:171`

Several `throw new Error('Invalid query item')` sites (also lines 194, 247, 260, 274, 288) omit the item id/shape that was invalid. Interpolate the item id or kind, ideally via a small shared factory.

# WARN 953b2cea-249 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:670`

Class `QueryExecutor` declares `#scopes`, `#includeAllFeeds`, `#changeResultSet` in between `private _plan`, `_trace`, `_lastResultSet` -- same role, different spelling. Use one convention.

# WARN 953b2cea-250 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:849`

`console.log` of the query execution trace in committed library code, silenced only with an eslint-disable. Use `log.info`/`log.debug` from `@dxos/log` (per-query, so prefer `debug`) instead of `console`.

# WARN 953b2cea-251 batch-queries-not-n-plus-1 `packages/core/echo/echo-host/src/query/query-executor.ts:1009`

The `IdSelector` path for queue-scoped queries runs `Promise.all(objectIds.map(...))` where each id calls `_loadQueueItemById`, which issues its own `indexEngine.lookupByObjectId` SQL query plus a separate `_loadQueueSnapshotMap([meta])` round trip. That is one or two queries per id. Add a batched index lookup (`WHERE object_id IN (...)`) that takes all ids for the queue, and load the snapshot map once for the resulting metas, per the batch-queries-not-n-plus-1 rule.

# WARN 953b2cea-252 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-planner.ts:66`

Class `QueryPlanner` uses `#planSubquery`/`#buildSteps` while all sibling members are `private _x` (`_options`, `_generate`, `_routeChanges`, ...). Rename or migrate for consistency.

# WARN 953b2cea-253 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-host/src/query/sql/compile.test.ts:225`

`planSubquery` only forwards to `planner.createPlan(query)` and is used about ten times, hiding the API under test. Inline `planner.createPlan(...)` at the call sites (rule: no-trivial-wrappers-over-official-apis).

# WARN 953b2cea-254 scope-multi-tenant-queries-by-space `packages/core/echo/echo-host/src/query/sql/compile.ts:770`

The incoming-reference traversal joins `reverseRef r ON r.targetDXN = 'echo:///' || w.objectId` and then `objectMeta t ON t.recordId = r.recordId` with no `t.spaceId = w.spaceId` condition. Object ids from one space can match reverse refs recorded in another space, leaking cross-space referrers into the working set. Add `AND t.spaceId = w.spaceId` to the objectMeta join.

# WARN 953b2cea-255 inject-dependencies-via-constructor `packages/core/echo/echo-panproto/src/lens/registry.ts:14`

The lens registry is a global mutable `Map` with module-level `register`/`resolve`/`lensesFor`/`sourcesFor` functions. Convert to a `LensRegistry` class instantiated and injected where needed, rather than reaching into a global mutable registry.

# WARN 953b2cea-256 inject-dependencies-via-constructor `packages/core/echo/echo-panproto/src/runner.ts:25`

Text formats and ref types are registered into global mutable Maps (`textFormats`, `refTypes`) that the runner functions reach into. Pass these collaborators to a runner class through its constructor instead of using global registries.

# WARN 953b2cea-257 deprecated-tag-must-be-accurate `packages/core/echo/echo-protocol/src/document-structure.ts:76`

`experimental_spaceKey` is `@deprecated` with only 'For backward compatibility'. Name the replacement (`spaceId`).

# WARN 953b2cea-258 jsdoc-non-obvious-identifiers `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:21`

`FeedBlockRef.actorId` is a bare string; the type-level doc names it but does not say whose actor (the feed author/peer). Add a field comment stating what it identifies.

# WARN 953b2cea-259 namespace-export-with-internal-hiding `packages/core/echo/echo-protocol/src/index.ts:1`

This barrel blanket-re-exports 9 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-260 import-as-namespace-is-all-or-nothing `packages/core/echo/echo-protocol/src/query/index.ts:5`

`export * as QueryAST from './ast.ts'`: namespace name and filename disagree, and `ast.ts` has no directive. Rename it to `QueryAST.ts` and add the directive.

# ERROR 953b2cea-261 errors-extend-base-error `packages/core/echo/echo-sqlite/src/errors.ts:9`

`UnsupportedOperationError` extends `Error` directly (also `UnsupportedQueryError`). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-262 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-sqlite/src/testing/database.bench.ts:46`

`ensureState` uses `statePromise ??= ...` to lazily build and seed the shared space from inside measured bench callbacks, so first-call init cost lands in the measured block. Move the setup to a `beforeAll`/`beforeEach` hook rather than lazy memoization in the bench body.

# WARN 953b2cea-263 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:515`

`Database` schema is hand-composed as `Schema.Any.pipe(Schema.refine(isDatabase))` although `isDatabase` is a plain runtime type guard. Replace with `Schema.declare(isDatabase)` (keeping the annotation if needed) per the schema-declare-and-brand rule.

# WARN 953b2cea-264 options-object-with-defaults `packages/core/echo/echo/src/Hypergraph.ts:82`

`createRefResolver(options: RefResolverOptions)` takes a required options object whose only field (`context`) is optional, so callers must write `createRefResolver({})` (see `packages/core/echo/echo-client/src/hypergraph.ts:189` and `packages/sdk/client/src/devtools/devtools.ts:219`). Make the parameter `options: RefResolverOptions = {}` (or `options?:`) in the interface and implementations, per `options-object-with-defaults`.

# WARN 953b2cea-265 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/internal/common/proxy/change.test.ts:15`

`tagRef` only forwards to `Ref.fromURI(URI.make(...))` with a fixed prefix and is used across the test. Inline the `Ref.fromURI` call so the API being exercised is visible.

# ERROR 953b2cea-266 errors-extend-base-error `packages/core/echo/echo/src/internal/common/proxy/errors.ts:8`

`MutationOutsideChangeContextError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-267 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/make-object.ts:149`

`'Invalid object id format.'` does not include the rejected `target.id`. Interpolate the invalid value.

# WARN 953b2cea-268 comment-hygiene `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:361`

"Maybe have been set by `create`." is tentative musing. State the actual condition or remove it.

# WARN 953b2cea-269 name-for-general-behavior `packages/core/echo/echo/src/internal/common/types/model-symbols.ts:5`

`ObjectCore`, `ObjectInternals`, `ObjectVersion`, `ObjectDatabaseId` and related symbols apply to all entities (objects and relations) but keep the `Object*` prefix from their first use case. Rename them to `Entity*` as the in-file TODO describes.

# WARN 953b2cea-270 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:53`

`getFormatAnnotation` (and `getOptionsAnnotation` at line 184) are bare `@deprecated`. Name the replacement accessor.

# WARN 953b2cea-271 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/JsonSchema/json-schema-type.ts:66`

JSON-schema `type` field is bare `@deprecated`; the TODO describes removal but not the replacement. Name it.

# WARN 953b2cea-272 name-for-general-behavior `packages/core/echo/echo/src/internal/Obj/common.ts:11`

`TypedObjectOptions`, `SimplifiedSchemaFields` and `TypedObjectFields` are shared by objects and relations but are named for objects only, as the TODOs state. Rename them to the general entity concept.

# WARN 953b2cea-273 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:645`

`Ref.load` throws a static `'Object not found'` without the ref's DXN/target id, so a failed load cannot be traced. Interpolate the ref's DXN (and ideally throw a typed not-found error), per the error-messages-carry-context rule.

# WARN 953b2cea-274 error-messages-carry-context `packages/core/echo/echo/src/Migration.ts:131`

`'Invalid from schema'` (and `'Invalid to schema'` at line 135) omit which schema failed. Include the schema/typename from `options.from`/`options.to`.

# WARN 953b2cea-275 name-for-general-behavior `packages/core/echo/echo/src/Query.ts:727`

`Query.all` suggests "all objects" while it combines (unions) several queries; its own error message has to explain this. Rename it to `combine` or `union` as the TODO proposes, so the name matches the behavior.

# WARN 953b2cea-276 keep-parallel-apis-structurally-aligned `packages/core/echo/echo/src/Relation.ts:363`

`Relation.update` returns `void` while its counterpart `Obj.update` returns the updated entity `T`. Callers cannot treat the two uniformly (for example chaining or returning the result). Return `relation` from `Relation.update` (or align both), per the parallel-API rule.

# WARN 953b2cea-277 keep-parallel-apis-structurally-aligned `packages/core/echo/echo/src/Relation.ts:379`

`Relation.getSnapshot` names its parameter `rel` while `Obj.getSnapshot` (Obj.ts:266) names it `obj`; the sibling modules also differ elsewhere (`Relation.subscribe` uses `rel`, `Relation.update` uses `relation`, `Obj.update` uses `obj`). Use one parameter name consistently across the parallel modules.

# WARN 953b2cea-278 keep-parallel-apis-structurally-aligned `packages/core/echo/echo/src/Relation.ts:445`

`Relation.getTypeURI` takes `internal.AnyProperties` and returns `URI.URI | undefined`, while `Obj.getTypeURI` takes `Unknown | Snapshot` and returns a non-optional `URI.URI` (asserting an invariant). Align the parameter type and return shape with `Obj.getTypeURI`, or document why a relation's type may be missing.

# WARN 953b2cea-279 keep-parallel-apis-structurally-aligned `packages/core/echo/echo/src/Relation.ts:521`

`Relation.getKeys` is a plain two-argument function `(entity, source)`, whereas `Obj.getKeys` (Obj.ts:764) is a `Function.dual` overload with an optional `source`. Give `Relation.getKeys` the same dual/optional-source signature so callers can use both identically.

# WARN 953b2cea-280 schema-persists-source-not-derived-duplicate `packages/core/echo/echo/src/View.ts:75`

`View.query` stores `raw` (grammar string) and `ast` (derived QueryAST) as independent persisted fields. Keep a single persisted source and compute the other with a memoized getter so they cannot drift.

# WARN 953b2cea-281 scope-multi-tenant-queries-by-space `packages/core/echo/feed/src/feed-store.ts:572`

The block query only adds `feeds.spaceId = ...` when `request.spaceId` is truthy, so a request with a feedId list but no spaceId reads feeds across spaces (feedId is unique only per space, per `idx_feeds_spaceId_feedId`). Make spaceId required on the request and always filter by it.

# WARN 953b2cea-282 jsdoc-non-obvious-identifiers `packages/core/echo/feed/src/feed-store.ts:715`

`resetSyncState` options `serverToken` and `feedNamespace` are not documented; it is unclear that `serverToken` identifies the new server instance whose pull progress is tracked. Add per-field JSDoc on the options bag.

# WARN 953b2cea-283 deferred-callback-owns-its-context `packages/core/echo/feed/src/sync-client.ts:45`

`sendMessage` takes a custom `ctx: Context` alongside the Effect it returns. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-284 deferred-callback-owns-its-context `packages/core/echo/feed/src/sync-client.ts:204`

`pull` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-285 deferred-callback-owns-its-context `packages/core/echo/feed/src/sync-client.ts:379`

`peekPull` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-286 deferred-callback-owns-its-context `packages/core/echo/feed/src/sync-client.ts:426`

`push` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-287 deferred-callback-owns-its-context `packages/core/echo/feed/src/sync-server.ts:37`

`sendMessage` takes a custom `ctx: Context` alongside the Effect it returns. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-288 deferred-callback-owns-its-context `packages/core/echo/feed/src/sync-server.ts:58`

`handleMessage` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-289 deferred-callback-owns-its-context `packages/core/echo/index-core/src/data-source.ts:60`

`getChangedObjects` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-290 deferred-callback-owns-its-context `packages/core/echo/index-core/src/index-engine.ts:350`

`updateSecondaryIndexes` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-291 deferred-callback-owns-its-context `packages/core/echo/index-core/src/index-engine.ts:502`

`update` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-292 deferred-callback-owns-its-context `packages/core/echo/index-core/src/index-engine.ts:593`

`#update` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-293 deferred-callback-owns-its-context `packages/core/echo/index-core/src/index-engine.ts:695`

`#updateActivity` threads a custom `ctx: Context` while returning an Effect. Effect's own context is the single propagation mechanism (`deferred-callback-owns-its-context`); drop the parameter and use Effect context/fiber interruption (e.g. a scope or a fresh context owned by the scheduler for deferred callbacks).

# WARN 953b2cea-294 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/indexes/reverse-ref-index.ts:128`

`ReverseRefIndex.query` runs `SELECT * FROM reverseRef WHERE targetDXN = ...` with no spaceId filter (the TODO notes the missing objectMeta join). reverseRef holds rows for every space, so a lookup of a target returns referrers from other spaces. Join `objectMeta` and filter `om.spaceId = ${spaceId}`, as `queryReferrers` does, and take a spaceId parameter.

# WARN 953b2cea-295 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/migrations/entity-meta/0004_queue_position.sql:13`

`idx_object_index_queuePosition ON objectMeta(queueId, queuePosition)` omits spaceId, whereas the sibling queueObjectId index was later rebuilt as `(spaceId, queueId, objectId)` in 0006 for this reason. Queue ids are only unique per space, so queue reads can collide across spaces. Drop and recreate as `(spaceId, queueId, queuePosition)` and add `spaceId =` to the cursor-read queries.

# WARN 953b2cea-296 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/migrations/reverse-ref/0001_init.sql:10`

The `reverseRef` index `idx_reverse_ref_target (targetDXN)` (and `idx_reverse_ref_target_path` in `0002_prop_path_normalized.ts:22`) is not led by a space id, and the table has no spaceId column; lookups by target span all spaces. Scope the index through the owning objectMeta (spaceId first) or add spaceId as the leading column of the key.

# WARN 953b2cea-297 name-for-general-behavior `packages/core/halo/credentials/src/credentials/signing.ts:52`

`getCredentialProofPayload` suggests it returns the proof, but it returns the bytes the proof's signature covers. The name implies a different behavior than the one implemented; rename it (for example `getCredentialSigningPayload`) per the rule.

# WARN 953b2cea-298 namespace-export-with-internal-hiding `packages/core/halo/credentials/src/index.ts:1`

This barrel blanket-re-exports 8 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-299 error-messages-carry-context `packages/core/halo/credentials/src/state-machine/member-state-machine.ts:95`

The switch default throws `'Invalid assertion type'` without the unexpected assertion `@type`. Include the value in the message.

# WARN 953b2cea-300 namespace-export-with-internal-hiding `packages/core/halo/halo-react/src/index.ts:1`

This barrel blanket-re-exports 8 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-301 deprecated-tag-must-be-accurate `packages/core/mesh/edge-client/src/base-http-client.ts:447`

`createRetryHandler` is bare `@deprecated`. Name the replacement retry mechanism.

# WARN 953b2cea-302 consistent-private-field-convention `packages/core/mesh/edge-client/src/edge-client.ts:118`

Class `EdgeClient` mixes `#sessionReconnects/#metricsCleanup/#refusal/#registerMetrics` with `private _persistentLifecycle/_messageListeners/_networkingStarted/_currentConnection`. Pick one.

# ERROR 953b2cea-303 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:375`

`SegmentedMessageLimitError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# ERROR 953b2cea-304 errors-extend-base-error `packages/core/mesh/edge-client/src/errors.ts:7`

`EdgeConnectionClosedError` extends `Error` directly (also `EdgeIdentityChangedError`). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-305 namespace-export-with-internal-hiding `packages/core/mesh/edge-client/src/index.ts:1`

This barrel blanket-re-exports 16 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# ERROR 953b2cea-306 errors-extend-base-error `packages/core/mesh/edge-client/src/service/edge-service.ts:38`

`EdgeServiceError` uses `Data.TaggedError`. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-307 deprecated-tag-must-be-accurate `packages/core/mesh/messaging/src/signal-manager/edge-signal-manager.ts:63`

`swarmEvent` is bare `@deprecated`. Name `swarmState` (or the actual replacement) in the tag.

# WARN 953b2cea-308 deprecated-tag-must-be-accurate `packages/core/mesh/messaging/src/signal-methods.ts:63`

`swarmEvent` is `@deprecated` with a TODO naming `swarmState`; move the replacement into the tag text so tooling shows it.

# WARN 953b2cea-309 namespace-export-with-internal-hiding `packages/core/mesh/network-manager/src/index.ts:1`

This barrel blanket-re-exports 7 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-310 no-env-vars-in-low-level-modules `packages/core/mesh/network-manager/src/swarm/connection.ts:379`

`Connection` is built from explicit constructor parameters, yet `_flushSignalBuffer` reads `process.env.NODE_ENV` inline to skip the signalling backoff in tests. Inject the delay (or a `backoff` flag) through the constructor and let the test setup pass it, per the rule that low-level modules take config from parameters.

# WARN 953b2cea-311 no-trivial-wrappers-over-official-apis `packages/core/mesh/network-manager/src/transport/webrtc/testing/rtc-proxy-worker.ts:24`

`post` only forwards to `self.postMessage(message)`. Inline `self.postMessage(...)` so the worker API call is visible.

# WARN 953b2cea-312 name-for-general-behavior `packages/core/mesh/rpc-tunnel/src/ports/worker.ts:23`

`createWorkerPort` takes any `MessagePort` and is not worker-specific, as the TODO notes. Rename it to describe the general message-port behavior (for example `createMessagePort`).

# WARN 953b2cea-313 error-messages-carry-context `packages/core/mesh/rpc/src/rpc.ts:477`

The switch default throws `'Malformed response.'` without the unexpected `response.content` case/kind. Include the unexpected value (and request id if available).

# WARN 953b2cea-314 consistent-file-naming-within-folder `packages/core/mesh/rpc/src/RpcRouter.test.ts:1`

Capitalized test filename while siblings (effect-rpc, rpc, service) are kebab-case. Rename to `rpc-router.test.ts`.

# WARN 953b2cea-315 effect-fn-not-hand-wrapped-gen `packages/core/mesh/rpc/src/RpcRouter.ts:120`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-316 deprecated-tag-must-be-accurate `packages/core/mesh/rpc/src/service.ts:171`

`RpcServerOptions` and `RpcBundledServerOptions` (line 206) are bare `@deprecated`. Name the replacement.

# WARN 953b2cea-317 no-compat-shims `packages/core/protocols/src/edge/edge-deprecated.ts:15`

The file retains pre-DX-1033 `Legacy*` wire types solely so old clients and servers keep working, with a plan to drop them later. This is a compat layer left behind after the DID migration; per `no-compat-shims`, migrate remaining consumers to the DID shapes and remove the file.

# WARN 953b2cea-318 comment-hygiene `packages/core/protocols/src/edge/edge-deprecated.ts:22`

The comment names a migration phase ("Drop in phase 7") and points at a phase doc instead of describing current behavior. State the condition for removal (no legacy senders remain) without the phase number.

# WARN 953b2cea-319 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

This barrel blanket-re-exports 10 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-320 namespace-service-layers `packages/devtools/cli-util/src/services/command-config.ts:23`

`static layerTest` on the `CommandConfig` `Context.Service` subclass should be a module-level `const layerTest` beside the tag. The `static isJson`/`isVerbose` accessors (lines 18-21) should also be module-level exports so the class body stays empty.

# WARN 953b2cea-321 import-as-namespace-is-all-or-nothing `packages/devtools/cli-util/src/util/index.ts:10`

`export * as FormBuilder from './form-builder.ts'` uses a hyphenated filename and no directive. Rename it to `FormBuilder.ts` and add `// @import-as-namespace`.

# WARN 953b2cea-322 effect-fn-not-hand-wrapped-gen `packages/devtools/cli-util/src/util/space.ts:25`

Arrow function whose body is only a hand-wrapped `Effect.gen(function* () {...})`. Define it with `Effect.fnUntraced(function* (...) {...})` or a named `Effect.fn(...)` instead, per rule effect-fn-not-hand-wrapped-gen.

# WARN 953b2cea-323 no-mixed-promise-effect-lifecycle `packages/devtools/cli-util/src/util/space.ts:39`

`throw new Error` inside `Option.getOrElse` within `Effect.gen`; the failure bypasses the error channel. Use `yield* Option.match`/`Effect.fail` with a typed error.

# WARN 953b2cea-324 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:242`

The dispatcher result is cast `as Effect.Effect<void, unknown, never>` after `Effect.provide(layer)`; the comment admits the inferred requirement is non-`never`. Fix the layer so it actually satisfies `Command.runWith`'s requirements instead of casting.

# WARN 953b2cea-325 avoid-full-collection-scans `packages/devtools/cli/src/commands/chat/non-interactive.ts:39`

`snapshotTrackedObjects` loads every object in the space via `Filter.everything()` and then discards all but the tracked typenames. Query only the tracked types (`Filter.or(...Filter.typename(...))`) so the filtering happens in the query instead of a full scan, and the same applies to the second scan at line 88.

# WARN 953b2cea-326 functions-before-classes `packages/devtools/cli/src/commands/chat/processor.ts:37`

`ChatProcessor` is an Effect-based class with no lifecycle that mixes in Promise glue (`async execute` with `Effect.runForkWith`, `Fiber.join` and `Effect.runPromiseExit`, then throws). Per `functions-before-classes`, expose `execute` as an Effect-returning function that composes with Effect, and keep Promise conversion at the CLI boundary.

# WARN 953b2cea-327 deprecated-tag-must-be-accurate `packages/devtools/cli/src/commands/function/deploy/echo.ts:56`

`upsertFunctionObject` is bare `@deprecated`. Name the replacement.

# WARN 953b2cea-328 effect-requirement-type-not-erased `packages/devtools/cli/src/commands/repl.ts:97`

The REPL program is cast `as Effect.Effect<void, unknown, never>`, erasing its requirement channel. Provide the missing services explicitly and remove the cast.

# WARN 953b2cea-329 import-as-namespace-is-all-or-nothing `packages/devtools/cli/src/util/index.ts:13`

`export * as TestToolkit from './test-toolkit.ts'` uses a hyphenated filename and no directive. Rename it to `TestToolkit.ts` and add the directive.

# WARN 953b2cea-330 no-pointless-indirection `packages/devtools/devtools/src/components/MasterDetailTable.tsx:32`

Explicit `useState<boolean>` type argument is already inferred from the initial value; drop it and write `useState(false)` (rule no-pointless-indirection).

# WARN 953b2cea-331 no-pointless-indirection `packages/devtools/devtools/src/components/MasterDetailTable.tsx:89`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-332 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:156`

`console.log(obj)` in a devtools component, suppressed via eslint-disable. Use the `@dxos/log` structured logger (`log.info('object', { obj })`) rather than `console`.

# WARN 953b2cea-333 co-locate-tightly-coupled-code `packages/devtools/devtools/src/components/Tree.tsx:1`

`Tree.tsx` and `Tree.stories.tsx` (also `Bitbar`, `ObjectsTree`, `PropertiesTable`, `PublicKeySelector`) are loose in `components/` rather than in own directories with their story.

# WARN 953b2cea-334 no-pointless-indirection `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:159`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-335 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:45`

`toggleActive` is a click handler passed to `Button.Root onClick` but is not named with the handle + Noun + Verb pattern. Rename to e.g. `handleSpaceActiveToggle` per the `event-handler-naming-convention` rule.

# WARN 953b2cea-336 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:54`

`toggleEdgeReplication` is a click handler passed to `onClick` without the handle prefix. Rename to e.g. `handleEdgeReplicationToggle` per the `event-handler-naming-convention` rule.

# WARN 953b2cea-337 no-pointless-indirection `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:35`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-338 no-pointless-indirection `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:44`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-339 no-pointless-indirection `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:97`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-340 reactive-state-via-atom-bridge `packages/devtools/devtools/src/hooks/useStats.ts:154`

`useStats` subscribes to the `NetworkService.queryStatus()` and `EdgeAgentService.queryEdgeStatus()` streams in `useEffect` and merges them into `useState`, reimplementing the Stream→Atom bridge. Back each with an `Atom` and consume via `useAtom`/`useAtomValue`.

# WARN 953b2cea-341 reactive-state-via-atom-bridge `packages/devtools/devtools/src/hooks/useSwarmTrace.ts:43`

`useSwarmTrace` forks Effect `Stream`s in a `useEffect` and copies each batch into `useState`, a custom subscription hook duplicating the Stream→Atom bridge. Expose the trace messages as an `Atom` (stream-backed) and read it with `useAtomValue`.

# WARN 953b2cea-342 no-impossible-state-handling `packages/e2e/blade-runner/src/replicants/echo-replicant.ts:101`

`invariant(this._db, 'Database not initialized.')` precedes `this._db!.add(doc)`; the `!` is redundant after the assertion. Remove it.

# WARN 953b2cea-343 no-impossible-state-handling `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:113`

`invariant(this._client, 'no client')` guards the method, but `this._client!` is used afterwards (also line 175 in `waitForReplication`). Drop the redundant `!`.

# WARN 953b2cea-344 consistent-private-field-convention `packages/e2e/composer-e2e/src/playwright/app-manager.ts:216`

Class `AppManager` mixes `private _initialized/_close/_invitationCode` with `#waitForBoot`, `#openSpaceSettingsPage`, `#expandRow` private helpers. Use one convention for private members.

# WARN 953b2cea-345 namespace-export-with-internal-hiding `packages/e2e/perf-harness/src/index.ts:1`

This barrel blanket-re-exports 20 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-346 lifecycle-owned-by-its-resource `packages/e2e/rpc-tunnel-e2e/src/test-client.ts:68`

The `testCall` stream handler starts a `setInterval` inline and never stores the handle or clears it: even when the stream calls `close()` (past 1,000,000) or the client disconnects, the 10ms timer keeps incrementing `_value` and calling `next`. This violates `lifecycle-owned-by-its-resource`. Keep the interval handle, clear it when the stream closes (and in the owning class's close/dispose), and register the cleanup via the stream's lifecycle.

# WARN 953b2cea-347 structured-logging-not-console `packages/experimental/discord-worker/src/worker.ts:235`

Request-handling code logs per-interaction events and errors with `console.log`/`console.error` (lines 136, 235, 289, 296, 335, 355-388) instead of the project logger; the signature/interaction-type lines fire on every request. Use `@dxos/log` and drop per-request detail to `debug`.

# WARN 953b2cea-348 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:253`

The "feed ? Query.select(Filter.type(X)).from(feed) : Query.select(Filter.nothing())" query is built inline in a `useMemo` in the component. This identical derivation is repeated across many containers, so extract a shared hook such as `useFeedQuery(db, feed, schema)`, per the rule.

# WARN 953b2cea-349 standalone-service-accessor `packages/plugins/plugin-agent/src/operations/list-triggers.ts:18`

`yield* BrainService.BrainService` followed by `brain.subscriptions(...)` is repeated in `cancel-trigger.ts:15`, `watch-facts.ts:32` and here. Add a standalone `BrainService.subscriptions(agentId)` wrapper and call it directly.

# ERROR 953b2cea-350 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:129`

`AiUsageQuotaError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-351 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:374`

`Effect.provide(..., ToolExecutionServices).pipe(Effect.provide(this._spaceLayer))` chains two provides. Merge them with `Layer.mergeAll(ToolExecutionServices, this._spaceLayer)` and provide once, per the flat-layer-composition rule.

# WARN 953b2cea-352 consistent-file-naming-within-folder `packages/plugins/plugin-assistant/src/components/ConnectorAuthMenu/ConnectorAuthMenu.stories.tsx:68`

Default story renders `ComponentStory`, not `DefaultStory`. Rename the default render component to `DefaultStory`.

# WARN 953b2cea-353 barrel-imports-not-internal-paths `packages/plugins/plugin-assistant/src/components/index.ts:9`

Reaches past a directory barrel into an individual file: re-exports `TracePanel` from `../containers/TracePanel/TracePanel.tsx`; use `../containers/TracePanel/index.ts`. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-354 layout-only-wrapper-invisible-to-a11y `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:88`

The root `<div>` has no styling or semantics and only groups the `<h1>` and the grid. Replace it with `<>...</>`, or add `role='none'` if a DOM node is needed.

# WARN 953b2cea-355 barrel-imports-not-internal-paths `packages/plugins/plugin-assistant/src/containers/IntegrationPrompt/IntegrationPrompt.tsx:20`

Reaches past a directory barrel into an individual file: imports `useChatReportContext` from `../../components/Chat/context.ts`; import from the `components/Chat` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-356 barrel-imports-not-internal-paths `packages/plugins/plugin-assistant/src/containers/PluginPrompt/PluginPrompt.tsx:17`

Reaches past a directory barrel into an individual file: imports `useChatReportContext` from `../../components/Chat/context.ts`; import from the `components/Chat` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-357 barrel-imports-not-internal-paths `packages/plugins/plugin-assistant/src/containers/PluginUrlPrompt/PluginUrlPrompt.tsx:19`

Reaches past a directory barrel into an individual file: imports `useChatReportContext` from `../../components/Chat/context.ts`; import from the `components/Chat` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-358 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:69`

Nested hand-rolled `flex flex-col gap-4` and `grid grid-cols-2 gap-8` divs; use `Grid`/`Flex` with ramp-step gaps. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-359 structured-logging-not-console `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.tsx:159`

`console.log(json)` of the trace dump in committed UI code. Replace with `log.info('trace dump', { data })` from `@dxos/log`.

# WARN 953b2cea-360 barrel-imports-not-internal-paths `packages/plugins/plugin-assistant/src/hooks/useChatKeymap.ts:12`

Reaches past a directory barrel into an individual file: imports `ChatEvent` from `../components/Chat/events.ts`; import from the `components/Chat` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-361 barrel-imports-not-internal-paths `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:17`

Reaches past a directory barrel into an individual file: imports `useChatContext` from `../components/Chat/context.ts`; import from the `components/Chat` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-362 structured-logging-not-console `packages/plugins/plugin-assistant/src/hooks/useDebug.ts:28`

Uses `console.group`/`console.log` to dump system prompt and tools in committed code. Replace with `@dxos/log` (`log.info`/`log.debug` with structured fields) per the rule.

# WARN 953b2cea-363 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:94`

The hook mixes `useAtomValue` for the process tree with manually forked fibers (`fibersRef`) writing the ephemeral status into `useState`; the ephemeral status stream is reactive state the UI watches. Derive the status through a stream-backed `Atom` and consume via `useAtomValue` instead of a hand-rolled subscription.

# WARN 953b2cea-364 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/hooks/useSkillRegistry.test.tsx:22`

`makeSpaceSkill` is a single `Obj.make(Skill.Skill, ...)` call with constant defaults, renaming the API under test. Inline `Obj.make(Skill.Skill, { name, instructions: Template.make(), tools: [] })` at the call sites.

# WARN 953b2cea-365 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/bind-chat-context.ts:28`

`Plugin.Service` is read with `Effect.serviceOption` rather than declared. Declare it and have hosts without a plugin manager provide a noop layer. The same pattern is in `ensure-companion-chat.ts:23` and `run-prompt-in-chat.ts:31`.

# WARN 953b2cea-366 jsdoc-non-obvious-identifiers `packages/plugins/plugin-assistant/src/types/AssistantCapabilities.ts:90`

`AgentResponse.requestId` and `optionId` are bare string ids; the doc on `message` shows siblings are documented. Say which request block's id and which option within it these refer to.

# WARN 953b2cea-367 consistent-file-naming-within-folder `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.stories.tsx:72`

Default story render component is generically named `Story`. Rename to `DefaultStory`.

# ERROR 953b2cea-368 errors-extend-base-error `packages/plugins/plugin-atproto/src/errors.ts:8`

`MissingHandleError` uses `Data.TaggedError` (the same applies to every error class in this file, lines 11-20). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-369 consistent-file-naming-within-folder `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:118`

Default story renders `SelectionStateStory`. Rename to `DefaultStory` per the storybook convention.

# WARN 953b2cea-370 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:128`

Hand-rolled `flex h-full` / `flex flex-col` divs; use `Flex` primitives. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-371 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-attention/src/testing.ts:5`

`export * as AttentionPlugin from './AttentionPlugin.testing.ts'`: the filename carries a `.testing` suffix and does not equal the namespace, and there is no directive. Align the name or drop the namespace style.

# WARN 953b2cea-372 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:94`

New-style `useObjects(accessTokenRefs)` call site; `useObjects` is deprecated by this rule because the list subscribes to every element. Pass refs unresolved and resolve in the leaf with `useObject`.

# WARN 953b2cea-373 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:127`

The list calls `useObjects(postRefs)` and then maps `ref.target` (line 132) to build tile data, so the list subscribes to every post and one edit re-renders all tiles. Subscribe only to the membership (`postRefs`), pass refs through, and let each tile call `useObject(ref)` itself (leaf-owns-its-subscription).

# WARN 953b2cea-374 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-blogger/src/operations/index.ts:12`

`export * as BloggerOperation from './definitions.ts'`: namespace and filename disagree and `definitions.ts` has no directive. Rename the file to `BloggerOperation.ts` and add the directive.

# WARN 953b2cea-375 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-bluesky/src/operations/index.ts:16`

`export * as BlueskyOperation from './definitions.ts'`: namespace and filename disagree and no directive is present. Rename the file to `BlueskyOperation.ts` and add the directive.

# WARN 953b2cea-376 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:151`

The container hand-builds a `Toolbar.Root` with `Button.Root` children (and carries a TODO acknowledging it), so graph actions and plugin extensions cannot compose into it. Build the actions with `MenuBuilder` in an atom via `useMenuActions`, render with `Menu.Root`, and thread the existing `attendableId` (`toolbars-are-menu-actions`).

# WARN 953b2cea-377 story-for-new-ui-component `packages/plugins/plugin-bookmarks/src/components/Summary/Summary.tsx:1`

`Summary` is a visual component with no `Summary.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-378 consistent-file-naming-within-folder `packages/plugins/plugin-bookmarks/src/containers/BookmarkCard/BookmarkCard.stories.tsx:16`

Default story renders `CardStory`. Rename to `DefaultStory`.

# WARN 953b2cea-379 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-brain/src/capabilities/fact-store.ts:74`

`layerFor` only wraps `Layer.succeed(FactStore, forSpace(spaceId))`. Inline it at its call sites so the layer construction is visible.

# WARN 953b2cea-380 standalone-service-accessor `packages/plugins/plugin-brain/src/operations/query-facts.ts:37`

`const store = yield* FactStore; const facts = yield* store.query(...)` is retyped at several sites (also `summarize-subject.ts:55`, `crawler/src/stages/topics.ts:46` and `:103`). Add a standalone `FactStore.query(...)` accessor next to the service and call it directly at each site.

# WARN 953b2cea-381 consistent-private-field-convention `packages/plugins/plugin-calls/src/calls/call-manager.ts:1`

Class `CallManager` has dozens of `private _xAtom` fields plus a `#seeded` field. Use `_seeded` or migrate all to `#`.

# WARN 953b2cea-382 namespace-brand-key-prefixing `packages/plugins/plugin-calls/src/calls/types.ts:56`

`{ __brand: 'EncodedTrackName' }` is a bare brand key with no module-path prefix. Use e.g. `'@dxos/plugin-calls/EncodedTrackName'`.

# WARN 953b2cea-383 no-impossible-state-handling `packages/plugins/plugin-calls/src/calls/util/calls-service.ts:361`

`invariant(newTrackResponse.tracks)` asserts presence, then `newTrackResponse.tracks?.find(...)` uses optional chaining. Bind `const { tracks: pulledTracks } = newTrackResponse` after the invariant and call `.find` without `?.`.

# WARN 953b2cea-384 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:108`

Arbitrary `w-[5rem]` bypasses the sizing tokens; use the design system's inline-size token (e.g. `is-*`/semantic width) instead. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-385 no-pointless-indirection `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:101`

Explicit `useState<number>` type argument is already inferred from the initial value; drop it and write `useState(0)` (rule no-pointless-indirection).

# WARN 953b2cea-386 no-pointless-indirection `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:77`

Explicit `useState<number>` type argument is already inferred from the initial value; drop it and write `useState(0)` (rule no-pointless-indirection).

# WARN 953b2cea-387 no-pointless-indirection `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsivePanel.tsx:26`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# ERROR 953b2cea-388 errors-extend-base-error `packages/plugins/plugin-chess-com/src/errors.ts:7`

`ChessComRequestError` uses `Data.TaggedError` (also `ChessComNotFoundError`). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-389 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:37`

Arbitrary `min-w-[18rem]` used for a panel width; the same 18rem is repeated in sibling popovers (ProgressStatusIndicator, PluginFailureBadge). Use one semantic sizing token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-390 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:76`

The container renders `Button.Root` children directly in `Toolbar.Root` (new game, toggle info) with no `attendableId`. Move these to menu actions (`MenuBuilder`/`useMenuActions`, `Menu.Root`) and pass `attendableId`, encoding the game-over state in action properties.

# WARN 953b2cea-391 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:93`

Grid layout composed with a Tailwind `gap-8` literal; use `Grid` with a ramp-step `gap` (e.g. `xl`). Rule: no-styling-wrapper-divs.

# WARN 953b2cea-392 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:103`

`<div className='hidden @4xl:flex flex-col justify-center items-center overflow-hidden'>` is a hand-rolled flex box; use `Flex column align='center' justify='center'`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-393 consistent-file-naming-within-folder `packages/plugins/plugin-chess/src/containers/ChessCard/ChessCard.stories.tsx:20`

Default story renders `CardStory`. Rename to `DefaultStory`.

# WARN 953b2cea-394 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:99`

Arbitrary `min-w-[6rem]` on Select.Trigger; use a semantic size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-395 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:27`

Arbitrary `min-h-[15rem]` on dialog content; use a semantic block-size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-396 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-cloudflare/src/services/index.ts:5`

`export * as CloudflareApi from './cloudflare-api.ts'` uses a hyphenated filename and no directive. Rename it to `CloudflareApi.ts` and add the directive.

# WARN 953b2cea-397 no-env-vars-in-low-level-modules `packages/plugins/plugin-code/src/agent-helper/server.ts:350`

`relay` spreads `process.env` into the child environment although `runAgentHelper` is already handed an explicit `env` (see `bin/dx-agent.ts`). Thread that `env` down to `relay` instead of reading `process.env` in the low-level module.

# WARN 953b2cea-398 reuse-shared-test-layer `packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:103`

Builds an inline Layer.succeed(Trace.TraceService, { write: () => {} }) no-op stub when the shared Trace.writerLayerNoop layer (used by the conductor tests) already provides it. Violates reuse-shared-test-layer; replace with the shared layer and delete the local stub.

# WARN 953b2cea-399 reuse-shared-test-layer `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:172`

Builds an inline Layer.succeed(Trace.TraceService, { write: () => {} }) no-op stub when the shared Trace.writerLayerNoop layer (used by the conductor tests) already provides it. Violates reuse-shared-test-layer; replace with the shared layer and delete the local stub.

# WARN 953b2cea-400 story-for-new-ui-component `packages/plugins/plugin-code/src/components/CodeToolbar/CodeToolbar.tsx:1`

`CodeToolbar` is a visual component with no `CodeToolbar.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-401 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-computer/src/vite-plugin/index.ts:11`

`export * as ShellMiddleware from './shell-middleware.ts'` uses a hyphenated filename and no directive. Rename it to `ShellMiddleware.ts` and add the directive.

# WARN 953b2cea-402 toolbars-are-menu-actions `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:46`

`attendableId` is underscored as unused, which the rule forbids for container toolbars. Destructure it as `attendableId` and thread it into the menu-action toolbar.

# WARN 953b2cea-403 story-for-new-ui-component `packages/plugins/plugin-connector/src/components/CreateConnectionPanel/CreateConnectionPanel.tsx:1`

`CreateConnectionPanel` is a visual component with no `CreateConnectionPanel.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-404 story-for-new-ui-component `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:1`

`SchemaTable` is a visual component with no `SchemaTable.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-405 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:30`

The selection query (id filter, `deleted: 'include'`, `includeFeeds` scope, nothing-fallback) is built in an inline `useMemo` in the component. Extract it into a named hook, e.g. `useSelectionQuery(db, id)`, so the component only renders the result.

# WARN 953b2cea-406 consistent-file-naming-within-folder `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

Default story render component is named `Render`. Rename to `DefaultStory`.

# WARN 953b2cea-407 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:189`

Arbitrary `w-[4rem]` for an input; use a semantic size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-408 story-for-new-ui-component `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:1`

`Companion` is a visual component with no `Companion.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-409 story-for-new-ui-component `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:1`

`FoldSpine` is a visual component with no `FoldSpine.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-410 consistent-file-naming-within-folder `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

Default story renders `SplitStory`. Rename to `DefaultStory`.

# WARN 953b2cea-411 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:68`

Hand-rolled `flex h-full gap-3 p-3` divs in several stories; use `Flex` primitives with ramp-step gaps. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-412 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:166`

`box` is a one-line wrapper over `element.getBoundingClientRect()`. Inline `getBoundingClientRect()` at its call sites.

# WARN 953b2cea-413 fix-root-cause-not-symptom `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:46`

A debounce timer (`setOpen(false)` then `setTimeout(() => setOpen(true), DEBOUNCE_DELAY)`) is used to dodge a documented race between showing the popover and the anchor rendering or the virtual trigger being measured. Fix the ordering (open only once the anchor ref/rect is available) rather than delaying with a timeout.

# WARN 953b2cea-414 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:100`

`Tabs.List` carries `grid ... gap-1` with a Tailwind number gap literal; use `Grid` via `asChild` with a ramp-step `gap`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-415 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:123`

`<div className='hidden lg:grid grid-cols-1 ... p-1'>` is a hand-rolled grid plus padding; use `Grid`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-416 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-deck/src/url/index.ts:9`

`export * as Navigation from './navigation.ts'` re-exports a lowercase file with no directive. Rename it to `Navigation.ts` and add the directive.

# WARN 953b2cea-417 jsdoc-non-obvious-identifiers `packages/plugins/plugin-deck/src/util/layout.ts:13`

`replaceId` has no comment while its sibling `pivotId` does; it is not inferable whether it names a plank to replace or a subject. Document what it refers to.

# WARN 953b2cea-418 no-bare-ref-schema-alias `packages/plugins/plugin-deepseek/src/skills/operations/definitions.ts:12`

`SandboxRef` is a module-level alias whose whole value is `Ref.Ref(Sandbox.Sandbox).annotate({...})`, used as the `sandbox` field (line 55). Write `Ref.Ref(Sandbox.Sandbox).annotate({ description: ... })` inline at the field, per `no-bare-ref-schema-alias`.

# WARN 953b2cea-419 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:70`

The container performs a direct GitHub API call (`fetch` of `api.github.com/.../pulls`), builds the query, filters merged PRs and maps the response inside a `useEffect`. Per the `business-logic-out-of-ui` rule, move the fetch and mapping into an Operation or service and have the component invoke it.

# WARN 953b2cea-420 standalone-service-accessor `packages/plugins/plugin-discord/src/capabilities/connector.ts:60`

`const rest = yield* DiscordREST; yield* rest.getMyUser()` is repeated three times in this file (lines 60, 125, 144). Extract a module-level `getMyUser` helper (or `Effect.serviceFunction`) and call it at each site.

# WARN 953b2cea-421 story-for-new-ui-component `packages/plugins/plugin-discord/src/components/DiscordSetup/DiscordSetup.tsx:1`

`DiscordSetup` is a visual component with no `DiscordSetup.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-422 obj-update-push `packages/plugins/plugin-discord/src/operations/admin/bind-channel.ts:97`

Inside `Obj.update`, `list.channels = [...list.channels, Ref.make(channel)]` assigns a spread copy of the object's own array, which is O(n) per append. Replace it with `list.channels.push(Ref.make(channel));` per the `obj-update-push` rule.

# WARN 953b2cea-423 no-pointless-indirection `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:61`

Explicit `useState<boolean>` type argument is already inferred from the initial value; drop it and write `useState(false)` (rule no-pointless-indirection).

# WARN 953b2cea-424 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

The container renders a bare `Toolbar.Root` with a variant toggle group and never takes `attendableId`. Build the toolbar from menu actions via `MenuBuilder`/`useMenuActions` and `Menu.Root`, threading `attendableId`.

# WARN 953b2cea-425 schema-persists-source-not-derived-duplicate `packages/plugins/plugin-explorer/src/types/Graph.ts:15`

`Graph.query` duplicates the same `raw` plus `ast` pair that `View` already persists (and `Graph` also references a `view`), so the query exists in up to three persisted places. Persist one canonical query and derive the AST from it.

# WARN 953b2cea-426 inject-dependencies-via-constructor `packages/plugins/plugin-file-system/src/capabilities/app-graph-builder.ts:38`

Per-workspace rearrange callbacks are cached in a module-level `Map` keyed by workspace id, outside the objects that own them. Keep this state on the graph-builder instance (class or closure created per plugin activation) instead of a global Map.

# WARN 953b2cea-427 comment-hygiene `packages/plugins/plugin-file-system/src/capabilities/state/markdown-documents.ts:141`

`// --- File watching ... ---` section separators (also 228, 263, 404) are decoration. Remove them; extract functions if the grouping matters.

# WARN 953b2cea-428 story-for-new-ui-component `packages/plugins/plugin-file/src/components/FileInput/FileInput.tsx:1`

`FileInput` is a visual component with no `FileInput.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-429 co-locate-tightly-coupled-code `packages/plugins/plugin-game/src/components/CreateGamePanel.tsx:1`

`CreateGamePanel.tsx` and `CreateGamePanel.stories.tsx` are loose in `components/`. Move them into a `CreateGamePanel/` directory with an index.

# ERROR 953b2cea-430 errors-extend-base-error `packages/plugins/plugin-game/src/util/load-game.ts:11`

`GameVariantMismatchError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-431 story-for-new-ui-component `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:1`

`CommentComposer` is a visual component with no `CommentComposer.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-432 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:103`

Arbitrary `w-[28rem]` popover width; use a semantic size token aligned with sibling popovers. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-433 story-for-new-ui-component `packages/plugins/plugin-github/src/components/PullRequestFiles/PullRequestFiles.tsx:1`

`PullRequestFiles` is a visual component with no `PullRequestFiles.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-434 story-for-new-ui-component `packages/plugins/plugin-github/src/components/PullRequestOverview/PullRequestOverview.tsx:1`

`PullRequestOverview` is a visual component with no `PullRequestOverview.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-435 story-for-new-ui-component `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:1`

`PullRequestStatus` is a visual component with no `PullRequestStatus.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-436 story-for-new-ui-component `packages/plugins/plugin-github/src/components/WalkthroughView/WalkthroughView.tsx:1`

`WalkthroughView` is a visual component with no `WalkthroughView.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-437 no-invented-theme-tokens `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:217`

`text-description` is not a `--color-` property in the theme, so it generates no CSS and the text renders in the inherited color. Use a declared token such as `text-fg-muted` (rule: no-invented-theme-tokens).

# WARN 953b2cea-438 no-invented-theme-tokens `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:259`

`text-description` is an invented token with no matching `--color-description` in the theme. Replace with `text-fg-muted` or `text-fg-subtle`.

# WARN 953b2cea-439 consistent-file-naming-within-folder `packages/plugins/plugin-github/src/GitHubPlugin.workerd.test.ts:1`

PascalCase test filename while siblings (approval, plugin, pull-request) are kebab-case. Rename to `github-plugin.workerd.test.ts`.

# WARN 953b2cea-440 inject-dependencies-via-constructor `packages/plugins/plugin-github/src/hooks/useSyncPullRequest.ts:20`

Per-pull-request sync bookkeeping lives in a global `Map<string, number>` keyed by object id, with a free `markSynced` helper. Keep this state on a per-instance object (a small tracker class or ref) rather than a global map, per the rule against per-object bookkeeping in global Maps.

# WARN 953b2cea-441 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/services/index.ts:5`

`export * as GitHubApi from './github-api.ts'` uses a hyphenated filename and no directive. Rename it to `GitHubApi.ts` and add the directive.

# WARN 953b2cea-442 barrel-imports-not-internal-paths `packages/plugins/plugin-github/src/stories/PullRequestArticle.stories.tsx:24`

Reaches past a directory barrel into an individual file: imports from `../containers/PullRequestArticle/PullRequestArticle.tsx` instead of that directory's index.ts. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-443 barrel-imports-not-internal-paths `packages/plugins/plugin-github/src/stories/PullRequestsArticle.stories.tsx:26`

Reaches past a directory barrel into an individual file: imports from `../containers/PullRequestsArticle/PullRequestsArticle.tsx` instead of that directory's index.ts. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-444 jsdoc-non-obvious-identifiers `packages/plugins/plugin-google/src/apis/GoogleContacts/api.ts:74`

`pageToken`, `syncToken` and `requestSyncToken` opaque Google handles are undocumented; add JSDoc saying `syncToken` is the token from a previous full sync used for incremental sync and `pageToken` continues a prior page.

# WARN 953b2cea-445 comment-hygiene `packages/plugins/plugin-google/src/operations/mail/sync/tag-push.test.ts:209`

The comment references "TASKS.md §Phase 1 DECIDED", a migration-phase number instead of current behavior. Say what archive means in the code, and drop the phase reference.

# ERROR 953b2cea-446 errors-extend-base-error `packages/plugins/plugin-heygen/src/services/heygen-provider-types.ts:60`

`MissingApiKeyError` extends `Error` directly (also `UnsupportedKindError`, `ProviderFailureError`). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-447 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:141`

`<div className='dx-expand flex flex-col gap-4 p-4 ...'>` and nested `flex gap-2` divs; use `Flex` with ramp-step gaps. Rule: no-styling-wrapper-divs.

# ERROR 953b2cea-448 errors-extend-base-error `packages/plugins/plugin-higgsfield/src/services/higgsfield-provider-types.ts:62`

`MissingCredentialError` extends `Error` directly (also `ProviderFailureError`). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-449 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:273`

`run` accepts `Effect.Effect<T, any, any>` and then casts the provided result to `Effect.Effect<T, any, never>` to get past the type-checker, masking any genuinely unprovided service. Make it generic over `R`, provide the real layers, and let the remaining requirement be checked rather than cast.

# WARN 953b2cea-450 parent-ref-backs-parent-pointer `packages/plugins/plugin-ibkr/src/sync.ts:61`

`Obj.setParent(op, portfolio)` sets the persisted sync operation's parent to the portfolio, but `Portfolio` holds only a `feed` ref and nothing referencing `op`, so the edge is one-way and `Obj.setParent` logs its ref-less-edge warning. Per `parent-ref-backs-parent-pointer`, add a ref (or annotation) to the operation on the portfolio alongside the parent write, or do not parent it.

# WARN 953b2cea-451 co-locate-tightly-coupled-code `packages/plugins/plugin-illustrator/src/components/CreateDrawingPanel.tsx:1`

`CreateDrawingPanel` is a loose component file in `components/`, not in its own directory. Move it into `CreateDrawingPanel/` with its story.

# WARN 953b2cea-452 co-locate-tightly-coupled-code `packages/plugins/plugin-illustrator/src/components/SceneSvg.tsx:1`

`SceneSvg.tsx`, `SceneSvgFile.tsx` and `SceneSvg.stories.tsx` are loose files in `components/`. Put each component in its own directory alongside its story.

# WARN 953b2cea-453 no-hand-rolled-lists `packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:85`

Score results are rendered as a mapped `<ul>`/`<li>` stack of rows with custom layout. Replace with a `Listbox` display list (rule: no-hand-rolled-lists).

# ERROR 953b2cea-454 errors-extend-base-error `packages/plugins/plugin-illustrator/src/util/load-drawing.ts:12`

`UnknownDrawingVariantError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-455 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:638`

Hand-rolled `<div className='flex flex-col'>` wrapper around a message; use `<Flex column asChild>` or `Flex` directly. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-456 story-for-new-ui-component `packages/plugins/plugin-inbox/src/components/Initialize/Initialize.tsx:1`

`Initialize` is a visual component with no `Initialize.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-457 story-for-new-ui-component `packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx:1`

`MarkdownViewer` is a visual component with no `MarkdownViewer.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-458 story-for-new-ui-component `packages/plugins/plugin-inbox/src/components/RelatedEvents/RelatedEvents.tsx:1`

`RelatedEvents` is a visual component with no `RelatedEvents.stories.tsx` alongside it, so it has no resting-state snapshot to catch visual regressions. Add a story at this component level (render the component itself, not a child, with only the props it uses) per `story-for-new-ui-component`.

# WARN 953b2cea-459 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:62`

Inline feed-scoped query construction with a `Filter.nothing()` fallback is repeated in the component body (same pattern in `SubscriptionsArticle`, `RelatedToContact`, `PortfolioArticle`, `SearchArticle`, `Chat`, `TestPlanArticle`, `ChessGameArticle`). Extract a reusable `useFeedQuery`-style hook instead of hand-building the query in each component.

# WARN 953b2cea-460 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:199`

`<div className='grid grid-cols-1 @2xl:grid-cols-[min-content_1fr] h-full'>` is a hand-rolled grid; use `Grid` (list form `cols`) instead. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-461 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:35`

`<div className='flex-1'>` exists only to carry layout; use `Flex grow`/`asChild` on a primitive. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-462 consistent-file-naming-within-folder `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:1`

Capitalized test filename in a folder with kebab-case tests (precondition, sync, topology). Rename to `feed-cursor.test.ts`.

# WARN 953b2cea-463 functions-before-classes `packages/plugins/plugin-inbox/src/testing/builder.ts:97`

`Builder` is a chainable class that only accumulates fake events, messages and persons and returns them from `build()`; it has no open/close lifecycle. Per `functions-before-classes`, replace it with a plain data-generating function (for example `createTestData({ persons, events, messages })`) instead of a stateful builder.

# WARN 953b2cea-464 consistent-file-naming-within-folder `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:86`

Default story renders `DefaultComponent`. Rename to `DefaultStory`.

# WARN 953b2cea-465 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:53`

An inline `useMemo` composes the tag-filtered query and resolves it to a db atom inside the component body, mixing query construction with rendering. Per `extract-non-rendering-logic-from-component`, move it into a named hook (e.g. `useTaggedQueryAtom(db, baseFilter, tag)`); the same shape also appears in `plugin-map/src/capabilities/marker-provider.tsx`.

# WARN 953b2cea-466 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

Paging buttons and a view-mode toggle group are rendered directly inside `Toolbar.Root`, and the component does not destructure `attendableId` from `ObjectArticleProps`. Express them as menu actions (`MenuBuilder` + `useMenuActions`, with state in action properties) and render with `Menu.Root` using `attendableId`.

# ERROR 953b2cea-467 errors-extend-base-error `packages/plugins/plugin-library/src/operations/http.ts:15`

`BookHiveFetchError` uses `Data.TaggedError`. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-468 comment-hygiene `packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:110`

`// -- Helpers --` is a section separator and decoration. Remove it.

# WARN 953b2cea-469 no-impossible-state-handling `packages/plugins/plugin-magazine/src/operations/fetch-article-content.ts:22`

`invariant(post.link, 'Post has no link.')` already guarantees `post.link`, yet `post.link!` is used. Capture `const link = post.link` after the invariant and use it, no `!`.

# ERROR 953b2cea-470 errors-extend-base-error `packages/plugins/plugin-magazine/src/operations/sources/feed-fetcher.ts:20`

`FeedFetchError` uses `Data.TaggedError`. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-471 barrel-imports-not-internal-paths `packages/plugins/plugin-magazine/src/stories/MagazineCurate.stories.tsx:41`

Reaches past a directory barrel into an individual file: imports from `../containers/MagazineArticle/MagazineArticle.tsx` instead of that directory's index.ts. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-472 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:365`

Span with hand-rolled `flex gap-1`; use `Flex asChild` with ramp-step `gap`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-473 barrel-imports-not-internal-paths `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx:49`

Reaches past a directory barrel into an individual file: imports `PreviewComponent` from `../components/PreviewComponent/PreviewComponent.tsx`; import from `../components/PreviewComponent/index.ts`. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-474 dont-recompute-in-reactive-closures `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:252`

`db.query(Query.select(...)).atom` is created on each invocation of the reactive action closure. Per `dont-recompute-in-reactive-closures`, create the meeting query atom once per database outside the closure and only read it with `get`.

# WARN 953b2cea-475 layout-only-wrapper-invisible-to-a11y `packages/plugins/plugin-meeting/src/containers/MeetingsList/MeetingsList.tsx:79`

The root `<div>` has no styling or semantics and only groups the toolbar row and the Listbox. Replace it with a Fragment, or add `role='none'` if a DOM node is needed.

# WARN 953b2cea-476 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-meeting/src/containers/MeetingsList/MeetingsList.tsx:80`

Arbitrary `min-h-[3rem]` for a toolbar row; use the design system's row/toolbar height token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-477 dont-recompute-in-reactive-closures `packages/plugins/plugin-messenger/src/capabilities/inbox-materializer.ts:38`

`space.db.query(...)` is constructed inside the `Atom.make` closure, so every recomputation (including each time the query result itself changes) builds a new query and re-subscribes. Per `dont-recompute-in-reactive-closures`, build the query once per space outside the closure (for example a per-space `Atom.family` or a cached query atom) and only `get()` it inside.

# WARN 953b2cea-478 structured-logging-not-console `packages/plugins/plugin-native/src/capabilities/ollama.ts:377`

`logSidecar` routes process output to `console.error/warn/log` while the same module imports and uses `@dxos/log` (line 27), mixing two logging APIs. Map the Ollama levels to `log.error`/`log.warn`/`log.debug` instead of `console.*`.

# WARN 953b2cea-479 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:356`

`<div className='grid place-items-center'>` hand-rolled grid; use `Grid`/`Flex center`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-480 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:370`

`ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'` uses a Tailwind number gap; use `Flex column gap='sm'`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-481 co-locate-tightly-coupled-code `packages/plugins/plugin-navtree/src/components/types.ts:14`

`NavTreeContextValue` sits in the shared `types.ts` while its only consumer is the `NavTreeContext/` directory; the context type and its hook are split across files. Move the type next to `NavTreeContext.ts`.

# WARN 953b2cea-482 co-locate-tightly-coupled-code `packages/plugins/plugin-navtree/src/components/types.ts:25`

`NavTreeItemColumnsProps` lives in the shared components `types.ts` but is only used by `NavTreeItem/NavTreeItemColumns.tsx`. Move it into that component file (co-locate Props with the component, per `co-locate-tightly-coupled-code`).

# WARN 953b2cea-483 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:49`

Arbitrary `w-[80px]` logo width, duplicated in Welcome.tsx; use a semantic size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-484 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:400`

`classNames='flex flex-col gap-6'` hand-rolls a column with a Tailwind number gap; use `Flex column` with a ramp-step `gap`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-485 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:885`

`<div className='flex flex-col md:gap-1 flex-row gap-0 sm:items-stretch'>` hand-rolled flex with number gaps; use `Flex` with ramp-step `gap`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-486 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:918`

`<div className='flex-1 border-t ...' />` is a styling-only div; use a `Flex grow` element or a separator primitive. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-487 reuse-existing-mechanism `packages/plugins/plugin-onboarding/src/credentials/util.ts:24`

`joinWaitlist` and `login` hand-roll raw `fetch` POSTs to hub-service `account/request-access` and `account/login`, but `HubHttpClient` in `@dxos/edge-client` (`hub-http-client.ts`) already exposes `requestAccess` and `login` for the same endpoints with typed request/response, auth and retry handling. Delete these helpers and call `HubHttpClient` (already available via plugin-client's `useHubClient`), adding a parameter there if the unauthenticated case needs to vary (rule: reuse-existing-mechanism).

# WARN 953b2cea-488 comment-hygiene `packages/plugins/plugin-onboarding/src/samples/bramble/roast-log.ts:77`

`// --- approved: ... ---` separators (also 129, 147, 178) are decoration. Remove them; the status field already says this.

# WARN 953b2cea-489 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:183`

`column.view.target` is read in the render path for every column (lines 183 and 199), but the component only subscribes to the single expanded column's view via `useObject(column?.view)`. Collapsed columns never re-render when their view ref resolves, so the detail pane can stay empty. Resolve each column's view with a subscription (move the row into a component that calls `useObject(column.view)`, or use `useResolveRef`), per the `subscribe-where-you-read` rule.

# WARN 953b2cea-490 dont-recompute-in-reactive-closures `packages/plugins/plugin-pipeline/src/hooks/usePipelineBoardModel.ts:48`

The query is built (`Query.fromAst(JSON.parse(JSON.stringify(...)))`, `getQueryTarget`, `queryTarget.query(query)`) inside the recomputation closure, and the closure re-runs whenever the query results change. Per `dont-recompute-in-reactive-closures`, derive the query atom only when the view's AST changes (memoize outside the results-reading closure) and `get()` it inside.

# WARN 953b2cea-491 no-pointless-indirection `packages/plugins/plugin-presenter/src/components/Markdown/Panel.tsx:39`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-492 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:23`

`<div className='flex flex-col grow overflow-hidden'>` wrapper only for layout; use `Flex column grow`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-493 event-handler-naming-convention `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:38`

`keydownHandler` is an event handler named with a `Handler` suffix rather than the `handle{Noun}{Verb}` pattern. Rename to e.g. `handleKeyDown`.

# WARN 953b2cea-494 co-locate-tightly-coupled-code `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:1`

`ProgressStatusIndicator.tsx` and its story are loose files in `components/`. Move them into a `ProgressStatusIndicator/` directory.

# WARN 953b2cea-495 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:44`

Arbitrary `w-[18rem]` duplicates the 18rem popover width in other components; swap in a shared semantic size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-496 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:135`

Test cases are rendered as a hand-rolled `<ul>` of mapped `<li>` rows with custom flex/padding. Replace with a non-selectable `Listbox` (omit `value`/`onValueChange`) so row rhythm comes from the theme (rule: no-hand-rolled-lists).

# WARN 953b2cea-497 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:154`

Runs are a mapped `<ul>`/`<li>` stack wrapping `RunRow` with hand-wired expand state. Use a `Listbox`/`OrderedList` (or Accordion for the expandable rows) instead of a hand-rolled list (rule: no-hand-rolled-lists).

# WARN 953b2cea-498 comment-hygiene `packages/plugins/plugin-registry/src/commands/registry/util.ts:41`

Ruled `// ----` banner separators (41, 80, 162, 293, 387 and their pairs) are decoration. Remove them or split into modules.

# WARN 953b2cea-499 no-hand-rolled-lists `packages/plugins/plugin-registry/src/components/DisableDependentsAlert/DisableDependentsAlert.tsx:50`

Dependent plugins are shown as a hand-styled `<ul>` of mapped `<li>` rows. Use a non-selectable `Listbox` (rule: no-hand-rolled-lists).

# WARN 953b2cea-500 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:47`

Arbitrary `min-w-[18rem] max-w-[28rem]` bypasses sizing tokens and drifts from sibling popovers; use semantic tokens. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-501 jsdoc-non-obvious-identifiers `packages/plugins/plugin-registry/src/containers/RegistryArticle/RegistryArticle.tsx:19`

Public prop `contextId: string` does not say what context it identifies (attendable, space, or view state key). Add a JSDoc line naming the concrete referent.

# WARN 953b2cea-502 standalone-service-accessor `packages/plugins/plugin-registry/src/operations/enable-plugins.ts:16`

`const manager = yield* Plugin.Service; manager.getPlugins()` is repeated across `enable-plugins.ts`, `disable-plugins.ts:16`, and `commands/plugin/{enable,disable,list}.ts`. Add a standalone `Plugin.getPlugins` accessor and call it at each site.

# WARN 953b2cea-503 effect-requirement-type-not-erased `packages/plugins/plugin-registry/src/util/assets.ts:44`

`installAssets` returns `Effect.Effect<string, PluginInstallError, any>`, erasing the requirement channel so callers can no longer detect a missing `provide`. Declare the real requirement (e.g. `FileSystem.FileSystem | Path.Path | HttpClient.HttpClient`) or drop the annotation and let it be inferred.

# WARN 953b2cea-504 effect-requirement-type-not-erased `packages/plugins/plugin-registry/src/util/assets.ts:138`

`removeAssets` is typed `Effect.Effect<void, never, any>`, widening `R` to `any`. Replace with the concrete service union it uses (e.g. `FileSystem.FileSystem`) so downstream providers are type-checked.

# WARN 953b2cea-505 effect-requirement-type-not-erased `packages/plugins/plugin-registry/src/util/resolve.ts:73`

`resolveDirectory` returns `Effect.Effect<Resolved, PluginInstallError, any>`. Name the actual requirement instead of `any` so missing services surface at compile time.

# WARN 953b2cea-506 effect-requirement-type-not-erased `packages/plugins/plugin-registry/src/util/resolve.ts:150`

`resolveUrl` erases the requirement channel with `any`. Thread the real services (e.g. `HttpClient.HttpClient`) through the signature.

# WARN 953b2cea-507 effect-requirement-type-not-erased `packages/plugins/plugin-registry/src/util/resolve.ts:208`

This exported/internal resolver is annotated `Effect.Effect<Resolved, PluginInstallError, any>`; the `any` requirement defeats the compiler's check for missing `provide`. Use the concrete union of services it needs.

# WARN 953b2cea-508 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.stories.tsx:18`

`<div className='p-4 flex flex-col gap-3'>` hand-rolled column with Tailwind number gap; use `Flex column`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-509 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:67`

Arbitrary `min-h-[120px]` pixel value; use a semantic size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-510 subscribe-where-you-read `packages/plugins/plugin-routine/src/containers/SkillArticle/SkillArticle.tsx:26`

`SkillArticle` receives `AppSurface.ObjectArticleProps<Skill.Skill>` and reads `subject.instructions.source` directly in render with no `useObject` subscription. Edits to the skill's instructions from elsewhere never update this article. Subscribe at the read, for example `const [source] = useObject(subject, 'instructions')` and render from the result, per the `subscribe-where-you-read` rule.

# WARN 953b2cea-511 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:35`

`// --- Root-level action ---` style separators (also 63, 87, 106, 135, 154) are decoration that restates the code below. Remove them.

# WARN 953b2cea-512 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:32`

`// --- Article surface ---` style separators (also 47, 58, 66, 81) are decoration that restates the surface definitions. Remove them.

# WARN 953b2cea-513 co-locate-tightly-coupled-code `packages/plugins/plugin-sample/src/components/RelatedItemsList.tsx:1`

`RelatedItemsList.tsx` and its `.stories.tsx` are loose in `components/` (same for `ActiveSpacePanel`, `SampleItemView`, `SampleStatusIndicator`). Move each into its own directory.

# WARN 953b2cea-514 consistent-file-naming-within-folder `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:1`

Capitalized test filename beside kebab-case siblings (paths, server, sidecar). Rename to `local-sandbox-backend.test.ts`.

# WARN 953b2cea-515 declare-optional-services-with-noop-layers `packages/plugins/plugin-sandbox/src/skills/functions/create-sandbox.ts:51`

`Capability.Service` is read with `Effect.serviceOption` instead of being declared. Declare it and provide a noop layer on headless runtimes.

# WARN 953b2cea-516 inline-obj-parent `packages/plugins/plugin-sandbox/src/skills/functions/download-file.ts:30`

`blob` is created by `Blob.fromBytes` after `loadedDest` is already loaded, then parented with `Obj.setParent(blob, loadedDest)` before `Database.add`. Pass `[Obj.Parent]: loadedDest` at make time (if `Blob.fromBytes` forwards props to `Obj.make`) instead of the separate `setParent` call, per the inline-obj-parent rule.

# WARN 953b2cea-517 no-bare-ref-schema-alias `packages/plugins/plugin-script/src/skills/functions/definitions.ts:14`

`FunctionRef` is a module-level alias for `Ref.Ref(Operation.PersistentOperation).annotate({...})`, reused as the `function` field in six inputs (lines 131, 163, 188, 202, 221, 263). Inline `Ref.Ref(Operation.PersistentOperation).annotate({ description: ... })` at each field with the description that input needs, per `no-bare-ref-schema-alias`.

# WARN 953b2cea-518 fix-root-cause-not-symptom `packages/plugins/plugin-script/src/templates/commentary.ts:128`

The relation filter swallows any exception from `Relation.getTarget` with a bare `catch { return false }`, labelled a workaround for `getTarget` not handling deleted objects. The root cause (deleted endpoints) should be fixed in `getTarget`/the query (or deleted relations filtered explicitly) instead of masking every failure at the call site.

# WARN 953b2cea-519 fix-root-cause-not-symptom `packages/plugins/plugin-script/src/templates/commentary.ts:143`

Same pattern: `Relation.getSource` is wrapped in `try/catch` returning `undefined` as a workaround for deleted objects. Fix `getSource` handling of deleted objects (or filter deleted relations up front) rather than discarding the error here.

# WARN 953b2cea-520 flat-layer-composition `packages/plugins/plugin-script/src/templates/discord.ts:108`

Three chained `Effect.provide` calls (DiscordRESTMemoryLive, DiscordConfig.layerConfig, FetchHttpClient.layer) can be one `Effect.provide(Layer.mergeAll(...))`, per the flat-layer-composition rule. Hoist the static layers to module scope and provide them once.

# WARN 953b2cea-521 no-native-form-controls `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:72`

A native `<input type='text'>` with hand-rolled Tailwind classes renders the search query box, so it inherits none of the theme. Replace it with the themed `Input.Root` / `Input.TextInput` primitives from `@dxos/react-ui` (or a `Form` driven by a schema), per the no-native-form-controls rule.

# WARN 953b2cea-522 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:82`

Arbitrary `max-h-[24rem]` on SearchList.Viewport, repeated identically in AddToCollectionDialog; use one shared semantic token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-523 deprecated-tag-must-be-accurate `packages/plugins/plugin-search/src/hooks/useWebSearch.ts:28`

`useWebSearch` is bare `@deprecated` with only a TODO. Name a replacement or use a TODO instead of the tag.

# WARN 953b2cea-524 test-asserts-real-behavior `packages/plugins/plugin-search/src/search/exa.test.ts:67`

`test.only` is left in committed code, which silently skips every other test in the file. Remove `.only` (rule: test-asserts-real-behavior). The test also only logs results, so add real assertions on the search output.

# WARN 953b2cea-525 no-premature-abstraction `packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx:485`

`rowBandRenderer` is built speculatively "for a future pass" and is only consumed by a hidden `<div data-row-bands>` that exists to keep it referenced. Per the no-premature-abstraction rule, delete the memo, the hidden div and the comment until CellGrid actually supports per-row tinting.

# WARN 953b2cea-526 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:312`

The `ScorePlayer` lifecycle (create in a ref, dispose on unmount, `load` on score change, play/stop with a playhead loop) is managed through several `useEffect`s directly in the component. Extract a `useScorePlayer(score, isPlaying)` hook that owns the resource lifecycle and returns the output node and playhead.

# WARN 953b2cea-527 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:484`

`<div className='flex-1 min-w-0 relative'>` wrapper carrying flex sizing; use `Flex grow`/`Container` or add a comment if positioning is genuinely ad hoc. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-528 comment-hygiene `packages/plugins/plugin-sequencer/src/util/lead-sheet.ts:8`

`// ---------------` is a bare separator with no content. Remove it.

# WARN 953b2cea-529 deprecated-tag-must-be-accurate `packages/plugins/plugin-sheet/src/model/sheet-model.ts:140`

`reset` and `recalculate` (line 167) are bare `@deprecated`. Name the replacements.

# ERROR 953b2cea-530 errors-extend-base-error `packages/plugins/plugin-sheet/src/types/SheetUtil.ts:26`

`ApiError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-531 co-locate-tightly-coupled-code `packages/plugins/plugin-sidekick/src/components/ActionItems.tsx:15`

`ActionItems` and its story are loose files in `components/` rather than in an `ActionItems/` directory. Place the component, `ActionItems.stories.tsx` and an index in their own directory.

# WARN 953b2cea-532 co-locate-tightly-coupled-code `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:14`

Component files (`ProfileGrid`, `ProfileSummary`, `DayAhead`, `Permissions`, `Section`) are loose in `components/`. Give each its own directory with its Props and story.

# WARN 953b2cea-533 layout-only-wrapper-invisible-to-a11y `packages/plugins/plugin-sidekick/src/containers/SidekickArticle/SidekickArticle.tsx:18`

The bare `<div>` carries no className or semantics and only groups the five sidekick sections inside `Layout.Container`. Replace it with `<>...</>`, or add `role='none'` if a DOM node is required.

# WARN 953b2cea-534 dont-recompute-in-reactive-closures `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:250`

`orderingSpace.db.query(Filter.type(...)).atom` is constructed inside the reactive closure each time it re-runs. Per `dont-recompute-in-reactive-closures`, construct the query once outside the closure (the space is stable for the scope) and just `get()` it here.

# WARN 953b2cea-535 dont-recompute-in-reactive-closures `packages/plugins/plugin-space/src/capabilities/dashboard.ts:41`

Three `space.db.query(...)` calls are created inside the atom closure on every run, and the result of each re-triggers the closure which rebuilds all of them. Per `dont-recompute-in-reactive-closures`, hoist the queries (keyed by space) outside the recomputation closure and read their `.atom` with `get`.

# WARN 953b2cea-536 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-space/src/commands/database/remove.ts:28`

`throw new Error` for invalid option combinations inside `Effect.gen`; the same applies to the throw a few lines below. Use `Effect.fail` with a typed error.

# WARN 953b2cea-537 effect-requirement-type-not-erased `packages/plugins/plugin-space/src/commands/space/join/join.ts:49`

The prompt effect (which requires terminal services) is cast to `Effect.Effect<string | undefined>` (requirement `never`), as the TODO admits, so the interactive path dies at runtime. Provide the Terminal service to the callback instead of casting.

# WARN 953b2cea-538 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:123`

Arbitrary `max-h-[24rem]` on SearchList.Viewport duplicated from SearchDialog; align both on a semantic token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-539 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:22`

`<div ... grid grid-rows-subgrid grid-cols-subgrid items-center>`; use `Grid cols='subgrid'` (with `asChild` to keep role semantics). Rule: no-styling-wrapper-divs.

# WARN 953b2cea-540 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:22`

Arbitrary `min-h-[3.5rem]` row height; use the semantic row-size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-541 layout-only-wrapper-invisible-to-a11y `packages/plugins/plugin-space/src/containers/ImportSpaceDialog/ImportSpaceDialog.tsx:83`

The bare `<div>` inside the status `Layout.Flex` only groups the spinner icon and the label, with no styling or semantics. Replace it with a Fragment, or add `role='none'`.

# WARN 953b2cea-542 no-hand-rolled-lists `packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx:34`

Schema names are rendered as a mapped stack of bare `<div>` rows. Use a non-selectable `Listbox` instead of hand-rolled row divs (rule: no-hand-rolled-lists).

# WARN 953b2cea-543 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:76`

Six repeated `<div className='flex gap-3 p-3'>` wrappers; use `Flex` with ramp-step `gap` (and padding on the primitive). Rule: no-styling-wrapper-divs.

# WARN 953b2cea-544 reactive-state-via-atom-bridge `packages/plugins/plugin-space/src/hooks/useEdgeStatus.ts:26`

Hand-rolled `useEffect`+`useState` hook subscribing to the `queryEdgeStatus()` stream and mirroring it into React state, reimplementing the Stream→Atom→`useAtom` bridge (`reactive-state-via-atom-bridge`). Back the EDGE status with an `Atom` fed from the stream and consume it via `useAtomValue`.

# WARN 953b2cea-545 avoid-full-collection-scans `packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:36`

Finds objects that reference `subject` by subscribing to `Filter.everything()` for the whole database and then scanning every object's references (and every relation) in a memo. This is the "find all objects referencing X" scan the rule names; it reruns on any change in the space. Use a reverse-reference / relation query (for example a query on relations by source/target, or a back-reference index) instead of iterating all objects.

# WARN 953b2cea-546 fix-root-cause-not-symptom `packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:64`

`isValidRelation` wraps `Relation.getSource`/`getTarget` in a `try/catch` that returns `false`, silently discarding the error, while the TODO states the real fix (dxos/dxos#10100) is pending upstream. This layers a client-side swallow on an issue whose fix is known; remove the guard once #10100 lands, and log the caught error meanwhile so the real cause stays visible.

# WARN 953b2cea-547 setter-must-not-own-transaction `packages/plugins/plugin-space/src/migrations/settings-space.ts:98`

`writeSpacesOrder` is a write helper that opens its own `Obj.update`; callers cannot batch it with other writes to the ordering. Fix: take the open draft and assign `order` directly.

# WARN 953b2cea-548 no-precision-loss-on-generic-refactor `packages/plugins/plugin-space/src/operations/add-relation.ts:44`

`resolveEnd` accepts `Obj.Unknown | Ref.Ref<Obj.Unknown>`, a union of two representations of the same concept (a relation end), and then casts the loaded result back to `Obj.Unknown`. Pick one canonical shape (a `Ref`) for the parameter, converting at the call site, so the cast and the union branch disappear.

# WARN 953b2cea-549 declare-optional-services-with-noop-layers `packages/plugins/plugin-space/src/operations/add-type.ts:45`

The handler reads `Plugin.Service` and `Capability.Service` with `Effect.serviceOption` instead of declaring them. Declare them and let headless hosts provide noop layers that fail loudly at the point of use.

# WARN 953b2cea-550 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:184`

The header toolbar is a hand-built `Toolbar.Root` with a bare add-section `Button.Root` even though `attendableId` is available in the component. Build with `MenuBuilder`/`useMenuActions` and render via `Menu.Root` passing `attendableId`.

# WARN 953b2cea-551 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:64`

`useObjects(objectRefs)` resolves every ref at list level. Keep only the membership subscription and have each gallery tile own its `useObject(ref)` subscription.

# WARN 953b2cea-552 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:85`

`useObjects(variantRefs)` subscribes the parent to every variant. Subscribe to membership only and let each variant tile subscribe to its own item.

# WARN 953b2cea-553 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:56`

`useObjects(variantRefs)` in a list component re-renders all variant tiles on any one variant edit. Pass refs through and resolve with `useObject` in each tile.

# WARN 953b2cea-554 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/generate.test.ts:120`

An identity-style `(effect) => effect as Effect.Effect<{ count: number }, unknown, never>` cast forces the requirement to `never`. Provide the real services and drop the cast.

# WARN 953b2cea-555 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:84`

`provide` takes `Effect.Effect<A, unknown, any>`, widening `R` to `any` so a missing service in the test layers goes unnoticed. Use a generic `<A, R>` and constrain the layers provided.

# WARN 953b2cea-556 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:103`

The container fetches the Discord widget API directly inside a `useEffect`, including cache-busting URL construction. Per the `business-logic-out-of-ui` rule, move this API-client logic into an Operation or service and have the component invoke it.

# WARN 953b2cea-557 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:163`

Channel links are a hand-rolled `<ul>` of mapped `<li>` rows with manual padding and hover styling. Use `Listbox` so keyboard navigation and row styling come from the primitive (rule: no-hand-rolled-lists).

# WARN 953b2cea-558 consistent-file-naming-within-folder `packages/plugins/plugin-tasks/src/components/Journal/Journal.stories.tsx:20`

Default story render component is `DefaultJournalStory`. Rename to `DefaultStory`.

# WARN 953b2cea-559 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:37`

The toolbar is a bare `Toolbar.Root` with a toggle group, and `attendableId` is underscored as unused (`attendableId: _attendableId`). Build the actions with `MenuBuilder`/`useMenuActions`, render with `Menu.Root`, and pass `attendableId` so attention-driven contributions target this surface.

# WARN 953b2cea-560 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:290`

Hand-rolled `flex items-center justify-center gap-2` box using a Tailwind number gap; use `Flex center gap='sm'`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-561 inline-obj-parent `packages/plugins/plugin-tasks/src/util/task-order.test.ts:109`

`child` is made right after `parent` and immediately parented with `Obj.setParent(child, parent)`. Create it as `make({ title: 'Child', [Obj.Parent]: parent })` so the parent edge is set at make time.

# WARN 953b2cea-562 leaf-owns-its-subscription `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:45`

`terra.objects.map((ref) => ref.target)` resolves each ref at list level (non-reactive, drops cold-loaded items). Pass refs through unresolved and let each leaf own its subscription via `useObject(ref)`.

# WARN 953b2cea-563 no-styling-wrapper-divs `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:138`

`<div className='fixed inset-0 flex overflow-hidden'>`; use `Flex` (asChild) and state in a comment why fixed positioning is required. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-564 no-pointless-indirection `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:227`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-565 functions-before-classes `packages/plugins/plugin-tldraw/src/model/RecordBuilder.ts:170`

`RecordBuilder` is a chainable builder that collects shapes and bindings and emits `CanvasContent` via `build()`; it has no open/close lifecycle. Per `functions-before-classes`, replace it with a function that takes a list of shape specs and returns the canvas content.

# WARN 953b2cea-566 options-object-with-defaults `packages/plugins/plugin-transcription/src/types/TranscriptionCapabilities.ts:42`

`TranscriptionManagerProvider` is typed `(props: TranscriptionManagerProviderProps) => ...` where the only field `messageEnricher` is optional, so `plugin-meeting/src/capabilities/call-extension.ts:42` must call it with `({})`. Make the parameter optional or defaulted (`props: TranscriptionManagerProviderProps = {}`) in the type and the implementation in `capabilities/transcriber.ts`.

# WARN 953b2cea-567 no-pointless-indirection `packages/plugins/plugin-transformer/src/components/Voice/Voice.tsx:21`

Explicit `useState<string>` type argument is already inferred from the initial value; drop it and write `useState('')` (rule no-pointless-indirection).

# WARN 953b2cea-568 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:204`

The test is labeled "full flow" / "e2e" but the selection step is performed by the test itself: `bindTarget` calls `materializeTrelloTargetHandler` and builds the `Cursor` by hand, which the comment admits is what the coordinator's `setCursors` does in production. The binding the sync then consumes is a test-built stand-in, so the production selection path is never exercised. Drive selection through the real coordinator (`setCursors`) instead of reimplementing it in the harness, or drop the e2e label (rule: test-real-scenario-not-narrower-proxy).

# WARN 953b2cea-569 follow-existing-lazy-loading-pattern `packages/plugins/plugin-trip/src/capabilities/index.ts:36`

`SkillDefinition` is registered with `Capability.inlineModule` and a top-level `import skillDefinition from './skill-definition.ts'` (line 24), while every sibling entry (`Schema`, `CreateObject`, `OperationHandler`, `ReactSurface`) and the `SkillDefinition` entries of plugin-inbox, plugin-brain and plugin-claude use lazy wrappers. Replace it with `AppCapability.skillDefinition(() => import('./skill-definition.ts'))` and drop the eager import, per the follow-existing-lazy-loading-pattern rule.

# WARN 953b2cea-570 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/capabilities/marker-provider.tsx:131`

`useObjects(segmentRefs ?? [])` is a deprecated call site that subscribes to every segment. Resolve per item at the leaf, or use a scoped query for membership.

# WARN 953b2cea-571 toolbars-are-menu-actions `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:58`

The article hand-builds a `Toolbar.Root` with a view-mode `ToggleGroup` and ignores `attendableId`. Use `MenuBuilder` inside an atom, `useMenuActions`, and `Menu.Root` with `attendableId`.

# WARN 953b2cea-572 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:51`

`useObjects(segmentRefs)` at list level; the comment even notes it re-renders on each target mutation. Subscribe to the `segments` ref array only and have each segment tile call `useObject(ref)`.

# WARN 953b2cea-573 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:266`

Hand-rolled `<div className='grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] overflow-hidden'>`; use `Grid` with `cols`. Rule: no-styling-wrapper-divs.

# WARN 953b2cea-574 functions-before-classes `packages/plugins/plugin-trip/src/testing/builder.ts:75`

`TripBuilder` is a chainable test-data builder (`addFlight`, bookings, segments) with no lifecycle. Per `functions-before-classes`, replace it with a function that takes an itinerary description and returns the segments and bookings.

# WARN 953b2cea-575 setter-must-not-own-transaction `packages/plugins/plugin-trip/src/types/Segment.ts:204`

`setDepartAt` is a low-level setter that opens its own `Obj.update`, so a caller changing departure and arrival (or other fields) needs one transaction per field. Fix: take the already-open draft segment and mutate it directly; let the caller wrap the batch in one `Obj.update`.

# WARN 953b2cea-576 setter-must-not-own-transaction `packages/plugins/plugin-trip/src/types/Segment.ts:218`

`setArriveAt` opens its own `Obj.update` internally, same as `setDepartAt`, preventing batching with other writes. Fix: accept a draft and mutate it directly.

# WARN 953b2cea-577 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-video/src/capabilities/app-graph-builder.ts:32`

`loadOps` only wraps `Effect.promise(() => import('../types/VideoOperation.ts'))`. Inline the dynamic import at the call sites.

# WARN 953b2cea-578 toolbars-are-menu-actions `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:27`

`attendableId` is underscored as unused while the article renders a `VoxelToolbar`. Pass `attendableId` through to a `useMenuActions`/`Menu.Root`-based toolbar.

# WARN 953b2cea-579 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:73`

Audio engine lifecycle (fade-out/stop effects and stop-on-unmount) is handled with inline `useEffect`s in the component body. Move it into a named hook (e.g. `useMixerEngine`) so the component only renders, per the rule.

# WARN 953b2cea-580 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/containers/ZenArticle/ZenArticle.tsx:18`

`attendableId` is underscored as unused in a container; rule requires passing it to the toolbar so attention-driven contributions target the right surface.

# WARN 953b2cea-581 comment-hygiene `packages/reflect/introspect-mcp/src/server/server.test.ts:86`

`// ----- Packages & symbols -----` separators (also 168, 182) are decoration. Use `describe` blocks and delete them.

# WARN 953b2cea-582 barrel-imports-not-internal-paths `packages/sdk/app-framework/src/testing/react.tsx:15`

Reaches past a directory barrel into an individual file: imports `PluginManagerProvider`, `SurfaceComponent`, `SurfaceManager` etc. from individual files under `../ui/components/*`; use the directory barrels. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-583 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:93`

`capabilities` and `fireEvents` options are bare `@deprecated`. Name the replacement options.

# WARN 953b2cea-584 barrel-imports-not-internal-paths `packages/sdk/app-framework/src/ui/hooks/useActivationSignal.ts:10`

Reaches past a directory barrel into an individual file: imports from `../components/PluginManager/PluginManagerProvider.ts`; import from the `PluginManager` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-585 barrel-imports-not-internal-paths `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:23`

Reaches past a directory barrel into an individual file: imports `App` and `bootLoader` from `../components/App/App.tsx` / `loader.ts`; use the `../components/App/index.ts` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-586 barrel-imports-not-internal-paths `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:25`

Reaches past a directory barrel into an individual file: imports from `../components/PluginManager/PluginManagerProvider.ts` and `../components/Surface/SurfaceManager.ts` / `SurfaceManagerContext.ts`, bypassing each directory's index.ts; import from the barrels. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-587 barrel-imports-not-internal-paths `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:15`

Reaches past a directory barrel into an individual file: imports `usePluginManager` from `../components/PluginManager/PluginManagerProvider.ts`; import from the `PluginManager` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-588 consistent-private-field-convention `packages/sdk/app-graph/src/AppGraphBuilder.ts:239`

Class `GraphBuilder` has `readonly #frameBudget` while also declaring `_frameBudget`, `_schedule`, `_yield`, `_onReleaseRelation`; the two spellings serve the same role. Unify.

# WARN 953b2cea-589 no-compat-shims `packages/sdk/app-graph/src/AppGraphBuilder.ts:282`

`_onExpand` keeps a compatibility layer (`TODO: Remove. This is for backwards compatibility.`) that also expands `Node.action` whenever the child relation is expanded, so callers that were not updated keep working. Per `no-compat-shims`, update the call sites to expand the action relation explicitly and delete this fallback.

# WARN 953b2cea-590 consistent-file-naming-within-folder `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:1`

Capitalized test filename beside kebab-case siblings (progress-registry, surface-roles). Rename to `tour.test.ts`.

# WARN 953b2cea-591 setter-must-not-own-transaction `packages/sdk/app-toolkit/src/echo/AppSpace.ts:97`

`setSpaceTemplateId` opens its own `Obj.update` on `space.properties`, so it cannot be batched with other property writes. Fix: take the open properties draft and set the annotation directly.

# WARN 953b2cea-592 setter-must-not-own-transaction `packages/sdk/app-toolkit/src/echo/AppSpace.ts:147`

`setDefaultSpaceId` opens its own `Obj.update` on the settings space properties, forcing one transaction per property. Fix: accept an open draft and mutate it directly.

# WARN 953b2cea-593 deprecated-tag-must-be-accurate `packages/sdk/app-toolkit/src/echo/AppSpace.ts:252`

`resolveLegacyDefaultSpace` is bare `@deprecated`. Name the replacement resolver.

# WARN 953b2cea-594 namespace-export-with-internal-hiding `packages/sdk/app-toolkit/src/index.ts:1`

This barrel blanket-re-exports 9 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-595 construct-populated-dont-mutate-after `packages/sdk/app-toolkit/src/types/AppSettings.ts:42`

`make` creates the settings with `Obj.make(AppSettings, { shared: {} })` and then sets `convergenceKey` through `Obj.update`. `Obj.make` accepts `[Obj.Meta]` in its props (as used in plugin-script `create.ts`), so pass the meta with `convergenceKey` directly in the constructing call.

# WARN 953b2cea-596 no-precision-loss-on-generic-refactor `packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.ts:187`

`snapshot` is constrained with `Role.Role<{ subject?: any }>` and `S extends Type.Obj<any>`, which widens the bounds to `any` and discards the schema's concrete shape. Constrain `subject` to `unknown` (or the schema's instance type) and use `Type.Obj.Any`/a concrete bound for `S` so `Obj.Snapshot<Type.InstanceType<S>>` stays precisely typed.

# WARN 953b2cea-597 test-asserts-real-behavior `packages/sdk/client-e2e/src/client.test.ts:134`

The identity assertions are commented out, so the test does not check the identity state it sets up. Restore the `expect` calls.

# WARN 953b2cea-598 namespace-export-with-internal-hiding `packages/sdk/client-protocol/src/index.ts:1`

This barrel blanket-re-exports 9 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-599 collapse-branches-via-identity-element `packages/sdk/client-protocol/src/Rpc.ts:64`

The two branches of the `handlersLayer` ternary differ only in whether `RpcTiming.serverLayer(...)` is merged in alongside `handlers` and `defectLogLayer`. Collapse to `Layer.mergeAll(handlers, defectLogLayer, timingEnabled ? RpcTiming.serverLayer(...) : Layer.empty)` per the identity-element rule.

# WARN 953b2cea-600 deprecated-tag-must-be-accurate `packages/sdk/client-protocol/src/space.ts:133`

`internal` is bare `@deprecated`; the TODO says 'Audit and remove', i.e. no replacement exists. Use a TODO instead of the tag, or name a replacement.

# WARN 953b2cea-601 schema-declare-and-brand `packages/sdk/client-protocol/src/space.ts:178`

`SpaceSchema` hand-composes `Schema.Any.pipe(Schema.refine(isSpace), ...)` for a type identified by the `isSpace` guard. Use `Schema.declare(isSpace).pipe(Schema.annotate({ title: 'Space' }))` instead.

# WARN 953b2cea-602 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

`EdgeHttpClientService` is read with `Effect.serviceOption` but is not in the layer requirements. Declare it and satisfy it with a noop layer on hosts that lack edge.

# WARN 953b2cea-603 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:95`

`EdgeConnectionService` is read via `Effect.serviceOption` and is not in the layer requirements. Declare it and use a noop layer.

# WARN 953b2cea-604 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:130`

`DevicesServiceLayer` reads `EdgeConnectionService` with `Effect.serviceOption`, undeclared in its type. Declare it and provide a noop layer in non-edge stacks.

# WARN 953b2cea-605 name-for-general-behavior `packages/sdk/client-services/src/internal/identity/identity-manager.ts:132`

`IdentityManager` is documented as representing the peer's state machine, which is broader than managing an identity. Rename it to describe that actual role, per the rule.

# WARN 953b2cea-606 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:616`

`IdentityManagerLayer` reads `EdgeConnectionService` with `Effect.serviceOption`, but the tag is absent from the declared `Layer` requirements. Add it to the requirements and the matching `LayerSpec` `requires`, and have non-edge hosts provide a documented `EdgeConnectionService.layerNoop`.

# WARN 953b2cea-607 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-recovery-manager.ts:361`

`EdgeHttpClientService` is read with `Effect.serviceOption` but absent from the declared `Layer` requirements. Declare it and provide a noop layer.

# WARN 953b2cea-608 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:398`

`InboxServiceLayer` reads `EdgeHttpClientService` and `EdgeConnectionService` with `Effect.serviceOption`, undeclared. Declare both and supply noop layers instead of treating absence as an empty inbox.

# WARN 953b2cea-609 error-messages-carry-context `packages/sdk/client-services/src/internal/invitations/invitation-host-extension.ts:299`

`'Active invitation not found'` carries no invitation id or state. Include the invitation/session identifier, or use a typed error.

# WARN 953b2cea-610 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:668`

`EdgeHttpClientService` is read via `Effect.serviceOption`, but the layer requires only `SwarmNetworkManagerService`. Declare the tag and use a noop layer.

# WARN 953b2cea-611 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:161`

`EdgeConnectionService` is read with `Effect.serviceOption` and is not in the layer's declared requirements. Declare it and provide a noop layer where there is no edge.

# WARN 953b2cea-612 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/layer-specs.ts:447`

The `LayerSpec` comment states the mesh and edge replicator tags are conditionally required because the factory reads them with `Effect.serviceOption`. Require them unconditionally and supply noop layers instead of pruning the requirement per host.

# WARN 953b2cea-613 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:49`

`SwarmNetworkManagerLayer` and the sibling layer at line 78 read `EdgeConnectionService` / `EdgeHttpClientService` via `Effect.serviceOption` without declaring them. Declare the requirements and use noop layers.

# WARN 953b2cea-614 test-asserts-real-behavior `packages/sdk/client-services/src/internal/space/space-manager.browser.test.ts:32`

The test body only opens two space managers; the createSpace/acceptSpace calls and their assertions are commented out, so no real outcome is checked. Restore the flow and assertions, or delete the test.

# WARN 953b2cea-615 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157`

The layer reads `EdgeConnectionService`, `EdgeHttpClientService`, `MeshEchoReplicatorService` and `EdgeAutomergeReplicatorService` via `Effect.serviceOption`, and none is in the declared requirements. Declare them in the `Layer` signature and `requires` and provide noop layers on hosts without them.

# WARN 953b2cea-616 consistent-private-field-convention `packages/sdk/client/src/invitations/invitations-proxy.ts:275`

Class `InvitationsProxy` has a `#share` helper among `private _ctx/_createdUpdate/_created/_matchesInvitationContext` members. Use one private convention.

# ERROR 953b2cea-617 errors-extend-base-error `packages/sdk/client/src/services/agent-hosting-provider.ts:39`

`ProviderApiError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-618 barrel-imports-not-internal-paths `packages/sdk/examples/src/stories/examples.stories.tsx:12`

Reaches past a directory barrel into an individual file: imports `../template/src/components/index.ts`, reaching into another package-like tree (`template/src/...`) rather than a public entry point; import via the template's package barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-619 event-handler-naming-convention `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:12`

`toggleNetwork` is a handler invoked from `onCheckedChange` but is not named `handle{Noun}{Verb}`. Rename to e.g. `handleNetworkToggle`.

# WARN 953b2cea-620 consistent-private-field-convention `packages/sdk/observability/src/extensions/otel/metrics.ts:81`

Class `OtelMetrics` has `private _meterProvider` next to `#counters/#gauges/#histograms/#observableGauges/#processor`. Make `_meterProvider` `#meterProvider` (or the reverse).

# WARN 953b2cea-621 consistent-private-field-convention `packages/sdk/observability/src/extensions/otel/traces-browser.ts:40`

Class `OtelTraces` has `private _tracer/_tracerProvider` beside `#samplingProcessors`. Unify.

# WARN 953b2cea-622 reactive-state-via-atom-bridge `packages/sdk/react-client/src/client/useClientStatus.ts:10`

Custom `useEffect`+`useState` hook subscribing to `client.status` to mirror it in React state. Expose the client status as an `Atom` and read it through the standard `useAtomValue` bridge rather than a bespoke subscription.

# WARN 953b2cea-623 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/atproto-record.ts:6`

Imports `createAnnotationHelper` from `@dxos/echo/internal`. The public equivalent is `Annotation.make` from `@dxos/echo`; switch the import and the two call sites (lines 64 and 96) per the `no-echo-internal-in-sdk` rule.

# WARN 953b2cea-624 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/factory.ts:5`

Imports `createAnnotationHelper` from `@dxos/echo/internal`. Use the public `Annotation.make` from `@dxos/echo` instead (call site at line 27) per the `no-echo-internal-in-sdk` rule.

# WARN 953b2cea-625 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:612`

The validation-failure assertions are commented out, so the test never checks that invalid tag values are rejected (only that valid ones decode). Fix validation and restore the `.to.throw()` assertions. The line above, `expect(effectSchema).not.toBeUndefined;`, also never calls the matcher and asserts nothing.

# WARN 953b2cea-626 reactive-state-via-atom-bridge `packages/sdk/shell/src/panels/IdentityPanel/useEdgeAgentsHandlers.ts:47`

Subscribes to the `queryAgentStatus()` stream in `useEffect` and stores each message with `setLastReceivedStatus`; the agent status is watched over time, so a hand-rolled subscription duplicates the Stream→Atom bridge. Back it with an `Atom` and use `useAtomValue`.

# WARN 953b2cea-627 fix-root-cause-not-symptom `packages/sdk/shell/src/panels/JoinPanel/JoinPanel.tsx:217`

The effect re-issues `resetIdentity`/`acceptHaloInvitation` events from outside the join machine to escape a state (`resettingIdentity`) with no automatic exit; the comment admits the defect is in the machine, which snapshots `identity` once. Fix the machine to react to identity clearing instead of papering over the routing race in the component.

# WARN 953b2cea-628 schema-field-uses-platform-reference-mechanism `packages/sdk/types/src/types/Message.ts:42`

`parentMessage` is a bare `Obj.ID` naming another Message object in the same space. A field naming another entity should be a typed `Ref.Ref(Message)` so the link is resolvable, traversable and tracked by the platform, not a duplicate ad hoc id (rule `schema-field-uses-platform-reference-mechanism`). Change it to `Schema.optional(Ref.Ref(Message))`.

# WARN 953b2cea-629 name-for-general-behavior `packages/sdk/types/src/types/Pipeline.ts:20`

The `Pipeline` type is a board of View-backed columns tracking progress, but its name collides with, and suggests, the `@dxos/pipeline` streaming abstraction. Rename to a name matching the real concept (the TODO lists `Funnel`, `Journey` and others).

# WARN 953b2cea-630 inject-dependencies-via-constructor `packages/sdk/types/src/types/TaskMigration.ts:66`

Per-database migration plans are stored in a module-level `WeakMap<Database, Plan>` and every loose function (`planFor`, `buildPlan`) takes `db` as a parameter. Convert to a `TaskMigrationPlanner` class that takes the database once in its constructor and keeps the plan as a field.

# WARN 953b2cea-631 consistent-file-naming-within-folder `packages/sdk/versioning/src/Branch.test.ts:1`

Capitalized test filename beside lowercase siblings (diff, model). Rename to `branch.test.ts`.

# WARN 953b2cea-632 collapse-branches-via-identity-element `packages/sdk/worker-framework/src/internal/rpc.ts:76`

The `handlersLayer` ternary either merges the timing layer into `handlers` or returns `handlers` alone, so the branches differ only by one included piece. Use `Layer.merge(handlers, timingEnabled ? RpcTiming.serverLayer(...) : Layer.empty)` per the identity-element rule.

# WARN 953b2cea-633 collapse-branches-via-identity-element `packages/sdk/worker-framework/src/internal/rpc.ts:145`

Same pattern as the earlier `handlersLayer` ternary in this file: the branches differ only in whether the timing layer is merged with `handlers`. Replace with a single `Layer.merge` using `Layer.empty` as the fallback for the timing layer.

# WARN 953b2cea-634 consistent-file-naming-within-folder `packages/sdk/worker-framework/src/stories/ModuleHost.stories.tsx:88`

Default story renders `ModuleHostStory`. Rename to `DefaultStory`.

# WARN 953b2cea-635 no-invented-theme-tokens `packages/stories/stories-agent/src/modules/ConversationModule.tsx:81`

`text-description` is not declared in the theme and produces no CSS. Replace with `text-fg-muted`.

# WARN 953b2cea-636 no-invented-theme-tokens `packages/stories/stories-agent/src/modules/DiscordBotModule.tsx:122`

`text-description` is not declared in the theme and produces no CSS. Replace with `text-fg-muted`.

# WARN 953b2cea-637 obj-update-push `packages/stories/stories-agent/src/testing/discord.ts:116`

Inside `Obj.update`, `list.channels = [...list.channels, Ref.make(channel)]` is a spread-assign append on a live proxy array. Use `list.channels.push(Ref.make(channel));` instead (`obj-update-push`).

# WARN 953b2cea-638 obj-update-push `packages/stories/stories-agent/src/testing/support-team.ts:123`

Inside `Obj.update`, `existing.identities = [...(existing.identities ?? []), identity]` appends via spread copy. Initialize the field if missing and then `existing.identities.push(identity)` (e.g. `(existing.identities ??= []).push(identity)`) per `obj-update-push`.

# WARN 953b2cea-639 namespace-export-with-internal-hiding `packages/ui/react-primitives/react-hooks/src/index.ts:1`

This barrel blanket-re-exports 23 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-640 no-invented-theme-tokens `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:134`

`hover:text-fg-default` references a nonexistent token (only `--color-fg`, `fg-muted`, `fg-subtle` exist), so the hover color never applies. Use `hover:text-fg`.

# WARN 953b2cea-641 name-for-general-behavior `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:26`

`FunctionBody` is reused by the Array, Gpt, Append, Trigger and Logic shapes, none of which is a function, and the existing TODO admits it ("not used for functions"). Rename it for what it renders (a shape body with input/output schema ports), per the name-for-general-behavior rule.

# WARN 953b2cea-642 named-react-imports `packages/ui/react-ui-canvas/src/components/About/About.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-643 named-react-imports `packages/ui/react-ui-canvas/src/components/Breadcrumbs/Breadcrumbs.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-644 named-react-imports `packages/ui/react-ui-canvas/src/components/ControlFrame/ControlFrame.tsx:11`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-645 named-react-imports `packages/ui/react-ui-canvas/src/components/ControlFrame/ControlFrame.tsx:82`

Uses `React.` namespace member access (and a default `import React` in this file), violating named-react-imports. Import the type by name, e.g. `import { type PointerEvent, type MouseEvent } from 'react'`, and drop the default import.

# WARN 953b2cea-646 named-react-imports `packages/ui/react-ui-canvas/src/components/Grid/Grid.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-647 named-react-imports `packages/ui/react-ui-canvas/src/components/LatticeGrid/LatticeGrid.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-648 named-react-imports `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# ERROR 953b2cea-649 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:172`

The list `onKeyDown` handler compares `event.key` to the literal `'Enter'` instead of using the `KEY_BINDINGS` table. Declare a binding in `src/model/keys.ts` (or reuse `open`, which is already `Enter`) and match it with `keyAction` / `matchesBinding`, per `key-chords-live-in-the-table`.

# WARN 953b2cea-650 named-react-imports `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:7`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-651 named-react-imports `packages/ui/react-ui-canvas/src/components/PartEditor/PartEditor.tsx:46`

Uses `React.` namespace member access (and a default `import React` in this file), violating named-react-imports. Import the type by name, e.g. `import { type PointerEvent, type MouseEvent } from 'react'`, and drop the default import.

# WARN 953b2cea-652 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/AlignField.tsx:6`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-653 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/ClassField.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-654 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-655 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:6`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-656 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/Properties.tsx:15`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-657 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/SceneField.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-658 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:5`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-659 named-react-imports `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:11`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-660 named-react-imports `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:78`

Uses `React.` namespace member access (and a default `import React` in this file), violating named-react-imports. Import the type by name, e.g. `import { type PointerEvent, type MouseEvent } from 'react'`, and drop the default import.

# WARN 953b2cea-661 named-react-imports `packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:10`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-662 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:77`

`stop` only forwards to `event.stopPropagation()`. Inline `event.stopPropagation()` in the handlers that use it.

# WARN 953b2cea-663 named-react-imports `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:14`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-664 named-react-imports `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:721`

Uses `React.` namespace member access (and a default `import React` in this file), violating named-react-imports. Import the type by name, e.g. `import { type PointerEvent, type MouseEvent } from 'react'`, and drop the default import.

# ERROR 953b2cea-665 intents-not-coordinates `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1370`

`SceneView.Properties.onGroup` builds a child `Scene` (with node geometry) via `groupIntoScene` and writes it straight into the store with `registry.set(store.scenes, ...)`, then rolls it back with another `registry.set(store.scenes, ...)` at line 1376, bypassing `projection.apply(intent)`. Per the rule, a component must not put a constructed scene into a store. Fix: express the group as an intent (e.g. a `group`/`batch` intent that creates the child scene) and let the projection own the store write and rollback.

# ERROR 953b2cea-666 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/SceneView/useSceneKeys.ts:155`

The `nudge` case re-derives direction by comparing `event.key` to the literals `'ArrowLeft'`, `'ArrowRight'`, `'ArrowUp'` and `'ArrowDown'`. Express the four directions as separate bindings in `keys.ts` (or expose a direction helper there) and match them via `matchesBinding`, so the chords live only in the table.

# WARN 953b2cea-667 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:12`

Default import of `react` (`import React, ...`) violates named-react-imports. Remove the default import and import only the named members used; the automatic JSX runtime needs no `React` binding.

# WARN 953b2cea-668 barrel-imports-not-internal-paths `packages/ui/react-ui-canvas/src/model/registry.ts:21`

Reaches past a directory barrel into an individual file: imports node views from `../components/SceneLayer/SceneLayer.tsx`; import from the `SceneLayer` barrel. Rule: import from the barrel, not internal paths.

# WARN 953b2cea-669 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-canvas/src/playwright/demo.spec.ts:32`

`settle` is a one-line wrapper over `page.waitForTimeout(BEAT)` used at many call sites. Inline `page.waitForTimeout(BEAT)` so the Playwright call is visible where it runs.

# WARN 953b2cea-670 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:28`

Arbitrary pixel sizes (`w-[1px] h-[12px]`, `gap-[1px]`, etc.) mixed with raw `w-4 h-4`; derive from sizing tokens. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-671 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:268`

Arbitrary `w-[6rem]` on Select.Trigger and `w-[24rem] max-h-[22rem]` at line 326; use semantic size tokens. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-672 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:372`

Arbitrary `w-[32rem]` popover width; use a semantic size token. Rule: design-tokens-not-raw-spacing-sizing.

# WARN 953b2cea-673 co-locate-tightly-coupled-code `packages/ui/react-ui-form/src/components/FieldEditor.tsx:1`

`FieldEditor.tsx` and `FieldEditor.stories.tsx` are loose in a flat `components/` directory. Move into `FieldEditor/` with story and index.

# WARN 953b2cea-674 co-locate-tightly-coupled-code `packages/ui/react-ui-form/src/components/Form.tsx:1`

`Form.tsx`, `FormRoot.tsx`, `FormField.tsx`, `FormFieldSet.tsx`, `FormFieldContext.ts` and `Form.stories.tsx` are all loose in `components/`; the Form context and its provider/hook are split across `FormFieldContext.ts` and sibling files. Group them in a `Form/` directory.

# ERROR 953b2cea-675 errors-extend-base-error `packages/ui/react-ui-form/src/components/layout/parser.ts:30`

`LayoutParseError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-676 co-locate-tightly-coupled-code `packages/ui/react-ui-form/src/components/ObjectForm.tsx:1`

`ObjectForm.tsx` and its story are loose in `components/`. Move into an `ObjectForm/` directory.

# WARN 953b2cea-677 co-locate-tightly-coupled-code `packages/ui/react-ui-form/src/components/ViewEditor.tsx:1`

`ViewEditor.tsx` and `ViewEditor.stories.tsx` are loose files. Move into a `ViewEditor/` directory.

# WARN 953b2cea-678 no-pointless-indirection `packages/ui/react-ui-gameboard/src/components/Gameboard/Square.tsx:75`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-679 extract-non-rendering-logic-from-component `packages/ui/react-ui-graph/src/components/Graph/Graph.tsx:179`

The projector start/stop lifecycle and renderer/model wiring are inline `useEffect`s in the `Graph` component. Extract them into a named hook (e.g. `useProjector(projector, model, renderer)`) to keep the component focused on rendering.

# WARN 953b2cea-680 no-premature-abstraction `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

`ToolForm` is a public, exported "convenience wrapper" around `Form.Root` with no real consumer (only a story mocks it; the other `ToolForm` lives in react-ui-introspect) and it papers over typing with `as any`. Per the no-premature-abstraction rule, remove the wrapper and its export until a second concrete caller exists, letting callers use `Form.Root` directly.

# WARN 953b2cea-681 co-locate-tightly-coupled-code `packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:1`

Stories `ActionMenu`, `ActionToolbar` and `ViewOptionsMenu` sit loose in `components/` instead of beside their components in per-component directories.

# WARN 953b2cea-682 consistent-file-naming-within-folder `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:71`

Default story render component is `DefaultStackStory`. Rename to `DefaultStory`.

# WARN 953b2cea-683 themed-primitives-take-classNames `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:54`

`MosaicTileProps` publishes `className?: string` on a composite part alongside the themed `classNames`, with no note that it is only set by a slotting parent. The consumer-facing prop must be `classNames` (converted internally via `composableProps`); drop `className` from the exported Props type, per `themed-primitives-take-classNames`.

# WARN 953b2cea-684 no-pointless-indirection `packages/ui/react-ui-pickers/src/components/EmojiPicker/EmojiPicker.tsx:52`

Explicit `useState<boolean>` type argument is already inferred from the initial value; drop it and write `useState(false)` (rule no-pointless-indirection).

# WARN 953b2cea-685 no-pointless-indirection `packages/ui/react-ui-pickers/src/components/EmojiPicker/EmojiPicker.tsx:117`

Explicit `useState<boolean>` type argument is already inferred from the initial value; drop it and write `useState(false)` (rule no-pointless-indirection).

# WARN 953b2cea-686 no-pointless-indirection `packages/ui/react-ui-pickers/src/components/PickerButton/PickerButton.tsx:53`

Explicit `useState<boolean>` type argument is already inferred from the initial value; drop it and write `useState(false)` (rule no-pointless-indirection).

# WARN 953b2cea-687 no-pointless-indirection `packages/ui/react-ui-query/src/components/QueryEditor/query-extension.ts:340`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-688 no-pointless-indirection `packages/ui/react-ui-search/src/components/SearchList/hooks/useSearchListResults.ts:47`

Explicit `useState<string>` type argument is already inferred from the initial value; drop it and write `useState('')` (rule no-pointless-indirection).

# WARN 953b2cea-689 error-messages-carry-context `packages/ui/react-ui-table/src/util/dynamic-table.ts:49`

`'invalid properties'` omits the `typename` and which inputs were missing. Include the typename in the message.

# WARN 953b2cea-690 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:24`

`stop` is a module-level wrapper over `event.stopPropagation()`. Inline the call in the handlers.

# WARN 953b2cea-691 no-pointless-indirection `packages/ui/react-ui-thread/src/command.ts:40`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-692 consistent-private-field-convention `packages/ui/react-ui-transcription/src/capture/media-stream-recorder.ts:147`

Class `MediaStreamRecorder` uses `private _context/_flushTimer/_pending` fields and `#collect/#flush/#createCaptureNode` methods. Pick one convention.

# WARN 953b2cea-693 namespace-export-with-internal-hiding `packages/ui/react-ui-transcription/src/index.ts:1`

This barrel blanket-re-exports 6 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-694 namespace-export-with-internal-hiding `packages/ui/react-ui-virtual/src/index.ts:1`

This barrel blanket-re-exports 6 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-695 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

This barrel blanket-re-exports 6 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

# WARN 953b2cea-696 options-object-with-defaults `packages/ui/react-ui/src/next/components/Container/Container.tsx:104`

`containerAttributes` destructures `ContainerProps` with per-field defaults but the parameter itself has no `= {}` default, so the caller in `Listbox.tsx:552` has to write `containerAttributes({})`. Add `= {}` to the destructured parameter so a no-config call is valid.

# WARN 953b2cea-697 no-pointless-indirection `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:59`

`mx(...)` is called with a single static string, so there is nothing to merge; pass the string directly as the className (rule no-pointless-indirection).

# WARN 953b2cea-698 inject-dependencies-via-constructor `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:241`

Per-view hover timestamps and hide timers are kept in module-level `WeakMap<EditorView, ...>` instead of on the object that owns them (e.g. a ViewPlugin instance or state field holding the view and its timers). Move this bookkeeping onto a plugin class constructed with the view, per the inject-dependencies-via-constructor rule.

# ERROR 953b2cea-699 errors-extend-base-error `packages/ui/ui-template/src/model.ts:184`

`BindingResolutionError` extends `Error` directly (also `TemplateValidationError` at line 257). Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# ERROR 953b2cea-700 errors-extend-base-error `packages/ui/ui-template/src/parser.ts:21`

`TemplateParseError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# ERROR 953b2cea-701 errors-extend-base-error `packages/ui/ui-template/src/system.ts:171`

`SystemError` extends `Error` directly. Define it with `BaseError.extend('<ClassName>', 'Default message')` from `@dxos/errors` (optionally a constructor requiring its context) so `_tag`, `context`, `is` and `wrap` work, per rule errors-extend-base-error.

# WARN 953b2cea-702 options-object-with-defaults `packages/ui/ui-theme/src/plugins/ThemePlugin.ts:136`

`ThemePlugin(options: ThemePluginOptions)` has no default although every `ThemePluginOptions` field is optional, which forces ten-plus callers (vite configs, `tools/code-index/src/workspace/Vite.ts:137`, etc.) to write `ThemePlugin({})`. Declare `options: ThemePluginOptions = {}` and drop the empty-object arguments.

# WARN 953b2cea-703 name-for-general-behavior `packages/ui/ui-theme/src/util/hash-styles.ts:186`

`getStyles` looks up the `ColorStyles` for a hue, and the TODO already marks the name as too generic and wrong. Rename it to describe the hue lookup (for example `getHueStyles`).

# WARN 953b2cea-704 namespace-export-with-internal-hiding `packages/ui/ui-types/src/index.ts:1`

This barrel blanket-re-exports 12 submodules with `export * from`, so every file's exports become public surface. Move internal-only code under `internal/` and replace the wildcards with explicit named exports (or `export * as Foo` namespace modules), per namespace-export-with-internal-hiding.

## Appendix

### Run

- full-project pass (`prepare.ts --full`), one Sonnet subagent per rule group, no System One
- each subagent searched its rule's in-scope files with grep, confirmed candidates by reading them, and recorded at most 25 clear violations, so a rule at 25 may have more
- not reviewed: `unit: pr` rules judge a change set, not a tree (groups 20 `delete-dead-code-after-migration`, 39 `refactor-must-preserve-behavior`, 73 `catalog-is-dependency-source-of-truth`, 74 `ci-and-tooling-avoid-duplicate-mechanisms`, 75 `diff-scoped-to-pr-purpose`)

### Fix pass

- one Sonnet fixer per package batch; each fix typechecked with `tsc --noEmit` and linted with oxlint
- 271 resolved, 433 ignored; reasons for each ignored issue below

### Ignored

- 953b2cea-11: The setter updates one property per call; changing it needs a caller-owned transaction redesign in a testbench component.
- 953b2cea-15: Event<T> to Event<void> narrowing cannot be typed without a cast given variance; needs a design change.
- 953b2cea-16: Replacing wildcard barrel with explicit exports changes the public API across the monorepo; out of scope.
- 953b2cea-17: The sleep asserts a negative (promise stays unresolved), which a Trigger cannot express.
- 953b2cea-19: No replacement API is identifiable without a design decision.
- 953b2cea-21: Changing track-leaks to explicit enabling requires bootstrap changes in other packages.
- 953b2cea-23: createId has many callers across other packages and no established replacement helper, so naming one needs a design decision.
- 953b2cea-24: Restructuring the debug barrel's exports into internal/ and named exports changes the public surface used by many packages outside my scope.
- 953b2cea-25: @dxos/log depends on @dxos/util which depends on @dxos/debug, so importing log in debug would create a dependency cycle.
- 953b2cea-26: Same dependency cycle: @dxos/log -> @dxos/util -> @dxos/debug prevents debug from importing @dxos/log.
- 953b2cea-27: Renaming many files to capitalized names is a large refactor touching every importer across the repo.
- 953b2cea-28: Renaming many files to capitalized names is a large refactor touching every importer across the repo.
- 953b2cea-29: Renaming many files to capitalized names is a large refactor touching every importer across the repo.
- 953b2cea-31: W may itself be a function type so typeof narrowing cannot yield a callable updater without a design change to SetAtomFn typing.
- 953b2cea-33: The loose AnyAst structural type underpins the whole converter; fixing needs a rewrite of the AST typing.
- 953b2cea-35: Renaming dynamic-runtime.ts changes a published package.json subpath export used outside this package, so it needs a cross-package change.
- 953b2cea-37: Renaming schema-ast.ts changes a published package.json subpath export, so it needs a cross-package change.
- 953b2cea-38: Changing getValue and setValue from any to unknown would break many callers outside this package, so it is a larger refactor.
- 953b2cea-39: The fix requires extending the hypercore typings in packages/common/typings, which is outside my packages.
- 953b2cea-40: The fix requires extending the hypercore typings in packages/common/typings, which is outside my packages.
- 953b2cea-41: Barrel refactor with internal/ directory affects the public surface and consumers; out of scope.
- 953b2cea-43: Real, but streamx.Readable is not assignable to readable-stream's wrap parameter type; removing the cast fails typecheck and needs a typed adapter.
- 953b2cea-44: The sleep is a pause in a replication performance benchmark with no replication event to await.
- 953b2cea-45: The sleep follows the timing measurement in a benchmark test and has no observable condition to wait on.
- 953b2cea-46: Switching the exported DXN type to Brand.Brand changes a widely used type across many packages outside my scope.
- 953b2cea-47: The cast depends on the DXN brand redesign (46); fixing it alone is not possible without changing the exported schema type.
- 953b2cea-48: Switching the exported EID type to Brand.Brand changes a widely used type across many packages.
- 953b2cea-49: The cast depends on the EID brand redesign (48); not fixable in isolation.
- 953b2cea-50: Switching the base URI type to Brand.Brand affects DXN, EID and all consumers across the repo.
- 953b2cea-51: The cast depends on the URI brand redesign (50); not fixable in isolation.
- 953b2cea-55: Restructuring the public barrel into internal/ with explicit exports is a large API refactor affecting many consumers.
- 953b2cea-57: Moving env resolution to a bootstrap layer is a design change spanning other packages.
- 953b2cea-59: The native object literal cannot satisfy RandomAccessStorage, which extends EventEmitter, without a redesign.
- 953b2cea-62: The double cast is needed because Object.assign cannot narrow SqlClient.updateValues, and it already carries an explanatory comment; avoiding it needs a redesign.
- 953b2cea-64: The VFS comes from @dxos/wa-sqlite and vfs_register expects the @effect/wa-sqlite type; the two are incompatible, so fixing it needs a cross-library type change.
- 953b2cea-70: Restructuring the public barrel into internal/ and namespaces is a large API refactor affecting call sites outside the package.
- 953b2cea-72: Changing the Id brand to Brand.Brand affects exported type and call sites outside this package.
- 953b2cea-73: Restructuring a 65-module barrel is a large cross-package refactor.
- 953b2cea-74: File rename of Position.test.ts was not applied; low value and risks parallel-agent/git churn.
- 953b2cea-75: A negative assertion (no update) has no condition to wait for; a bounded wait is the practical option.
- 953b2cea-76: @dxos/errors is not a dependency of agent-code-mode; adding it needs a package.json/lockfile change, and the error type is used across the package.
- 953b2cea-77: The handler map is intentionally module-global because the worker entry is instantiated by the runtime and cannot take constructor injection; needs design decision.
- 953b2cea-78: Sibling source file AgentService.ts is PascalCase, so the test name matches its subject; not a real inconsistency.
- 953b2cea-81: Reported file is not in my assigned work verification scope and the cast likely needs typing changes in test helpers; not fixed.
- 953b2cea-85: Errors are used with Effect catchTag-style handling; migrating to BaseError.extend changes semantics and needs a design decision.
- 953b2cea-86: Removing the cast fails typecheck because the generic Exclude does not reduce; the cast is required.
- 953b2cea-88: Renaming definitions.ts across eight skills is a broad refactor with many import sites.
- 953b2cea-89: Moving UI test plugins to another package is a cross-package design change.
- 953b2cea-92: Making ArtifactDiffResolver a required service with a noop layer changes the requirement channel for every formatUserPrompt caller and needs a design decision.
- 953b2cea-93: The module-level map is deliberately shared across Binder instances on the same feed; a per-Binder counter would miss writes made by other binders and change behavior.
- 953b2cea-96: Threading a generic requirement through makeHandler depends on the toolkit handler types and is a larger typing refactor.
- 953b2cea-98: Converting loadChat to Effect.fnUntraced loses the explicit return type and breaks inference at call sites (Agent.ts resetChatHistory fails typecheck), so I reverted it.
- 953b2cea-105: Replacing the wildcard barrel exports requires moving code under internal/ and updating consumers across packages; too large.
- 953b2cea-106: Renaming 13 test files is a wide churn that I did not take on in this batch.
- 953b2cea-108: Passing the base environment into the shell layer changes its signature and needs composition-root call-site changes.
- 953b2cea-109: Removing the cast means threading the handler requirement through the process type, which is a design change.
- 953b2cea-110: Choosing a retention cap and eviction policy for outputs is a design decision, since subscribeOutputs replay semantics depend on it.
- 953b2cea-112: A live-process limit with a new typed error is a design decision that changes spawn's error type.
- 953b2cea-113: Making RemoteOperationInvoker.Service a required service with a noop layer needs layer changes on every host outside this package.
- 953b2cea-116: Moving layerKv off the class changes an exported symbol used in agent-runtime, plugin-routine and cli, which are outside my packages.
- 953b2cea-117: Moving layerMemory and the accessors off the class changes an exported symbol used outside my packages.
- 953b2cea-118: Widening getApiKey's error type changes an exported signature used by callers outside these packages; needs a typed-error design decision.
- 953b2cea-124: Dropping raw or ast from the persisted schema is a data-model migration needing a design decision.
- 953b2cea-125: Needs reader migration in Automation.stories.tsx and the dispatcher, outside the owned packages or a schema migration.
- 953b2cea-140: shared is a built Context, not a Layer, so the suggested Layer.provide collapse does not directly apply; the pattern is a deliberate shared-client test setup.
- 953b2cea-142: Changing the layer signature to require EdgeHttpClientService affects exported API and callers outside this package.
- 953b2cea-145: @dxos/errors is not a dependency of the extractor package; adding it needs a package.json and lockfile change.
- 953b2cea-146: Renaming the test file is a larger change than a contained fix; skipped.
- 953b2cea-147: Replacing barrel wildcards needs a public-API redesign and call-site changes in other packages.
- 953b2cea-148: The replacement client is not identifiable from the code, so the tag cannot be made accurate.
- 953b2cea-150: The replacement API is unknown (the TODO only says queues will be integrated into echo), so I cannot name it.
- 953b2cea-151: The replacement for SpaceProxy is not identifiable from the code.
- 953b2cea-153: Moving externalId to Obj.Meta.foreignKeys is a schema/data-model change with cross-package consumers.
- 953b2cea-154: Exported setter API used by other packages; changing to draft-based requires cross-package call-site changes.
- 953b2cea-155: Exported setter API used by other packages; changing it requires cross-package call-site changes.
- 953b2cea-156: Exported setter API used by other packages; changing it requires cross-package call-site changes.
- 953b2cea-157: Exported setter API used by other packages; changing it requires cross-package call-site changes.
- 953b2cea-161: These are exported host-facing request/option types that deliberately accept unvalidated string input; changing them is a cross-package API change.
- 953b2cea-167: Converting the barrel to explicit exports and moving code to internal/ is a large public-surface refactor.
- 953b2cea-169: Restoring the topTopics assertion makes the test fail; the digest shape has drifted and the fix needs a design decision.
- 953b2cea-170: Restoring the commented assertions fails because the draft shape (threadIds etc.) changed; needs rewriting against the new API.
- 953b2cea-171: Same as 170: the commented assertion uses a stale draft field and fails when restored.
- 953b2cea-172: Same as 170: the commented assertions fail when restored against the current draft shape.
- 953b2cea-173: Replacing wildcard barrel exports with namespaces changes the public API and every consumer outside this package.
- 953b2cea-175: Switching ParquetReadError to BaseError.extend changes its constructor and shape and needs a decision; the class is also not shown to use the rule's required pattern without wider changes.
- 953b2cea-176: Restoring the draft.summary assertion makes the test fail against current behavior; needs investigation of the pipeline, not a test-only edit.
- 953b2cea-177: Changing Thread.messageIds to Refs or foreignKeys is a schema design change affecting stored data and consumers.
- 953b2cea-178: The types/ directory is also the package's public ./types subpath export used by other packages, so renaming it is a cross-package change.
- 953b2cea-180: Needs a new @dxos/errors dependency in blob and the S3 errors have custom constructors and callers.
- 953b2cea-181: objectKey is called from plugin-s3 with a literal '_probe' space id, so a SpaceId type needs a cross-package change.
- 953b2cea-183: Lazy memoized setup is deliberate; the doc comment states beforeAll/beforeEach are not guaranteed to finish before a bench's first call in vitest bench.
- 953b2cea-187: The sleeps separate real timestamps for updated/created queries; fixing needs clock injection into ECHO, a larger design change.
- 953b2cea-189: Same deliberate lazy-setup pattern as echo.bench.ts because hooks are not guaranteed to resolve before the first bench call.
- 953b2cea-191: Convention unification across ~25 fields is a large mechanical refactor outside a contained fix.
- 953b2cea-192: Test sleep is a deliberate macrotask turn to surface an unhandled rejection; replacing it needs test redesign.
- 953b2cea-193: Large private-field convention unification across ~60 fields; not a contained change.
- 953b2cea-194: Switching to ctx-scoped scheduling changes disposal/settle behavior and needs a design decision.
- 953b2cea-195: Rewriting the slow-load simulation in the test needs test redesign.
- 953b2cea-196: Changing LoadObjectProps.objectId to EntityId ripples to call sites; not contained.
- 953b2cea-197: Large private-field convention unification; not contained.
- 953b2cea-198: Branding many objectId parameters ripples through call sites and tests; too large.
- 953b2cea-199: Ctx-scheduling the inactivity timeout changes promise settlement on disposal; needs design decision.
- 953b2cea-200: Ctx-scoped scheduling would alter disposal semantics of satisfaction requests; needs design decision.
- 953b2cea-202: Replacing seven sleeps in the stall test needs test redesign.
- 953b2cea-207: Only partly fixed: spaceId on RepoClosedError is now SpaceId, but DocumentUnavailableError documentId was left as string, so the finding is not fully addressed.
- 953b2cea-208: Private-field convention unification; not contained.
- 953b2cea-209: Replacing the manual reconnect timer with ctx scheduling changes reconnect/cancel behavior; needs design decision.
- 953b2cea-210: Private-field convention unification; not contained.
- 953b2cea-212: Branding ObjectDiagnostic fields may ripple to external consumers; not verified contained.
- 953b2cea-213: Restructuring the barrel into internal/ with explicit exports is a large cross-package refactor.
- 953b2cea-214: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-215: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-216: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-217: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-218: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-219: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-220: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-221: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-222: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-223: Removing a root export may break consumers outside this package; needs cross-package verification.
- 953b2cea-224: The replacement for pendingBatch is unknown and needs an owner decision; not changed.
- 953b2cea-225: Private-field convention unification; not contained.
- 953b2cea-226: Narrowing public method params to EntityId ripples to call sites outside the package.
- 953b2cea-227: Negative-assertion sleep window needs test redesign.
- 953b2cea-228: Branding the test-builder spaceId key may ripple through test callers; low value.
- 953b2cea-230: Negative-traffic windows in a test need real elapsed time; a deterministic signal does not exist.
- 953b2cea-231: Test sleeps need a larger test rewrite; out of scope for a minimal fix.
- 953b2cea-232: Test sleep rewrite needs a test redesign; out of scope.
- 953b2cea-233: Test sleep rewrite needs a test redesign; out of scope.
- 953b2cea-234: Tried DocumentId; it conflicts with the external getContainingSpaceForDocument callback type (string) and call sites, so it needs a cross-package change.
- 953b2cea-235: Timer lifecycle change in a large host needs a design decision; not a contained behavior-preserving fix.
- 953b2cea-236: Lease eviction timer has no owning ctx; refactor needed.
- 953b2cea-237: Mixing #private (new code) with legacy _private is allowed by CLAUDE.md; renaming is churn.
- 953b2cea-239: CLAUDE.md permits #private in new code beside existing _private; not a defect.
- 953b2cea-240: CLAUDE.md permits #private in new code beside existing _private; not a defect.
- 953b2cea-241: CLAUDE.md permits #private in new code beside existing _private; not a defect.
- 953b2cea-242: Banner removal across a large test file is cosmetic and low value; out of scope.
- 953b2cea-243: Phase labels in the test describe sequential scenario steps; acceptable.
- 953b2cea-244: testSqlite takes no parameters and returns an explicitly typed Effect; Effect.fnUntraced would not fit the declared signature cleanly, so a false positive.
- 953b2cea-246: CLAUDE.md permits #private in new code beside existing _private; not a defect.
- 953b2cea-247: Flush timer rework needs a design decision about batching and cancellation; out of scope.
- 953b2cea-248: Query-item error messages need a shared factory across several sites; low value and out of scope.
- 953b2cea-249: CLAUDE.md permits #private in new code beside existing _private; not a defect.
- 953b2cea-251: Needs a new batched index lookup API; a larger refactor.
- 953b2cea-252: CLAUDE.md permits #private in new code beside existing _private; not a defect.
- 953b2cea-253: The local planSubquery is a required callback argument of planDeclinedByCompiler, not a hiding wrapper; false positive.
- 953b2cea-254: Adding a spaceId constraint would change semantics for legitimate cross-space references; needs a design decision.
- 953b2cea-255: Converting the global lens registry to an injected class is a large refactor that needs a design decision.
- 953b2cea-256: Replacing the global registries with a runner class is a large refactor that needs a design decision.
- 953b2cea-259: Replacing barrel wildcards with explicit exports and an internal/ directory is a large cross-package refactor.
- 953b2cea-260: Renaming ast.ts to QueryAST.ts touches imports across packages; out of scope.
- 953b2cea-261: Needs a new @dxos/errors dependency in echo-sqlite.
- 953b2cea-262: The lazy init is deliberate and documented, because vitest bench does not await beforeAll before the first warmup call, so moving it would break the bench.
- 953b2cea-265: Test-only helper used many times; inlining adds noise, low value.
- 953b2cea-269: Renaming exported symbols to Entity* is a cross-package refactor.
- 953b2cea-272: Renaming exported types is a cross-package refactor needing a naming decision.
- 953b2cea-275: Renaming Query.all is a public API change with many call sites outside this package.
- 953b2cea-276: Changing Relation.update return type is an API design decision.
- 953b2cea-277: Parameter names are cosmetic across parallel modules; needs a convention decision and churn.
- 953b2cea-278: Aligning getTypeURI signatures changes semantics and callers; design decision.
- 953b2cea-279: Converting Relation.getKeys to dual is an API change with outside call sites.
- 953b2cea-280: Persisting a single source for View.query is a schema/data migration decision.
- 953b2cea-281: Making spaceId required on the request changes the exported API and its callers; needs a design decision.
- 953b2cea-283: Removing ctx from the sync protocol is a large cross-module refactor affecting callers and the protocol design.
- 953b2cea-284: Removing ctx from the sync protocol is a large cross-module refactor affecting callers and the protocol design.
- 953b2cea-285: Removing ctx from the sync protocol is a large cross-module refactor affecting callers and the protocol design.
- 953b2cea-286: Removing ctx from the sync protocol is a large cross-module refactor affecting callers and the protocol design.
- 953b2cea-287: Removing ctx from the sync protocol is a large cross-module refactor affecting callers and the protocol design.
- 953b2cea-288: Removing ctx from the sync protocol is a large cross-module refactor affecting callers and the protocol design.
- 953b2cea-289: Removing the threaded ctx from index-core's Effect APIs is a large cross-cutting refactor with callers beyond a contained fix.
- 953b2cea-290: Same ctx-parameter removal refactor across IndexEngine; needs design decision on deferred-callback context ownership.
- 953b2cea-291: Same ctx-parameter removal refactor across IndexEngine; needs design decision.
- 953b2cea-292: Same ctx-parameter removal refactor across IndexEngine; needs design decision.
- 953b2cea-293: Same ctx-parameter removal refactor across IndexEngine; needs design decision.
- 953b2cea-294: Needs spaceId parameter on ReverseRefIndex.query plus objectMeta join and caller changes; schema/design change beyond a minimal fix.
- 953b2cea-295: Requires a new SQL migration and query changes; editing the shipped 0004 migration is unsafe.
- 953b2cea-296: Requires a new migration adding spaceId to reverseRef; design decision, not contained.
- 953b2cea-298: Barrel redesign affects consumers outside this package.
- 953b2cea-300: Restructuring the barrel into internal/ with explicit exports is a large refactor affecting consumers.
- 953b2cea-301: Replacement retry mechanism is not identifiable without a design decision; function is still actively used.
- 953b2cea-302: Converting private fields across a large class is a broad refactor beyond a contained fix.
- 953b2cea-303: Changing error base classes alters exported error types and behavior; needs design decision.
- 953b2cea-304: Exported error classes are used across packages; migrating to BaseError needs cross-package changes.
- 953b2cea-305: Restructuring the public barrel into internal/ would change the exported surface used by other packages.
- 953b2cea-306: Migrating exported Data.TaggedError to BaseError changes the API and call sites; needs design decision.
- 953b2cea-309: Barrel redesign affects consumers outside this package.
- 953b2cea-310: Injecting the delay through the constructor needs a design decision and call-site changes.
- 953b2cea-311: The post helper gives the worker typed messages (ProxyWorkerResponse); inlining self.postMessage would lose that, so it is not a trivial wrapper.
- 953b2cea-312: Renaming the exported createWorkerPort requires cross-package call-site updates.
- 953b2cea-314: Renaming the test file is cosmetic and needs a matching rename of RpcRouter.ts conventions; out of scope.
- 953b2cea-315: Wrapped gen is inside a function that needs the Scope requirement and a larger refactor; not a contained change.
- 953b2cea-316: Replacement (createProtoRpcPeer) is a judgment call for the options interfaces; not changed.
- 953b2cea-317: Removing the legacy wire types requires migrating consumers outside this package.
- 953b2cea-319: Barrel redesign affects consumers outside this package.
- 953b2cea-320: Moving static layerTest/isJson out of the class changes exported API used by call sites in other packages.
- 953b2cea-321: Renaming file to FormBuilder.ts touches imports across packages and needs a directive convention decision.
- 953b2cea-323: Replacing the throw changes the error channel of spaceIdWithDefault, affecting callers across packages.
- 953b2cea-324: Requires reworking layer composition for the CLI dispatcher; non-trivial design change.
- 953b2cea-325: Query rewrite needs verification against ECHO filter semantics and live behavior; not a contained safe change.
- 953b2cea-326: Refactoring ChatProcessor class to functions is a larger refactor.
- 953b2cea-327: No replacement is identified in the codebase for upsertFunctionObject; requires author decision.
- 953b2cea-328: Requires explicitly providing REPL services; non-trivial refactor.
- 953b2cea-329: Renaming the file and adding a directive is a style choice with no clear need; skipped as out of scope.
- 953b2cea-333: Moving components into directories is a larger restructure touching many imports; out of scope.
- 953b2cea-340: Rewriting useStats onto Atoms is a larger design refactor.
- 953b2cea-341: Rewriting useSwarmTrace onto Atoms is a larger design refactor.
- 953b2cea-345: Restructuring a 20-submodule barrel is a large refactor with public API impact.
- 953b2cea-347: Cloudflare worker without @dxos/log dependency; needs a design decision on logging in the worker.
- 953b2cea-348: A shared useFeedQuery hook would be repeated across many containers outside plugin-agent, so it is a cross-package refactor.
- 953b2cea-351: The provides are deliberately sequential: the space layer supplies requirements of ToolExecutionServices, so merging them into one mergeAll would change behavior.
- 953b2cea-358: Story-only layout markup; swapping to Grid/Flex with ramp-step gaps is a stylistic choice needing visual verification, not a contained safe fix.
- 953b2cea-359: The console.log is the intentional output of a user-invoked dxosDumpTrace debug helper whose purpose is console dump, not incidental logging.
- 953b2cea-362: useDebug is an explicit user-triggered console dump using console.group; structured logging would hide the intended output.
- 953b2cea-363: Rewriting the hook onto a stream-backed Atom is a large refactor needing a design decision.
- 953b2cea-365: Declaring Plugin.Service with noop layers requires host-wide changes across packages; the optional read is deliberate and documented.
- 953b2cea-368: Needs a new @dxos/errors dependency, and Effect TaggedError usage is tied to catchTag at call sites.
- 953b2cea-370: Replacing the wrapper divs with Flex primitives needs layout changes that cannot be verified here.
- 953b2cea-371: Renaming the testing module and its namespace affects imports across other packages.
- 953b2cea-372: Moving the subscription into leaf components is a larger refactor.
- 953b2cea-373: Moving the subscription into leaf components is a larger refactor.
- 953b2cea-374: The file rename and directive change are not a contained fix.
- 953b2cea-375: File rename plus directive touches many imports; needs convention decision.
- 953b2cea-376: Toolbar migration to MenuBuilder is a larger UI refactor.
- 953b2cea-377: Needs a new Summary story; out of scope for a contained fix.
- 953b2cea-380: Adding a FactStore.query accessor touches several sites including crawler outside my packages; a design change.
- 953b2cea-384: I found no is-* sizing token in use in the repo to replace w-[5rem], so the replacement would be a guess.
- 953b2cea-388: Switching Data.TaggedError to BaseError changes error semantics used with Effect catchTag; needs a design decision.
- 953b2cea-389: Needs a semantic sizing token design decision shared across other packages' popovers.
- 953b2cea-390: Migrating the toolbar to menu actions is a larger refactor needing design decisions.
- 953b2cea-391: Depends on the Layout.Grid gap ramp API and responsive variant handling; not a contained safe change.
- 953b2cea-392: Flex component has no equivalent for the responsive @4xl hidden/flex behavior without a design decision.
- 953b2cea-394: No semantic size token is evident for this min-width; needs a design decision.
- 953b2cea-395: No semantic block-size token is evident for min-h-[15rem]; needs a design decision.
- 953b2cea-396: File rename plus directive touches many imports; needs convention decision.
- 953b2cea-397: Threading env through relay requires a wider signature change in the agent helper; not contained.
- 953b2cea-400: Requires writing a new story; out of scope.
- 953b2cea-401: File rename plus directive touches many imports; needs convention decision.
- 953b2cea-402: Requires building a menu-action toolbar, a larger UI refactor.
- 953b2cea-403: Requires a new story, out of scope.
- 953b2cea-404: Requires writing a new story; out of scope.
- 953b2cea-407: No obvious semantic size token for this input width; needs a design decision.
- 953b2cea-408: Needs a new story, out of scope for a contained fix.
- 953b2cea-409: Needs a new story, out of scope for a contained fix.
- 953b2cea-413: Real but removing the debounce is a behavioral popover redesign needing UI verification.
- 953b2cea-414: Converting Tabs.List to Grid via asChild with ramp gap risks changing rail spacing and cannot be visually verified here.
- 953b2cea-419: Moving the GitHub fetch into an operation/service is a larger refactor.
- 953b2cea-421: Requires a new story, out of scope for a contained fix.
- 953b2cea-424: Rebuilding the toolbar on MenuBuilder/Menu.Root is a large refactor.
- 953b2cea-425: Changing the persisted Graph schema is a design and migration decision.
- 953b2cea-426: Moving module-level cache into per-activation state needs a restructure of the graph builder; not a contained change.
- 953b2cea-428: Requires a new story, out of scope.
- 953b2cea-429: Moving files into a directory changes import paths and exports; larger than a contained fix.
- 953b2cea-430: Requires adding the @dxos/errors dependency to plugin-game (package.json and install), which is out of scope here.
- 953b2cea-431: Requires a new story for CommentComposer, out of scope.
- 953b2cea-432: No established semantic width token for popovers; needs a design decision.
- 953b2cea-433: A PullRequestFiles story already exists in src/stories.
- 953b2cea-434: A PullRequestOverview story already exists in src/stories.
- 953b2cea-435: Requires a new story for PullRequestStatus, out of scope.
- 953b2cea-436: Requires a new story for WalkthroughView, out of scope.
- 953b2cea-440: Module-level cache is intentional so all mounts share the rate-limit guard; a per-instance tracker would defeat it.
- 953b2cea-441: Rename touches many call sites and the 'directive' convention is unclear; needs a design decision.
- 953b2cea-446: Requires adding the @dxos/errors dependency to plugin-heygen and changing constructors used by call sites; out of scope here.
- 953b2cea-447: Story-only styling in a stories file; low value and needs a layout rewrite with Flex tokens.
- 953b2cea-448: Converting Error subclasses to BaseError.extend changes error semantics and needs a design decision.
- 953b2cea-449: Test helper typing change; the package already has pre-existing type errors in test files and the right generic fix needs layer design.
- 953b2cea-450: Needs a schema design decision about adding a ref on Portfolio.
- 953b2cea-451: Directory move with story is a larger refactor touching imports and needs a story.
- 953b2cea-452: Directory moves of multiple components and stories is a larger refactor.
- 953b2cea-453: Replacing with Listbox is a UI redesign needing visual verification.
- 953b2cea-455: Layout.Flex does not accept an onClick prop (tsc error), so the div with a click handler stays.
- 953b2cea-456: Requires adding a new story, which is out of scope for this batch.
- 953b2cea-457: Requires adding a new story, which is out of scope for this batch.
- 953b2cea-458: Requires adding a new story, which is out of scope for this batch.
- 953b2cea-459: The suggested shared useFeedQuery hook spans many packages and needs a design decision.
- 953b2cea-460: Grid does not obviously support the container-query responsive column template, so converting risks changing layout.
- 953b2cea-461: Flex grow also adds overflow-hidden, which would change behavior (it could clip focus rings), so the div stays.
- 953b2cea-463: Replacing the Builder class is a large refactor touching many call sites, stories and tests.
- 953b2cea-465: Extracting a shared hook also affects plugin-map, outside my packages.
- 953b2cea-466: Rewriting the toolbar as MenuBuilder actions is a larger refactor beyond a contained fix.
- 953b2cea-467: plugin-library does not depend on @dxos/errors; adding the dependency and migrating the error is out of scope for a contained fix.
- 953b2cea-472: The span is a dx-tag with inline icon; converting to Flex asChild risks changing styling and is cosmetic.
- 953b2cea-474: Needs a per-db query atom cache design change; risk of altering reactive behavior.
- 953b2cea-476: No known design-system toolbar height token to substitute without a design decision.
- 953b2cea-479: The div is the trigger-cloned child of ActionMenu and carries the testid, with an explanatory comment already present.
- 953b2cea-480: ScrollArea.Viewport classNames layout is not a wrapper div and replacing it needs a design-system decision.
- 953b2cea-483: Needs a semantic size token decision shared across components; design decision.
- 953b2cea-484: Large Welcome component restyle to Flex primitives needs visual verification via storybook.
- 953b2cea-485: Same as 484; requires visual verification of responsive layout.
- 953b2cea-486: Same as 484; separator replacement needs visual verification.
- 953b2cea-487: Replacing with HubHttpClient needs cross-package changes for the unauthenticated case in edge-client.
- 953b2cea-489: Needs restructuring rows into per-column subscribed components; larger refactor.
- 953b2cea-490: Reworking the reactive query derivation needs a design change in the board model hook.
- 953b2cea-492: Layout.Flex availability/props for column grow overflow-hidden is not verified, and the swap risks changing layout; needs design decision.
- 953b2cea-494: Moving the component and story into a directory is a file restructure with call-site churn; out of scope.
- 953b2cea-495: No shared semantic size token exists to swap in; needs a design decision.
- 953b2cea-496: Replacing hand-rolled lists with Listbox is a UI refactor needing stories/design.
- 953b2cea-497: Replacing runs list with Listbox/Accordion is a UI refactor needing design.
- 953b2cea-499: Replacing the dependents list with a Listbox is a UI redesign needing visual verification, not a contained fix.
- 953b2cea-500: No semantic width token exists here and the sibling popovers use the same arbitrary sizing; needs a design-system decision.
- 953b2cea-502: Adding Plugin.getPlugins lives in app-framework, outside my packages.
- 953b2cea-508: Story decorator wrapper; low-value change not worth the layout risk.
- 953b2cea-509: No semantic size token identified for min-h-[120px]; needs a design decision.
- 953b2cea-513: Moving four components with stories into directories touches many imports and the barrel; large refactor.
- 953b2cea-515: Requires declaring the service and noop layers across runtimes; design change.
- 953b2cea-516: Blob.fromBytes does not forward props (Obj.Parent) and lives in another package, so the fix needs a cross-package change.
- 953b2cea-517: Six identical inlines of the same annotated ref add duplication for no benefit; the alias shares one description.
- 953b2cea-518: Fixing Relation.getTarget lives in the echo package, outside this batch.
- 953b2cea-519: Fixing Relation.getSource lives in the echo package, outside this batch.
- 953b2cea-520: The chained provides are order-dependent (later layers satisfy earlier ones), so merging them would change behavior.
- 953b2cea-522: A shared semantic token spans SearchDialog and AddToCollectionDialog and needs a design decision.
- 953b2cea-526: Extracting a useScorePlayer hook is a large refactor of the player lifecycle.
- 953b2cea-527: The relative-positioned wrapper hosts overlay positioning, so it is ad hoc layout and not a styling wrapper.
- 953b2cea-528: The line is the heading underline of the documented lead-sheet format, not a bare separator.
- 953b2cea-529: reset/recalculate have no real replacement API to name; they are still used internally and marked for removal.
- 953b2cea-530: plugin-sheet lacks @dxos/errors dependency and ApiError has a subclass hierarchy; requires wider change.
- 953b2cea-531: Restructuring components into directories with stories is a larger refactor touching many imports.
- 953b2cea-532: Moving five components into their own directories with Props and stories is a large refactor and needs new stories.
- 953b2cea-534: The query depends on the reactively derived ordering space, so hoisting needs a restructure of the closure.
- 953b2cea-535: The queries depend on the reactive active space, so hoisting needs a keyed atom-family redesign.
- 953b2cea-538: Needs a shared semantic token and a change in plugin-search, which is outside this batch.
- 953b2cea-539: Needs a design decision on Grid subgrid and asChild with role semantics; not a contained change.
- 953b2cea-540: No obvious semantic row-size token is available; needs a design decision.
- 953b2cea-542: Switching to a non-selectable Listbox is a UI redesign needing its own verification.
- 953b2cea-543: Story-only wrappers; low value and not worth the churn.
- 953b2cea-544: Replacing the hook with a stream-fed atom is a larger refactor needing a design decision.
- 953b2cea-545: No reverse-reference index exists; the TODO already tracks the limitation.
- 953b2cea-546: The guard is a documented workaround for a pending upstream fix; logging per relation per render would be noisy.
- 953b2cea-547: The private helper is called once per write and nothing needs batching with it; no real defect.
- 953b2cea-548: The Obj-or-Ref union comes from the operation input schema, so changing it is a schema and API change.
- 953b2cea-549: Optional ambient services are deliberate so headless hosts work; a noop-layer design is cross-package.
- 953b2cea-550: Rebuilding the toolbar on MenuBuilder/Menu.Root is a larger UI refactor.
- 953b2cea-551: Needs a refactor of the gallery tiles to own per-ref subscriptions; selection/index logic depends on resolved objects at list level.
- 953b2cea-552: Requires restructuring the variant tiles and their consumers; larger refactor.
- 953b2cea-553: Requires moving resolution into each tile with shared list logic; larger refactor.
- 953b2cea-554: The cast is needed because opaqueHandler erases context; removing it requires reworking the test harness types.
- 953b2cea-555: Same opaqueHandler context erasure; tightening R requires reworking the test harness.
- 953b2cea-556: Moving Discord widget fetch into an Operation is a larger refactor.
- 953b2cea-557: Replacing the channel list with Listbox is a UI refactor needing design.
- 953b2cea-559: Rewriting the toolbar with MenuBuilder/Menu.Root is a larger UI refactor needing design decisions.
- 953b2cea-560: The classes are part of a conditional mx() expression on the drop area, so swapping to Flex would restructure the element and risk behavior change.
- 953b2cea-562: Needs leaf component restructuring (design change) beyond a contained fix.
- 953b2cea-563: Fixed-position root wrapper is intentional layout; converting to Flex asChild is cosmetic and risky.
- 953b2cea-565: Replacing the RecordBuilder class is a larger refactor touching its callers.
- 953b2cea-568: Driving the real coordinator setCursors needs a test redesign.
- 953b2cea-570: Refactoring marker-provider to per-leaf subscriptions is a larger redesign of the MarkerProvider hook.
- 953b2cea-571: Migrating the SegmentArticle toolbar to MenuBuilder/Menu.Root is a larger UI refactor needing verification via storybook.
- 953b2cea-572: Moving to per-tile useObject requires restructuring TripArticle's list and segment ordering logic; not contained.
- 953b2cea-573: The div uses container-query responsive grid columns (@3xl) that Layout.Grid cols does not express; swapping would change behavior.
- 953b2cea-574: TripBuilder is used across stories/tests; replacing the class is a broad refactor of test-data helpers.
- 953b2cea-578: Converting VoxelToolbar to a Menu-based toolbar is a larger UI refactor.
- 953b2cea-579: Extracting the audio engine lifecycle into a hook is a larger refactor of Mixer.
- 953b2cea-580: ZenArticle has no toolbar; passing attendableId requires adding a menu toolbar, a design change.
- 953b2cea-581: Restructuring the test into describe blocks is a broader test refactor; separators are low-value.
- 953b2cea-588: The #frameBudget field and the _frameBudget() overridable method serve different roles (storage vs protected accessor), so not a naming inconsistency.
- 953b2cea-589: Removing the backwards-compat action expansion requires updating call sites across other packages.
- 953b2cea-591: Changing the signature to take a draft requires updating call sites outside the package or a design decision.
- 953b2cea-592: Signature change breaks plugin-space call sites outside my packages.
- 953b2cea-594: Restructuring the barrel into internal/ and explicit exports is a large refactor affecting consumers.
- 953b2cea-596: Tightening the generic bounds risks breaking inference for many surface filter call sites across packages; needs a careful design pass.
- 953b2cea-597: The assertions are deliberately disabled with a TODO because the functionality was unreliable.
- 953b2cea-598: Reworking the barrel into internal/ plus explicit exports changes public surface across many call sites outside this package.
- 953b2cea-602: Declaring optional edge services with noop layers is a cross-cutting design change across host stacks and LayerSpecs, not a contained fix.
- 953b2cea-603: Same noop-layer redesign for EdgeConnectionService; requires host-wide layer changes outside this contained fix.
- 953b2cea-604: Same noop-layer redesign; requires changes to every host that composes DevicesServiceLayer.
- 953b2cea-605: Renaming the exported IdentityManager touches many call sites across packages and needs a naming decision.
- 953b2cea-606: Same noop-layer redesign; needs LayerSpec and host changes beyond a contained fix.
- 953b2cea-607: Same noop-layer redesign for EdgeHttpClientService; cross-cutting.
- 953b2cea-608: Same noop-layer redesign; changes semantics of absent edge services and needs host-wide changes.
- 953b2cea-609: The error is thrown precisely because no active invitation exists, so there is no invitation id or state to include; a typed error would be a design change.
- 953b2cea-610: Same noop-layer redesign; cross-cutting.
- 953b2cea-611: Same noop-layer redesign; cross-cutting.
- 953b2cea-612: Same noop-layer redesign; requires changing LayerSpec requirements and all hosts.
- 953b2cea-613: Same noop-layer redesign; cross-cutting.
- 953b2cea-614: The test is already test.skip with the flow pending an unbuilt invitation factoring (TODO); restoring it needs new implementation work.
- 953b2cea-615: Same noop-layer redesign for four optional services; cross-cutting.
- 953b2cea-617: ProviderApiError is exported and converting to BaseError.extend is a contained but unverified API change; left as-is (not done).
- 953b2cea-618: Template is not a package with a public entry; the import is of an example tree and needs a structural decision.
- 953b2cea-622: Exposing client status as an Atom needs a cross-package client API change.
- 953b2cea-623: Annotation.make creates user annotations with different semantics than createAnnotationHelper, so the swap is not behavior-preserving without a design decision.
- 953b2cea-624: Same as 623: Annotation.make is not a drop-in replacement for createAnnotationHelper.
- 953b2cea-625: Restoring the assertions requires fixing validation behavior, which is a design/behavior change beyond a contained fix.
- 953b2cea-626: Needs an Atom/stream bridge design change in the shell hook; not a contained fix.
- 953b2cea-627: Requires reworking the join state machine, a design change beyond a contained fix.
- 953b2cea-628: Changing parentMessage to a Ref is a schema change affecting call sites in other packages.
- 953b2cea-629: Renaming the exported Pipeline type needs a naming decision and updates across other packages.
- 953b2cea-630: Converting to a TaskMigrationPlanner class changes the exported API used by other packages and is a larger refactor.
- 953b2cea-631: False positive: sibling source files (Branch.ts, History.ts, Version.ts) are capitalized, so Branch.test.ts matches Branch.ts.
- 953b2cea-639: Rewriting a 23-module barrel changes public API and every consumer's imports.
- 953b2cea-641: Rename touches many shapes and needs a naming decision.
- 953b2cea-642: Package tsconfig uses classic jsx ('react'), so removing the default React import breaks tsc (TS2686); needs a repo-wide jsx runtime change.
- 953b2cea-643: Same: classic JSX runtime requires the React binding.
- 953b2cea-644: Same: classic JSX runtime requires the React binding.
- 953b2cea-645: React.PointerEvent types can't be fully fixed since the default import must stay under classic jsx.
- 953b2cea-646: Same: classic JSX runtime requires the React binding.
- 953b2cea-647: Same: classic JSX runtime requires the React binding.
- 953b2cea-648: Same: classic JSX runtime requires the React binding.
- 953b2cea-650: Same: classic JSX runtime requires the React binding.
- 953b2cea-651: Default import must stay under classic jsx; partial change not worthwhile.
- 953b2cea-652: Same: classic JSX runtime requires the React binding.
- 953b2cea-653: Same: classic JSX runtime requires the React binding.
- 953b2cea-654: Same: classic JSX runtime requires the React binding.
- 953b2cea-655: Same: classic JSX runtime requires the React binding.
- 953b2cea-656: Same: classic JSX runtime requires the React binding.
- 953b2cea-657: Same: classic JSX runtime requires the React binding.
- 953b2cea-658: Same: classic JSX runtime requires the React binding.
- 953b2cea-659: Same: classic JSX runtime requires the React binding.
- 953b2cea-660: Default import must stay under classic jsx; partial change not worthwhile.
- 953b2cea-661: Same: classic JSX runtime requires the React binding.
- 953b2cea-663: Same: classic JSX runtime requires the React binding.
- 953b2cea-664: Default import must stay under classic jsx; partial change not worthwhile.
- 953b2cea-665: Needs a design decision (new group intent in the projection) and a larger refactor.
- 953b2cea-667: Same: classic JSX runtime requires the React binding.
- 953b2cea-670: Needs design decision on sizing tokens for waveform pixel-precise bars.
- 953b2cea-671: Needs design decision on equivalent semantic size tokens; no clear token mapping.
- 953b2cea-672: No semantic width token matches this hover-card width; the arbitrary value is intentional and commented.
- 953b2cea-673: Moving files into a directory is a restructure touching import paths and stories; out of scope for a contained fix.
- 953b2cea-674: Grouping Form files into a directory is a large restructure with many call sites.
- 953b2cea-675: Changing LayoutParseError to BaseError.extend alters an exported class and its usage; not a contained fix.
- 953b2cea-676: Directory restructure across import paths; out of scope.
- 953b2cea-677: Directory restructure across import paths; out of scope.
- 953b2cea-681: Moving stories into per-component directories is a larger restructuring, out of scope.
- 953b2cea-683: className is intentionally supplied by slotting parents and consumed via composableProps; removing it risks breaking slot usage.
- 953b2cea-693: Splitting the barrel into internal/ and explicit exports is a larger refactor affecting consumers.
- 953b2cea-694: Replacing barrel wildcards and moving code to internal/ changes the public surface and needs consumer updates and a design decision.
- 953b2cea-695: Replacing the barrel wildcards with explicit exports and an internal/ split is a large public-surface refactor.
- 953b2cea-698: Moving the hover bookkeeping into a ViewPlugin class is a non-trivial refactor of the collab extension.
- 953b2cea-699: Needs a new @dxos/errors dependency (package.json and lockfile change) in ui-template, which is not contained.
- 953b2cea-700: Same as 699: needs a new @dxos/errors dependency.
- 953b2cea-701: Same as 699: needs a new @dxos/errors dependency.
- 953b2cea-703: getStyles is exported and used by many call sites in other packages; rename is cross-package.
- 953b2cea-704: Replacing 12 wildcard exports changes the public surface used by many packages outside this batch.
- 953b2cea-590: A case-only rename (`Tour.test.ts` → `tour.test.ts`) breaks checkouts on case-insensitive filesystems; not worth it for a naming warning.
- 953b2cea-662: `main` rewrote `Dock.tsx` and still uses `stop`; the merge took main's version.

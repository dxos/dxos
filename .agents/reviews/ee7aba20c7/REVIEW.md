---
branch: HEAD
commit: ee7aba20c7f604beb6b7038f7641589727f9ae76
base: 128be93325129950e3c27b24559fd56349bd204c
mode: fast
createdAt: 2026-10-04T17:15:18.624Z
isFinalized: true
groups: 5778
rules: [barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, isolate-benchmark-setup-and-flaky-tests, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, options-object-with-defaults, reactive-state-via-atom-bridge, schema-declare-and-brand, setter-must-not-own-transaction, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: ee7aba20c7
---

_242 error(s), 498 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ee7aba20c7-1 - ignored - barrel-imports-not-internal-paths - packages/apps/composer-app/src/pages/devtools.tsx:13
- ee7aba20c7-2 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:85
- ee7aba20c7-3 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/index.ts:1
- ee7aba20c7-4 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/internal/index.ts:1
- ee7aba20c7-5 - ignored - import-as-namespace-is-all-or-nothing - packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1
- ee7aba20c7-6 - ignored - namespace-export-with-internal-hiding - packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1
- ee7aba20c7-7 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:467
- ee7aba20c7-8 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- ee7aba20c7-9 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- ee7aba20c7-10 - ignored - structured-logging-not-console - packages/core/compute/agent-claude/src/Demo.test.ts:42
- ee7aba20c7-11 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- ee7aba20c7-12 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- ee7aba20c7-13 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- ee7aba20c7-14 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203
- ee7aba20c7-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- ee7aba20c7-16 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- ee7aba20c7-17 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:54
- ee7aba20c7-18 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237
- ee7aba20c7-19 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- ee7aba20c7-20 - ignored - error-messages-carry-context - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957
- ee7aba20c7-21 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- ee7aba20c7-22 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- ee7aba20c7-23 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119
- ee7aba20c7-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126
- ee7aba20c7-25 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- ee7aba20c7-26 - ignored - moon-yml-entrypoint-registration - packages/core/compute/assistant-toolkit/package.json:37
- ee7aba20c7-27 - ignored - namespace-export-with-internal-hiding - packages/core/compute/assistant-toolkit/src/index.ts:1
- ee7aba20c7-28 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1
- ee7aba20c7-29 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/planning/index.ts:1
- ee7aba20c7-30 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:224
- ee7aba20c7-31 - ignored - test-asserts-real-behavior - packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23
- ee7aba20c7-32 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140
- ee7aba20c7-33 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- ee7aba20c7-34 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:113
- ee7aba20c7-35 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- ee7aba20c7-36 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- ee7aba20c7-37 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- ee7aba20c7-38 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- ee7aba20c7-39 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- ee7aba20c7-40 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- ee7aba20c7-41 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79
- ee7aba20c7-42 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- ee7aba20c7-43 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- ee7aba20c7-44 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:405
- ee7aba20c7-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429
- ee7aba20c7-46 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462
- ee7aba20c7-47 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:474
- ee7aba20c7-48 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- ee7aba20c7-49 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:195
- ee7aba20c7-50 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:351
- ee7aba20c7-51 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:363
- ee7aba20c7-52 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390
- ee7aba20c7-53 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- ee7aba20c7-54 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- ee7aba20c7-55 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- ee7aba20c7-56 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- ee7aba20c7-57 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- ee7aba20c7-58 - ignored - no-casts - packages/core/compute/compute-runtime/src/services/service-registry.ts:54
- ee7aba20c7-59 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- ee7aba20c7-60 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381
- ee7aba20c7-61 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111
- ee7aba20c7-62 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- ee7aba20c7-63 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:235
- ee7aba20c7-64 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1044
- ee7aba20c7-65 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- ee7aba20c7-66 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- ee7aba20c7-67 - ignored - no-casts - packages/core/compute/compute/src/ServiceResolver.ts:85
- ee7aba20c7-68 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.test.ts:68
- ee7aba20c7-69 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- ee7aba20c7-70 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- ee7aba20c7-71 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- ee7aba20c7-72 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:20
- ee7aba20c7-73 - ignored - no-casts - packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136
- ee7aba20c7-74 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- ee7aba20c7-75 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- ee7aba20c7-76 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- ee7aba20c7-77 - ignored - flat-layer-composition - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:102
- ee7aba20c7-78 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- ee7aba20c7-79 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- ee7aba20c7-80 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- ee7aba20c7-81 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- ee7aba20c7-82 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- ee7aba20c7-83 - ignored - test-asserts-real-behavior - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- ee7aba20c7-84 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- ee7aba20c7-85 - ignored - no-casts - packages/core/compute/operation/src/invoker.test.ts:23
- ee7aba20c7-86 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/invoker.test.ts:63
- ee7aba20c7-87 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- ee7aba20c7-88 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- ee7aba20c7-89 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- ee7aba20c7-90 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- ee7aba20c7-91 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- ee7aba20c7-92 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- ee7aba20c7-93 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- ee7aba20c7-94 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- ee7aba20c7-95 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- ee7aba20c7-96 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- ee7aba20c7-97 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116
- ee7aba20c7-98 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:107
- ee7aba20c7-99 - ignored - namespace-brand-key-prefixing - packages/core/compute/pipeline/src/Stage.test.ts:14
- ee7aba20c7-100 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- ee7aba20c7-101 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- ee7aba20c7-102 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75
- ee7aba20c7-103 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- ee7aba20c7-104 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- ee7aba20c7-105 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- ee7aba20c7-106 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- ee7aba20c7-107 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- ee7aba20c7-108 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:266
- ee7aba20c7-109 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- ee7aba20c7-110 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- ee7aba20c7-111 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- ee7aba20c7-112 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- ee7aba20c7-113 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- ee7aba20c7-114 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- ee7aba20c7-115 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- ee7aba20c7-116 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:860
- ee7aba20c7-117 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- ee7aba20c7-118 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- ee7aba20c7-119 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- ee7aba20c7-120 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- ee7aba20c7-121 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- ee7aba20c7-122 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- ee7aba20c7-123 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- ee7aba20c7-124 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- ee7aba20c7-125 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- ee7aba20c7-126 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- ee7aba20c7-127 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- ee7aba20c7-128 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- ee7aba20c7-129 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- ee7aba20c7-130 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- ee7aba20c7-131 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- ee7aba20c7-132 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- ee7aba20c7-133 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- ee7aba20c7-134 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- ee7aba20c7-135 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- ee7aba20c7-136 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- ee7aba20c7-137 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- ee7aba20c7-138 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46
- ee7aba20c7-139 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- ee7aba20c7-140 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- ee7aba20c7-141 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- ee7aba20c7-142 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- ee7aba20c7-143 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- ee7aba20c7-144 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- ee7aba20c7-145 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- ee7aba20c7-146 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:688
- ee7aba20c7-147 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- ee7aba20c7-148 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- ee7aba20c7-149 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- ee7aba20c7-150 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- ee7aba20c7-151 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- ee7aba20c7-152 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- ee7aba20c7-153 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- ee7aba20c7-154 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- ee7aba20c7-155 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- ee7aba20c7-156 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- ee7aba20c7-157 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- ee7aba20c7-158 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- ee7aba20c7-159 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- ee7aba20c7-160 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:134
- ee7aba20c7-161 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- ee7aba20c7-162 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- ee7aba20c7-163 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- ee7aba20c7-164 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- ee7aba20c7-165 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- ee7aba20c7-166 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- ee7aba20c7-167 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- ee7aba20c7-168 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- ee7aba20c7-169 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- ee7aba20c7-170 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- ee7aba20c7-171 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- ee7aba20c7-172 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- ee7aba20c7-173 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- ee7aba20c7-174 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- ee7aba20c7-175 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- ee7aba20c7-176 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- ee7aba20c7-177 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- ee7aba20c7-178 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- ee7aba20c7-179 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- ee7aba20c7-180 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- ee7aba20c7-181 - ignored - test-asserts-real-behavior - packages/devtools/cli-util/src/util/form-builder.test.ts:49
- ee7aba20c7-182 - ignored - no-casts - packages/devtools/cli/src/bin.ts:239
- ee7aba20c7-183 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:239
- ee7aba20c7-184 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- ee7aba20c7-185 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- ee7aba20c7-186 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:59
- ee7aba20c7-187 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129
- ee7aba20c7-188 - ignored - no-casts - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118
- ee7aba20c7-189 - ignored - error-messages-carry-context - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130
- ee7aba20c7-190 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- ee7aba20c7-191 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/create-object.ts:37
- ee7aba20c7-192 - ignored - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:72
- ee7aba20c7-193 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123
- ee7aba20c7-194 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405
- ee7aba20c7-195 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- ee7aba20c7-196 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- ee7aba20c7-197 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73
- ee7aba20c7-198 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50
- ee7aba20c7-199 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- ee7aba20c7-200 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22
- ee7aba20c7-201 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26
- ee7aba20c7-202 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82
- ee7aba20c7-203 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49
- ee7aba20c7-204 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50
- ee7aba20c7-205 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:122
- ee7aba20c7-206 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- ee7aba20c7-207 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- ee7aba20c7-208 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65
- ee7aba20c7-209 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- ee7aba20c7-210 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- ee7aba20c7-211 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- ee7aba20c7-212 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- ee7aba20c7-213 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- ee7aba20c7-214 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- ee7aba20c7-215 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- ee7aba20c7-216 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- ee7aba20c7-217 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- ee7aba20c7-218 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- ee7aba20c7-219 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- ee7aba20c7-220 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261
- ee7aba20c7-221 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:182
- ee7aba20c7-222 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118
- ee7aba20c7-223 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202
- ee7aba20c7-224 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/operations/sync.ts:48
- ee7aba20c7-225 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217
- ee7aba20c7-226 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- ee7aba20c7-227 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171
- ee7aba20c7-228 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- ee7aba20c7-229 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- ee7aba20c7-230 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- ee7aba20c7-231 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- ee7aba20c7-232 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- ee7aba20c7-233 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44
- ee7aba20c7-234 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- ee7aba20c7-235 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:63
- ee7aba20c7-236 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:75
- ee7aba20c7-237 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:111
- ee7aba20c7-238 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30
- ee7aba20c7-239 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93
- ee7aba20c7-240 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42
- ee7aba20c7-241 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:84
- ee7aba20c7-242 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70
- ee7aba20c7-243 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94
- ee7aba20c7-244 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- ee7aba20c7-245 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- ee7aba20c7-246 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58
- ee7aba20c7-247 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- ee7aba20c7-248 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- ee7aba20c7-249 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- ee7aba20c7-250 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89
- ee7aba20c7-251 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31
- ee7aba20c7-252 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- ee7aba20c7-253 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/schema-defs.test.ts:39
- ee7aba20c7-254 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22
- ee7aba20c7-255 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- ee7aba20c7-256 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53
- ee7aba20c7-257 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77
- ee7aba20c7-258 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128
- ee7aba20c7-259 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- ee7aba20c7-260 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- ee7aba20c7-261 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- ee7aba20c7-262 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- ee7aba20c7-263 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166
- ee7aba20c7-264 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- ee7aba20c7-265 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62
- ee7aba20c7-266 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- ee7aba20c7-267 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:90
- ee7aba20c7-268 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96
- ee7aba20c7-269 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-crm/src/index.ts:1
- ee7aba20c7-270 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- ee7aba20c7-271 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm-project.ts:59
- ee7aba20c7-272 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm.ts:25
- ee7aba20c7-273 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:78
- ee7aba20c7-274 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- ee7aba20c7-275 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:807
- ee7aba20c7-276 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71
- ee7aba20c7-277 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- ee7aba20c7-278 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- ee7aba20c7-279 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- ee7aba20c7-280 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66
- ee7aba20c7-281 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78
- ee7aba20c7-282 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- ee7aba20c7-283 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:55
- ee7aba20c7-284 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:103
- ee7aba20c7-285 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:187
- ee7aba20c7-286 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-debug/src/index.ts:1
- ee7aba20c7-287 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- ee7aba20c7-288 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27
- ee7aba20c7-289 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- ee7aba20c7-290 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- ee7aba20c7-291 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- ee7aba20c7-292 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- ee7aba20c7-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- ee7aba20c7-294 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29
- ee7aba20c7-295 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161
- ee7aba20c7-296 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- ee7aba20c7-297 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136
- ee7aba20c7-298 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:87
- ee7aba20c7-299 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:177
- ee7aba20c7-300 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:67
- ee7aba20c7-301 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- ee7aba20c7-302 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39
- ee7aba20c7-303 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- ee7aba20c7-304 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- ee7aba20c7-305 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:113
- ee7aba20c7-306 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- ee7aba20c7-307 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32
- ee7aba20c7-308 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/connector.ts:58
- ee7aba20c7-309 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/DiscordSource.ts:1
- ee7aba20c7-310 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-discord/src/errors.ts:16
- ee7aba20c7-311 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/operations/sync.ts:217
- ee7aba20c7-312 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- ee7aba20c7-313 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- ee7aba20c7-314 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- ee7aba20c7-315 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- ee7aba20c7-316 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- ee7aba20c7-317 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108
- ee7aba20c7-318 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26
- ee7aba20c7-319 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- ee7aba20c7-320 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29
- ee7aba20c7-321 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23
- ee7aba20c7-322 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39
- ee7aba20c7-323 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75
- ee7aba20c7-324 - ignored - no-casts - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27
- ee7aba20c7-325 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- ee7aba20c7-326 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- ee7aba20c7-327 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- ee7aba20c7-328 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- ee7aba20c7-329 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:147
- ee7aba20c7-330 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/capabilities/connector.ts:29
- ee7aba20c7-331 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- ee7aba20c7-332 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync.test.ts:94
- ee7aba20c7-333 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101
- ee7aba20c7-334 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/walkthrough/generate.ts:82
- ee7aba20c7-335 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- ee7aba20c7-336 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- ee7aba20c7-337 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- ee7aba20c7-338 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- ee7aba20c7-339 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210
- ee7aba20c7-340 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- ee7aba20c7-341 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- ee7aba20c7-342 - ignored - subscribe-where-you-read - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:30
- ee7aba20c7-343 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66
- ee7aba20c7-344 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- ee7aba20c7-345 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:86
- ee7aba20c7-346 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102
- ee7aba20c7-347 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- ee7aba20c7-348 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53
- ee7aba20c7-349 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188
- ee7aba20c7-350 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- ee7aba20c7-351 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154
- ee7aba20c7-352 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- ee7aba20c7-353 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27
- ee7aba20c7-354 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180
- ee7aba20c7-355 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- ee7aba20c7-356 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- ee7aba20c7-357 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- ee7aba20c7-358 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- ee7aba20c7-359 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- ee7aba20c7-360 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- ee7aba20c7-361 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/templates/analyze-mailbox.ts:33
- ee7aba20c7-362 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- ee7aba20c7-363 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- ee7aba20c7-364 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- ee7aba20c7-365 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59
- ee7aba20c7-366 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- ee7aba20c7-367 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-jmap/src/index.ts:1
- ee7aba20c7-368 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32
- ee7aba20c7-369 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60
- ee7aba20c7-370 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- ee7aba20c7-371 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88
- ee7aba20c7-372 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124
- ee7aba20c7-373 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47
- ee7aba20c7-374 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137
- ee7aba20c7-375 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87
- ee7aba20c7-376 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- ee7aba20c7-377 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- ee7aba20c7-378 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109
- ee7aba20c7-379 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- ee7aba20c7-380 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- ee7aba20c7-381 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-linear/src/capabilities/connector.ts:29
- ee7aba20c7-382 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-linear/src/operations/sync.test.ts:48
- ee7aba20c7-383 - ignored - inline-obj-parent - packages/plugins/plugin-linear/src/operations/sync.ts:248
- ee7aba20c7-384 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- ee7aba20c7-385 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52
- ee7aba20c7-386 - ignored - no-casts - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:43
- ee7aba20c7-387 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- ee7aba20c7-388 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84
- ee7aba20c7-389 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128
- ee7aba20c7-390 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28
- ee7aba20c7-391 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- ee7aba20c7-392 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- ee7aba20c7-393 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-map/src/index.ts:1
- ee7aba20c7-394 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186
- ee7aba20c7-395 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117
- ee7aba20c7-396 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333
- ee7aba20c7-397 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- ee7aba20c7-398 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- ee7aba20c7-399 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87
- ee7aba20c7-400 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- ee7aba20c7-401 - ignored - test-asserts-real-behavior - packages/plugins/plugin-markdown/src/plugin.test.ts:15
- ee7aba20c7-402 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- ee7aba20c7-403 - ignored - options-object-with-defaults - packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:25
- ee7aba20c7-404 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58
- ee7aba20c7-405 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70
- ee7aba20c7-406 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- ee7aba20c7-407 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:130
- ee7aba20c7-408 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- ee7aba20c7-409 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- ee7aba20c7-410 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- ee7aba20c7-411 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- ee7aba20c7-412 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- ee7aba20c7-413 - ignored - structured-logging-not-console - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27
- ee7aba20c7-414 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25
- ee7aba20c7-415 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:220
- ee7aba20c7-416 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371
- ee7aba20c7-417 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25
- ee7aba20c7-418 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194
- ee7aba20c7-419 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38
- ee7aba20c7-420 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312
- ee7aba20c7-421 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128
- ee7aba20c7-422 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:53
- ee7aba20c7-423 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- ee7aba20c7-424 - ignored - no-casts - packages/plugins/plugin-observability/src/plugin.test.ts:14
- ee7aba20c7-425 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- ee7aba20c7-426 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- ee7aba20c7-427 - ignored - inline-obj-parent - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65
- ee7aba20c7-428 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101
- ee7aba20c7-429 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43
- ee7aba20c7-430 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- ee7aba20c7-431 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- ee7aba20c7-432 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123
- ee7aba20c7-433 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118
- ee7aba20c7-434 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- ee7aba20c7-435 - ignored - no-casts - packages/plugins/plugin-presenter/src/useExitPresenter.ts:16
- ee7aba20c7-436 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- ee7aba20c7-437 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- ee7aba20c7-438 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- ee7aba20c7-439 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- ee7aba20c7-440 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- ee7aba20c7-441 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- ee7aba20c7-442 - ignored - no-casts - packages/plugins/plugin-preview/src/stories/Card.stories.tsx:101
- ee7aba20c7-443 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:35
- ee7aba20c7-444 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37
- ee7aba20c7-445 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- ee7aba20c7-446 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- ee7aba20c7-447 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458
- ee7aba20c7-448 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124
- ee7aba20c7-449 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109
- ee7aba20c7-450 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104
- ee7aba20c7-451 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69
- ee7aba20c7-452 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/templates/inbox-research.ts:55
- ee7aba20c7-453 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- ee7aba20c7-454 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- ee7aba20c7-455 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129
- ee7aba20c7-456 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:375
- ee7aba20c7-457 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- ee7aba20c7-458 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- ee7aba20c7-459 - ignored - no-casts - packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41
- ee7aba20c7-460 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- ee7aba20c7-461 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99
- ee7aba20c7-462 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54
- ee7aba20c7-463 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448
- ee7aba20c7-464 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222
- ee7aba20c7-465 - ignored - no-casts - packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296
- ee7aba20c7-466 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- ee7aba20c7-467 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- ee7aba20c7-468 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- ee7aba20c7-469 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- ee7aba20c7-470 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290
- ee7aba20c7-471 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40
- ee7aba20c7-472 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- ee7aba20c7-473 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- ee7aba20c7-474 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-s3/src/capabilities/connector.ts:95
- ee7aba20c7-475 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- ee7aba20c7-476 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- ee7aba20c7-477 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74
- ee7aba20c7-478 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-sandbox/src/index.ts:1
- ee7aba20c7-479 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- ee7aba20c7-480 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76
- ee7aba20c7-481 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- ee7aba20c7-482 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- ee7aba20c7-483 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- ee7aba20c7-484 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- ee7aba20c7-485 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59
- ee7aba20c7-486 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36
- ee7aba20c7-487 - ignored - no-casts - packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40
- ee7aba20c7-488 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- ee7aba20c7-489 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- ee7aba20c7-490 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54
- ee7aba20c7-491 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58
- ee7aba20c7-492 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- ee7aba20c7-493 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- ee7aba20c7-494 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:82
- ee7aba20c7-495 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-search/src/index.ts:1
- ee7aba20c7-496 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- ee7aba20c7-497 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- ee7aba20c7-498 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299
- ee7aba20c7-499 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- ee7aba20c7-500 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23
- ee7aba20c7-501 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267
- ee7aba20c7-502 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84
- ee7aba20c7-503 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- ee7aba20c7-504 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- ee7aba20c7-505 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/capabilities/connector.ts:29
- ee7aba20c7-506 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/operations/sync.ts:173
- ee7aba20c7-507 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- ee7aba20c7-508 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- ee7aba20c7-509 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-handler/navigation-handler.ts:51
- ee7aba20c7-510 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- ee7aba20c7-511 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- ee7aba20c7-512 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- ee7aba20c7-513 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112
- ee7aba20c7-514 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100
- ee7aba20c7-515 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- ee7aba20c7-516 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- ee7aba20c7-517 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:259
- ee7aba20c7-518 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- ee7aba20c7-519 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:250
- ee7aba20c7-520 - ignored - no-casts - packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95
- ee7aba20c7-521 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48
- ee7aba20c7-522 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242
- ee7aba20c7-523 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- ee7aba20c7-524 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58
- ee7aba20c7-525 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:199
- ee7aba20c7-526 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180
- ee7aba20c7-527 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225
- ee7aba20c7-528 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- ee7aba20c7-529 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54
- ee7aba20c7-530 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72
- ee7aba20c7-531 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108
- ee7aba20c7-532 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- ee7aba20c7-533 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:68
- ee7aba20c7-534 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80
- ee7aba20c7-535 - ignored - inline-obj-parent - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99
- ee7aba20c7-536 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-studio/src/index.ts:1
- ee7aba20c7-537 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- ee7aba20c7-538 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- ee7aba20c7-539 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:95
- ee7aba20c7-540 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109
- ee7aba20c7-541 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145
- ee7aba20c7-542 - ignored - no-casts - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23
- ee7aba20c7-543 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64
- ee7aba20c7-544 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:77
- ee7aba20c7-545 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89
- ee7aba20c7-546 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31
- ee7aba20c7-547 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:13
- ee7aba20c7-548 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- ee7aba20c7-549 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18
- ee7aba20c7-550 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- ee7aba20c7-551 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- ee7aba20c7-552 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:73
- ee7aba20c7-553 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- ee7aba20c7-554 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139
- ee7aba20c7-555 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- ee7aba20c7-556 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- ee7aba20c7-557 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:87
- ee7aba20c7-558 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- ee7aba20c7-559 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- ee7aba20c7-560 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232
- ee7aba20c7-561 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- ee7aba20c7-562 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- ee7aba20c7-563 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-tldraw/src/index.ts:1
- ee7aba20c7-564 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116
- ee7aba20c7-565 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- ee7aba20c7-566 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- ee7aba20c7-567 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- ee7aba20c7-568 - ignored - no-casts - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- ee7aba20c7-569 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- ee7aba20c7-570 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trello/src/capabilities/connector.ts:31
- ee7aba20c7-571 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- ee7aba20c7-572 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- ee7aba20c7-573 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- ee7aba20c7-574 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- ee7aba20c7-575 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- ee7aba20c7-576 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.ts:191
- ee7aba20c7-577 - ignored - no-casts - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54
- ee7aba20c7-578 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102
- ee7aba20c7-579 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- ee7aba20c7-580 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- ee7aba20c7-581 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- ee7aba20c7-582 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- ee7aba20c7-583 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54
- ee7aba20c7-584 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28
- ee7aba20c7-585 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- ee7aba20c7-586 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- ee7aba20c7-587 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- ee7aba20c7-588 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/common/index.ts:1
- ee7aba20c7-589 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- ee7aba20c7-590 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:403
- ee7aba20c7-591 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:490
- ee7aba20c7-592 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin-manifest.ts:115
- ee7aba20c7-593 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:474
- ee7aba20c7-594 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/plugin.ts:474
- ee7aba20c7-595 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:626
- ee7aba20c7-596 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- ee7aba20c7-597 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- ee7aba20c7-598 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- ee7aba20c7-599 - ignored - bounded-live-state - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:78
- ee7aba20c7-600 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- ee7aba20c7-601 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229
- ee7aba20c7-602 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253
- ee7aba20c7-603 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- ee7aba20c7-604 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- ee7aba20c7-605 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- ee7aba20c7-606 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- ee7aba20c7-607 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- ee7aba20c7-608 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354
- ee7aba20c7-609 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82
- ee7aba20c7-610 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- ee7aba20c7-611 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- ee7aba20c7-612 - ignored - comment-hygiene - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:88
- ee7aba20c7-613 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- ee7aba20c7-614 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- ee7aba20c7-615 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- ee7aba20c7-616 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- ee7aba20c7-617 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-solid/src/index.ts:1
- ee7aba20c7-618 - ignored - no-casts - packages/sdk/app-solid/src/useCapabilities.test.tsx:19
- ee7aba20c7-619 - ignored - no-casts - packages/sdk/app-solid/src/usePluginManager.test.tsx:13
- ee7aba20c7-620 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22
- ee7aba20c7-621 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- ee7aba20c7-622 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206
- ee7aba20c7-623 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- ee7aba20c7-624 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/types/ConnectorSync.ts:1
- ee7aba20c7-625 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324
- ee7aba20c7-626 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- ee7aba20c7-627 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/index.ts:13
- ee7aba20c7-628 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:396
- ee7aba20c7-629 - ignored - no-sleep-in-test - packages/sdk/client-e2e/src/spaces.test.ts:65
- ee7aba20c7-630 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- ee7aba20c7-631 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- ee7aba20c7-632 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- ee7aba20c7-633 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- ee7aba20c7-634 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- ee7aba20c7-635 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- ee7aba20c7-636 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- ee7aba20c7-637 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- ee7aba20c7-638 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- ee7aba20c7-639 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- ee7aba20c7-640 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/spaces.ts:73
- ee7aba20c7-641 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- ee7aba20c7-642 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- ee7aba20c7-643 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- ee7aba20c7-644 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- ee7aba20c7-645 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- ee7aba20c7-646 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- ee7aba20c7-647 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- ee7aba20c7-648 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- ee7aba20c7-649 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- ee7aba20c7-650 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- ee7aba20c7-651 - ignored - no-casts - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137
- ee7aba20c7-652 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- ee7aba20c7-653 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- ee7aba20c7-654 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:148
- ee7aba20c7-655 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- ee7aba20c7-656 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- ee7aba20c7-657 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- ee7aba20c7-658 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- ee7aba20c7-659 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- ee7aba20c7-660 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- ee7aba20c7-661 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- ee7aba20c7-662 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- ee7aba20c7-663 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:107
- ee7aba20c7-664 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- ee7aba20c7-665 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- ee7aba20c7-666 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- ee7aba20c7-667 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/space/space-manager.ts:97
- ee7aba20c7-668 - ignored - no-casts - packages/sdk/client-services/src/internal/space/space-manager.ts:181
- ee7aba20c7-669 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- ee7aba20c7-670 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- ee7aba20c7-671 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- ee7aba20c7-672 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- ee7aba20c7-673 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- ee7aba20c7-674 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- ee7aba20c7-675 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- ee7aba20c7-676 - ignored - flat-layer-composition - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:195
- ee7aba20c7-677 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- ee7aba20c7-678 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- ee7aba20c7-679 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- ee7aba20c7-680 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:235
- ee7aba20c7-681 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/testing/test-worker-factory.ts:70
- ee7aba20c7-682 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- ee7aba20c7-683 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/observability/src/ai/AiObservability.test.ts:372
- ee7aba20c7-684 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- ee7aba20c7-685 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- ee7aba20c7-686 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- ee7aba20c7-687 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- ee7aba20c7-688 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- ee7aba20c7-689 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- ee7aba20c7-690 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- ee7aba20c7-691 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- ee7aba20c7-692 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:274
- ee7aba20c7-693 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- ee7aba20c7-694 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- ee7aba20c7-695 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- ee7aba20c7-696 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- ee7aba20c7-697 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- ee7aba20c7-698 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- ee7aba20c7-699 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- ee7aba20c7-700 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- ee7aba20c7-701 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- ee7aba20c7-702 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- ee7aba20c7-703 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- ee7aba20c7-704 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- ee7aba20c7-705 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61
- ee7aba20c7-706 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- ee7aba20c7-707 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169
- ee7aba20c7-708 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70
- ee7aba20c7-709 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- ee7aba20c7-710 - ignored - barrel-imports-not-internal-paths - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:96
- ee7aba20c7-711 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134
- ee7aba20c7-712 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- ee7aba20c7-713 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- ee7aba20c7-714 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- ee7aba20c7-715 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- ee7aba20c7-716 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- ee7aba20c7-717 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- ee7aba20c7-718 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- ee7aba20c7-719 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- ee7aba20c7-720 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- ee7aba20c7-721 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- ee7aba20c7-722 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/storybook-testing/src/test/startup.test.ts:73
- ee7aba20c7-723 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- ee7aba20c7-724 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- ee7aba20c7-725 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- ee7aba20c7-726 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- ee7aba20c7-727 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- ee7aba20c7-728 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24
- ee7aba20c7-729 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- ee7aba20c7-730 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- ee7aba20c7-731 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- ee7aba20c7-732 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:51
- ee7aba20c7-733 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:252
- ee7aba20c7-734 - ignored - no-casts - packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76
- ee7aba20c7-735 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47
- ee7aba20c7-736 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- ee7aba20c7-737 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- ee7aba20c7-738 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- ee7aba20c7-739 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- ee7aba20c7-740 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162

## Issues

# WARN ee7aba20c7-1 barrel-imports-not-internal-paths `packages/apps/composer-app/src/pages/devtools.tsx:13`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 13-16 (`import * as DevtoolsPlugin from '@dxos/plugin-devtools/DevtoolsPlugin';`, location confidence 0.99). Judged with added `imports, public-api` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-2 moon-yml-entrypoint-registration `packages/common/effect/package.json:85`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 85-96 (`"import": "./dist/lib/ns/KvsStore.mjs"`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-3 import-as-namespace-is-all-or-nothing `packages/common/effect/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`export * as AtomEx from './AtomEx.ts';`, location confidence 0.57). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-4 import-as-namespace-is-all-or-nothing `packages/common/effect/src/internal/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-11 (`export * as GlobalValue from './GlobalValue.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-5 import-as-namespace-is-all-or-nothing `packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`export const useThing = () => 1;`, location confidence 1.00). Judged with added `public-api` context after a first pass of 0.69. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-6 namespace-export-with-internal-hiding `packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-10 (`export * as Alpha from './Alpha.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-7 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:467`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 467-514 (`try {`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-8 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-9 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-10 structured-logging-not-console `packages/core/compute/agent-claude/src/Demo.test.ts:42`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 42-53 (`for (const message of collected) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-11 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.87. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-12 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-13 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-14 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 203-210 (`return result.error ?? Schema.decodeUnknownSync(Schema.String)(JSON.parse(Str...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-15 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 148-154 (`),`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-16 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.90. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-17 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:54`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 54-69 (`const connect = (port: MessagePort) =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-18 no-casts `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 237-245 (`const readBody = async (init?: RequestInit): Promise<any> => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-19 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-20 error-messages-carry-context `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 957-965 (`const error = (patch?: string) =>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-21 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 293-304 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-22 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-23 errors-extend-base-error `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 119-125 (`export class SeedError extends Data.TaggedError('SeedError')<{ message: strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-24 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 126-137 (`export const seed = ({`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-25 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-26 moon-yml-entrypoint-registration `packages/core/compute/assistant-toolkit/package.json:37`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 37-48 (`"source": "./src/AgentOperationHandlerSet.ts",`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-27 namespace-export-with-internal-hiding `packages/core/compute/assistant-toolkit/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-11 (`export * from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-28 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as AlarmSkill from './AlarmSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-29 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/planning/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as PlanningSkill from './PlanningSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-30 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 224-235 (`);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-31 test-asserts-real-behavior `packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 23-34 (`describe('WebSearchSkill', () => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-32 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 140-151 (`const addChecklist = (chat: Chat.Chat) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-33 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-34 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:113`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 113-124 (`export const formatUserPrompt = ({`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-35 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-36 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-37 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-38 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-39 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-40 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-41 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 79-90 (`),`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-42 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-43 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-44 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:405`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 405-428 (`}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-45 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 429-452 (`const manager = yield* ProcessManager.Service;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-46 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1462-1485 (`);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-47 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:474`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 474-497 (`if (!handle) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-48 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-49 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:195`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.80. The likeliest place is lines 195-206 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-50 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:351`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 351-362 (`};`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-51 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:363`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 363-374 (`};`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-52 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 390-401 (`export const layer: Layer.Layer<`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-53 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-54 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.80. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-55 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-56 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-57 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-58 no-casts `packages/core/compute/compute-runtime/src/services/service-registry.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-63 (`A,`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-59 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-60 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 381-404 (`#triggerQuery: QueryResult.QueryResult<Trigger.Trigger> | undefined;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-61 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1111-1122 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-62 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

System One judges this a likely violation of `namespace-service-layers` (Layer constructors are module-level exports, never class statics), p=0.88. The likeliest place is lines 40-51 (`static layerKv = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-63 no-casts `packages/core/compute/compute/src/Operation.ts:235`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 235-258 (`services: props.services ?? [],`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-64 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1044`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 1044-1067 (`export interface OperationService {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-65 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-66 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-67 no-casts `packages/core/compute/compute/src/ServiceResolver.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 85-96 (`export const succeed = <I, S>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-68 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.test.ts:68`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 68-79 (`const resolve = ({ registry = [], space = [] }: { registry?: Skill.Skill[]; s...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-69 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-70 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-71 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-72 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:20`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 20-32 (`const make = (getEdgeClient: () => EdgeClient, spaceId?: SpaceId): RemoteOper...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-73 no-casts `packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 136-147 (`const versionMeta = safeParseJson<any>(latest.versionMetaJSON);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-74 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-83 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-75 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-76 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-77 flat-layer-composition `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:102`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 102-113 (`const resolverLayer = () =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-78 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-79 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-80 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-81 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-82 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-83 test-asserts-real-behavior `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-84 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-85 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-28 (`const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRun...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-86 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/invoker.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 63-75 (`const computeHandler = Operation.withHandler(Compute, (data) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-87 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 112-123 (`},`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-88 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-89 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-90 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-91 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-92 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-93 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-94 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-95 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-96 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-97 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 116-127 (`export const makeExtractionStage = (): Stage<ExtractionInput> => ({`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-98 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:107`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 107-118 (`test('per-stage sliding overflow coalesces stale input while a slow run is in...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-99 namespace-brand-key-prefixing `packages/core/compute/pipeline/src/Stage.test.ts:14`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 14-25 (`describe('Stage.map', () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-100 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-101 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-102 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.85. The likeliest place is lines 75-86 (`bench(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-103 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-104 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.89. The likeliest place is lines 154-164 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-105 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-106 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-107 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-108 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:266`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 266-277 (`});`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-109 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-110 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-111 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-112 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-113 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-114 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-115 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-116 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:860`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 860-883 (`await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress, abort....`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-117 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-118 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-119 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-120 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.85. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-121 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-122 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-123 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 93-104 (`});`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-124 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-125 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-126 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-127 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-128 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-129 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-130 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-131 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-132 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-133 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-134 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-135 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.87. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-136 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-137 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 884-907 (`break;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-138 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 46-57 (`export const createTestSqliteStorageAdapter = async (`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-139 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-140 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-141 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-142 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-143 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.90. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-144 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-145 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-146 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:688`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 688-706 (`Object.entries(predicate).map(([key, value]) => [key, processPredicate(value)]),`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-147 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-148 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-149 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-150 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-151 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-152 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-153 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-154 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-155 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-156 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-157 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-158 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-159 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-160 namespace-brand-key-prefixing `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:134`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 134-162 (`const ECHO_JSON_SCHEMA_KEYS = new Set([`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-161 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-162 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-163 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-164 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-165 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-166 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-167 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-168 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-169 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-170 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-171 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-172 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-173 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-174 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-175 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-176 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-177 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-178 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-179 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-180 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-181 test-asserts-real-behavior `packages/devtools/cli-util/src/util/form-builder.test.ts:49`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 49-60 (`yield* Console.log(print(doc));`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-182 no-casts `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-183 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.86. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-184 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-185 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-186 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 59-70 (`try {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-187 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 129-140 (`let response: any;`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-188 no-casts `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 118-129 (`condition: () => this._client!.spaces.get(response.spaceId as SpaceId),`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-189 error-messages-carry-context `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 130-141 (`if (buildResult.error || !buildResult.bundle) {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-190 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-191 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/create-object.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 37-48 (`{ name: props?.name },`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-192 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:72`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 72-98 (`type ChatRootProps = PropsWithChildren<`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-193 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 123-146 (`const feedMessages = useQuery(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-194 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 405-426 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-195 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-196 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-197 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 73-84 (`const meta = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-198 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-53 (`const styles = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-199 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-200 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 22-25 (`const DefaultStory = (props: ToolboxProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-201 no-casts `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 26-37 (`const meta = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-202 no-casts `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`const factory = createObjectFactory(space.db, random as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-203 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 49-60 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-204 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 50-61 (`}, [manager]);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-205 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:122`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.82. The likeliest place is lines 122-133 (`<Button`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-206 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-207 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-208 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 65-76 (`{roles.map((role) => (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-209 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 57-68 (`});`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-210 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-211 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 284-295 (`<Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick={han...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-212 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 73-84 (`.action(`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-213 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-214 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-215 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-216 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-217 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-218 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-219 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-220 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 261-272 (`<Banner.Root valence='warning'>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-221 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:182`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 182-193 (`useEffect(() => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-222 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.88. The likeliest place is lines 118-129 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-223 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 202-213 (`<Panel.Header>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-224 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/operations/sync.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 48-59 (`const syncBinding = ({ binding }: { binding: Cursor.ExternalCursor }) =>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-225 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 217-228 (`const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: ...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-226 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 87-98 (`.map((obj) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-227 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 171-182 (`iconOnly`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-228 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-229 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-230 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-231 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-232 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 83-92 (`);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-233 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 44-55 (`export const mailboxFacts: ProjectCapabilities.Template = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-234 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-235 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 63-74 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-236 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 75-86 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-237 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:111`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 111-122 (`<div>{participants}</div>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-238 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 30-41 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-239 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 93-104 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-240 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 42-53 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-241 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:84`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 84-95 (`</Panel.Header>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-242 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-243 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 94-105 (`)}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-244 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-245 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-246 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 58-69 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-247 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-248 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-249 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 94-105 (`}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-250 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 89-100 (`onValueChange={({ value: [value] }) =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-251 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 31-42 (`return;`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-252 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-253 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/schema-defs.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 39-50 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-254 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 22-33 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-255 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-256 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 53-64 (`const meta: Meta<typeof DefaultStory> = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-257 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 77-88 (`return (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-258 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 128-139 (`AiService.AiService,`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-259 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 494-517 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-260 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-261 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-262 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-263 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 166-182 (`const openCreateSyncRoutineDialog = (`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-264 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-265 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-266 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-267 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:90`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.85. The likeliest place is lines 90-101 (`[subject],`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-268 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 96-107 (`data: () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-269 namespace-export-with-internal-hiding `packages/plugins/plugin-crm/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as CrmPlugin from './CrmPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-270 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-271 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm-project.ts:59`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 59-70 (`export const crmProject: ProjectCapabilities.Template = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-272 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 25-36 (`export const crm: RoutineCapabilities.Template = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-273 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:78`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 78-89 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-274 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-275 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:807`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 807-823 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-276 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 71-82 (`iconOnly`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-277 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-278 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-279 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-280 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 66-77 (`});`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-281 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 78-89 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-282 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-283 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 55-66 (`export const SpaceGenerator = composable<HTMLDivElement, SpaceGeneratorProps>(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-284 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 103-114 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-285 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:187`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 187-198 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-286 namespace-export-with-internal-hiding `packages/plugins/plugin-debug/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as DebugPlugin from './DebugPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-287 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.81. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-288 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 27-41 (`const DefaultStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-289 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-290 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-291 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-292 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 135-146 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-293 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-294 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 29-40 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-295 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 161-179 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-296 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-297 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 136-147 (`classNames={[`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-298 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 87-98 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-299 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:177`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 177-188 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-300 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:67`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 67-78 (`export const useAncestorBreadcrumbs = (id: string | undefined): Breadcrumb[] ...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-301 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-302 no-sleep-in-test `packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 39-46 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sub...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-303 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-304 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 42-54 (`applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-305 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:113`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 113-118 (`});`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-306 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-307 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 32-43 (`const sampleProfiler = useCallback(() => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-308 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/connector.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 58-69 (`const validateToken = (token: string) =>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-309 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/DiscordSource.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`export { discordSourceLayer as layer } from './services/discord-source.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-310 namespace-brand-key-prefixing `packages/plugins/plugin-discord/src/errors.ts:16`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 16-21 (`type DfxErrorResponseShape = {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-311 flat-layer-composition `packages/plugins/plugin-discord/src/operations/sync.ts:217`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 217-228 (`yield* Feed.append(feed, mapped).pipe(Effect.provideService(Database.Origin, ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-312 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-313 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-314 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-315 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-316 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-317 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 108-119 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-318 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 26-29 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-319 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-320 no-casts `packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 29-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-321 no-casts `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 23-26 (`const generator = random as any as ValueGenerator;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-322 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 39-50 (`let cancelled = false;`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-323 no-styling-wrapper-divs `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 75-86 (`<div className='relative flex dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-324 no-casts `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-32 (`const generator = random as any as ValueGenerator;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-325 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 94-105 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-326 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-327 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-328 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Input readOnly value={reference} classNames='grow' />`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-329 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:147`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 147-158 (`const bytes = yield* Blob.read(blob);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-330 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-331 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-332 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync.test.ts:94`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 94-105 (`throw new Error('expected external-sync cursor');`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-333 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`value={url}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-334 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/walkthrough/generate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 82-93 (`export const generateWalkthrough = <R = never>({`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-335 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-336 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-337 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 39-50 (`try {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-338 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-339 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 210-233 (`expect(afterRerun.length).toBe(feedMessages.length);`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-340 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-341 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-342 subscribe-where-you-read `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:30`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 30-41 (`export const PortfolioReportDetail = ({ role, subject, companionTo }: Portfol...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-343 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 66-77 (`disabled={syncingLots}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-344 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-345 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`.map((message) => [message.sender?.email?.toLowerCase(), message.sender] as c...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-346 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 102-113 (`const CompanionStory = () => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-347 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 126-134 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-348 no-casts `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 53-64 (`const { defaultSpace } = yield* initializeIdentity(client);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-349 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 188-199 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-350 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-351 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 154-177 (`const filterTagUris = useMemo(() => getFilterTagUris(debouncedFilter), [debou...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-352 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-353 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 27-38 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-354 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 180-191 (`onCheckedChange={() => toggleAll()}`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-355 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-356 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-357 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-358 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.77). Judged with added `test` context after a first pass of 0.56. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-359 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-360 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-361 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/templates/analyze-mailbox.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 33-44 (`export const analyzeMailbox: RoutineCapabilities.Template = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-362 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-363 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-364 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-365 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-366 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.86. The likeliest place is lines 71-82 (`))}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-367 namespace-export-with-internal-hiding `packages/plugins/plugin-jmap/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-8 (`export * as JmapPlugin from './JmapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-368 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 32-43 (`Layer.provide(JmapMailApi.Live),`, location confidence 0.47). Judged with added `imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-369 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 60-71 (`export const jmapMailSyncProvider = (): Layer.Layer<MailSync.MailSyncProvider...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-370 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-371 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.86. The likeliest place is lines 88-99 (`const DefaultComponent = () => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-372 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 124-135 (`return null;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-373 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 47-58 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-374 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 137-148 (`if (target == null) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-375 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`const settingsSchema = (isView ? KanbanSchema.KanbanViewSettingsSchema : Kanb...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-376 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-377 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 37-48 (`<Button`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-378 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 109-120 (`() =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-379 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 106-117 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-380 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 106-117 (`}`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-381 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-linear/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-382 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-linear/src/operations/sync.test.ts:48`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 48-59 (`describe('plugin-linear sync', () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-383 inline-obj-parent `packages/plugins/plugin-linear/src/operations/sync.ts:248`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 248-263 (`taskSet.milestones.push(Ref.make(milestone));`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-384 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 109-122 (`/>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-385 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 52-63 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-386 no-casts `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 43-54 (`const seedSpace =`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-387 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-388 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 84-95 (`});`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-389 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 128-142 (`const loadValidFeeds = (magazine: Magazine.Magazine) =>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-390 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 28-39 (`export const magazineCuration: RoutineCapabilities.Template = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-391 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-392 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-393 namespace-export-with-internal-hiding `packages/plugins/plugin-map/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as MapPlugin from './MapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-394 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 186-194 (`const useTest = (view: EditorView | null) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-395 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 117-128 (`const [missing, setMissing] = useState(false);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-396 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 333-344 (`if (mode === 'section') {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-397 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-398 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-399 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-100 (`{subjects.map((subject) => (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-400 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-401 test-asserts-real-behavior `packages/plugins/plugin-markdown/src/plugin.test.ts:15`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 15-26 (`describe('MarkdownPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-402 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-403 options-object-with-defaults `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:25`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.80. The likeliest place is lines 25-36 (`type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-404 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 58-69 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-405 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 70-81 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-406 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 118-129 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-407 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 130-141 (`<div className='grid grid-cols-2 gap-2 dx-grow'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-408 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-409 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-410 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-411 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 83-94 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-412 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-413 structured-logging-not-console `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 27-38 (`const menuActions = random.helpers.multiple(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-414 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 25-36 (`export const NavTreeItemActionDropdownMenu = composable<HTMLButtonElement, Na...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-415 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:220`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 220-231 (`if (source.data.type === self.data.type) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-416 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 371-382 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-417 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 25-35 (`const ITEM_END_SIZE = '1.25rem';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-418 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 194-205 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-419 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 38-49 (`const current = getHotkeyScope() ?? '';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-420 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 312-323 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-421 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 128-139 (`id: 'appGraphBuilder',`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-422 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 53-64 (`const waitFor = (count: number, current: () => number) =>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-423 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-424 no-casts `packages/plugins/plugin-observability/src/plugin.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-25 (`describe('ObservabilityPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-425 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-426 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.61). Judged with added `diff, imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-427 inline-obj-parent `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 65-74 (`objects: seed.objects.map((object) => Ref.make(object)),`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-428 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 101-112 (`export const Projects: SampleSpace.Phase<ProjectsResult, ProjectsInput> = Sam...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-429 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 43-54 (`} else {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-430 no-styling-wrapper-divs `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-431 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-432 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 123-134 (`title: random.lorem.sentence(),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-433 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 118-129 (`name: 'Messages',`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-434 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.88. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-435 no-casts `packages/plugins/plugin-presenter/src/useExitPresenter.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 16-24 (`export const useExitPresenter = (object: any) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-436 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-437 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-438 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-439 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-440 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-441 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.85. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-442 no-casts `packages/plugins/plugin-preview/src/stories/Card.stories.tsx:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 101-107 (`export const _FormTableEmpty: StoryObj<typeof DefaultStory<any>> = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-443 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`{roles.map((role, i) => (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-444 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 37-48 (`const terminateLocal = (pid: string) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-445 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-446 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-447 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 458-475 (`if (!chat) {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-448 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 124-135 (`useEffect(() => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-449 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 109-120 (`{`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-450 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 104-115 (`const seed = () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-451 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 69-80 (`expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox....`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-452 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/templates/inbox-research.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 55-66 (`export const inboxResearch: ProjectCapabilities.Template = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-453 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-454 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-455 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 129-140 (`) : (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-456 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 375-378 (`const SectionBody = ({ classNames, children }: ThemedClassName<PropsWithChild...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-457 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-458 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 130-141 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-459 no-casts `packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 41-48 (`const { plugins } = await harness.runPromise(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-460 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 46-57 (`standalone`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-461 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 99-110 (`</div>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-462 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 54-65 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-463 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 448-459 (`const filteredAnchors = showResolvedThreads`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-464 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 222-233 (`<Button icon='ph--trash--regular' label={t('discard-branch.label')} onClick={...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-465 no-casts `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 296-320 (`for (const { creator, content } of context.args.suggestions ?? []) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-466 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-467 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-468 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-469 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-470 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 290-300 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-471 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 40-46 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-472 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-473 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 162-175 (`}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-474 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-s3/src/capabilities/connector.ts:95`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 95-106 (`onValidate: ({ values }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-475 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.93. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-476 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-477 extract-non-rendering-logic-from-component `packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 74-85 (`useEffect(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-478 namespace-export-with-internal-hiding `packages/plugins/plugin-sandbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as SandboxPlugin from './SandboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-479 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-480 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 76-87 (`</Dialog.Header>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-481 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-482 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-483 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-484 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-485 no-styling-wrapper-divs `packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-69 (`if (!script || !sourceReady) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-486 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 36-47 (`if (!token || !gistId) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-487 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-488 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-489 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-490 no-casts `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 54-65 (`onClientInitialized: ({ client }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-491 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 58-69 (`onClientInitialized: ({ client }) =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-492 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-493 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.83. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-494 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 82-93 (`export const getStringProperty = (object: any, keys: string[]): string | unde...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-495 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-search/src/index.ts:1`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 1-11 (`export * as SearchPlugin from './SearchPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-496 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-497 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-498 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 299-310 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-499 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 467-478 (`<div`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-500 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 23-34 (`export const Basic = () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-501 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 267-278 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-502 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 84-95 (`export const Spec = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-503 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-504 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 81-92 (`});`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-505 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-506 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/operations/sync.ts:173`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 173-184 (`const resolveUsers = (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-507 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-508 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-509 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-handler/navigation-handler.ts:51`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 51-62 (`const hasLocalIdentity = Effect.gen(function* () {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-510 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-511 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-512 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-513 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 112-123 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-514 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 100-111 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-515 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-516 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-517 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:259`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 259-270 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-518 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-519 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-520 no-casts `packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 95-106 (`StorybookPlugin.make({}),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-521 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 48-59 (`}, [schemas]);`, location confidence 0.71). Judged with added `siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-522 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 242-253 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-523 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-524 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 58-68 (`}, [updateState]);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-525 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:199`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 199-210 (`const rail = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-526 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 180-191 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-527 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 225-233 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-528 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 47-58 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-529 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 54-65 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-530 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 72-83 (`(id: string) =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-531 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 108-119 (`return;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-532 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-533 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:68`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 68-79 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-534 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 80-86 (`<div className='grid overflow-hidden border-s border-separator'>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-535 inline-obj-parent `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 99-110 (`yield* initializeIdentity(client);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-536 namespace-export-with-internal-hiding `packages/plugins/plugin-studio/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as StudioPlugin from './StudioPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-537 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-538 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-539 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:95`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 95-106 (`const operationService = (): Operation.OperationService => ({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-540 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 109-120 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-541 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 145-156 (`<div className='flex items-start'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-542 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-36 (`const makeObservability = (): Observability.Observability =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-543 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 64-75 (`Obj.update(subject, (subject) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-544 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 77-88 (`const registrars = manager`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-545 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 89-100 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-546 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 31-45 (`data-testid='supportPlugin.startTour'`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-547 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-16 (`const observabilityWith = (support: Observability.Observability['support']): ...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-548 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 165-176 (`return {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-549 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 18-29 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-550 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-551 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-552 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 73-82 (`disabled={!canSave}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-553 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-554 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 139-150 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-555 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-556 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 137-152 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-557 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 87-98 (`if (text.length === 0) {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-558 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-559 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-560 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 232-243 (`useEffect(() => {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-561 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-562 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.82. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-563 namespace-export-with-internal-hiding `packages/plugins/plugin-tldraw/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as TldrawModel from '#model';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-564 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 116-127 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-565 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-566 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-567 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-568 no-casts `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-569 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-570 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trello/src/capabilities/connector.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 31-42 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-571 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-572 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-573 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-574 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-575 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-576 no-casts `packages/plugins/plugin-trello/src/operations/sync.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 191-202 (`newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-577 no-casts `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`const extension = yield* AppGraphBuilder.createExtension({`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-578 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 102-113 (`const planTripExtension = yield* AppGraphBuilder.createExtension({`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-579 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-580 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-581 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 264-275 (`<div`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-582 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-583 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 54-65 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-584 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 28-39 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-585 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-586 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-587 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-588 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/common/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-8 (`export * as Capabilities from './capabilities.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-589 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-590 no-casts `packages/sdk/app-framework/src/core/capability.ts:403`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 403-422 (`[ContributionTypeId]: capability as unknown as IdentifierOf<C>,`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-591 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:490`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 490-515 (`export interface Module<Options = void> {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-592 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin-manifest.ts:115`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 115-126 (`export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedMan...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-593 no-casts `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-594 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-595 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:626`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 626-651 (`export const resolveLazy = (plugin: Plugin): Effect.Effect<Plugin, LazyPlugin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-596 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-597 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-598 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-599 bounded-live-state `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:78`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 78-89 (`output: event.output,`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-600 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 114-125 (`}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-601 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.83. The likeliest place is lines 229-240 (`runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-602 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 253-264 (`const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.ru...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-603 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-604 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-605 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-606 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-607 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-608 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 354-365 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-609 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 82-91 (`export const useOptionalAtomCapability = <T>(atomCapability: Capability.Inter...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-610 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-611 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.88. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-612 comment-hygiene `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:88`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 88-99 (`const REQUIRE_SHIM_BANNER = [`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-613 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 893-917 (`release();`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-614 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-615 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-616 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-617 namespace-export-with-internal-hiding `packages/sdk/app-solid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-8 (`export * from './common.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-618 no-casts `packages/sdk/app-solid/src/useCapabilities.test.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 19-24 (`const mockManager = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-619 no-casts `packages/sdk/app-solid/src/usePluginManager.test.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-24 (`describe('usePluginManager', () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-620 no-casts `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 22-28 (`const statusMessage = (data: Trace.PayloadType<typeof Trace.StatusUpdate>, me...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-621 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-622 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 206-217 (`}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-623 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-624 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/types/ConnectorSync.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`//`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-625 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-626 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-627 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-16 (`export * from './SettingsScope.tsx';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-628 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:396`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 396-419 (`});`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-629 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-630 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-631 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-632 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-633 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-634 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-635 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-636 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-637 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-638 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-639 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.83. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-640 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/spaces.ts:73`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 73-85 (`unsubscribe = dataSpaceManager.updated.on(() => update());`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-641 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-642 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-643 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-644 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-645 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-646 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-647 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.80. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-648 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 93-104 (`update();`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-649 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-650 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-651 no-casts `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 137-148 (`log.error('failed to load metadata from SQLite', { err });`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-652 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-653 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-654 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 148-159 (`yield* Hook.on(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-655 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-656 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-657 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 488-499 (`});`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-658 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-659 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-660 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-661 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 429-452 (`}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-662 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-663 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:107`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 107-118 (`await setNetworkIdentity({ identity });`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-664 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-665 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-666 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-667 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/space/space-manager.ts:97`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 97-108 (`async close(): Promise<void> {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-668 no-casts `packages/sdk/client-services/src/internal/space/space-manager.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 181-193 (`public findSpaceByRootDocumentId(documentId: string): Space | undefined {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-669 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-670 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.88. The likeliest place is lines 188-199 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-671 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-672 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-673 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-674 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-675 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-676 flat-layer-composition `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:195`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 195-206 (`const stackContext = yield* Layer.build(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-677 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-678 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-679 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-680 no-casts `packages/sdk/client/src/services/local-client-services.ts:235`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 235-246 (`this.signalMetadataTags.origin = 'undefined';`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-681 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/testing/test-worker-factory.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-81 (`createSession: ({ isOwner }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-682 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-683 effect-fn-not-hand-wrapped-gen `packages/sdk/observability/src/ai/AiObservability.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 372-383 (`const setupWired = ({`, location confidence 0.88). Judged with added `test` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-684 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-685 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-686 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-687 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-688 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-689 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-690 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-691 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-692 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 274-285 (`const mutableParent = parent as Obj.Mutable<JsonSchema.JsonSchema>;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-693 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-694 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-695 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-696 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-697 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-698 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-699 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-700 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-701 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-702 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-703 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-704 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-705 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 61-73 (`const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-706 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-707 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 169-176 (`}`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-708 no-casts `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-709 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 79-85 (`}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-710 barrel-imports-not-internal-paths `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:96`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 96-107 (`const decorators = createDecorators<StoryArgs>(({ args }) => ({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-711 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 134-145 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-712 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-713 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 116-127 (`{`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-714 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.90. The likeliest place is lines 200-207 (`}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-715 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-716 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-717 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-718 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-719 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-720 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-721 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.83. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-722 effect-fn-not-hand-wrapped-gen `packages/stories/storybook-testing/src/test/startup.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 73-84 (`const clientPlugin = ClientPlugin.make({`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-723 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-724 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-725 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-726 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-727 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-728 no-casts `packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`for (const id of Array.from(selected.values())) {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-729 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-730 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-731 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-732 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 51-57 (`const projectorTypes: Record<ProjectorType, Factory> = {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-733 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:252`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 252-263 (`{debug && (`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-734 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 76-84 (`setContext: (context: any) => void;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-735 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`useEffect(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-736 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-737 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-738 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ee7aba20c7-739 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ee7aba20c7-740 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 162-188 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `128be93325129950e3c27b24559fd56349bd204c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 740 violations written to fragments, 8023 uncertain, 65469 clean, 0 unanswered
- left for an agentic reviewer: 584 batch(es)

```text
requests: 29653 (5845 verdicts re-asked with context the model requested)
estimated input tokens: 185690508
billed input tokens: 173000762 (cost $7.2660)
measured chars per token: 3.22
```

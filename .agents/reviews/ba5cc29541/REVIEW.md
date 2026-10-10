---
branch: HEAD
commit: ba5cc29541ef2b6e8ad9d227c6b2ee624ad1b72d
base: 128be93325129950e3c27b24559fd56349bd204c
mode: fast
createdAt: 2026-10-05T00:07:07.478Z
isFinalized: true
groups: 5895
rules: [barrel-imports-not-internal-paths, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, isolate-benchmark-setup-and-flaky-tests, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, options-object-with-defaults, reactive-state-via-atom-bridge, reuse-shared-test-layer, schema-declare-and-brand, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: ba5cc29541
---

_241 error(s), 522 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ba5cc29541-1 - ignored - barrel-imports-not-internal-paths - packages/apps/composer-app/src/pages/devtools.tsx:13
- ba5cc29541-2 - ignored - error-messages-carry-context - packages/apps/composer-crx/src/core/image/image.ts:60
- ba5cc29541-3 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/index.ts:1
- ba5cc29541-4 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/internal/index.ts:1
- ba5cc29541-5 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/KvsStore.ts:1
- ba5cc29541-6 - ignored - import-as-namespace-is-all-or-nothing - packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1
- ba5cc29541-7 - ignored - namespace-export-with-internal-hiding - packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1
- ba5cc29541-8 - ignored - moon-yml-entrypoint-registration - packages/common/graph/package.json:49
- ba5cc29541-9 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:1
- ba5cc29541-10 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- ba5cc29541-11 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- ba5cc29541-12 - ignored - structured-logging-not-console - packages/core/compute/agent-claude/src/Demo.test.ts:42
- ba5cc29541-13 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- ba5cc29541-14 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- ba5cc29541-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- ba5cc29541-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:167
- ba5cc29541-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- ba5cc29541-18 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- ba5cc29541-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:54
- ba5cc29541-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/queue-scripted.test.ts:98
- ba5cc29541-21 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237
- ba5cc29541-22 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- ba5cc29541-23 - ignored - error-messages-carry-context - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957
- ba5cc29541-24 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- ba5cc29541-25 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- ba5cc29541-26 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119
- ba5cc29541-27 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126
- ba5cc29541-28 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- ba5cc29541-29 - ignored - namespace-export-with-internal-hiding - packages/core/compute/assistant-toolkit/src/index.ts:1
- ba5cc29541-30 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1
- ba5cc29541-31 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/automation/index.ts:1
- ba5cc29541-32 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/planning/index.ts:1
- ba5cc29541-33 - ignored - test-asserts-real-behavior - packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23
- ba5cc29541-34 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140
- ba5cc29541-35 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- ba5cc29541-36 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:113
- ba5cc29541-37 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- ba5cc29541-38 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- ba5cc29541-39 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- ba5cc29541-40 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:77
- ba5cc29541-41 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- ba5cc29541-42 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- ba5cc29541-43 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- ba5cc29541-44 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79
- ba5cc29541-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- ba5cc29541-46 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- ba5cc29541-47 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:405
- ba5cc29541-48 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429
- ba5cc29541-49 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462
- ba5cc29541-50 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- ba5cc29541-51 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:195
- ba5cc29541-52 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:351
- ba5cc29541-53 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:363
- ba5cc29541-54 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390
- ba5cc29541-55 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- ba5cc29541-56 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:13
- ba5cc29541-57 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- ba5cc29541-58 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- ba5cc29541-59 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- ba5cc29541-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- ba5cc29541-61 - ignored - no-casts - packages/core/compute/compute-runtime/src/services/service-registry.ts:54
- ba5cc29541-62 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- ba5cc29541-63 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142
- ba5cc29541-64 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381
- ba5cc29541-65 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111
- ba5cc29541-66 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- ba5cc29541-67 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:235
- ba5cc29541-68 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1044
- ba5cc29541-69 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- ba5cc29541-70 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- ba5cc29541-71 - ignored - no-casts - packages/core/compute/compute/src/ServiceResolver.ts:85
- ba5cc29541-72 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- ba5cc29541-73 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- ba5cc29541-74 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- ba5cc29541-75 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:1
- ba5cc29541-76 - ignored - no-casts - packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136
- ba5cc29541-77 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- ba5cc29541-78 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- ba5cc29541-79 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- ba5cc29541-80 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- ba5cc29541-81 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- ba5cc29541-82 - ignored - error-messages-carry-context - packages/core/compute/functions-runtime-cloudflare/src/internal/service-container.ts:55
- ba5cc29541-83 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/queues-api.ts:22
- ba5cc29541-84 - ignored - options-object-with-defaults - packages/core/compute/functions-runtime-cloudflare/src/queues-api.ts:22
- ba5cc29541-85 - ignored - comment-hygiene - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:24
- ba5cc29541-86 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- ba5cc29541-87 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- ba5cc29541-88 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- ba5cc29541-89 - ignored - test-asserts-real-behavior - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- ba5cc29541-90 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-client/src/McpToolkit.tools.test.ts:60
- ba5cc29541-91 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- ba5cc29541-92 - ignored - no-casts - packages/core/compute/operation/src/invoker.test.ts:23
- ba5cc29541-93 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/invoker.test.ts:63
- ba5cc29541-94 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- ba5cc29541-95 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- ba5cc29541-96 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- ba5cc29541-97 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- ba5cc29541-98 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- ba5cc29541-99 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- ba5cc29541-100 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- ba5cc29541-101 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- ba5cc29541-102 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- ba5cc29541-103 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- ba5cc29541-104 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116
- ba5cc29541-105 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:131
- ba5cc29541-106 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- ba5cc29541-107 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- ba5cc29541-108 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75
- ba5cc29541-109 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- ba5cc29541-110 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- ba5cc29541-111 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- ba5cc29541-112 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- ba5cc29541-113 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- ba5cc29541-114 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- ba5cc29541-115 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- ba5cc29541-116 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- ba5cc29541-117 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- ba5cc29541-118 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- ba5cc29541-119 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- ba5cc29541-120 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:692
- ba5cc29541-121 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:860
- ba5cc29541-122 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- ba5cc29541-123 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- ba5cc29541-124 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- ba5cc29541-125 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- ba5cc29541-126 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- ba5cc29541-127 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- ba5cc29541-128 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- ba5cc29541-129 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- ba5cc29541-130 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- ba5cc29541-131 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- ba5cc29541-132 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- ba5cc29541-133 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- ba5cc29541-134 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- ba5cc29541-135 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- ba5cc29541-136 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- ba5cc29541-137 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/db-host/query-service.ts:311
- ba5cc29541-138 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- ba5cc29541-139 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- ba5cc29541-140 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- ba5cc29541-141 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- ba5cc29541-142 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- ba5cc29541-143 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- ba5cc29541-144 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- ba5cc29541-145 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- ba5cc29541-146 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- ba5cc29541-147 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- ba5cc29541-148 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- ba5cc29541-149 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- ba5cc29541-150 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- ba5cc29541-151 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- ba5cc29541-152 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- ba5cc29541-153 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- ba5cc29541-154 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:95
- ba5cc29541-155 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- ba5cc29541-156 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- ba5cc29541-157 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- ba5cc29541-158 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- ba5cc29541-159 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- ba5cc29541-160 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- ba5cc29541-161 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- ba5cc29541-162 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- ba5cc29541-163 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- ba5cc29541-164 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- ba5cc29541-165 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- ba5cc29541-166 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- ba5cc29541-167 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- ba5cc29541-168 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- ba5cc29541-169 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- ba5cc29541-170 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- ba5cc29541-171 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- ba5cc29541-172 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- ba5cc29541-173 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- ba5cc29541-174 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- ba5cc29541-175 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- ba5cc29541-176 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- ba5cc29541-177 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- ba5cc29541-178 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- ba5cc29541-179 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- ba5cc29541-180 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/index-tracker.ts:79
- ba5cc29541-181 - ignored - error-messages-carry-context - packages/core/mesh/edge-client/src/edge-http-client.ts:157
- ba5cc29541-182 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:481
- ba5cc29541-183 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- ba5cc29541-184 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- ba5cc29541-185 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- ba5cc29541-186 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- ba5cc29541-187 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- ba5cc29541-188 - ignored - test-asserts-real-behavior - packages/devtools/cli-util/src/util/form-builder.test.ts:49
- ba5cc29541-189 - ignored - no-casts - packages/devtools/cli/src/bin.ts:103
- ba5cc29541-190 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:239
- ba5cc29541-191 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- ba5cc29541-192 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- ba5cc29541-193 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:121
- ba5cc29541-194 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129
- ba5cc29541-195 - ignored - no-casts - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118
- ba5cc29541-196 - ignored - error-messages-carry-context - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130
- ba5cc29541-197 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- ba5cc29541-198 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/create-object.ts:25
- ba5cc29541-199 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405
- ba5cc29541-200 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- ba5cc29541-201 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- ba5cc29541-202 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73
- ba5cc29541-203 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50
- ba5cc29541-204 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- ba5cc29541-205 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92
- ba5cc29541-206 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22
- ba5cc29541-207 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26
- ba5cc29541-208 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82
- ba5cc29541-209 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49
- ba5cc29541-210 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50
- ba5cc29541-211 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- ba5cc29541-212 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- ba5cc29541-213 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65
- ba5cc29541-214 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- ba5cc29541-215 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- ba5cc29541-216 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- ba5cc29541-217 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- ba5cc29541-218 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- ba5cc29541-219 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- ba5cc29541-220 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- ba5cc29541-221 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- ba5cc29541-222 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- ba5cc29541-223 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- ba5cc29541-224 - ignored - reuse-shared-test-layer - packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438
- ba5cc29541-225 - ignored - test-asserts-real-behavior - packages/plugins/plugin-assistant/src/skills/assistant/skill.node.test.ts:29
- ba5cc29541-226 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- ba5cc29541-227 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261
- ba5cc29541-228 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:182
- ba5cc29541-229 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118
- ba5cc29541-230 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202
- ba5cc29541-231 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/operations/sync.ts:48
- ba5cc29541-232 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217
- ba5cc29541-233 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- ba5cc29541-234 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171
- ba5cc29541-235 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- ba5cc29541-236 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- ba5cc29541-237 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- ba5cc29541-238 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- ba5cc29541-239 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- ba5cc29541-240 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- ba5cc29541-241 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44
- ba5cc29541-242 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- ba5cc29541-243 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:63
- ba5cc29541-244 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:75
- ba5cc29541-245 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:111
- ba5cc29541-246 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30
- ba5cc29541-247 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:54
- ba5cc29541-248 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93
- ba5cc29541-249 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42
- ba5cc29541-250 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:84
- ba5cc29541-251 - ignored - test-asserts-real-behavior - packages/plugins/plugin-chess-com/src/plugin.test.ts:17
- ba5cc29541-252 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70
- ba5cc29541-253 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94
- ba5cc29541-254 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- ba5cc29541-255 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- ba5cc29541-256 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58
- ba5cc29541-257 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- ba5cc29541-258 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- ba5cc29541-259 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- ba5cc29541-260 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89
- ba5cc29541-261 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251
- ba5cc29541-262 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:43
- ba5cc29541-263 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- ba5cc29541-264 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/schema-defs.test.ts:39
- ba5cc29541-265 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22
- ba5cc29541-266 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- ba5cc29541-267 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:235
- ba5cc29541-268 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53
- ba5cc29541-269 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77
- ba5cc29541-270 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128
- ba5cc29541-271 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- ba5cc29541-272 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- ba5cc29541-273 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- ba5cc29541-274 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- ba5cc29541-275 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:94
- ba5cc29541-276 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166
- ba5cc29541-277 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- ba5cc29541-278 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62
- ba5cc29541-279 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- ba5cc29541-280 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66
- ba5cc29541-281 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96
- ba5cc29541-282 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-crm/src/index.ts:1
- ba5cc29541-283 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- ba5cc29541-284 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-crm/src/skills/crm/index.ts:1
- ba5cc29541-285 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm-project.ts:59
- ba5cc29541-286 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm.ts:25
- ba5cc29541-287 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:78
- ba5cc29541-288 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- ba5cc29541-289 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:807
- ba5cc29541-290 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71
- ba5cc29541-291 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- ba5cc29541-292 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- ba5cc29541-293 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- ba5cc29541-294 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66
- ba5cc29541-295 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78
- ba5cc29541-296 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- ba5cc29541-297 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:55
- ba5cc29541-298 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:103
- ba5cc29541-299 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:187
- ba5cc29541-300 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-debug/src/index.ts:1
- ba5cc29541-301 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- ba5cc29541-302 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27
- ba5cc29541-303 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- ba5cc29541-304 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- ba5cc29541-305 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- ba5cc29541-306 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- ba5cc29541-307 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- ba5cc29541-308 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29
- ba5cc29541-309 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161
- ba5cc29541-310 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512
- ba5cc29541-311 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- ba5cc29541-312 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136
- ba5cc29541-313 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:87
- ba5cc29541-314 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:177
- ba5cc29541-315 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:67
- ba5cc29541-316 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- ba5cc29541-317 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39
- ba5cc29541-318 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- ba5cc29541-319 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- ba5cc29541-320 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:113
- ba5cc29541-321 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- ba5cc29541-322 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32
- ba5cc29541-323 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/connector.ts:58
- ba5cc29541-324 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-discord/src/errors.ts:16
- ba5cc29541-325 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/operations/sync.ts:217
- ba5cc29541-326 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- ba5cc29541-327 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- ba5cc29541-328 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- ba5cc29541-329 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- ba5cc29541-330 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- ba5cc29541-331 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108
- ba5cc29541-332 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26
- ba5cc29541-333 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- ba5cc29541-334 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29
- ba5cc29541-335 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23
- ba5cc29541-336 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39
- ba5cc29541-337 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75
- ba5cc29541-338 - ignored - no-casts - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27
- ba5cc29541-339 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- ba5cc29541-340 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- ba5cc29541-341 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- ba5cc29541-342 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- ba5cc29541-343 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:147
- ba5cc29541-344 - ignored - no-casts - packages/plugins/plugin-game/src/types/Game.ts:80
- ba5cc29541-345 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/capabilities/connector.ts:29
- ba5cc29541-346 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- ba5cc29541-347 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101
- ba5cc29541-348 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/walkthrough/generate.ts:82
- ba5cc29541-349 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- ba5cc29541-350 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/operations/calendar/list/handler.ts:28
- ba5cc29541-351 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- ba5cc29541-352 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/operations/calendar/sync/sync.ts:85
- ba5cc29541-353 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- ba5cc29541-354 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- ba5cc29541-355 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78
- ba5cc29541-356 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- ba5cc29541-357 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- ba5cc29541-358 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66
- ba5cc29541-359 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- ba5cc29541-360 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-illustrator/src/index.ts:1
- ba5cc29541-361 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74
- ba5cc29541-362 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102
- ba5cc29541-363 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- ba5cc29541-364 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53
- ba5cc29541-365 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188
- ba5cc29541-366 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- ba5cc29541-367 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154
- ba5cc29541-368 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- ba5cc29541-369 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx:39
- ba5cc29541-370 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27
- ba5cc29541-371 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180
- ba5cc29541-372 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-inbox/src/index.ts:1
- ba5cc29541-373 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts:112
- ba5cc29541-374 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- ba5cc29541-375 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- ba5cc29541-376 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- ba5cc29541-377 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- ba5cc29541-378 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- ba5cc29541-379 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- ba5cc29541-380 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/templates/analyze-mailbox.ts:33
- ba5cc29541-381 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- ba5cc29541-382 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- ba5cc29541-383 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- ba5cc29541-384 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59
- ba5cc29541-385 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- ba5cc29541-386 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-jmap/src/index.ts:1
- ba5cc29541-387 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32
- ba5cc29541-388 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60
- ba5cc29541-389 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync.test.ts:223
- ba5cc29541-390 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- ba5cc29541-391 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:86
- ba5cc29541-392 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:122
- ba5cc29541-393 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47
- ba5cc29541-394 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:83
- ba5cc29541-395 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137
- ba5cc29541-396 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87
- ba5cc29541-397 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- ba5cc29541-398 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- ba5cc29541-399 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109
- ba5cc29541-400 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- ba5cc29541-401 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- ba5cc29541-402 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-linear/src/capabilities/connector.ts:29
- ba5cc29541-403 - ignored - inline-obj-parent - packages/plugins/plugin-linear/src/operations/sync.ts:248
- ba5cc29541-404 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- ba5cc29541-405 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52
- ba5cc29541-406 - ignored - no-casts - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:117
- ba5cc29541-407 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- ba5cc29541-408 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84
- ba5cc29541-409 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128
- ba5cc29541-410 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28
- ba5cc29541-411 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- ba5cc29541-412 - ignored - moon-yml-entrypoint-registration - packages/plugins/plugin-map-solid/package.json:49
- ba5cc29541-413 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- ba5cc29541-414 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-map/src/index.ts:1
- ba5cc29541-415 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186
- ba5cc29541-416 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117
- ba5cc29541-417 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333
- ba5cc29541-418 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- ba5cc29541-419 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- ba5cc29541-420 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87
- ba5cc29541-421 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- ba5cc29541-422 - ignored - test-asserts-real-behavior - packages/plugins/plugin-markdown/src/plugin.test.ts:15
- ba5cc29541-423 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- ba5cc29541-424 - ignored - options-object-with-defaults - packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:25
- ba5cc29541-425 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:37
- ba5cc29541-426 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58
- ba5cc29541-427 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70
- ba5cc29541-428 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- ba5cc29541-429 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:130
- ba5cc29541-430 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- ba5cc29541-431 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- ba5cc29541-432 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- ba5cc29541-433 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- ba5cc29541-434 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- ba5cc29541-435 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25
- ba5cc29541-436 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:196
- ba5cc29541-437 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371
- ba5cc29541-438 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25
- ba5cc29541-439 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194
- ba5cc29541-440 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38
- ba5cc29541-441 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312
- ba5cc29541-442 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128
- ba5cc29541-443 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-navtree/src/types/NavTreeNode.ts:1
- ba5cc29541-444 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- ba5cc29541-445 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82
- ba5cc29541-446 - ignored - no-casts - packages/plugins/plugin-observability/src/plugin.test.ts:14
- ba5cc29541-447 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- ba5cc29541-448 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- ba5cc29541-449 - ignored - inline-obj-parent - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65
- ba5cc29541-450 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101
- ba5cc29541-451 - ignored - comment-hygiene - packages/plugins/plugin-onboarding/src/samples/bramble/roast-log.ts:72
- ba5cc29541-452 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43
- ba5cc29541-453 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- ba5cc29541-454 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- ba5cc29541-455 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123
- ba5cc29541-456 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118
- ba5cc29541-457 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:189
- ba5cc29541-458 - ignored - no-casts - packages/plugins/plugin-presenter/src/useExitPresenter.ts:16
- ba5cc29541-459 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- ba5cc29541-460 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- ba5cc29541-461 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- ba5cc29541-462 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- ba5cc29541-463 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- ba5cc29541-464 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:35
- ba5cc29541-465 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37
- ba5cc29541-466 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- ba5cc29541-467 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- ba5cc29541-468 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458
- ba5cc29541-469 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124
- ba5cc29541-470 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-projects/src/index.ts:1
- ba5cc29541-471 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/routine.test.ts:32
- ba5cc29541-472 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104
- ba5cc29541-473 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81
- ba5cc29541-474 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/templates/inbox-research.ts:55
- ba5cc29541-475 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- ba5cc29541-476 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- ba5cc29541-477 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129
- ba5cc29541-478 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:185
- ba5cc29541-479 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- ba5cc29541-480 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- ba5cc29541-481 - ignored - no-casts - packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41
- ba5cc29541-482 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- ba5cc29541-483 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99
- ba5cc29541-484 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54
- ba5cc29541-485 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448
- ba5cc29541-486 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222
- ba5cc29541-487 - ignored - no-casts - packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296
- ba5cc29541-488 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- ba5cc29541-489 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- ba5cc29541-490 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- ba5cc29541-491 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- ba5cc29541-492 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290
- ba5cc29541-493 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40
- ba5cc29541-494 - ignored - comment-hygiene - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:220
- ba5cc29541-495 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- ba5cc29541-496 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- ba5cc29541-497 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-s3/src/capabilities/connector.ts:95
- ba5cc29541-498 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- ba5cc29541-499 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- ba5cc29541-500 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74
- ba5cc29541-501 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-sandbox/src/index.ts:1
- ba5cc29541-502 - ignored - no-sleep-in-test - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226
- ba5cc29541-503 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- ba5cc29541-504 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76
- ba5cc29541-505 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- ba5cc29541-506 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- ba5cc29541-507 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- ba5cc29541-508 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- ba5cc29541-509 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59
- ba5cc29541-510 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36
- ba5cc29541-511 - ignored - no-casts - packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40
- ba5cc29541-512 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-script/src/index.ts:1
- ba5cc29541-513 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- ba5cc29541-514 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- ba5cc29541-515 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54
- ba5cc29541-516 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58
- ba5cc29541-517 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- ba5cc29541-518 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- ba5cc29541-519 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:59
- ba5cc29541-520 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-search/src/index.ts:1
- ba5cc29541-521 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- ba5cc29541-522 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- ba5cc29541-523 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:311
- ba5cc29541-524 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- ba5cc29541-525 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23
- ba5cc29541-526 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267
- ba5cc29541-527 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84
- ba5cc29541-528 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- ba5cc29541-529 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- ba5cc29541-530 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/capabilities/connector.ts:29
- ba5cc29541-531 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/operations/sync.ts:173
- ba5cc29541-532 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- ba5cc29541-533 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- ba5cc29541-534 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- ba5cc29541-535 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- ba5cc29541-536 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- ba5cc29541-537 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112
- ba5cc29541-538 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100
- ba5cc29541-539 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- ba5cc29541-540 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- ba5cc29541-541 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:39
- ba5cc29541-542 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:259
- ba5cc29541-543 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- ba5cc29541-544 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:250
- ba5cc29541-545 - ignored - no-casts - packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95
- ba5cc29541-546 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48
- ba5cc29541-547 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242
- ba5cc29541-548 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- ba5cc29541-549 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58
- ba5cc29541-550 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:199
- ba5cc29541-551 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180
- ba5cc29541-552 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225
- ba5cc29541-553 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- ba5cc29541-554 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54
- ba5cc29541-555 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72
- ba5cc29541-556 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108
- ba5cc29541-557 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- ba5cc29541-558 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:68
- ba5cc29541-559 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80
- ba5cc29541-560 - ignored - inline-obj-parent - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99
- ba5cc29541-561 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-studio/src/index.ts:1
- ba5cc29541-562 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- ba5cc29541-563 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- ba5cc29541-564 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109
- ba5cc29541-565 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145
- ba5cc29541-566 - ignored - no-casts - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23
- ba5cc29541-567 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64
- ba5cc29541-568 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:53
- ba5cc29541-569 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89
- ba5cc29541-570 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31
- ba5cc29541-571 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:13
- ba5cc29541-572 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- ba5cc29541-573 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-table/src/index.ts:1
- ba5cc29541-574 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18
- ba5cc29541-575 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- ba5cc29541-576 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- ba5cc29541-577 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:37
- ba5cc29541-578 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- ba5cc29541-579 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139
- ba5cc29541-580 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- ba5cc29541-581 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- ba5cc29541-582 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-tasks/src/index.ts:1
- ba5cc29541-583 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- ba5cc29541-584 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- ba5cc29541-585 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:244
- ba5cc29541-586 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- ba5cc29541-587 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- ba5cc29541-588 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-thread/src/index.ts:1
- ba5cc29541-589 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116
- ba5cc29541-590 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:56
- ba5cc29541-591 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- ba5cc29541-592 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- ba5cc29541-593 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- ba5cc29541-594 - ignored - no-casts - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- ba5cc29541-595 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- ba5cc29541-596 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trello/src/capabilities/connector.ts:31
- ba5cc29541-597 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- ba5cc29541-598 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- ba5cc29541-599 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- ba5cc29541-600 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trello/src/operations/handlers.test.ts:175
- ba5cc29541-601 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- ba5cc29541-602 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- ba5cc29541-603 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.ts:191
- ba5cc29541-604 - ignored - no-casts - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54
- ba5cc29541-605 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102
- ba5cc29541-606 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- ba5cc29541-607 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- ba5cc29541-608 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- ba5cc29541-609 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- ba5cc29541-610 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54
- ba5cc29541-611 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28
- ba5cc29541-612 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- ba5cc29541-613 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- ba5cc29541-614 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- ba5cc29541-615 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/common/capabilities.ts:305
- ba5cc29541-616 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/common/index.ts:1
- ba5cc29541-617 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- ba5cc29541-618 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:403
- ba5cc29541-619 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:490
- ba5cc29541-620 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin-manifest.ts:115
- ba5cc29541-621 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:474
- ba5cc29541-622 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:626
- ba5cc29541-623 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- ba5cc29541-624 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- ba5cc29541-625 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- ba5cc29541-626 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/plugin-process-manager/index.ts:1
- ba5cc29541-627 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56
- ba5cc29541-628 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205
- ba5cc29541-629 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229
- ba5cc29541-630 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253
- ba5cc29541-631 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- ba5cc29541-632 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- ba5cc29541-633 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- ba5cc29541-634 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- ba5cc29541-635 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- ba5cc29541-636 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354
- ba5cc29541-637 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82
- ba5cc29541-638 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- ba5cc29541-639 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- ba5cc29541-640 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- ba5cc29541-641 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- ba5cc29541-642 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- ba5cc29541-643 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- ba5cc29541-644 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-solid/src/index.ts:1
- ba5cc29541-645 - ignored - no-casts - packages/sdk/app-solid/src/useCapabilities.test.tsx:19
- ba5cc29541-646 - ignored - no-casts - packages/sdk/app-solid/src/usePluginManager.test.tsx:13
- ba5cc29541-647 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22
- ba5cc29541-648 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- ba5cc29541-649 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206
- ba5cc29541-650 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- ba5cc29541-651 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324
- ba5cc29541-652 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- ba5cc29541-653 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/index.ts:13
- ba5cc29541-654 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:396
- ba5cc29541-655 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- ba5cc29541-656 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- ba5cc29541-657 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- ba5cc29541-658 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- ba5cc29541-659 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:88
- ba5cc29541-660 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- ba5cc29541-661 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- ba5cc29541-662 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- ba5cc29541-663 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- ba5cc29541-664 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- ba5cc29541-665 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- ba5cc29541-666 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- ba5cc29541-667 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- ba5cc29541-668 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- ba5cc29541-669 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- ba5cc29541-670 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- ba5cc29541-671 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- ba5cc29541-672 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- ba5cc29541-673 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- ba5cc29541-674 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- ba5cc29541-675 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- ba5cc29541-676 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- ba5cc29541-677 - ignored - no-casts - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137
- ba5cc29541-678 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- ba5cc29541-679 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- ba5cc29541-680 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25
- ba5cc29541-681 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- ba5cc29541-682 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- ba5cc29541-683 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- ba5cc29541-684 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- ba5cc29541-685 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- ba5cc29541-686 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- ba5cc29541-687 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- ba5cc29541-688 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- ba5cc29541-689 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:95
- ba5cc29541-690 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- ba5cc29541-691 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- ba5cc29541-692 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- ba5cc29541-693 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/space/space-manager.ts:97
- ba5cc29541-694 - ignored - no-casts - packages/sdk/client-services/src/internal/space/space-manager.ts:181
- ba5cc29541-695 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- ba5cc29541-696 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- ba5cc29541-697 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- ba5cc29541-698 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- ba5cc29541-699 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- ba5cc29541-700 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- ba5cc29541-701 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- ba5cc29541-702 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- ba5cc29541-703 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- ba5cc29541-704 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- ba5cc29541-705 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:211
- ba5cc29541-706 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/testing/test-worker-factory.ts:70
- ba5cc29541-707 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- ba5cc29541-708 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/observability/src/ai/AiObservability.test.ts:372
- ba5cc29541-709 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- ba5cc29541-710 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- ba5cc29541-711 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- ba5cc29541-712 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- ba5cc29541-713 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- ba5cc29541-714 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- ba5cc29541-715 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- ba5cc29541-716 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- ba5cc29541-717 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:274
- ba5cc29541-718 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- ba5cc29541-719 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- ba5cc29541-720 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- ba5cc29541-721 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- ba5cc29541-722 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- ba5cc29541-723 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- ba5cc29541-724 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- ba5cc29541-725 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- ba5cc29541-726 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- ba5cc29541-727 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- ba5cc29541-728 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- ba5cc29541-729 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- ba5cc29541-730 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- ba5cc29541-731 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169
- ba5cc29541-732 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70
- ba5cc29541-733 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- ba5cc29541-734 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134
- ba5cc29541-735 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- ba5cc29541-736 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- ba5cc29541-737 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- ba5cc29541-738 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- ba5cc29541-739 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- ba5cc29541-740 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- ba5cc29541-741 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- ba5cc29541-742 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- ba5cc29541-743 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- ba5cc29541-744 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/storybook-testing/src/test/startup.test.ts:73
- ba5cc29541-745 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- ba5cc29541-746 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- ba5cc29541-747 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- ba5cc29541-748 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- ba5cc29541-749 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- ba5cc29541-750 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24
- ba5cc29541-751 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- ba5cc29541-752 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- ba5cc29541-753 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- ba5cc29541-754 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:120
- ba5cc29541-755 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216
- ba5cc29541-756 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317
- ba5cc29541-757 - ignored - no-casts - packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76
- ba5cc29541-758 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47
- ba5cc29541-759 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- ba5cc29541-760 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- ba5cc29541-761 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- ba5cc29541-762 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- ba5cc29541-763 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162

## Issues

# WARN ba5cc29541-1 barrel-imports-not-internal-paths `packages/apps/composer-app/src/pages/devtools.tsx:13`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.83. The likeliest place is lines 13-16 (`import * as DevtoolsPlugin from '@dxos/plugin-devtools/DevtoolsPlugin';`, location confidence 0.99). Judged with added `imports, public-api` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-2 error-messages-carry-context `packages/apps/composer-crx/src/core/image/image.ts:60`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 60-71 (`const contentType =`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-3 import-as-namespace-is-all-or-nothing `packages/common/effect/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`export * as AtomEx from './AtomEx.ts';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-4 import-as-namespace-is-all-or-nothing `packages/common/effect/src/internal/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-7 (`export * as GlobalValue from './GlobalValue.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-5 import-as-namespace-is-all-or-nothing `packages/common/effect/src/KvsStore.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-8 (`export { createKvsStore as make } from './atom-kvs.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-6 import-as-namespace-is-all-or-nothing `packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-8 (`export const useThing = () => 1;`, location confidence 1.00). Judged with added `public-api` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-7 namespace-export-with-internal-hiding `packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as Alpha from './Alpha.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-8 moon-yml-entrypoint-registration `packages/common/graph/package.json:49`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.82. The likeliest place is lines 49-60 (`"types": "./dist/types/src/Retention.d.ts",`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-9 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:1`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 1-38 (`import * as Duration from 'effect/Duration';`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-10 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-11 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-12 structured-logging-not-console `packages/core/compute/agent-claude/src/Demo.test.ts:42`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 42-53 (`for (const message of collected) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-13 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.86. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-14 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-15 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:167`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 167-178 (`const setup = async () => {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-17 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 148-154 (`),`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-18 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.90. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-19 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:54`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 54-69 (`const connect = (port: MessagePort) =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-20 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/queue-scripted.test.ts:98`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 98-109 (`const waitForQueueDrained = (feed: Feed.Feed) =>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-21 no-casts `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 237-245 (`const readBody = async (init?: RequestInit): Promise<any> => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-22 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-23 error-messages-carry-context `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 957-965 (`const error = (patch?: string) =>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-24 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 293-304 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-25 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-26 errors-extend-base-error `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 119-125 (`export class SeedError extends Data.TaggedError('SeedError')<{ message: strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-27 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 126-137 (`export const seed = ({`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-28 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-29 namespace-export-with-internal-hiding `packages/core/compute/assistant-toolkit/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-11 (`export * from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-30 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as AlarmSkill from './AlarmSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-31 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/automation/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as AutomationSkill from './AutomationSkill.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-32 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/planning/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as PlanningSkill from './PlanningSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-33 test-asserts-real-behavior `packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 23-34 (`describe('WebSearchSkill', () => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-34 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 140-151 (`const addChecklist = (chat: Chat.Chat) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-35 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-36 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:113`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 113-124 (`export const formatUserPrompt = ({`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-37 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-38 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-39 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-40 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:77`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 77-88 (`export const loadInstructions = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-41 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.88. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-42 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-43 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-44 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 79-90 (`),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-45 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-46 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-47 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:405`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 405-428 (`}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-48 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 429-452 (`const manager = yield* ProcessManager.Service;`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-49 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 1462-1485 (`);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-50 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-51 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:195`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.80. The likeliest place is lines 195-206 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-52 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:351`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 351-362 (`};`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-53 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:363`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 363-374 (`};`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-54 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 390-401 (`export const layer: Layer.Layer<`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-55 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-56 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-57 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.82. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-58 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-59 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-60 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-61 no-casts `packages/core/compute/compute-runtime/src/services/service-registry.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-63 (`A,`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-62 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-63 flat-layer-composition `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 1142-1165 (`}, Effect.provide(TestLayer())),`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-64 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 381-404 (`#triggerQuery: QueryResult.QueryResult<Trigger.Trigger> | undefined;`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-65 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1111-1122 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-66 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

System One judges this a likely violation of `namespace-service-layers` (Layer constructors are module-level exports, never class statics), p=0.88. The likeliest place is lines 40-51 (`static layerKv = Layer.effect(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-67 no-casts `packages/core/compute/compute/src/Operation.ts:235`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 235-258 (`services: props.services ?? [],`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-68 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1044`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 1044-1067 (`export interface OperationService {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-69 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-70 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-71 no-casts `packages/core/compute/compute/src/ServiceResolver.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 85-96 (`export const succeed = <I, S>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-72 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-73 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-74 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-75 import-as-namespace-is-all-or-nothing `packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-76 no-casts `packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 136-147 (`const versionMeta = safeParseJson<any>(latest.versionMetaJSON);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-77 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-83 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-78 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-79 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-80 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-81 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-82 error-messages-carry-context `packages/core/compute/functions-runtime-cloudflare/src/internal/service-container.ts:55`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 55-66 (`}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-83 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/queues-api.ts:22`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.81. The likeliest place is lines 22-29 (`export interface QueuesAPI {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-84 options-object-with-defaults `packages/core/compute/functions-runtime-cloudflare/src/queues-api.ts:22`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 22-29 (`export interface QueuesAPI {`, location confidence 0.89). Judged with added `importers, public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-85 comment-hygiene `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:24`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 24-35 (`export const wrapHandlerForCloudflare = (func: FunctionProtocol.Func): Export...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-86 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-87 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-88 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-89 test-asserts-real-behavior `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-90 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-client/src/McpToolkit.tools.test.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 60-71 (`const withServer = <A, E, R>(body: (url: string) => Effect.Effect<A, E, R>) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-91 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-92 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-28 (`const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRun...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-93 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/invoker.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 63-75 (`const computeHandler = Operation.withHandler(Compute, (data) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-94 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 112-123 (`},`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-95 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-96 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-97 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-98 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-99 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-100 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-101 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-102 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-103 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-104 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 116-127 (`export const makeExtractionStage = (): Stage<ExtractionInput> => ({`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-105 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:131`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 131-142 (`Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-106 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-107 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-108 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.86. The likeliest place is lines 75-86 (`bench(`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-109 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-110 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 154-164 (`});`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-111 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-112 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-113 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-114 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-115 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-116 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-117 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-118 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-119 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-120 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:692`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 692-715 (`async addReplicator(ctx: Context, replicator: AutomergeReplicator): Promise<v...`, location confidence 0.30). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-121 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:860`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 860-883 (`await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress, abort....`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-122 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-123 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-124 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-125 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-126 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-127 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-128 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 93-104 (`});`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-129 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-130 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-131 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-132 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-133 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-134 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-135 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.89. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-136 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-137 event-handler-naming-convention `packages/core/echo/echo-host/src/db-host/query-service.ts:311`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 311-322 (`sendResults: (results) => {`, location confidence 0.84). Judged with added `siblings` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-138 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-139 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-140 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-141 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-142 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-143 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 884-907 (`break;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-144 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-145 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-146 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-147 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-148 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.89. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-149 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-150 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-151 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 666-687 (`return {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-152 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-153 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-154 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:95`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 95-118 (`const deepCopy = <T>(value: T, visited = new Map<object, object>()): T => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-155 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-156 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-157 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-158 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-159 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-160 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-161 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-162 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-163 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-164 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.86. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-165 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-166 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-167 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-168 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-169 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-170 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-171 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-172 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-173 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-174 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-175 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-176 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-177 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-178 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-179 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-180 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/index-tracker.ts:79`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.80. The likeliest place is lines 79-90 (`AND (${spaceIdParam} IS NULL OR spaceId = ${spaceIdParam})`, location confidence 0.30). Judged with added `diff, importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-181 error-messages-carry-context `packages/core/mesh/edge-client/src/edge-http-client.ts:157`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 157-174 (`const parseFinalizeResponse = (body: unknown): FinalizedUpload => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-182 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:481`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 481-504 (`body: data as BodyInit,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-183 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-184 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-185 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-186 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-187 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-188 test-asserts-real-behavior `packages/devtools/cli-util/src/util/form-builder.test.ts:49`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 49-60 (`yield* Console.log(print(doc));`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-189 no-casts `packages/devtools/cli/src/bin.ts:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 103-111 (`let leaksTracker: any;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-190 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.86. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-191 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-192 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-193 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:121`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 121-132 (`const toCompactGraph = (graph: ComputeGraph) => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-194 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 129-140 (`let response: any;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-195 no-casts `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 118-129 (`condition: () => this._client!.spaces.get(response.spaceId as SpaceId),`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-196 error-messages-carry-context `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 130-141 (`if (buildResult.error || !buildResult.bundle) {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-197 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-198 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/create-object.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 25-36 (`Effect.fnUntraced(function* (pluginOptions: AssistantOptions.AssistantPluginO...`, location confidence 0.11). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-199 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 405-426 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-200 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-201 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-202 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 73-84 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-203 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 50-53 (`const styles = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-204 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-205 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 92-103 (`const meta = {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-206 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 22-25 (`const DefaultStory = (props: ToolboxProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-207 no-casts `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 26-37 (`const meta = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-208 no-casts `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`const factory = createObjectFactory(space.db, random as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-209 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 49-60 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-210 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 50-61 (`}, [manager]);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-211 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-212 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-213 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 65-76 (`{roles.map((role) => (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-214 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-215 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-216 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 284-295 (`<Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick={han...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-217 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 73-84 (`.action(`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-218 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-219 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.85. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-220 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-221 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-222 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-223 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-224 reuse-shared-test-layer `packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 438-449 (`const makeSpaceLayer = (agentService: AgentService.Service) =>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-225 test-asserts-real-behavior `packages/plugins/plugin-assistant/src/skills/assistant/skill.node.test.ts:29`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 29-40 (`describe('Assistant Skill', () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-226 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-227 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 261-272 (`<Banner.Root valence='warning'>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-228 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:182`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 182-193 (`useEffect(() => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-229 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.88. The likeliest place is lines 118-129 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-230 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 202-213 (`<Panel.Header>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-231 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/operations/sync.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 48-59 (`const syncBinding = ({ binding }: { binding: Cursor.ExternalCursor }) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-232 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 217-228 (`const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: ...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-233 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 87-98 (`.map((obj) => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-234 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 171-182 (`iconOnly`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-235 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-236 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-237 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-238 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-239 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-240 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-92 (`);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-241 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 44-55 (`export const mailboxFacts: ProjectCapabilities.Template = {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-242 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-243 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 63-74 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-244 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 75-86 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-245 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:111`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 111-122 (`<div>{participants}</div>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-246 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 30-41 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-247 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 54-65 (`const timeout = setTimeout(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-248 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 93-104 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-249 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 42-53 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-250 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:84`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 84-95 (`</Panel.Header>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-251 test-asserts-real-behavior `packages/plugins/plugin-chess-com/src/plugin.test.ts:17`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 17-28 (`describe('ChessComPlugin', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-252 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-253 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`)}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-254 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-255 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-256 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 58-69 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-257 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-258 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-259 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 94-105 (`}`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-260 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 89-100 (`onValueChange={({ value: [value] }) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-261 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 251-262 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-262 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:43`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 43-54 (`if (!hubClient) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-263 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-264 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/schema-defs.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 39-50 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-265 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 22-33 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-266 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-267 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:235`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 235-246 (`emptyMessage={t('view.code.empty.placeholder')}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-268 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 53-64 (`const meta: Meta<typeof DefaultStory> = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-269 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 77-88 (`return (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-270 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 128-139 (`AiService.AiService,`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-271 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 494-517 (`);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-272 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-273 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-274 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-275 flat-layer-composition `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:94`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 94-117 (`const runOnTokenCreated = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-276 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 166-182 (`const openCreateSyncRoutineDialog = (`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-277 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-278 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 62-73 (`);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-279 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-280 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.87. The likeliest place is lines 66-77 (`void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] }, { sp...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-281 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 96-107 (`data: () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-282 namespace-export-with-internal-hiding `packages/plugins/plugin-crm/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-8 (`export * as CrmPlugin from './CrmPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-283 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-284 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-crm/src/skills/crm/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as CrmSkill from './CrmSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-285 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm-project.ts:59`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 59-70 (`export const crmProject: ProjectCapabilities.Template = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-286 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 25-36 (`export const crm: RoutineCapabilities.Template = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-287 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:78`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 78-89 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-288 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-289 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:807`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 807-823 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-290 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 71-82 (`iconOnly`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-291 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-292 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-293 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-294 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 66-77 (`});`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-295 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 78-89 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-296 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-297 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 55-66 (`export const SpaceGenerator = composable<HTMLDivElement, SpaceGeneratorProps>(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-298 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 103-114 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-299 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:187`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 187-198 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-300 namespace-export-with-internal-hiding `packages/plugins/plugin-debug/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as DebugPlugin from './DebugPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-301 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-302 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 27-41 (`const DefaultStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-303 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-304 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-305 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-306 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 135-146 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-307 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-308 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 29-40 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-309 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 161-179 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-310 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 512-535 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-311 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-312 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 136-147 (`classNames={[`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-313 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 87-98 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-314 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:177`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 177-188 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-315 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:67`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 67-78 (`export const useAncestorBreadcrumbs = (id: string | undefined): Breadcrumb[] ...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-316 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-317 no-sleep-in-test `packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 39-46 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sub...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-318 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-319 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 42-54 (`applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-320 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:113`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 113-118 (`});`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-321 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-322 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 32-43 (`const sampleProfiler = useCallback(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-323 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/connector.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 58-69 (`const validateToken = (token: string) =>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-324 namespace-brand-key-prefixing `packages/plugins/plugin-discord/src/errors.ts:16`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 16-21 (`type DfxErrorResponseShape = {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-325 flat-layer-composition `packages/plugins/plugin-discord/src/operations/sync.ts:217`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 217-228 (`yield* Feed.append(feed, mapped).pipe(Effect.provideService(Database.Origin, ...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-326 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-327 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-328 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-329 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-330 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-331 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 108-119 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-332 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 26-29 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-333 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-334 no-casts `packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 29-34 (`const generator = random as any as ValueGenerator;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-335 no-casts `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 23-26 (`const generator = random as any as ValueGenerator;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-336 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 39-50 (`let cancelled = false;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-337 no-styling-wrapper-divs `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 75-86 (`<div className='relative flex dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-338 no-casts `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-32 (`const generator = random as any as ValueGenerator;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-339 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 94-105 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-340 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-341 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-342 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Input readOnly value={reference} classNames='grow' />`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-343 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:147`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 147-158 (`const bytes = yield* Blob.read(blob);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-344 no-casts `packages/plugins/plugin-game/src/types/Game.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-93 (`export const GameRef = <S extends Type.AnyObj>(_variantType: S) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-345 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-346 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-347 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`value={url}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-348 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/walkthrough/generate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 82-93 (`export const generateWalkthrough = <R = never>({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-349 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-350 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/operations/calendar/list/handler.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 28-42 (`const listGoogleCalendars = (token: string) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-351 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-352 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/operations/calendar/sync/sync.ts:85`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 85-96 (`export const syncCalendar = ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-353 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`try {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-354 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-355 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 78-98 (`const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Laye...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-356 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-357 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-358 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 66-77 (`disabled={syncingLots}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-359 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.82. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-360 namespace-export-with-internal-hiding `packages/plugins/plugin-illustrator/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as IllustratorPlugin from './IllustratorPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-361 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 74-85 (`const seeded = useRef(false);`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-362 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 102-113 (`const CompanionStory = () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-363 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 126-134 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-364 no-casts `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 53-64 (`const { defaultSpace } = yield* initializeIdentity(client);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-365 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 188-199 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-366 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-367 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 154-177 (`const filterTagUris = useMemo(() => getFilterTagUris(debouncedFilter), [debou...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-368 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-369 subscribe-where-you-read `packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx:39`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 39-50 (`useObject(calendar);`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-370 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 27-38 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-371 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 180-191 (`onCheckedChange={() => toggleAll()}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-372 namespace-export-with-internal-hiding `packages/plugins/plugin-inbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * as InboxPlugin from './InboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-373 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 112-123 (`const generateClassification = (prompt: string, useStrict: boolean) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-374 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-375 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-376 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-377 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.72). Judged with added `test` context after a first pass of 0.61. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-378 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-379 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-380 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/templates/analyze-mailbox.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 33-44 (`export const analyzeMailbox: RoutineCapabilities.Template = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-381 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-382 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-383 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-384 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 59-70 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-385 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.86. The likeliest place is lines 71-82 (`))}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-386 namespace-export-with-internal-hiding `packages/plugins/plugin-jmap/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-8 (`export * as JmapPlugin from './JmapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-387 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 32-43 (`Layer.provide(JmapMailApi.Live),`, location confidence 0.53). Judged with added `imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-388 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 60-71 (`export const jmapMailSyncProvider = (): Layer.Layer<MailSync.MailSyncProvider...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-389 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync.test.ts:223`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 223-246 (`const traceLayer = Trace.testTraceService().pipe(`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-390 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-391 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:86`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.85. The likeliest place is lines 86-97 (`const DefaultComponent = () => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-392 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 122-133 (`return null;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-393 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 47-58 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-394 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:83`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 83-94 (`[invokePromise],`, location confidence 0.61). Judged with added `imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-395 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 137-148 (`if (target == null) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-396 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`const settingsSchema = (isView ? KanbanSchema.KanbanViewSettingsSchema : Kanb...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-397 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-398 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 37-48 (`<Button`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-399 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 109-120 (`() =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-400 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.87. The likeliest place is lines 106-117 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-401 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 106-117 (`}`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-402 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-linear/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-403 inline-obj-parent `packages/plugins/plugin-linear/src/operations/sync.ts:248`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 248-263 (`taskSet.milestones.push(Ref.make(milestone));`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-404 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 109-122 (`/>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-405 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 52-63 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-406 no-casts `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 117-128 (`const seedSpaceWithQueueItems = ({ client }: { client: Client }) =>`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-407 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-408 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 84-95 (`});`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-409 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 128-142 (`const loadValidFeeds = (magazine: Magazine.Magazine) =>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-410 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 28-39 (`export const magazineCuration: RoutineCapabilities.Template = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-411 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-412 moon-yml-entrypoint-registration `packages/plugins/plugin-map-solid/package.json:49`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 49-60 (`},`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-413 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-414 namespace-export-with-internal-hiding `packages/plugins/plugin-map/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-9 (`export * as MapPlugin from './MapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-415 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 186-194 (`const useTest = (view: EditorView | null) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-416 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 117-128 (`const [missing, setMissing] = useState(false);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-417 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 333-344 (`if (mode === 'section') {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-418 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-419 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-420 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 87-100 (`{subjects.map((subject) => (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-421 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-422 test-asserts-real-behavior `packages/plugins/plugin-markdown/src/plugin.test.ts:15`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 15-26 (`describe('MarkdownPlugin', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-423 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-424 options-object-with-defaults `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:25`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 25-36 (`type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-425 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 37-48 (`const identity = Option.getOrUndefined(haloIdentity.getSnapshot());`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-426 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.84. The likeliest place is lines 58-69 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-427 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 70-81 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-428 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 118-129 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-429 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 130-141 (`<div className='grid grid-cols-2 gap-2 dx-grow'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-430 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-431 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-432 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-433 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 83-94 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-434 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-435 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 25-36 (`export const NavTreeItemActionDropdownMenu = composable<HTMLButtonElement, Na...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-436 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:196`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 196-207 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-437 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 371-382 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-438 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 25-35 (`const ITEM_END_SIZE = '1.25rem';`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-439 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 194-205 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-440 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 38-49 (`const current = getHotkeyScope() ?? '';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-441 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 312-323 (`useEffect(() => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-442 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 128-139 (`id: 'appGraphBuilder',`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-443 barrel-imports-not-internal-paths `packages/plugins/plugin-navtree/src/types/NavTreeNode.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-12 (`import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tr...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-444 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-445 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 82-92 (`(event) =>`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-446 no-casts `packages/plugins/plugin-observability/src/plugin.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-25 (`describe('ObservabilityPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-447 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-448 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.60). Judged with added `diff, imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-449 inline-obj-parent `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 65-74 (`objects: seed.objects.map((object) => Ref.make(object)),`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-450 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 101-112 (`export const Projects: SampleSpace.Phase<ProjectsResult, ProjectsInput> = Sam...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-451 comment-hygiene `packages/plugins/plugin-onboarding/src/samples/bramble/roast-log.ts:72`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 72-83 (`const makeRoastLogs = (type: Type.AnyObj, people: Record<PersonKey, Person.Pe...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-452 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 43-54 (`} else {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-453 no-styling-wrapper-divs `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-454 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-455 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 123-134 (`title: random.lorem.sentence(),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-456 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 118-129 (`name: 'Messages',`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-457 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:189`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.89. The likeliest place is lines 189-200 (`<Form.Fields />`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-458 no-casts `packages/plugins/plugin-presenter/src/useExitPresenter.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 16-24 (`export const useExitPresenter = (object: any) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-459 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-460 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-461 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-462 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-463 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.85. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-464 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`{roles.map((role, i) => (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-465 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 37-48 (`const terminateLocal = (pid: string) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-466 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-467 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-468 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 458-475 (`if (!chat) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-469 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 124-135 (`useEffect(() => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-470 namespace-export-with-internal-hiding `packages/plugins/plugin-projects/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-10 (`export * as ProjectsPlugin from './ProjectsPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-471 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/routine.test.ts:32`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 32-40 (`const { text, toolCall } = ScriptedLanguageModel;`, location confidence 0.48). Judged with added `imports, test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-472 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 104-115 (`const seed = () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-473 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 81-92 (`const routineSkills = routineInstructions?.skills.map((ref) => ref.uri.toStri...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-474 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/templates/inbox-research.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 55-66 (`export const inboxResearch: ProjectCapabilities.Template = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-475 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-476 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-477 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 129-140 (`) : (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-478 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:185`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 185-196 (`/>`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-479 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-480 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 130-141 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-481 no-casts `packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 41-48 (`const { plugins } = await harness.runPromise(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-482 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 46-57 (`standalone`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-483 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 99-110 (`</div>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-484 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 54-65 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-485 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 448-459 (`const filteredAnchors = showResolvedThreads`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-486 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 222-233 (`<Button icon='ph--trash--regular' label={t('discard-branch.label')} onClick={...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-487 no-casts `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 296-320 (`for (const { creator, content } of context.args.suggestions ?? []) {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-488 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-489 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-490 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-491 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-492 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 290-300 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-493 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 40-46 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-494 comment-hygiene `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:220`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 220-224 (`//`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-495 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-496 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 162-175 (`}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-497 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-s3/src/capabilities/connector.ts:95`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 95-106 (`onValidate: ({ values }) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-498 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.95. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-499 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.92. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-500 extract-non-rendering-logic-from-component `packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 74-85 (`useEffect(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-501 namespace-export-with-internal-hiding `packages/plugins/plugin-sandbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.86. The likeliest place is lines 1-9 (`export * as SandboxPlugin from './SandboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-502 no-sleep-in-test `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 226-237 (`yield* Effect.sleep('6 seconds');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-503 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-504 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.85. The likeliest place is lines 76-87 (`</Dialog.Header>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-505 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-506 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-507 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-508 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-509 no-styling-wrapper-divs `packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-69 (`if (!script || !sourceReady) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-510 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 36-47 (`if (!token || !gistId) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-511 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-512 namespace-export-with-internal-hiding `packages/plugins/plugin-script/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-11 (`export * as ScriptPlugin from './ScriptPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-513 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-514 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-515 no-casts `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 54-65 (`onClientInitialized: ({ client }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-516 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 58-69 (`onClientInitialized: ({ client }) =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-517 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-518 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.85. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-519 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 59-70 (`Object.entries(fields).some(([, value]) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-520 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-search/src/index.ts:1`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 1-11 (`export * as SearchPlugin from './SearchPlugin.ts';`, location confidence 1.00). Judged with added `importers, imports, public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-521 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-522 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-523 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:311`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 311-322 (`useEffect(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-524 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 467-478 (`<div`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-525 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 23-34 (`export const Basic = () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-526 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 267-278 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-527 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 84-95 (`export const Spec = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-528 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-529 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 81-92 (`});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-530 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-531 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/operations/sync.ts:173`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 173-184 (`const resolveUsers = (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-532 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-533 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-534 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 25-36 (`Effect.gen(function* () {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-535 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-536 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-537 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 112-123 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-538 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 100-111 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-539 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-540 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-541 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 39-50 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-542 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:259`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 259-270 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-543 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-544 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-545 no-casts `packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 95-106 (`StorybookPlugin.make({}),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-546 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 48-59 (`}, [schemas]);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-547 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 242-253 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-548 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-549 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 58-68 (`}, [updateState]);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-550 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:199`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 199-210 (`const rail = (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-551 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 180-191 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-552 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 225-233 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-553 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-554 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 54-65 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-555 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 72-83 (`(id: string) =>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-556 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 108-119 (`return;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-557 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-558 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:68`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 68-79 (`}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-559 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 80-86 (`<div className='grid overflow-hidden border-s border-separator'>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-560 inline-obj-parent `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 99-110 (`yield* initializeIdentity(client);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-561 namespace-export-with-internal-hiding `packages/plugins/plugin-studio/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as StudioPlugin from './StudioPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-562 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-563 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.82. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-564 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 109-120 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-565 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 145-156 (`<div className='flex items-start'>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-566 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-36 (`const makeObservability = (): Observability.Observability =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-567 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 64-75 (`Obj.update(subject, (subject) => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-568 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 53-64 (`if (!typename) {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-569 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 89-100 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-570 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 31-45 (`data-testid='supportPlugin.startTour'`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-571 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-16 (`const observabilityWith = (support: Observability.Observability['support']): ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-572 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 165-176 (`return {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-573 namespace-export-with-internal-hiding `packages/plugins/plugin-table/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-9 (`export * as TablePlugin from './TablePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-574 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 18-29 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-575 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-576 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-577 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 37-48 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-578 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-579 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 139-150 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-580 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-581 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 137-152 (`);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-582 namespace-export-with-internal-hiding `packages/plugins/plugin-tasks/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as TasksPlugin from './TasksPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-583 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-584 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-585 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:244`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 244-255 (`const manager = managerRef.current;`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-586 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-587 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-588 namespace-export-with-internal-hiding `packages/plugins/plugin-thread/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as ThreadPlugin from './ThreadPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-589 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 116-127 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-590 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const [devicesToken, setDevicesToken] = useState(0);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-591 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-592 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-593 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-594 no-casts `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-595 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-596 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trello/src/capabilities/connector.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 31-42 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-597 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-598 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-599 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-600 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trello/src/operations/handlers.test.ts:175`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 175-186 (`const bindTarget = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-601 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-602 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-603 no-casts `packages/plugins/plugin-trello/src/operations/sync.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 191-202 (`newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-604 no-casts `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`const extension = yield* AppGraphBuilder.createExtension({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-605 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 102-113 (`const planTripExtension = yield* AppGraphBuilder.createExtension({`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-606 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-607 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-608 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-609 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-610 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 54-65 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-611 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 28-39 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-612 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-613 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-614 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-615 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/common/capabilities.ts:305`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 305-316 (`export const getAtomValue = <T>(`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-616 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/common/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-8 (`export * as Capabilities from './capabilities.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-617 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-618 no-casts `packages/sdk/app-framework/src/core/capability.ts:403`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 403-422 (`[ContributionTypeId]: capability as unknown as IdentifierOf<C>,`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-619 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:490`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 490-515 (`export interface Module<Options = void> {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-620 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin-manifest.ts:115`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 115-126 (`export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedMan...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-621 no-casts `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-622 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:626`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 626-651 (`export const resolveLazy = (plugin: Plugin): Effect.Effect<Plugin, LazyPlugin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-623 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-624 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-625 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-626 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/plugin-process-manager/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-9 (`export * from './history/index.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-627 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 56-61 (`const resolveWith = <S>(manager: PluginManager.PluginManager, tag: Context.Ke...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-628 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 205-216 (`const remoteProcessManagerLayer = RemoteProcessManager.layerNoop.pipe(Layer.p...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-629 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 229-240 (`runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-630 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 253-264 (`const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.ru...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-631 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-632 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-633 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-634 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-635 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-636 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 354-365 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-637 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-91 (`export const useOptionalAtomCapability = <T>(atomCapability: Capability.Inter...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-638 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-639 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.86. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-640 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 893-917 (`release();`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-641 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-642 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-643 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-644 namespace-export-with-internal-hiding `packages/sdk/app-solid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-8 (`export * from './common.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-645 no-casts `packages/sdk/app-solid/src/useCapabilities.test.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 19-24 (`const mockManager = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-646 no-casts `packages/sdk/app-solid/src/usePluginManager.test.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-24 (`describe('usePluginManager', () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-647 no-casts `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 22-28 (`const statusMessage = (data: Trace.PayloadType<typeof Trace.StatusUpdate>, me...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-648 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-649 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 206-217 (`}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-650 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-651 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-652 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-653 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-16 (`export * from './SettingsScope.tsx';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-654 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:396`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 396-419 (`});`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-655 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-656 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-657 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-658 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-659 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:88`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 88-101 (`export const EdgeAgentServiceLayer: Layer.Layer<`, location confidence 0.84). Judged with added `importers, imports` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-660 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-661 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-662 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-663 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-664 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-665 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-666 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-667 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-668 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-669 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-670 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-671 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-672 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-673 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.82. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-674 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 93-104 (`update();`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-675 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-676 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-677 no-casts `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 137-148 (`log.error('failed to load metadata from SQLite', { err });`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-678 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.90. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-679 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-680 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 25-32 (`export interface CrossDeviceSpaceSynchronizer extends CredentialProcessor, Li...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-681 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.78). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-682 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-683 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 488-499 (`});`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-684 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-685 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-686 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-687 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 429-452 (`}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-688 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-689 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:95`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 95-106 (`yield* Effect.addFinalizer(() =>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-690 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-691 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-692 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-693 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/space/space-manager.ts:97`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 97-108 (`async close(): Promise<void> {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-694 no-casts `packages/sdk/client-services/src/internal/space/space-manager.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 181-193 (`public findSpaceByRootDocumentId(documentId: string): Space | undefined {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-695 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-696 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 188-199 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-697 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-698 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-699 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-700 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-701 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-702 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-703 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-704 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-705 no-casts `packages/sdk/client/src/services/local-client-services.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 211-222 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-706 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/testing/test-worker-factory.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 70-81 (`createSession: ({ isOwner }) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-707 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-708 effect-fn-not-hand-wrapped-gen `packages/sdk/observability/src/ai/AiObservability.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 372-383 (`const setupWired = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-709 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-710 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-711 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-712 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-713 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-714 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-715 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-716 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-717 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 274-285 (`const mutableParent = parent as Obj.Mutable<JsonSchema.JsonSchema>;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-718 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-719 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-720 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-721 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-722 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.85. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-723 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-724 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-725 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-726 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.88. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-727 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-728 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-729 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-730 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-731 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 169-176 (`}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-732 no-casts `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-733 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 79-85 (`}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-734 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 134-145 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-735 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-736 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 116-127 (`{`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-737 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.91. The likeliest place is lines 200-207 (`}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-738 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-739 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-740 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-741 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-742 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-743 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-744 effect-fn-not-hand-wrapped-gen `packages/stories/storybook-testing/src/test/startup.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 73-84 (`const clientPlugin = ClientPlugin.make({`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-745 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-746 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-747 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-748 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-749 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-750 no-casts `packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`for (const id of Array.from(selected.values())) {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-751 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-752 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-753 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-754 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:120`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 120-131 (`queueMicrotask(() => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-755 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 216-227 (`positioning={virtualAnchor(popoverAnchorRef)}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-756 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.81. The likeliest place is lines 317-328 (`<Toolbar.Root>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-757 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 76-84 (`setContext: (context: any) => void;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-758 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`useEffect(() => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-759 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-760 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-761 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN ba5cc29541-762 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ba5cc29541-763 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 162-188 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `128be93325129950e3c27b24559fd56349bd204c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 763 violations written to fragments, 8192 uncertain, 66723 clean, 0 unanswered
- left for an agentic reviewer: 594 batch(es)

```text
requests: 30246 (5960 verdicts re-asked with context the model requested)
estimated input tokens: 189602835
billed input tokens: 176577096 (cost $7.4162)
measured chars per token: 3.22
```

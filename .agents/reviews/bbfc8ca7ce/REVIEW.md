---
branch: HEAD
commit: bbfc8ca7cea3bd1f7e3f900f1299d98beb948f4e
base: 1b40b48e6290c98b7ce6a8c46ac6eb46bcf4623c
mode: fast
createdAt: 2026-10-03T01:49:25.742Z
isFinalized: true
groups: 2764
rules: [barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, reactive-state-via-atom-bridge, reuse-shared-test-layer, schema-declare-and-brand, scope-multi-tenant-queries-by-space, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, use-context-scoped-cancellation]
reviewId: bbfc8ca7ce
---

_184 error(s), 252 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bbfc8ca7ce-1 - ignored - error-messages-carry-context - packages/apps/composer-crx/src/core/image/image.ts:60
- bbfc8ca7ce-2 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:25
- bbfc8ca7ce-3 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:1
- bbfc8ca7ce-4 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- bbfc8ca7ce-5 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:129
- bbfc8ca7ce-6 - ignored - structured-logging-not-console - packages/core/compute/agent-claude/src/Demo.test.ts:42
- bbfc8ca7ce-7 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- bbfc8ca7ce-8 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- bbfc8ca7ce-9 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- bbfc8ca7ce-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- bbfc8ca7ce-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203
- bbfc8ca7ce-12 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- bbfc8ca7ce-13 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- bbfc8ca7ce-14 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237
- bbfc8ca7ce-15 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- bbfc8ca7ce-16 - ignored - error-messages-carry-context - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957
- bbfc8ca7ce-17 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- bbfc8ca7ce-18 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- bbfc8ca7ce-19 - ignored - namespace-export-with-internal-hiding - packages/core/compute/assistant-toolkit/src/index.ts:1
- bbfc8ca7ce-20 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1
- bbfc8ca7ce-21 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/automation/index.ts:1
- bbfc8ca7ce-22 - ignored - test-asserts-real-behavior - packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23
- bbfc8ca7ce-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140
- bbfc8ca7ce-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- bbfc8ca7ce-25 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- bbfc8ca7ce-26 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- bbfc8ca7ce-27 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- bbfc8ca7ce-28 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- bbfc8ca7ce-29 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- bbfc8ca7ce-30 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- bbfc8ca7ce-31 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- bbfc8ca7ce-32 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- bbfc8ca7ce-33 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- bbfc8ca7ce-34 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426
- bbfc8ca7ce-35 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455
- bbfc8ca7ce-36 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- bbfc8ca7ce-37 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- bbfc8ca7ce-38 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- bbfc8ca7ce-39 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- bbfc8ca7ce-40 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- bbfc8ca7ce-41 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- bbfc8ca7ce-42 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- bbfc8ca7ce-43 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- bbfc8ca7ce-44 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- bbfc8ca7ce-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- bbfc8ca7ce-46 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- bbfc8ca7ce-47 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- bbfc8ca7ce-48 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- bbfc8ca7ce-49 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- bbfc8ca7ce-50 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- bbfc8ca7ce-51 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- bbfc8ca7ce-52 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- bbfc8ca7ce-53 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:327
- bbfc8ca7ce-54 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- bbfc8ca7ce-55 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- bbfc8ca7ce-56 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- bbfc8ca7ce-57 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- bbfc8ca7ce-58 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- bbfc8ca7ce-59 - ignored - flat-layer-composition - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:102
- bbfc8ca7ce-60 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- bbfc8ca7ce-61 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- bbfc8ca7ce-62 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- bbfc8ca7ce-63 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- bbfc8ca7ce-64 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- bbfc8ca7ce-65 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- bbfc8ca7ce-66 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- bbfc8ca7ce-67 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- bbfc8ca7ce-68 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- bbfc8ca7ce-69 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- bbfc8ca7ce-70 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- bbfc8ca7ce-71 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- bbfc8ca7ce-72 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- bbfc8ca7ce-73 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- bbfc8ca7ce-74 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- bbfc8ca7ce-75 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- bbfc8ca7ce-76 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:131
- bbfc8ca7ce-77 - ignored - namespace-brand-key-prefixing - packages/core/compute/pipeline/src/Stage.test.ts:14
- bbfc8ca7ce-78 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- bbfc8ca7ce-79 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- bbfc8ca7ce-80 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- bbfc8ca7ce-81 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- bbfc8ca7ce-82 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- bbfc8ca7ce-83 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- bbfc8ca7ce-84 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- bbfc8ca7ce-85 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:266
- bbfc8ca7ce-86 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- bbfc8ca7ce-87 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- bbfc8ca7ce-88 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- bbfc8ca7ce-89 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- bbfc8ca7ce-90 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- bbfc8ca7ce-91 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- bbfc8ca7ce-92 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1008
- bbfc8ca7ce-93 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1272
- bbfc8ca7ce-94 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1728
- bbfc8ca7ce-95 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- bbfc8ca7ce-96 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:195
- bbfc8ca7ce-97 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- bbfc8ca7ce-98 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:205
- bbfc8ca7ce-99 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- bbfc8ca7ce-100 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- bbfc8ca7ce-101 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- bbfc8ca7ce-102 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- bbfc8ca7ce-103 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- bbfc8ca7ce-104 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- bbfc8ca7ce-105 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- bbfc8ca7ce-106 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- bbfc8ca7ce-107 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- bbfc8ca7ce-108 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:38
- bbfc8ca7ce-109 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/query-service.ts:406
- bbfc8ca7ce-110 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- bbfc8ca7ce-111 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- bbfc8ca7ce-112 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- bbfc8ca7ce-113 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- bbfc8ca7ce-114 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- bbfc8ca7ce-115 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- bbfc8ca7ce-116 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46
- bbfc8ca7ce-117 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- bbfc8ca7ce-118 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- bbfc8ca7ce-119 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- bbfc8ca7ce-120 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- bbfc8ca7ce-121 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- bbfc8ca7ce-122 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- bbfc8ca7ce-123 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- bbfc8ca7ce-124 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- bbfc8ca7ce-125 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- bbfc8ca7ce-126 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- bbfc8ca7ce-127 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- bbfc8ca7ce-128 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- bbfc8ca7ce-129 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- bbfc8ca7ce-130 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- bbfc8ca7ce-131 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- bbfc8ca7ce-132 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- bbfc8ca7ce-133 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- bbfc8ca7ce-134 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- bbfc8ca7ce-135 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- bbfc8ca7ce-136 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- bbfc8ca7ce-137 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- bbfc8ca7ce-138 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- bbfc8ca7ce-139 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- bbfc8ca7ce-140 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- bbfc8ca7ce-141 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- bbfc8ca7ce-142 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- bbfc8ca7ce-143 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- bbfc8ca7ce-144 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- bbfc8ca7ce-145 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- bbfc8ca7ce-146 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- bbfc8ca7ce-147 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- bbfc8ca7ce-148 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- bbfc8ca7ce-149 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- bbfc8ca7ce-150 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- bbfc8ca7ce-151 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- bbfc8ca7ce-152 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/index-tracker.ts:79
- bbfc8ca7ce-153 - ignored - no-mixed-promise-effect-lifecycle - packages/core/halo/keyring/src/sqlite-keyring.ts:43
- bbfc8ca7ce-154 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- bbfc8ca7ce-155 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- bbfc8ca7ce-156 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- bbfc8ca7ce-157 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- bbfc8ca7ce-158 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- bbfc8ca7ce-159 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- bbfc8ca7ce-160 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- bbfc8ca7ce-161 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- bbfc8ca7ce-162 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:59
- bbfc8ca7ce-163 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129
- bbfc8ca7ce-164 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- bbfc8ca7ce-165 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- bbfc8ca7ce-166 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:51
- bbfc8ca7ce-167 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:111
- bbfc8ca7ce-168 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- bbfc8ca7ce-169 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- bbfc8ca7ce-170 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- bbfc8ca7ce-171 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:52
- bbfc8ca7ce-172 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131
- bbfc8ca7ce-173 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:144
- bbfc8ca7ce-174 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- bbfc8ca7ce-175 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- bbfc8ca7ce-176 - ignored - reuse-shared-test-layer - packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438
- bbfc8ca7ce-177 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- bbfc8ca7ce-178 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:273
- bbfc8ca7ce-179 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:103
- bbfc8ca7ce-180 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- bbfc8ca7ce-181 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- bbfc8ca7ce-182 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- bbfc8ca7ce-183 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- bbfc8ca7ce-184 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- bbfc8ca7ce-185 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- bbfc8ca7ce-186 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- bbfc8ca7ce-187 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- bbfc8ca7ce-188 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- bbfc8ca7ce-189 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- bbfc8ca7ce-190 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251
- bbfc8ca7ce-191 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- bbfc8ca7ce-192 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- bbfc8ca7ce-193 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- bbfc8ca7ce-194 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- bbfc8ca7ce-195 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- bbfc8ca7ce-196 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62
- bbfc8ca7ce-197 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- bbfc8ca7ce-198 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96
- bbfc8ca7ce-199 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-crm/src/index.ts:1
- bbfc8ca7ce-200 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- bbfc8ca7ce-201 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:65
- bbfc8ca7ce-202 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:101
- bbfc8ca7ce-203 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:185
- bbfc8ca7ce-204 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- bbfc8ca7ce-205 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- bbfc8ca7ce-206 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- bbfc8ca7ce-207 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188
- bbfc8ca7ce-208 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:496
- bbfc8ca7ce-209 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- bbfc8ca7ce-210 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- bbfc8ca7ce-211 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- bbfc8ca7ce-212 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- bbfc8ca7ce-213 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- bbfc8ca7ce-214 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- bbfc8ca7ce-215 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- bbfc8ca7ce-216 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- bbfc8ca7ce-217 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file-system/src/containers/WorkspaceSettingsContainer.tsx:68
- bbfc8ca7ce-218 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- bbfc8ca7ce-219 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- bbfc8ca7ce-220 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- bbfc8ca7ce-221 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- bbfc8ca7ce-222 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- bbfc8ca7ce-223 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101
- bbfc8ca7ce-224 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- bbfc8ca7ce-225 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- bbfc8ca7ce-226 - ignored - structured-logging-not-console - packages/plugins/plugin-google/src/operations/mail/sync/sync-bench.test.ts:103
- bbfc8ca7ce-227 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- bbfc8ca7ce-228 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78
- bbfc8ca7ce-229 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- bbfc8ca7ce-230 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- bbfc8ca7ce-231 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- bbfc8ca7ce-232 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- bbfc8ca7ce-233 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- bbfc8ca7ce-234 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- bbfc8ca7ce-235 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- bbfc8ca7ce-236 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- bbfc8ca7ce-237 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- bbfc8ca7ce-238 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/skills/InboxSendSkill.ts:1
- bbfc8ca7ce-239 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- bbfc8ca7ce-240 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- bbfc8ca7ce-241 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- bbfc8ca7ce-242 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-jmap/src/index.ts:1
- bbfc8ca7ce-243 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- bbfc8ca7ce-244 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109
- bbfc8ca7ce-245 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:145
- bbfc8ca7ce-246 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- bbfc8ca7ce-247 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- bbfc8ca7ce-248 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-linear/src/operations/sync.test.ts:48
- bbfc8ca7ce-249 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- bbfc8ca7ce-250 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- bbfc8ca7ce-251 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-map/src/index.ts:1
- bbfc8ca7ce-252 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- bbfc8ca7ce-253 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- bbfc8ca7ce-254 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:53
- bbfc8ca7ce-255 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- bbfc8ca7ce-256 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- bbfc8ca7ce-257 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- bbfc8ca7ce-258 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- bbfc8ca7ce-259 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- bbfc8ca7ce-260 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- bbfc8ca7ce-261 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- bbfc8ca7ce-262 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- bbfc8ca7ce-263 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- bbfc8ca7ce-264 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124
- bbfc8ca7ce-265 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-projects/src/index.ts:1
- bbfc8ca7ce-266 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69
- bbfc8ca7ce-267 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- bbfc8ca7ce-268 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- bbfc8ca7ce-269 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- bbfc8ca7ce-270 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- bbfc8ca7ce-271 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- bbfc8ca7ce-272 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:263
- bbfc8ca7ce-273 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40
- bbfc8ca7ce-274 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- bbfc8ca7ce-275 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- bbfc8ca7ce-276 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- bbfc8ca7ce-277 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-sandbox/src/index.ts:1
- bbfc8ca7ce-278 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- bbfc8ca7ce-279 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:59
- bbfc8ca7ce-280 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- bbfc8ca7ce-281 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- bbfc8ca7ce-282 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- bbfc8ca7ce-283 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- bbfc8ca7ce-284 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- bbfc8ca7ce-285 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:236
- bbfc8ca7ce-286 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- bbfc8ca7ce-287 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- bbfc8ca7ce-288 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:13
- bbfc8ca7ce-289 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-table/src/index.ts:1
- bbfc8ca7ce-290 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- bbfc8ca7ce-291 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- bbfc8ca7ce-292 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- bbfc8ca7ce-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- bbfc8ca7ce-294 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- bbfc8ca7ce-295 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- bbfc8ca7ce-296 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- bbfc8ca7ce-297 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- bbfc8ca7ce-298 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- bbfc8ca7ce-299 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- bbfc8ca7ce-300 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- bbfc8ca7ce-301 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- bbfc8ca7ce-302 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- bbfc8ca7ce-303 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- bbfc8ca7ce-304 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- bbfc8ca7ce-305 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- bbfc8ca7ce-306 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205
- bbfc8ca7ce-307 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:217
- bbfc8ca7ce-308 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253
- bbfc8ca7ce-309 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- bbfc8ca7ce-310 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- bbfc8ca7ce-311 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- bbfc8ca7ce-312 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- bbfc8ca7ce-313 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- bbfc8ca7ce-314 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351
- bbfc8ca7ce-315 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- bbfc8ca7ce-316 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- bbfc8ca7ce-317 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- bbfc8ca7ce-318 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- bbfc8ca7ce-319 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- bbfc8ca7ce-320 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- bbfc8ca7ce-321 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- bbfc8ca7ce-322 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206
- bbfc8ca7ce-323 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- bbfc8ca7ce-324 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- bbfc8ca7ce-325 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:396
- bbfc8ca7ce-326 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- bbfc8ca7ce-327 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- bbfc8ca7ce-328 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- bbfc8ca7ce-329 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- bbfc8ca7ce-330 - ignored - test-asserts-real-behavior - packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33
- bbfc8ca7ce-331 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- bbfc8ca7ce-332 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- bbfc8ca7ce-333 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- bbfc8ca7ce-334 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- bbfc8ca7ce-335 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- bbfc8ca7ce-336 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- bbfc8ca7ce-337 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- bbfc8ca7ce-338 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/spaces.ts:73
- bbfc8ca7ce-339 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- bbfc8ca7ce-340 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- bbfc8ca7ce-341 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- bbfc8ca7ce-342 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- bbfc8ca7ce-343 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- bbfc8ca7ce-344 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- bbfc8ca7ce-345 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- bbfc8ca7ce-346 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- bbfc8ca7ce-347 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- bbfc8ca7ce-348 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- bbfc8ca7ce-349 - ignored - no-casts - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137
- bbfc8ca7ce-350 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- bbfc8ca7ce-351 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- bbfc8ca7ce-352 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:148
- bbfc8ca7ce-353 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- bbfc8ca7ce-354 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- bbfc8ca7ce-355 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- bbfc8ca7ce-356 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- bbfc8ca7ce-357 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- bbfc8ca7ce-358 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- bbfc8ca7ce-359 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- bbfc8ca7ce-360 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- bbfc8ca7ce-361 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- bbfc8ca7ce-362 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- bbfc8ca7ce-363 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- bbfc8ca7ce-364 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- bbfc8ca7ce-365 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157
- bbfc8ca7ce-366 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- bbfc8ca7ce-367 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- bbfc8ca7ce-368 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- bbfc8ca7ce-369 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- bbfc8ca7ce-370 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- bbfc8ca7ce-371 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- bbfc8ca7ce-372 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- bbfc8ca7ce-373 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- bbfc8ca7ce-374 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- bbfc8ca7ce-375 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:211
- bbfc8ca7ce-376 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- bbfc8ca7ce-377 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- bbfc8ca7ce-378 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- bbfc8ca7ce-379 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- bbfc8ca7ce-380 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- bbfc8ca7ce-381 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- bbfc8ca7ce-382 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- bbfc8ca7ce-383 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- bbfc8ca7ce-384 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- bbfc8ca7ce-385 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:274
- bbfc8ca7ce-386 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- bbfc8ca7ce-387 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- bbfc8ca7ce-388 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- bbfc8ca7ce-389 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- bbfc8ca7ce-390 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- bbfc8ca7ce-391 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- bbfc8ca7ce-392 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- bbfc8ca7ce-393 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- bbfc8ca7ce-394 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- bbfc8ca7ce-395 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- bbfc8ca7ce-396 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- bbfc8ca7ce-397 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- bbfc8ca7ce-398 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- bbfc8ca7ce-399 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- bbfc8ca7ce-400 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- bbfc8ca7ce-401 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- bbfc8ca7ce-402 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- bbfc8ca7ce-403 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- bbfc8ca7ce-404 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- bbfc8ca7ce-405 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- bbfc8ca7ce-406 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- bbfc8ca7ce-407 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- bbfc8ca7ce-408 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- bbfc8ca7ce-409 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- bbfc8ca7ce-410 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- bbfc8ca7ce-411 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- bbfc8ca7ce-412 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- bbfc8ca7ce-413 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- bbfc8ca7ce-414 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- bbfc8ca7ce-415 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254
- bbfc8ca7ce-416 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18
- bbfc8ca7ce-417 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:98
- bbfc8ca7ce-418 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:28
- bbfc8ca7ce-419 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:189
- bbfc8ca7ce-420 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:84
- bbfc8ca7ce-421 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:155
- bbfc8ca7ce-422 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87
- bbfc8ca7ce-423 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37
- bbfc8ca7ce-424 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37
- bbfc8ca7ce-425 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:81
- bbfc8ca7ce-426 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63
- bbfc8ca7ce-427 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:46
- bbfc8ca7ce-428 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:196
- bbfc8ca7ce-429 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- bbfc8ca7ce-430 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- bbfc8ca7ce-431 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- bbfc8ca7ce-432 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47
- bbfc8ca7ce-433 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- bbfc8ca7ce-434 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- bbfc8ca7ce-435 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- bbfc8ca7ce-436 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24

## Issues

# WARN bbfc8ca7ce-1 error-messages-carry-context `packages/apps/composer-crx/src/core/image/image.ts:60`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 60-71 (`const contentType =`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-2 moon-yml-entrypoint-registration `packages/common/effect/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.81. The likeliest place is lines 25-36 (`"./DynamicRuntime": {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-3 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:1`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 1-38 (`import * as Duration from 'effect/Duration';`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-4 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-5 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 129-140 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-6 structured-logging-not-console `packages/core/compute/agent-claude/src/Demo.test.ts:42`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 42-53 (`for (const message of collected) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-7 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.87. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-8 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-9 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-10 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-11 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 203-210 (`return result.error ?? Schema.decodeUnknownSync(Schema.String)(JSON.parse(Str...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-12 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 148-154 (`),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-13 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-14 no-casts `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 237-245 (`const readBody = async (init?: RequestInit): Promise<any> => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-15 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-16 error-messages-carry-context `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 957-965 (`const error = (patch?: string) =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-17 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 293-304 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-18 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-19 namespace-export-with-internal-hiding `packages/core/compute/assistant-toolkit/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-11 (`export * from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-20 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as AlarmSkill from './AlarmSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-21 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/automation/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as AutomationSkill from './AutomationSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-22 test-asserts-real-behavior `packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 23-34 (`describe('WebSearchSkill', () => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-23 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 140-151 (`const addChecklist = (chat: Chat.Chat) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-24 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-25 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-26 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-27 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-28 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-29 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-30 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-31 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-32 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-33 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-34 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 426-449 (`const manager = yield* ProcessManager.Service;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-35 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1455-1478 (`);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-36 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-37 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-38 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.80. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-39 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 350-361 (`};`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-40 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-373 (`};`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-41 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-42 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-43 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-44 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.80. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-45 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-46 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-47 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-48 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-49 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-50 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-51 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-52 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-53 no-casts `packages/core/compute/compute/src/Process.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 327-346 (`[ProcessTypeId]: {} as any,`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-54 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-55 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-56 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-57 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-83 (`}`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-58 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-59 flat-layer-composition `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:102`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 102-113 (`const resolverLayer = () =>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-60 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-61 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-62 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-63 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-64 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-65 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-66 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 112-123 (`},`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-67 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-68 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-69 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-70 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-71 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-72 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-73 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-74 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-75 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-76 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:131`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 131-142 (`Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-77 namespace-brand-key-prefixing `packages/core/compute/pipeline/src/Stage.test.ts:14`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 14-25 (`describe('Stage.map', () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-78 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-79 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-80 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-81 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 154-164 (`});`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-82 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-83 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-84 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-85 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:266`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 266-277 (`});`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-86 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-87 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-88 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-89 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-90 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-91 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.33). Judged with added `imports, public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-92 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1008`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1008-1031 (`return this._afterCreate<T>(handle.documentId);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-93 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1272`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1272-1295 (`private async _getContainingSpaceForDocument(documentId: string): Promise<Pub...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-94 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1728`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 1728-1751 (`private _leaseUntilSettled(documentId: DocumentId): void {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-95 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.92. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-96 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:195`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 195-206 (`const heads = ['hash1', 'hash2'];`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-97 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 29-36 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-98 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:205`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.92. The likeliest place is lines 205-216 (`removeRangeEffect(keyPrefix: StorageKey): Effect.Effect<void, SqlError.SqlErr...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-99 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-100 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 93-104 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-101 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-102 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-103 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-104 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-105 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-106 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-107 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-108 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:38`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 38-49 (`updateIndexes: () => Promise<void>;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-109 no-casts `packages/core/echo/echo-host/src/db-host/query-service.ts:406`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 406-417 (`} catch (err) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-110 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-111 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-112 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-113 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-114 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-115 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 884-907 (`break;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-116 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 46-57 (`export const createTestSqliteStorageAdapter = async (`, location confidence 0.27). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-117 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-118 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-119 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-120 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-121 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.90. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-122 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-123 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-124 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 666-687 (`return {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-125 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-126 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-127 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-128 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-129 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-130 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-131 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-132 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-133 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-134 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-135 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-136 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.86. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-137 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-138 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-139 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-140 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-141 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-142 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-143 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-144 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-145 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-146 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-147 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-148 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-149 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-150 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-151 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-152 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/index-tracker.ts:79`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.82. The likeliest place is lines 79-90 (`AND (${spaceIdParam} IS NULL OR spaceId = ${spaceIdParam})`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-153 no-mixed-promise-effect-lifecycle `packages/core/halo/keyring/src/sqlite-keyring.ts:43`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 43-54 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.46). Judged with added `importers, imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-154 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-155 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-156 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-157 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-158 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-159 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-160 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-161 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-162 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 59-70 (`try {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-163 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 129-140 (`let response: any;`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-164 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-165 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-166 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 51-62 (`}, [manager]);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-167 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:111`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.82. The likeliest place is lines 111-122 (`const loadedLabel = running`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-168 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`.action(`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-169 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-170 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.88. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-171 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:52`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 52-63 (`export const useMcpServerStatus = (`, location confidence 0.76). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-172 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 131-142 (`const authorize = (server: McpServer.McpServer, popup: Window | null) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-173 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:144`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 144-155 (`AssistantPlugin({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-174 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-175 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-176 reuse-shared-test-layer `packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 438-449 (`const makeSpaceLayer = (agentService: AgentService.Service) =>`, location confidence 0.34). Judged with added `siblings, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-177 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-178 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:273`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 273-284 (`<Banner.Body>{t('mirror-unresolved.label')}</Banner.Body>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-179 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 103-114 (`useEffect(() => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-180 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-181 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-182 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-183 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-184 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-185 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 83-92 (`);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-186 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-187 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-188 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-189 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 94-105 (`}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-190 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 251-262 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-191 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 494-517 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-192 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-193 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-194 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-195 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-196 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 62-73 (`);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-197 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-198 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 96-107 (`data: () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-199 namespace-export-with-internal-hiding `packages/plugins/plugin-crm/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as CrmPlugin from './CrmPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-200 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-201 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 65-76 (`useEffect(() => {`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-202 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:101`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 101-112 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-203 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:185`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 185-196 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-204 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-205 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-206 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-207 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 188-213 (`return (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-208 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:496`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 496-519 (`useEffect(() => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-209 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-210 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-211 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-212 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-213 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-214 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-215 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-216 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-217 business-logic-out-of-ui `packages/plugins/plugin-file-system/src/containers/WorkspaceSettingsContainer.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 68-79 (`),`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-218 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-219 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-220 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Field.Input readOnly value={reference} classNames='grow' />`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-221 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-222 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-223 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 101-112 (`value={url}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-224 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-225 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 39-50 (`try {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-226 structured-logging-not-console `packages/plugins/plugin-google/src/operations/mail/sync/sync-bench.test.ts:103`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 103-114 (`perMessageMs: round(stat.totalMs / newMessages),`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-227 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-228 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 78-98 (`const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Laye...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-229 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-230 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.81. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-231 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-232 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-233 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-234 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-235 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.69). Judged with added `test` context after a first pass of 0.51. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-236 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-237 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-238 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/skills/InboxSendSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-15 (`import type * as Operation from '@dxos/compute/Operation';`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-239 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-240 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-241 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-242 namespace-export-with-internal-hiding `packages/plugins/plugin-jmap/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as JmapPlugin from './JmapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-243 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-244 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 109-120 (`() =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-245 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:145`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 145-156 (`<img src={cover} alt='' className='w-[6rem] aspect-[2/3] shrink-0 self-start ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-246 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 106-117 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-247 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 106-117 (`}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-248 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-linear/src/operations/sync.test.ts:48`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 48-59 (`describe('plugin-linear sync', () => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-249 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-250 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-251 namespace-export-with-internal-hiding `packages/plugins/plugin-map/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-9 (`export * as MapPlugin from './MapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-252 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-253 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-254 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 53-64 (`const waitFor = (count: number, current: () => number) =>`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-255 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-256 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-257 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.90. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-258 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-259 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-260 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-261 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-262 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-263 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-264 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 124-135 (`const fiber = Effect.runFork(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-265 namespace-export-with-internal-hiding `packages/plugins/plugin-projects/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-10 (`export * as ProjectsPlugin from './ProjectsPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-266 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 69-80 (`expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox....`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-267 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-268 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 130-141 (`}`, location confidence 0.52). Judged with added `diff, imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-269 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-270 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-271 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-272 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:263`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 263-273 (`const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-273 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 40-46 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-274 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-275 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-276 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-277 namespace-export-with-internal-hiding `packages/plugins/plugin-sandbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as SandboxPlugin from './SandboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-278 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.84. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-279 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 59-70 (`Object.entries(fields).some(([, value]) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-280 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-281 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-282 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-283 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-284 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-285 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:236`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 236-247 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-286 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-287 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-288 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-16 (`const observabilityWith = (support: Observability.Observability['support']): ...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-289 namespace-export-with-internal-hiding `packages/plugins/plugin-table/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as TablePlugin from './TablePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-290 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-291 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-292 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-293 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 301-312 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-294 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-295 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-296 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-297 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.37). Judged with added `test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-298 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-299 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-300 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-301 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-302 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-303 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-304 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-305 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 114-125 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-306 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 205-216 (`const remoteProcessManagerLayer = RemoteProcessManager.layerNoop.pipe(Layer.p...`, location confidence 0.30). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-307 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:217`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 217-228 (`const managedRuntime = ManagedRuntime.make(runtimeLayer as Layer.Layer<any, a...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-308 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 253-264 (`const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.ru...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-309 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-310 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-311 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-312 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-313 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-314 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 351-362 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-315 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-316 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-317 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 893-917 (`release();`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-318 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-319 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-320 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-321 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-322 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 206-217 (`}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-323 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-324 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-325 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:396`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 396-419 (`});`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-326 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-327 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-328 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-329 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-330 test-asserts-real-behavior `packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 33-44 (`});`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-331 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-332 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-333 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-334 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-335 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-336 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-337 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.81. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-338 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/spaces.ts:73`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 73-85 (`unsubscribe = dataSpaceManager.updated.on(() => update());`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-339 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-340 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-341 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-342 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-343 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-344 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-345 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.81. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-346 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 93-104 (`update();`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-347 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-348 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-349 no-casts `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 137-148 (`log.error('failed to load metadata from SQLite', { err });`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-350 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-351 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-352 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 148-159 (`yield* Hook.on(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-353 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-354 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-355 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 488-499 (`});`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-356 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-357 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-358 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-359 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 429-452 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-360 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-361 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-362 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-363 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-364 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-365 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 1157-1180 (`const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-366 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.91. The likeliest place is lines 188-199 (`);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-367 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-368 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-369 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-370 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-371 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-372 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-373 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-374 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-375 no-casts `packages/sdk/client/src/services/local-client-services.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 211-222 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-376 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-377 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-378 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-379 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-380 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-381 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-382 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-383 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.85. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-384 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-385 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 274-285 (`const mutableParent = parent as Obj.Mutable<JsonSchema.JsonSchema>;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-386 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-387 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-388 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-389 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-390 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-391 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.82. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-392 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-393 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-394 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-395 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-396 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-397 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-398 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 79-85 (`}`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-399 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.86. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-400 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 116-127 (`{`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-401 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.90. The likeliest place is lines 200-207 (`}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-402 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-403 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-404 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-405 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-406 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-407 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-408 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-409 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-410 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-411 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-412 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-413 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-414 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-415 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 254-265 (`<>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-416 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 18-29 (`export const getDefaultValue = (ast?: SchemaAST.AST): any => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-417 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 98-109 (`const handleChange = useCallback(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-418 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 28-39 (`const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-419 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:189`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.85. The likeliest place is lines 189-200 (`<Field.Root key={item.id}>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-420 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 84-95 (`);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-421 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:155`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 155-164 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-422 no-casts `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 87-98 (`}`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-423 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-48 (`expect(resolved!.segments).toEqual(['origin']);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-424 no-casts `packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 37-48 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-425 no-casts `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 81-92 (`Obj.update(object, (object) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-426 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 63-74 (`const handleCreate = useCallback(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-427 no-casts `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 46-55 (`export const ObjectTree = ObjectTreeImpl as unknown as <T>(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-428 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:196`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 196-207 (`const query =`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-429 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-430 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-431 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-432 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 47-58 (`useEffect(() => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-433 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-434 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bbfc8ca7ce-435 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bbfc8ca7ce-436 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1b40b48e6290c98b7ce6a8c46ac6eb46bcf4623c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 436 violations written to fragments, 4218 uncertain, 30805 clean, 0 unanswered
- left for an agentic reviewer: 334 batch(es)

```text
requests: 14177 (2961 verdicts re-asked with context the model requested)
estimated input tokens: 102695097
billed input tokens: 96738511 (cost $4.0630)
measured chars per token: 3.18
```

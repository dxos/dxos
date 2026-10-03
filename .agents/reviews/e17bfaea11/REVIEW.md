---
branch: HEAD
commit: e17bfaea113f0decfe57011c0d21364fca44f8d8
base: f20abf2340494295458ef52b0a6917d68c77e4fd
mode: fast
createdAt: 2026-10-02T23:23:41.353Z
isFinalized: true
groups: 6250
rules: [bounded-live-state, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-native-form-controls, no-pointless-indirection, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, reactive-state-via-atom-bridge, reuse-shared-test-layer, schema-declare-and-brand, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: e17bfaea11
---

_303 error(s), 781 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e17bfaea11-1 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:163
- e17bfaea11-2 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- e17bfaea11-3 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- e17bfaea11-4 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- e17bfaea11-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:34
- e17bfaea11-6 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:68
- e17bfaea11-7 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:80
- e17bfaea11-8 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- e17bfaea11-9 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:78
- e17bfaea11-10 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:25
- e17bfaea11-11 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/index.ts:13
- e17bfaea11-12 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:1
- e17bfaea11-13 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- e17bfaea11-14 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:129
- e17bfaea11-15 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:1
- e17bfaea11-16 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- e17bfaea11-17 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- e17bfaea11-18 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- e17bfaea11-19 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- e17bfaea11-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203
- e17bfaea11-21 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- e17bfaea11-22 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- e17bfaea11-23 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237
- e17bfaea11-24 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- e17bfaea11-25 - ignored - error-messages-carry-context - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957
- e17bfaea11-26 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:291
- e17bfaea11-27 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- e17bfaea11-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- e17bfaea11-29 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- e17bfaea11-30 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- e17bfaea11-31 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- e17bfaea11-32 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:77
- e17bfaea11-33 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- e17bfaea11-34 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- e17bfaea11-35 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- e17bfaea11-36 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- e17bfaea11-37 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- e17bfaea11-38 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- e17bfaea11-39 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426
- e17bfaea11-40 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455
- e17bfaea11-41 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- e17bfaea11-42 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- e17bfaea11-43 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- e17bfaea11-44 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- e17bfaea11-45 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- e17bfaea11-46 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- e17bfaea11-47 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- e17bfaea11-48 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- e17bfaea11-49 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- e17bfaea11-50 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- e17bfaea11-51 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- e17bfaea11-52 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- e17bfaea11-53 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- e17bfaea11-54 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- e17bfaea11-55 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- e17bfaea11-56 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:327
- e17bfaea11-57 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- e17bfaea11-58 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- e17bfaea11-59 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- e17bfaea11-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- e17bfaea11-61 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- e17bfaea11-62 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- e17bfaea11-63 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- e17bfaea11-64 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- e17bfaea11-65 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- e17bfaea11-66 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- e17bfaea11-67 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- e17bfaea11-68 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- e17bfaea11-69 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- e17bfaea11-70 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- e17bfaea11-71 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- e17bfaea11-72 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- e17bfaea11-73 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- e17bfaea11-74 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- e17bfaea11-75 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- e17bfaea11-76 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- e17bfaea11-77 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- e17bfaea11-78 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- e17bfaea11-79 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:155
- e17bfaea11-80 - ignored - namespace-brand-key-prefixing - packages/core/compute/pipeline/src/Stage.test.ts:14
- e17bfaea11-81 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- e17bfaea11-82 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- e17bfaea11-83 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- e17bfaea11-84 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- e17bfaea11-85 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- e17bfaea11-86 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- e17bfaea11-87 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- e17bfaea11-88 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- e17bfaea11-89 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- e17bfaea11-90 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- e17bfaea11-91 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- e17bfaea11-92 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- e17bfaea11-93 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- e17bfaea11-94 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1008
- e17bfaea11-95 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1272
- e17bfaea11-96 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1728
- e17bfaea11-97 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- e17bfaea11-98 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:195
- e17bfaea11-99 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- e17bfaea11-100 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:205
- e17bfaea11-101 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- e17bfaea11-102 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- e17bfaea11-103 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- e17bfaea11-104 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- e17bfaea11-105 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- e17bfaea11-106 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- e17bfaea11-107 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:109
- e17bfaea11-108 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- e17bfaea11-109 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- e17bfaea11-110 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:38
- e17bfaea11-111 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- e17bfaea11-112 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- e17bfaea11-113 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- e17bfaea11-114 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- e17bfaea11-115 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- e17bfaea11-116 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- e17bfaea11-117 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- e17bfaea11-118 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- e17bfaea11-119 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:134
- e17bfaea11-120 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- e17bfaea11-121 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- e17bfaea11-122 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- e17bfaea11-123 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- e17bfaea11-124 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- e17bfaea11-125 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- e17bfaea11-126 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- e17bfaea11-127 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- e17bfaea11-128 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- e17bfaea11-129 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- e17bfaea11-130 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- e17bfaea11-131 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- e17bfaea11-132 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- e17bfaea11-133 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- e17bfaea11-134 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- e17bfaea11-135 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- e17bfaea11-136 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- e17bfaea11-137 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- e17bfaea11-138 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- e17bfaea11-139 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- e17bfaea11-140 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- e17bfaea11-141 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- e17bfaea11-142 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- e17bfaea11-143 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- e17bfaea11-144 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- e17bfaea11-145 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- e17bfaea11-146 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- e17bfaea11-147 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- e17bfaea11-148 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- e17bfaea11-149 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- e17bfaea11-150 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- e17bfaea11-151 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- e17bfaea11-152 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- e17bfaea11-153 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/index-tracker.ts:103
- e17bfaea11-154 - ignored - error-messages-carry-context - packages/core/mesh/edge-client/src/edge-http-client.ts:157
- e17bfaea11-155 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:481
- e17bfaea11-156 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- e17bfaea11-157 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- e17bfaea11-158 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- e17bfaea11-159 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- e17bfaea11-160 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- e17bfaea11-161 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- e17bfaea11-162 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/components/ControlledSelector.tsx:9
- e17bfaea11-163 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:132
- e17bfaea11-164 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:37
- e17bfaea11-165 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:30
- e17bfaea11-166 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84
- e17bfaea11-167 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113
- e17bfaea11-168 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46
- e17bfaea11-169 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78
- e17bfaea11-170 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:46
- e17bfaea11-171 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89
- e17bfaea11-172 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- e17bfaea11-173 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39
- e17bfaea11-174 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60
- e17bfaea11-175 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:133
- e17bfaea11-176 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100
- e17bfaea11-177 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214
- e17bfaea11-178 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- e17bfaea11-179 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:41
- e17bfaea11-180 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123
- e17bfaea11-181 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:378
- e17bfaea11-182 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- e17bfaea11-183 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- e17bfaea11-184 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:44
- e17bfaea11-185 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:59
- e17bfaea11-186 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193
- e17bfaea11-187 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117
- e17bfaea11-188 - ignored - no-invented-theme-tokens - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:95
- e17bfaea11-189 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:51
- e17bfaea11-190 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53
- e17bfaea11-191 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113
- e17bfaea11-192 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- e17bfaea11-193 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131
- e17bfaea11-194 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:66
- e17bfaea11-195 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- e17bfaea11-196 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:142
- e17bfaea11-197 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:154
- e17bfaea11-198 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:287
- e17bfaea11-199 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:109
- e17bfaea11-200 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- e17bfaea11-201 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- e17bfaea11-202 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- e17bfaea11-203 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:142
- e17bfaea11-204 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- e17bfaea11-205 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- e17bfaea11-206 - ignored - reuse-shared-test-layer - packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438
- e17bfaea11-207 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99
- e17bfaea11-208 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:279
- e17bfaea11-209 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:111
- e17bfaea11-210 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:255
- e17bfaea11-211 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:134
- e17bfaea11-212 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121
- e17bfaea11-213 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:205
- e17bfaea11-214 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:89
- e17bfaea11-215 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:185
- e17bfaea11-216 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- e17bfaea11-217 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- e17bfaea11-218 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- e17bfaea11-219 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- e17bfaea11-220 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- e17bfaea11-221 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- e17bfaea11-222 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- e17bfaea11-223 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61
- e17bfaea11-224 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109
- e17bfaea11-225 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:133
- e17bfaea11-226 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31
- e17bfaea11-227 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55
- e17bfaea11-228 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94
- e17bfaea11-229 - ignored - no-casts - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34
- e17bfaea11-230 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46
- e17bfaea11-231 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- e17bfaea11-232 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108
- e17bfaea11-233 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- e17bfaea11-234 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96
- e17bfaea11-235 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44
- e17bfaea11-236 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:65
- e17bfaea11-237 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:77
- e17bfaea11-238 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- e17bfaea11-239 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:72
- e17bfaea11-240 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:96
- e17bfaea11-241 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- e17bfaea11-242 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-claude/src/index.ts:1
- e17bfaea11-243 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- e17bfaea11-244 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- e17bfaea11-245 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- e17bfaea11-246 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48
- e17bfaea11-247 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96
- e17bfaea11-248 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:93
- e17bfaea11-249 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:257
- e17bfaea11-250 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:35
- e17bfaea11-251 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:35
- e17bfaea11-252 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:71
- e17bfaea11-253 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47
- e17bfaea11-254 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41
- e17bfaea11-255 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-client/src/index.ts:1
- e17bfaea11-256 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- e17bfaea11-257 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:74
- e17bfaea11-258 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67
- e17bfaea11-259 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102
- e17bfaea11-260 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:190
- e17bfaea11-261 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18
- e17bfaea11-262 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79
- e17bfaea11-263 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130
- e17bfaea11-264 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- e17bfaea11-265 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- e17bfaea11-266 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- e17bfaea11-267 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- e17bfaea11-268 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166
- e17bfaea11-269 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- e17bfaea11-270 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62
- e17bfaea11-271 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- e17bfaea11-272 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:71
- e17bfaea11-273 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54
- e17bfaea11-274 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- e17bfaea11-275 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:87
- e17bfaea11-276 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- e17bfaea11-277 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx:26
- e17bfaea11-278 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:64
- e17bfaea11-279 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:88
- e17bfaea11-280 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70
- e17bfaea11-281 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82
- e17bfaea11-282 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- e17bfaea11-283 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- e17bfaea11-284 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- e17bfaea11-285 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49
- e17bfaea11-286 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:61
- e17bfaea11-287 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:181
- e17bfaea11-288 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:129
- e17bfaea11-289 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- e17bfaea11-290 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- e17bfaea11-291 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- e17bfaea11-292 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-deck/src/capabilities/url-handler.ts:37
- e17bfaea11-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45
- e17bfaea11-294 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:49
- e17bfaea11-295 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:137
- e17bfaea11-296 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:24
- e17bfaea11-297 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- e17bfaea11-298 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30
- e17bfaea11-299 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188
- e17bfaea11-300 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- e17bfaea11-301 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83
- e17bfaea11-302 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:169
- e17bfaea11-303 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:46
- e17bfaea11-304 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- e17bfaea11-305 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- e17bfaea11-306 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:102
- e17bfaea11-307 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- e17bfaea11-308 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55
- e17bfaea11-309 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67
- e17bfaea11-310 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157
- e17bfaea11-311 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- e17bfaea11-312 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- e17bfaea11-313 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- e17bfaea11-314 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- e17bfaea11-315 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- e17bfaea11-316 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- e17bfaea11-317 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- e17bfaea11-318 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111
- e17bfaea11-319 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- e17bfaea11-320 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- e17bfaea11-321 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- e17bfaea11-322 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- e17bfaea11-323 - ignored - no-native-form-controls - packages/plugins/plugin-file/src/components/FileInput/FileInput.tsx:29
- e17bfaea11-324 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297
- e17bfaea11-325 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- e17bfaea11-326 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:109
- e17bfaea11-327 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278
- e17bfaea11-328 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- e17bfaea11-329 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:44
- e17bfaea11-330 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:80
- e17bfaea11-331 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- e17bfaea11-332 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- e17bfaea11-333 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- e17bfaea11-334 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:91
- e17bfaea11-335 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:91
- e17bfaea11-336 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- e17bfaea11-337 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- e17bfaea11-338 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:91
- e17bfaea11-339 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-google/src/index.ts:1
- e17bfaea11-340 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- e17bfaea11-341 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- e17bfaea11-342 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- e17bfaea11-343 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210
- e17bfaea11-344 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- e17bfaea11-345 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:138
- e17bfaea11-346 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:162
- e17bfaea11-347 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95
- e17bfaea11-348 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:181
- e17bfaea11-349 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74
- e17bfaea11-350 - ignored - subscribe-where-you-read - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:34
- e17bfaea11-351 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- e17bfaea11-352 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- e17bfaea11-353 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- e17bfaea11-354 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297
- e17bfaea11-355 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:428
- e17bfaea11-356 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:171
- e17bfaea11-357 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:207
- e17bfaea11-358 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:299
- e17bfaea11-359 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- e17bfaea11-360 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- e17bfaea11-361 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- e17bfaea11-362 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:240
- e17bfaea11-363 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- e17bfaea11-364 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:31
- e17bfaea11-365 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:175
- e17bfaea11-366 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-inbox/src/index.ts:1
- e17bfaea11-367 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- e17bfaea11-368 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- e17bfaea11-369 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- e17bfaea11-370 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- e17bfaea11-371 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- e17bfaea11-372 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- e17bfaea11-373 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- e17bfaea11-374 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- e17bfaea11-375 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- e17bfaea11-376 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:53
- e17bfaea11-377 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77
- e17bfaea11-378 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77
- e17bfaea11-379 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-jmap/src/index.ts:1
- e17bfaea11-380 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync.test.ts:60
- e17bfaea11-381 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- e17bfaea11-382 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- e17bfaea11-383 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- e17bfaea11-384 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- e17bfaea11-385 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- e17bfaea11-386 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:39
- e17bfaea11-387 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- e17bfaea11-388 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:150
- e17bfaea11-389 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109
- e17bfaea11-390 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109
- e17bfaea11-391 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- e17bfaea11-392 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- e17bfaea11-393 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-linear/src/operations/sync.test.ts:48
- e17bfaea11-394 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28
- e17bfaea11-395 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74
- e17bfaea11-396 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36
- e17bfaea11-397 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110
- e17bfaea11-398 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77
- e17bfaea11-399 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:74
- e17bfaea11-400 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- e17bfaea11-401 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- e17bfaea11-402 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:86
- e17bfaea11-403 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:75
- e17bfaea11-404 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:99
- e17bfaea11-405 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- e17bfaea11-406 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- e17bfaea11-407 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76
- e17bfaea11-408 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-map/src/index.ts:1
- e17bfaea11-409 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- e17bfaea11-410 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188
- e17bfaea11-411 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:120
- e17bfaea11-412 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:336
- e17bfaea11-413 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- e17bfaea11-414 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- e17bfaea11-415 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- e17bfaea11-416 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- e17bfaea11-417 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- e17bfaea11-418 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59
- e17bfaea11-419 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71
- e17bfaea11-420 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- e17bfaea11-421 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- e17bfaea11-422 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.stories.tsx:68
- e17bfaea11-423 - ignored - comment-hygiene - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23
- e17bfaea11-424 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132
- e17bfaea11-425 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:48
- e17bfaea11-426 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:88
- e17bfaea11-427 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:100
- e17bfaea11-428 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:128
- e17bfaea11-429 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190
- e17bfaea11-430 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:238
- e17bfaea11-431 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:96
- e17bfaea11-432 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:151
- e17bfaea11-433 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:23
- e17bfaea11-434 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41
- e17bfaea11-435 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313
- e17bfaea11-436 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88
- e17bfaea11-437 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216
- e17bfaea11-438 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- e17bfaea11-439 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82
- e17bfaea11-440 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- e17bfaea11-441 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69
- e17bfaea11-442 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22
- e17bfaea11-443 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16
- e17bfaea11-444 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:36
- e17bfaea11-445 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:158
- e17bfaea11-446 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:374
- e17bfaea11-447 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:870
- e17bfaea11-448 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- e17bfaea11-449 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:47
- e17bfaea11-450 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:84
- e17bfaea11-451 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:109
- e17bfaea11-452 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- e17bfaea11-453 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16
- e17bfaea11-454 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78
- e17bfaea11-455 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- e17bfaea11-456 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- e17bfaea11-457 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- e17bfaea11-458 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- e17bfaea11-459 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- e17bfaea11-460 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:35
- e17bfaea11-461 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- e17bfaea11-462 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- e17bfaea11-463 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130
- e17bfaea11-464 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81
- e17bfaea11-465 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- e17bfaea11-466 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- e17bfaea11-467 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- e17bfaea11-468 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:107
- e17bfaea11-469 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:155
- e17bfaea11-470 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:180
- e17bfaea11-471 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:43
- e17bfaea11-472 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55
- e17bfaea11-473 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:138
- e17bfaea11-474 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:150
- e17bfaea11-475 - ignored - no-casts - packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:32
- e17bfaea11-476 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- e17bfaea11-477 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-registry/src/index.ts:1
- e17bfaea11-478 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138
- e17bfaea11-479 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:59
- e17bfaea11-480 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35
- e17bfaea11-481 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:104
- e17bfaea11-482 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- e17bfaea11-483 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456
- e17bfaea11-484 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226
- e17bfaea11-485 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-review/src/index.ts:1
- e17bfaea11-486 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- e17bfaea11-487 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- e17bfaea11-488 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- e17bfaea11-489 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:39
- e17bfaea11-490 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:265
- e17bfaea11-491 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:334
- e17bfaea11-492 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:311
- e17bfaea11-493 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60
- e17bfaea11-494 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60
- e17bfaea11-495 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:188
- e17bfaea11-496 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42
- e17bfaea11-497 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309
- e17bfaea11-498 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164
- e17bfaea11-499 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx:32
- e17bfaea11-500 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- e17bfaea11-501 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- e17bfaea11-502 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- e17bfaea11-503 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- e17bfaea11-504 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38
- e17bfaea11-505 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:94
- e17bfaea11-506 - ignored - no-sleep-in-test - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226
- e17bfaea11-507 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:84
- e17bfaea11-508 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- e17bfaea11-509 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141
- e17bfaea11-510 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:134
- e17bfaea11-511 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:71
- e17bfaea11-512 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92
- e17bfaea11-513 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:78
- e17bfaea11-514 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- e17bfaea11-515 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:80
- e17bfaea11-516 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188
- e17bfaea11-517 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40
- e17bfaea11-518 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:36
- e17bfaea11-519 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-script/src/index.ts:1
- e17bfaea11-520 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60
- e17bfaea11-521 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- e17bfaea11-522 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- e17bfaea11-523 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:59
- e17bfaea11-524 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- e17bfaea11-525 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81
- e17bfaea11-526 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87
- e17bfaea11-527 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:315
- e17bfaea11-528 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471
- e17bfaea11-529 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:27
- e17bfaea11-530 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:39
- e17bfaea11-531 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:75
- e17bfaea11-532 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270
- e17bfaea11-533 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42
- e17bfaea11-534 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- e17bfaea11-535 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- e17bfaea11-536 - ignored - comment-hygiene - packages/plugins/plugin-sheet/src/translations.ts:47
- e17bfaea11-537 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:22
- e17bfaea11-538 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- e17bfaea11-539 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- e17bfaea11-540 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- e17bfaea11-541 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- e17bfaea11-542 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- e17bfaea11-543 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250
- e17bfaea11-544 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/ForeignKeys/ForeignKeys.tsx:37
- e17bfaea11-545 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50
- e17bfaea11-546 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:114
- e17bfaea11-547 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:98
- e17bfaea11-548 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- e17bfaea11-549 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- e17bfaea11-550 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:264
- e17bfaea11-551 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- e17bfaea11-552 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:239
- e17bfaea11-553 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:51
- e17bfaea11-554 - ignored - comment-hygiene - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:55
- e17bfaea11-555 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:227
- e17bfaea11-556 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:79
- e17bfaea11-557 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-space/src/index.ts:1
- e17bfaea11-558 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- e17bfaea11-559 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- e17bfaea11-560 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60
- e17bfaea11-561 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:205
- e17bfaea11-562 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:182
- e17bfaea11-563 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:229
- e17bfaea11-564 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32
- e17bfaea11-565 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- e17bfaea11-566 - ignored - comment-hygiene - packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13
- e17bfaea11-567 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- e17bfaea11-568 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:51
- e17bfaea11-569 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:88
- e17bfaea11-570 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:100
- e17bfaea11-571 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:44
- e17bfaea11-572 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:35
- e17bfaea11-573 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58
- e17bfaea11-574 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:118
- e17bfaea11-575 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:77
- e17bfaea11-576 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:113
- e17bfaea11-577 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45
- e17bfaea11-578 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- e17bfaea11-579 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- e17bfaea11-580 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:65
- e17bfaea11-581 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137
- e17bfaea11-582 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113
- e17bfaea11-583 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:149
- e17bfaea11-584 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15
- e17bfaea11-585 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:39
- e17bfaea11-586 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- e17bfaea11-587 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- e17bfaea11-588 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- e17bfaea11-589 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60
- e17bfaea11-590 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:58
- e17bfaea11-591 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:94
- e17bfaea11-592 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:36
- e17bfaea11-593 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:161
- e17bfaea11-594 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- e17bfaea11-595 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-table/src/index.ts:1
- e17bfaea11-596 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69
- e17bfaea11-597 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125
- e17bfaea11-598 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:21
- e17bfaea11-599 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61
- e17bfaea11-600 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:87
- e17bfaea11-601 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40
- e17bfaea11-602 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59
- e17bfaea11-603 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:216
- e17bfaea11-604 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- e17bfaea11-605 - ignored - error-messages-carry-context - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:581
- e17bfaea11-606 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78
- e17bfaea11-607 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330
- e17bfaea11-608 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- e17bfaea11-609 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- e17bfaea11-610 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107
- e17bfaea11-611 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86
- e17bfaea11-612 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- e17bfaea11-613 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:235
- e17bfaea11-614 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- e17bfaea11-615 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:135
- e17bfaea11-616 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- e17bfaea11-617 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- e17bfaea11-618 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- e17bfaea11-619 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- e17bfaea11-620 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253
- e17bfaea11-621 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- e17bfaea11-622 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:153
- e17bfaea11-623 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- e17bfaea11-624 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- e17bfaea11-625 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- e17bfaea11-626 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- e17bfaea11-627 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- e17bfaea11-628 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- e17bfaea11-629 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- e17bfaea11-630 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- e17bfaea11-631 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- e17bfaea11-632 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:57
- e17bfaea11-633 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:41
- e17bfaea11-634 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- e17bfaea11-635 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- e17bfaea11-636 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- e17bfaea11-637 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56
- e17bfaea11-638 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:30
- e17bfaea11-639 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- e17bfaea11-640 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- e17bfaea11-641 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- e17bfaea11-642 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:70
- e17bfaea11-643 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:154
- e17bfaea11-644 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:232
- e17bfaea11-645 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- e17bfaea11-646 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- e17bfaea11-647 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- e17bfaea11-648 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- e17bfaea11-649 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- e17bfaea11-650 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:61
- e17bfaea11-651 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- e17bfaea11-652 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- e17bfaea11-653 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- e17bfaea11-654 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- e17bfaea11-655 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351
- e17bfaea11-656 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- e17bfaea11-657 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- e17bfaea11-658 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.test.ts:459
- e17bfaea11-659 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- e17bfaea11-660 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- e17bfaea11-661 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- e17bfaea11-662 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- e17bfaea11-663 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:227
- e17bfaea11-664 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- e17bfaea11-665 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206
- e17bfaea11-666 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- e17bfaea11-667 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- e17bfaea11-668 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:128
- e17bfaea11-669 - ignored - no-sleep-in-test - packages/sdk/client-e2e/src/spaces.test.ts:65
- e17bfaea11-670 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- e17bfaea11-671 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- e17bfaea11-672 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- e17bfaea11-673 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- e17bfaea11-674 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- e17bfaea11-675 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- e17bfaea11-676 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- e17bfaea11-677 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- e17bfaea11-678 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- e17bfaea11-679 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- e17bfaea11-680 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/spaces.ts:73
- e17bfaea11-681 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- e17bfaea11-682 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- e17bfaea11-683 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- e17bfaea11-684 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- e17bfaea11-685 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- e17bfaea11-686 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- e17bfaea11-687 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- e17bfaea11-688 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- e17bfaea11-689 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- e17bfaea11-690 - ignored - no-casts - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137
- e17bfaea11-691 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- e17bfaea11-692 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- e17bfaea11-693 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25
- e17bfaea11-694 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- e17bfaea11-695 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- e17bfaea11-696 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- e17bfaea11-697 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- e17bfaea11-698 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- e17bfaea11-699 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- e17bfaea11-700 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:597
- e17bfaea11-701 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- e17bfaea11-702 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- e17bfaea11-703 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- e17bfaea11-704 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- e17bfaea11-705 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/space/space-manager.ts:97
- e17bfaea11-706 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- e17bfaea11-707 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- e17bfaea11-708 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- e17bfaea11-709 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- e17bfaea11-710 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- e17bfaea11-711 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- e17bfaea11-712 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- e17bfaea11-713 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- e17bfaea11-714 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- e17bfaea11-715 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- e17bfaea11-716 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:235
- e17bfaea11-717 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- e17bfaea11-718 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- e17bfaea11-719 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/observability/src/ai/AiObservability.test.ts:372
- e17bfaea11-720 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- e17bfaea11-721 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- e17bfaea11-722 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- e17bfaea11-723 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- e17bfaea11-724 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- e17bfaea11-725 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- e17bfaea11-726 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- e17bfaea11-727 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- e17bfaea11-728 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- e17bfaea11-729 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- e17bfaea11-730 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- e17bfaea11-731 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:274
- e17bfaea11-732 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- e17bfaea11-733 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- e17bfaea11-734 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- e17bfaea11-735 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- e17bfaea11-736 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- e17bfaea11-737 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- e17bfaea11-738 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- e17bfaea11-739 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- e17bfaea11-740 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- e17bfaea11-741 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- e17bfaea11-742 - ignored - comment-hygiene - packages/sdk/shell/src/components/Panel/Action.tsx:106
- e17bfaea11-743 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:34
- e17bfaea11-744 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- e17bfaea11-745 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- e17bfaea11-746 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- e17bfaea11-747 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- e17bfaea11-748 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- e17bfaea11-749 - ignored - no-invented-theme-tokens - packages/stories/stories-assistant/src/modules/AgentModule.tsx:55
- e17bfaea11-750 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61
- e17bfaea11-751 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- e17bfaea11-752 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:342
- e17bfaea11-753 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- e17bfaea11-754 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- e17bfaea11-755 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- e17bfaea11-756 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- e17bfaea11-757 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- e17bfaea11-758 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:30
- e17bfaea11-759 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.ts:41
- e17bfaea11-760 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- e17bfaea11-761 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- e17bfaea11-762 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112
- e17bfaea11-763 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:77
- e17bfaea11-764 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:173
- e17bfaea11-765 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:226
- e17bfaea11-766 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- e17bfaea11-767 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:29
- e17bfaea11-768 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- e17bfaea11-769 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:153
- e17bfaea11-770 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:370
- e17bfaea11-771 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97
- e17bfaea11-772 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- e17bfaea11-773 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346
- e17bfaea11-774 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153
- e17bfaea11-775 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:143
- e17bfaea11-776 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- e17bfaea11-777 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156
- e17bfaea11-778 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246
- e17bfaea11-779 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:89
- e17bfaea11-780 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- e17bfaea11-781 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- e17bfaea11-782 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:163
- e17bfaea11-783 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:190
- e17bfaea11-784 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- e17bfaea11-785 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- e17bfaea11-786 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88
- e17bfaea11-787 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124
- e17bfaea11-788 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- e17bfaea11-789 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- e17bfaea11-790 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- e17bfaea11-791 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- e17bfaea11-792 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76
- e17bfaea11-793 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- e17bfaea11-794 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- e17bfaea11-795 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- e17bfaea11-796 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50
- e17bfaea11-797 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15
- e17bfaea11-798 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- e17bfaea11-799 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:45
- e17bfaea11-800 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28
- e17bfaea11-801 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- e17bfaea11-802 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- e17bfaea11-803 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:43
- e17bfaea11-804 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24
- e17bfaea11-805 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- e17bfaea11-806 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- e17bfaea11-807 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- e17bfaea11-808 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57
- e17bfaea11-809 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120
- e17bfaea11-810 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- e17bfaea11-811 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82
- e17bfaea11-812 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106
- e17bfaea11-813 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194
- e17bfaea11-814 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- e17bfaea11-815 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- e17bfaea11-816 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:222
- e17bfaea11-817 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:346
- e17bfaea11-818 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:42
- e17bfaea11-819 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16
- e17bfaea11-820 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114
- e17bfaea11-821 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161
- e17bfaea11-822 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240
- e17bfaea11-823 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14
- e17bfaea11-824 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- e17bfaea11-825 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- e17bfaea11-826 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- e17bfaea11-827 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- e17bfaea11-828 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169
- e17bfaea11-829 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40
- e17bfaea11-830 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14
- e17bfaea11-831 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28
- e17bfaea11-832 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:15
- e17bfaea11-833 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27
- e17bfaea11-834 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:270
- e17bfaea11-835 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:127
- e17bfaea11-836 - ignored - event-handler-naming-convention - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:163
- e17bfaea11-837 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:290
- e17bfaea11-838 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:491
- e17bfaea11-839 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95
- e17bfaea11-840 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- e17bfaea11-841 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:93
- e17bfaea11-842 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:281
- e17bfaea11-843 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83
- e17bfaea11-844 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- e17bfaea11-845 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:61
- e17bfaea11-846 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- e17bfaea11-847 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:278
- e17bfaea11-848 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:20
- e17bfaea11-849 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- e17bfaea11-850 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- e17bfaea11-851 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- e17bfaea11-852 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440
- e17bfaea11-853 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452
- e17bfaea11-854 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607
- e17bfaea11-855 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56
- e17bfaea11-856 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120
- e17bfaea11-857 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- e17bfaea11-858 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228
- e17bfaea11-859 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:410
- e17bfaea11-860 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162
- e17bfaea11-861 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/debug/Debug.tsx:52
- e17bfaea11-862 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/debug/Debug.tsx:64
- e17bfaea11-863 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45
- e17bfaea11-864 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- e17bfaea11-865 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- e17bfaea11-866 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:83
- e17bfaea11-867 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:204
- e17bfaea11-868 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:398
- e17bfaea11-869 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/scenarios.tsx:421
- e17bfaea11-870 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:62
- e17bfaea11-871 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- e17bfaea11-872 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- e17bfaea11-873 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- e17bfaea11-874 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- e17bfaea11-875 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Card.stories.tsx:76
- e17bfaea11-876 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111
- e17bfaea11-877 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188
- e17bfaea11-878 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218
- e17bfaea11-879 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254
- e17bfaea11-880 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18
- e17bfaea11-881 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.tsx:98
- e17bfaea11-882 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.tsx:53
- e17bfaea11-883 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.stories.tsx:64
- e17bfaea11-884 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:52
- e17bfaea11-885 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:119
- e17bfaea11-886 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:99
- e17bfaea11-887 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:31
- e17bfaea11-888 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:192
- e17bfaea11-889 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx:155
- e17bfaea11-890 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:434
- e17bfaea11-891 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:157
- e17bfaea11-892 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87
- e17bfaea11-893 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:135
- e17bfaea11-894 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:213
- e17bfaea11-895 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37
- e17bfaea11-896 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37
- e17bfaea11-897 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.stories.tsx:116
- e17bfaea11-898 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:69
- e17bfaea11-899 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60
- e17bfaea11-900 - ignored - structured-logging-not-console - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60
- e17bfaea11-901 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.tsx:31
- e17bfaea11-902 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:137
- e17bfaea11-903 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63
- e17bfaea11-904 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:48
- e17bfaea11-905 - ignored - no-invented-theme-tokens - packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:172
- e17bfaea11-906 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:112
- e17bfaea11-907 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:280
- e17bfaea11-908 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:99
- e17bfaea11-909 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:116
- e17bfaea11-910 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:200
- e17bfaea11-911 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- e17bfaea11-912 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- e17bfaea11-913 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- e17bfaea11-914 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21
- e17bfaea11-915 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68
- e17bfaea11-916 - ignored - no-casts - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58
- e17bfaea11-917 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82
- e17bfaea11-918 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92
- e17bfaea11-919 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- e17bfaea11-920 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- e17bfaea11-921 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:59
- e17bfaea11-922 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:123
- e17bfaea11-923 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:207
- e17bfaea11-924 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317
- e17bfaea11-925 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-graph/src/components/SVG/Root.tsx:43
- e17bfaea11-926 - ignored - no-casts - packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20
- e17bfaea11-927 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116
- e17bfaea11-928 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207
- e17bfaea11-929 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119
- e17bfaea11-930 - ignored - comment-hygiene - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23
- e17bfaea11-931 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35
- e17bfaea11-932 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:225
- e17bfaea11-933 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98
- e17bfaea11-934 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:55
- e17bfaea11-935 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:102
- e17bfaea11-936 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:114
- e17bfaea11-937 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74
- e17bfaea11-938 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:58
- e17bfaea11-939 - ignored - no-casts - packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:223
- e17bfaea11-940 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Listbox/ListItemContent.stories.tsx:13
- e17bfaea11-941 - ignored - no-casts - packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:20
- e17bfaea11-942 - ignored - no-casts - packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:19
- e17bfaea11-943 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:115
- e17bfaea11-944 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293
- e17bfaea11-945 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711
- e17bfaea11-946 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:91
- e17bfaea11-947 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:359
- e17bfaea11-948 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:912
- e17bfaea11-949 - ignored - no-casts - packages/ui/react-ui-list/src/next/Tree/Tree.tsx:54
- e17bfaea11-950 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- e17bfaea11-951 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61
- e17bfaea11-952 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:88
- e17bfaea11-953 - ignored - no-casts - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- e17bfaea11-954 - ignored - no-casts - packages/ui/react-ui-menu/src/components/action-label.ts:17
- e17bfaea11-955 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20
- e17bfaea11-956 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:108
- e17bfaea11-957 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:87
- e17bfaea11-958 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268
- e17bfaea11-959 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:103
- e17bfaea11-960 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173
- e17bfaea11-961 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- e17bfaea11-962 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- e17bfaea11-963 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255
- e17bfaea11-964 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:119
- e17bfaea11-965 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:101
- e17bfaea11-966 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40
- e17bfaea11-967 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- e17bfaea11-968 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:84
- e17bfaea11-969 - ignored - structured-logging-not-console - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115
- e17bfaea11-970 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115
- e17bfaea11-971 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:500
- e17bfaea11-972 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31
- e17bfaea11-973 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97
- e17bfaea11-974 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118
- e17bfaea11-975 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:229
- e17bfaea11-976 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:48
- e17bfaea11-977 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:798
- e17bfaea11-978 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- e17bfaea11-979 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- e17bfaea11-980 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53
- e17bfaea11-981 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:133
- e17bfaea11-982 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:713
- e17bfaea11-983 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970
- e17bfaea11-984 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:497
- e17bfaea11-985 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:464
- e17bfaea11-986 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:99
- e17bfaea11-987 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- e17bfaea11-988 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:145
- e17bfaea11-989 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:75
- e17bfaea11-990 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:315
- e17bfaea11-991 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341
- e17bfaea11-992 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359
- e17bfaea11-993 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505
- e17bfaea11-994 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184
- e17bfaea11-995 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:152
- e17bfaea11-996 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- e17bfaea11-997 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:64
- e17bfaea11-998 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:148
- e17bfaea11-999 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:228
- e17bfaea11-1000 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:311
- e17bfaea11-1001 - ignored - moon-yml-entrypoint-registration - packages/ui/react-ui/package.json:25
- e17bfaea11-1002 - ignored - no-casts - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:30
- e17bfaea11-1003 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:77
- e17bfaea11-1004 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.tsx:89
- e17bfaea11-1005 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:78
- e17bfaea11-1006 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24
- e17bfaea11-1007 - ignored - no-casts - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:44
- e17bfaea11-1008 - ignored - no-casts - packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx:42
- e17bfaea11-1009 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Button/Button.stories.tsx:13
- e17bfaea11-1010 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:18
- e17bfaea11-1011 - ignored - no-casts - packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:135
- e17bfaea11-1012 - ignored - structured-logging-not-console - packages/ui/react-ui/src/components/Card/Card.stories.tsx:24
- e17bfaea11-1013 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx:23
- e17bfaea11-1014 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Carousel/index.ts:1
- e17bfaea11-1015 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx:48
- e17bfaea11-1016 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Column/Column.stories.tsx:90
- e17bfaea11-1017 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:51
- e17bfaea11-1018 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103
- e17bfaea11-1019 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Drawer/Drawer.stories.tsx:41
- e17bfaea11-1020 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:38
- e17bfaea11-1021 - ignored - no-casts - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:35
- e17bfaea11-1022 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.tsx:22
- e17bfaea11-1023 - ignored - no-casts - packages/ui/react-ui/src/components/Field/Field.stories.tsx:142
- e17bfaea11-1024 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Field/Field.stories.tsx:231
- e17bfaea11-1025 - ignored - themed-primitives-take-classNames - packages/ui/react-ui/src/components/Field/PinInput.tsx:24
- e17bfaea11-1026 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Field/PinInput.tsx:55
- e17bfaea11-1027 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Field/SegmentedInput.tsx:78
- e17bfaea11-1028 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx:30
- e17bfaea11-1029 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Focus/Focus.stories.tsx:26
- e17bfaea11-1030 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx:15
- e17bfaea11-1031 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Icon/Icon.stories.tsx:88
- e17bfaea11-1032 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Image/Image.stories.tsx:41
- e17bfaea11-1033 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Image/Image.stories.tsx:69
- e17bfaea11-1034 - ignored - bounded-live-state - packages/ui/react-ui/src/components/Image/Image.tsx:69
- e17bfaea11-1035 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Main/Main.stories.tsx:76
- e17bfaea11-1036 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/components/Main/Main.tsx:54
- e17bfaea11-1037 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/MediaPlayer/index.ts:1
- e17bfaea11-1038 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Menu/Menu.stories.tsx:210
- e17bfaea11-1039 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/MenuButton/MenuButton.stories.tsx:51
- e17bfaea11-1040 - ignored - no-hand-rolled-lists - packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:17
- e17bfaea11-1041 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:102
- e17bfaea11-1042 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:17
- e17bfaea11-1043 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:122
- e17bfaea11-1044 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Progress/index.ts:1
- e17bfaea11-1045 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:130
- e17bfaea11-1046 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/QrCode/index.ts:1
- e17bfaea11-1047 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:47
- e17bfaea11-1048 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:142
- e17bfaea11-1049 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Select/Select.stories.tsx:57
- e17bfaea11-1050 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19
- e17bfaea11-1051 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19
- e17bfaea11-1052 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Slider/Slider.stories.tsx:84
- e17bfaea11-1053 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:181
- e17bfaea11-1054 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/TextCrawl/index.ts:1
- e17bfaea11-1055 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:35
- e17bfaea11-1056 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:90
- e17bfaea11-1057 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.tsx:182
- e17bfaea11-1058 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:28
- e17bfaea11-1059 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Toast/Toast.tsx:186
- e17bfaea11-1060 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Toc/index.ts:1
- e17bfaea11-1061 - ignored - no-casts - packages/ui/react-ui/src/components/Toolbar/Toolbar.stories.tsx:69
- e17bfaea11-1062 - ignored - no-casts - packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:40
- e17bfaea11-1063 - ignored - no-casts - packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:55
- e17bfaea11-1064 - ignored - no-sleep-in-test - packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:79
- e17bfaea11-1065 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Tooltip/Tooltip.tsx:183
- e17bfaea11-1066 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Tour/Tour.stories.tsx:98
- e17bfaea11-1067 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:48
- e17bfaea11-1068 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:107
- e17bfaea11-1069 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:119
- e17bfaea11-1070 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- e17bfaea11-1071 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:49
- e17bfaea11-1072 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Container/Container.stories.tsx:11
- e17bfaea11-1073 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14
- e17bfaea11-1074 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:61
- e17bfaea11-1075 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/playground/Elevation.stories.tsx:50
- e17bfaea11-1076 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:116
- e17bfaea11-1077 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/DensityProvider/index.ts:1
- e17bfaea11-1078 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/ElevationProvider/index.ts:1
- e17bfaea11-1079 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- e17bfaea11-1080 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51
- e17bfaea11-1081 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63
- e17bfaea11-1082 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- e17bfaea11-1083 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- e17bfaea11-1084 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# WARN e17bfaea11-1 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:163`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 163-174 (`context.push(`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-2 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-3 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-4 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:34`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 34-47 (`)}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-6 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:68`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.88. The likeliest place is lines 68-79 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-7 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`</Field.Root>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-8 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-9 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:78`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 78-89 (`multiUse: true,`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-10 moon-yml-entrypoint-registration `packages/common/effect/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.81. The likeliest place is lines 25-36 (`"./DynamicRuntime": {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-11 import-as-namespace-is-all-or-nothing `packages/common/effect/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 13-17 (`export * as RuntimeProvider from './RuntimeProvider.ts';`, location confidence 0.13). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-12 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:1`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 1-38 (`import * as Duration from 'effect/Duration';`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-13 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-14 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 129-140 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-15 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:1`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.84. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-16 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.86. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-17 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-18 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-19 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-20 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 203-210 (`return result.error ?? Schema.decodeUnknownSync(Schema.String)(JSON.parse(Str...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-21 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 148-154 (`),`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-22 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.88. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-23 no-casts `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 237-245 (`const readBody = async (init?: RequestInit): Promise<any> => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-24 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-25 error-messages-carry-context `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 957-965 (`const error = (patch?: string) =>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-26 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:291`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 291-302 (`);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-27 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-28 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-29 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-30 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-31 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-32 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:77`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 77-88 (`export const loadInstructions = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-33 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-34 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-35 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-36 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-37 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-38 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-39 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 426-449 (`const manager = yield* ProcessManager.Service;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-40 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1455-1478 (`);`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-41 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-42 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.80. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-43 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 350-361 (`};`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-44 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-373 (`};`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-45 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.87. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-46 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-47 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.80. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-48 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-49 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-50 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-51 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-52 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-53 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-54 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-55 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-56 no-casts `packages/core/compute/compute/src/Process.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 327-346 (`[ProcessTypeId]: {} as any,`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-57 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-58 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-59 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-60 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-83 (`}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-61 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-62 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-63 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-64 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-65 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-66 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-67 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-68 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-69 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 112-123 (`},`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-70 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-71 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-72 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-73 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-74 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-75 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-76 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-77 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-78 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-79 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:155`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 155-166 (`yield* Fiber.join(aborter);`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-80 namespace-brand-key-prefixing `packages/core/compute/pipeline/src/Stage.test.ts:14`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 14-25 (`describe('Stage.map', () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-81 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-82 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-83 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-84 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 154-164 (`});`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-85 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-86 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-87 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-88 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-89 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-90 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-91 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-92 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-93 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-94 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1008`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 1008-1031 (`return this._afterCreate<T>(handle.documentId);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-95 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1272`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1272-1295 (`private async _getContainingSpaceForDocument(documentId: string): Promise<Pub...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-96 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1728`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 1728-1751 (`private _leaseUntilSettled(documentId: DocumentId): void {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-97 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-98 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:195`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 195-206 (`const heads = ['hash1', 'hash2'];`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-99 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 29-36 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-100 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:205`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.93. The likeliest place is lines 205-216 (`removeRangeEffect(keyPrefix: StorageKey): Effect.Effect<void, SqlError.SqlErr...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-101 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-102 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 93-104 (`});`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-103 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-104 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-105 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-106 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-107 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 109-120 (`expect(JSON.parse(page1.objects![0])).toMatchObject(items[0]);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-108 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-109 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-110 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:38`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 38-49 (`updateIndexes: () => Promise<void>;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-111 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-112 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-113 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-114 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-115 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-116 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 884-907 (`break;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-117 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-118 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-119 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 134-145 (`Effect.gen(function* () {`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-120 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-121 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.90. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-122 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-123 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-124 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 666-687 (`return {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-125 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-126 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-127 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-128 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-129 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-130 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-131 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-132 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-133 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-134 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-135 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-136 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-137 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-138 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-139 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-140 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-141 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-142 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-143 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-144 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-145 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-146 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-147 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-148 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-149 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-150 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-151 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-152 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-153 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/index-tracker.ts:103`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.80. The likeliest place is lines 103-114 (`}): Effect.Effect<Map<string, IndexCursor[]>, SqlError.SqlError> =>`, location confidence 0.40). Judged with added `diff, importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-154 error-messages-carry-context `packages/core/mesh/edge-client/src/edge-http-client.ts:157`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 157-174 (`const parseFinalizeResponse = (body: unknown): FinalizedUpload => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-155 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:481`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 481-504 (`body: data as BodyInit,`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-156 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-157 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-158 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-159 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-160 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-161 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-162 event-handler-naming-convention `packages/devtools/devtools/src/components/ControlledSelector.tsx:9`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 9-15 (`export type ControlledSelectorProps<T> = {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-163 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:132`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 132-143 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-164 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-165 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`const [recording, setRecording] = useState(false);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-166 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 84-95 (`const data = useMemo(() => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-167 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const dataRows = useMemo(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-168 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 46-57 (`const handleRowClicked = (row: any) => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-169 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 78-89 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-170 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 46-57 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-171 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 89-100 (`async (spaceId: string) => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-172 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-173 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 39-50 (`</Banner.Content>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-174 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 60-71 (`try {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-175 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:133`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 133-144 (`let response: any;`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-176 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 100-111 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-177 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 214-225 (`export const SignalMessageTable = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-178 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-179 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 41-52 (`return feedSchemas.length === 0`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-180 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 123-146 (`const feedMessages = useQuery(`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-181 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:378`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 378-410 (`>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-182 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-183 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-184 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:44`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 44-48 (`const styles = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-185 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-70 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-186 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 193-204 (`'flex flex-col w-full dx-density-md',`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-187 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 117-128 (`interval={500}`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-188 no-invented-theme-tokens `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:95`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 95-106 (`<div className={subGridClassNames}>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-189 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:51`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 51-62 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-190 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 53-64 (`}, [manager]);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-191 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.88. The likeliest place is lines 113-124 (`const loadedLabel = running`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-192 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-193 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 131-142 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-194 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:66`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 66-77 (`{roles.map((role) => (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-195 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-196 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:142`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 142-153 (`const SnapshotStory = () => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-197 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:154`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 154-165 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-198 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:287`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 287-298 (`<IconButton.Root icon='ph--skip-back--regular' iconOnly label='Reset (R)' onC...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-199 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 109-120 (`const TriggerStatusPopover = ({`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-200 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`.action(`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-201 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-202 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-203 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:142`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 142-153 (`AssistantPlugin({`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-204 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-205 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-206 reuse-shared-test-layer `packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 438-449 (`const makeSpaceLayer = (agentService: AgentService.Service) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-207 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 99-110 (`useEffect(() => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-208 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:279`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 279-290 (`<Banner.Body>{t('mirror-unresolved.label')}</Banner.Body>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-209 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-210 toolbars-are-menu-actions `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:255`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 255-266 (`if (event.key === 'Enter') {`, location confidence 0.61). Judged with added `importers` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-211 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 134-145 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-212 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 121-132 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-213 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 205-216 (`<Panel.Toolbar asChild>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-214 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 89-100 (`objects`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-215 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:185`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 185-196 (`<Toolbar.IconButton`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-216 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-217 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-218 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-10 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-219 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-220 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-221 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-92 (`);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-222 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-223 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-224 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 109-120 (`<div>{participants}</div>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-225 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:133`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 133-144 (`{actions`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-226 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 31-42 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-227 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 55-66 (`const timeout = setTimeout(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-228 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 94-105 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-229 no-casts `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 34-45 (`const screenshare: UserState = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-230 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 46-57 (`});`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-231 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-232 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 108-119 (`}`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-233 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-234 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 96-107 (`iconOnly`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-235 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-236 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:65`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.96. The likeliest place is lines 65-76 (`<Toolbar.IconButton`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-237 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.87. The likeliest place is lines 77-88 (`</Toolbar.Root>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-238 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-239 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:72`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 72-83 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-240 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 96-107 (`)}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-241 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-10 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-242 namespace-export-with-internal-hiding `packages/plugins/plugin-claude/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as ClaudePlugin from './ClaudePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-243 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-244 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-245 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-246 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 48-59 (`const closedRef = useRef(false);`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-247 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 96-107 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-248 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 93-104 (`onValueChange={(value) =>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-249 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:257`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 257-268 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-250 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:35`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 35-46 (`return;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-251 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 35-51 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-252 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:71`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 71-81 (`<div className='w-4 text-xs text-center text-subdued'>{i + 1}</div>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-253 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-52 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-254 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.87. The likeliest place is lines 41-52 (`setFetchState((previous) => (previous.state === 'ready' ? previous : { state:...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-255 namespace-export-with-internal-hiding `packages/plugins/plugin-client/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-12 (`export * as ClientPlugin from './ClientPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-256 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-48 (`return (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-257 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 74-85 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-258 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.96. The likeliest place is lines 67-78 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-259 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 102-113 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-260 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:190`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 190-201 (`let cancelled = false;`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-261 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 18-29 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-262 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 79-90 (`return (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-263 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 130-141 (`AiService.AiService,`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-264 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 494-517 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-265 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-266 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-267 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-268 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 166-182 (`const openCreateSyncRoutineDialog = (`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-269 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.86. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-270 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`);`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-271 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-272 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 71-82 (`</Toolbar.Root>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-273 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 54-65 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-274 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-275 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:87`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 87-95 (`{onClose && <SystemIconButton.Close variant='ghost' iconOnly onClick={onClose...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-276 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.83. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-277 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx:26`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 26-37 (`export const DebugPanelHeader = ({ mode, onModeChange, onClose, density }: De...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-278 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 64-75 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-279 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 88-99 (`{/* The settings variant puts the control in a right-hand column; log rows ne...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-280 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 70-81 (`});`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-281 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 82-93 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-282 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-283 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-284 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-285 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 49-60 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-286 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:61`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 61-72 (`useEffect(() => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-287 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:181`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 181-192 (`<Panel.Root {...Util.composableProps(props)} ref={forwardedRef}>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-288 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:129`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 129-140 (`const chat = yield* Database.add(`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-289 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 31-40 (`export const useDrawerState = () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-290 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-291 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-292 use-context-scoped-cancellation `packages/plugins/plugin-deck/src/capabilities/url-handler.ts:37`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 37-48 (`if (window.confirm('Leave Composer?')) {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-293 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 45-56 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-294 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:49`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 49-60 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-295 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:137`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 137-148 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-296 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:24`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 24-35 (`const MainPane = ({ id, label }: { id: string; label: string }) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-297 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 44-55 (`const SplitStory = () => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-298 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 30-41 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-299 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 188-213 (`return (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-300 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-301 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 83-94 (`data-tauri-drag-region='deep'`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-302 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:169`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 169-180 (`<IconButton.Root`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-303 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:46`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 46-55 (`};`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-304 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-305 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-306 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:102`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 102-107 (`});`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-307 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-308 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 55-66 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-309 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 67-78 (`url.searchParams.set('sort', 'updated');`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-310 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 157-171 (`const Content = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-311 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-312 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-313 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-314 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-315 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-316 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-317 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-318 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-319 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-320 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-321 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-322 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-323 no-native-form-controls `packages/plugins/plugin-file/src/components/FileInput/FileInput.tsx:29`

System One judges this a likely violation of `no-native-form-controls` (Edit objects with the schema-driven `Form`, never a native input), p=0.80. The likeliest place is lines 29-40 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-324 extract-non-rendering-logic-from-component `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 297-308 (`let task: PDFDocumentLoadingTask | undefined;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-325 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-326 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:109`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 109-120 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-327 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 278-289 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-328 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-329 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:44`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 44-55 (`setPending(true);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-330 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 80-91 (`<Field.Input readOnly value={reference} classNames='grow' />`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-331 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-332 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-333 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-334 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:91`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 91-102 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-335 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:91`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 91-102 (`/>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-336 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-337 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-338 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 91-102 (`setPhase('idle');`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-339 namespace-export-with-internal-hiding `packages/plugins/plugin-google/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-11 (`export * as GooglePlugin from './GooglePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-340 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-341 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`try {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-342 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-343 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 210-233 (`expect(afterRerun.length).toBe(feedMessages.length);`, location confidence 0.28). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-344 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-345 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:138`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 138-149 (`return (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-346 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 162-173 (`<div className='dx-expand flex flex-col gap-2 overflow-y-auto'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-347 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 95-106 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-348 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 181-194 (`</div>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-349 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 74-85 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-350 subscribe-where-you-read `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:34`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 34-45 (`export const PortfolioReportDetail = ({ role, subject, companionTo }: Portfol...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-351 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-352 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-353 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-354 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 297-320 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-355 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:428`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 428-451 (`'dx-document dx-attention-surface border border-subdued-separator rounded ove...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-356 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:171`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.88. The likeliest place is lines 171-182 (`setShowBcc(true);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-357 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:207`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 207-218 (`return (`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-358 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:299`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 299-310 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-359 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-360 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-361 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-362 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:240`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 240-263 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-363 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-364 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 31-42 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-365 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:175`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 175-186 (`onCheckedChange={toggleAll}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-366 namespace-export-with-internal-hiding `packages/plugins/plugin-inbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-14 (`export * as InboxPlugin from './InboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-367 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-368 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-369 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-370 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.65). Judged with added `test` context after a first pass of 0.58. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-371 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-372 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-373 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-374 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-375 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-376 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 53-64 (`const BeaconPopover = () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-377 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 77-88 (`<div className='flex flex-col gap-1'>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-378 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 77-88 (`<div className='flex flex-col gap-1'>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-379 namespace-export-with-internal-hiding `packages/plugins/plugin-jmap/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-11 (`export * as JmapPlugin from './JmapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-380 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync.test.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 60-82 (`const withFaultAfterEmails = (n: number, dataset: JmapDataset): Layer.Layer<J...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-381 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-382 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-383 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-384 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`if (target == null) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-385 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-10 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-386 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:39`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 39-50 (`<Toolbar.IconButton`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-387 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 114-125 (`() =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-388 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:150`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 150-161 (`<img src={cover} alt='' className='w-[6rem] aspect-[2/3] shrink-0 self-start ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-389 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 109-120 (`}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-390 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 109-120 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-391 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-392 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-393 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-linear/src/operations/sync.test.ts:48`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 48-59 (`describe('plugin-linear sync', () => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-394 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 28-39 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-395 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 74-80 (`<div className='dx-expand grid grid-cols-2 gap-2 px-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-396 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 36-47 (`{words.map((word) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-397 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 110-123 (`/>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-398 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 77-88 (`() =>`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-399 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-88 (`</Card.Row>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-400 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-401 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-402 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:86`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 86-97 (`});`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-403 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 75-86 (`void handleFetch();`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-404 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:99`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 99-110 (`</Select.Viewport>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-405 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-406 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-407 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 76-87 (`const features = useMemo(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-408 namespace-export-with-internal-hiding `packages/plugins/plugin-map/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-10 (`export * as MapPlugin from './MapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-409 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-410 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 188-196 (`const useTest = (view: EditorView | null) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-411 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 120-131 (`const [missing, setMissing] = useState(false);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-412 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:336`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 336-347 (`if (mode === 'section') {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-413 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-414 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-415 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-416 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-11 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-417 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-418 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 59-70 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-419 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 71-82 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-420 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 119-130 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-421 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 119-130 (`return (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-422 toolbars-are-menu-actions `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.stories.tsx:68`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 68-80 (`label={splitterMode === 'end' ? 'Collapse' : 'Expand'}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-423 comment-hygiene `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 23-33 (`type MobileLayoutRootProps = Util.ThemedClassName<`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-424 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`const description = describeScrollTarget(event.target);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-425 toolbars-are-menu-actions `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:48`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 48-59 (`const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-426 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 88-99 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-427 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 100-111 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-428 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 128-137 (`monolithicAction ? monolithicAction.properties!.label : props.label,`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-429 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 190-201 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-430 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:238`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 238-249 (`'flex justify-center items-center dx-focus-ring-group-indicator transition-co...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-431 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 96-107 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-432 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:151`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 151-162 (`<Tree`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-433 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 23-34 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-434 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 41-52 (`const current = getHotkeyScope() ?? '';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-435 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 313-324 (`useEffect(() => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-436 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 88-99 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-437 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 216-227 (`export const Visitor = () => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-438 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-439 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 82-92 (`(event) =>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-440 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-441 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 69-80 (`</Dialog.Title>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-442 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 22-33 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-443 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-444 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 36-50 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-445 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:158`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 158-181 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-446 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:374`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 374-397 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-447 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:870`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 870-893 (`const InlineForm = ({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-448 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.52). Judged with added `diff, imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-449 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 47-58 (`} else {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-450 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-95 (`const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-451 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:109`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 109-120 (`export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootPr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-452 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.88. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-453 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 16-27 (`export const Layout = Util.composable<HTMLDivElement, LayoutProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-454 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-455 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-456 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-457 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-458 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-459 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-460 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`{roles.map((role, i) => (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-461 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-462 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-463 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 130-141 (`const fiber = Effect.runFork(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-464 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 81-92 (`const routineSkills = routineInstructions?.skills.map((ref) => ref.uri.toStri...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-465 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-466 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 58-69 (`return (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-467 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-468 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 107-118 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-469 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:155`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 155-166 (`) : (`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-470 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:180`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 180-191 (`<div className='flex items-center gap-2'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-471 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:43`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 43-54 (`label={t('failure-badge.label')}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-472 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 55-68 (`reason:`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-473 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:138`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 138-149 (`return (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-474 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:150`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 150-161 (`)}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-475 no-casts `packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-476 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-477 namespace-export-with-internal-hiding `packages/plugins/plugin-registry/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-13 (`export * as RegistryPlugin from './RegistryPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-478 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 138-149 (`[anchor, onComment],`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-479 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 59-67 (`onClick={handleCheckpoint}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-480 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-481 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 104-115 (`</div>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-482 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-483 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 456-467 (`const filteredAnchors = showResolvedThreads`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-484 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 226-237 (`<IconButton.Root icon='ph--trash--regular' label={t('discard-branch.label')} ...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-485 namespace-export-with-internal-hiding `packages/plugins/plugin-review/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-13 (`export * as ReviewPlugin from './ReviewPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-486 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-487 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-488 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-489 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:39`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 39-50 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-490 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:265`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 265-275 (`const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-491 setter-must-not-own-transaction `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:334`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.80. The likeliest place is lines 334-345 (`const applyActionKind = (`, location confidence 0.43). Judged with added `importers, imports` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-492 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:311`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 311-317 (`const LabelledRow = ({ label, children, classNames }: Util.ThemedClassName<Pr...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-493 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 60-71 (`},`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-494 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 60-71 (`},`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-495 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 188-199 (`if (inputIndex !== -1) {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-496 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 42-48 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-497 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 309-320 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-498 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 164-177 (`}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-499 no-invented-theme-tokens `packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx:32`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 32-38 (`const STATUS_CLASSES: Record<RunStatus, string> = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-500 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.95. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-501 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-502 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-503 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 32-46 (`);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-504 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.94. The likeliest place is lines 38-49 (`return (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-505 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 94-105 (`onLoadMore={onLoadMoreCommits}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-506 no-sleep-in-test `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 226-237 (`yield* Effect.sleep('6 seconds');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-507 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 84-95 (`case 'script':`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-508 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 13-28 (`import * as ScrollArea from '@dxos/react-ui/ScrollArea';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-509 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 141-152 (`{/* Side rail */}`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-510 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:134`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 134-143 (`<Toolbar.IconButton icon='ph--play--regular' label='Execute' iconOnly onClick...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-511 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 71-84 (`<Toolbar.Root>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-512 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 92-103 (`keymap.of(lintKeymap),`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-513 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:78`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 78-89 (`</Dialog.Header>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-514 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-515 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`});`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-516 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 188-199 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-517 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.95. The likeliest place is lines 40-51 (`if (!token || !gistId) {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-518 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 36-47 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-519 namespace-export-with-internal-hiding `packages/plugins/plugin-script/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * as ScriptPlugin from './ScriptPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-520 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 60-71 (`onClientInitialized: ({ client }) =>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-521 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-522 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.83. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-523 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 59-70 (`Object.entries(fields).some(([, value]) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-524 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-525 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 81-92 (`return (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-526 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 87-98 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-527 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:315`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 315-326 (`useEffect(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-528 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 471-482 (`<div`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-529 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 27-38 (`const DefaultStory = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-530 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 39-50 (`}, [space]);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-531 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 75-86 (`<Field.Root>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-532 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 270-281 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-533 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 42-55 (`>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-534 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-535 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 81-92 (`});`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-536 comment-hygiene `packages/plugins/plugin-sheet/src/translations.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 47-60 (`'add-row-after.label': 'Add row after',`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-537 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:22`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.88. The likeliest place is lines 22-33 (`export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][n...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-538 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-539 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-540 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-541 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-542 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-543 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 250-261 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-544 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/ForeignKeys/ForeignKeys.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 37-48 (`const KeyItem = ({ forignKey, onDelete }: KeyItemProps) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-545 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 50-61 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-subdued'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-546 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:114`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 114-125 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-547 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:98`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 98-109 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-548 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-549 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-550 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 264-275 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-551 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-552 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:239`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 239-250 (`useEffect(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-553 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 51-62 (`}, [schemas]);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-554 comment-hygiene `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:55`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 55-66 (`return () => clearInterval(interval);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-555 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 227-238 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-556 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:79`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 79-90 (`const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-557 namespace-export-with-internal-hiding `packages/plugins/plugin-space/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-12 (`export * as SpacePlugin from './SpacePlugin.ts';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-558 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-559 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-560 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 60-70 (`}, [updateState]);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-561 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 205-216 (`const rail = (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-562 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:182`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 182-193 (`<Panel.Toolbar classNames='dx-toolbar-surface'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-563 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:229`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.85. The likeliest place is lines 229-237 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-564 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-47 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-565 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-566 comment-hygiene `packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 13-24 (`export const StatusBarActions = (_props: StatusBarActionsProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-567 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-568 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 51-65 (`<div role='img' aria-label={label} className='dx-fill flex items-center justi...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-569 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 88-99 (`<div className='flex items-center gap-1'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-570 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 100-111 (`<Toolbar.IconButton`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-571 no-invented-theme-tokens `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:44`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 44-55 (`const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-572 no-invented-theme-tokens `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:35`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 35-49 (`const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boole...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-573 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 58-69 (`export const GalleryArticle = ({ role, subject: collection }: GalleryArticleP...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-574 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 118-129 (`<Panel.Toolbar asChild>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-575 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:77`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 77-88 (`(id: string) =>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-576 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 113-124 (`return;`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-577 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 45-56 (`export const MediaArtifactVariants = ({`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-578 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-579 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.83. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-580 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 65-76 (`<Select.Viewport>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-581 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 137-148 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-582 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 113-124 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-583 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:149`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 149-160 (`classNames='w-60 min-h-40 gap-0 p-2 border-accent-bg bg-accent-bg text-accent...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-584 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-24 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-585 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 39-53 (`export const Key = ({ binding }: { binding: string }) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-586 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-587 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-588 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 228-241 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-589 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 60-71 (`Obj.update(subject, (subject) => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-590 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:58`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 58-69 (`if (!typename) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-591 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 94-105 (`return (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-592 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:36`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 36-50 (`data-testid='supportPlugin.startTour'`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-593 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:161`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 161-172 (`const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-594 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 165-176 (`return {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-595 namespace-export-with-internal-hiding `packages/plugins/plugin-table/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-10 (`export * as TablePlugin from './TablePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-596 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 69-80 (`<JournalEntry`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-597 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 125-136 (`<div`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-598 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:21`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 21-32 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-599 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-600 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 87-98 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-601 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-51 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-602 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-603 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 216-226 (`'onDragLeaveCapture': handleDragLeave,`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-604 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 136-151 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-605 error-messages-carry-context `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:581`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 581-604 (`throw new Error('Add sub-task item not found.');`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-606 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 78-89 (`const [filterText, setFilterText] = useFilterQuery(taskSet.id, filterEditorRef);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-607 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 330-341 (`>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-608 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-609 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-610 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 107-118 (`export const TerraForm = ({ config, onChange, onWaterSheen }: TerraFormProps)...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-611 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`engine.evaluateAt(simNow());`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-612 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-613 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:235`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 235-246 (`useEffect(() => {`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-614 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-615 no-styling-wrapper-divs `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:135`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 135-146 (`<Tooltip.Provider>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-616 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-617 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-618 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-619 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-620 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-621 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-622 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 153-164 (`? t('microphone-denied.label')`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-623 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-10 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-624 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-625 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-626 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 301-312 (`return (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-627 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-628 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-629 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-630 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-631 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-632 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 57-68 (`<Card.Header>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-633 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 41-52 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-634 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.88. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-635 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-636 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-637 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-638 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:30`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 30-41 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-639 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-640 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-641 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-642 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 70-81 (`useEffect(() => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-643 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:154`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 154-165 (`<Splitter.Panel asChild position='start'>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-644 no-styling-wrapper-divs `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:232`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 232-243 (`<Icon.Root icon={sourceIcon[item.source.type] ?? 'ph--question--regular'} />`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-645 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-646 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-647 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-648 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 114-125 (`}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-649 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-650 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 61-70 (`export const Crashes: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-651 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-652 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-653 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-654 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-655 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 351-362 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-656 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-657 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-658 no-casts `packages/sdk/app-graph/src/AppGraph.test.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 459-482 (`});`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-659 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 893-917 (`release();`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-660 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-661 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-662 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-663 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:227`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 227-238 (`</Field.Root>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-664 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-665 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 206-217 (`}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-666 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-667 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-668 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 128-154 (`const peerFromClient = async (client: Client): Promise<InvitationPeer> => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-669 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-670 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-671 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-672 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.90. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-673 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-674 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-675 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-676 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-677 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-678 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-679 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-680 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/spaces.ts:73`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 73-85 (`unsubscribe = dataSpaceManager.updated.on(() => update());`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-681 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-682 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-683 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-684 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-685 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-686 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-687 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 93-104 (`update();`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-688 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-689 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-690 no-casts `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 137-148 (`log.error('failed to load metadata from SQLite', { err });`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-691 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-692 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-693 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 25-32 (`export interface CrossDeviceSpaceSynchronizer extends CredentialProcessor, Li...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-694 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-695 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-696 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 488-499 (`});`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-697 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-698 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-699 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 429-452 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-700 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:597`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 597-620 (`}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-701 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-702 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-703 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-704 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-705 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/space/space-manager.ts:97`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 97-108 (`async close(): Promise<void> {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-706 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-707 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 188-199 (`);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-708 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-709 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-710 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-711 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-712 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-713 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-714 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-715 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-716 no-casts `packages/sdk/client/src/services/local-client-services.ts:235`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 235-246 (`this.signalMetadataTags.origin = 'undefined';`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-717 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-718 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 23-34 (`target='_blank'`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-719 effect-fn-not-hand-wrapped-gen `packages/sdk/observability/src/ai/AiObservability.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 372-383 (`const setupWired = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-720 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-721 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-722 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-723 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-724 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-725 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-726 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-727 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-26 (`import * as Button from '@dxos/react-ui/Button';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-728 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-729 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 44-55 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-730 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-731 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 274-285 (`const mutableParent = parent as Obj.Mutable<JsonSchema.JsonSchema>;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-732 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-733 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-734 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-735 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-736 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-737 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-738 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-739 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-740 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.88. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-741 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-742 comment-hygiene `packages/sdk/shell/src/components/Panel/Action.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 106-117 (`/>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-743 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:34`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 34-45 (`export const InvitationManager = ({`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-744 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.82. The likeliest place is lines 13-31 (`import { type Space, SpaceMember_PresenceState, useSpaces } from '@dxos/react...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-745 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.80. The likeliest place is lines 13-31 (`import { type Space, SpaceMember_PresenceState, useSpaces } from '@dxos/react...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-746 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-747 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-748 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-749 no-invented-theme-tokens `packages/stories/stories-assistant/src/modules/AgentModule.tsx:55`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 55-66 (`const blockClass = (block: ContentBlock.Any): string => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-750 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 61-73 (`const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-751 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 79-85 (`}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-752 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:342`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 342-353 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-753 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 116-127 (`{`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-754 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.90. The likeliest place is lines 200-207 (`}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-755 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-756 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-757 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-758 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 30-41 (`const feed = mailbox.feed!.target!;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-759 no-casts `packages/stories/stories-inbox/src/testing/archive.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 41-52 (`const reconstructMessage = (json: any): Message.Message =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-760 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-761 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-762 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 112-118 (`export const Default: Story = {`, location confidence 0.69). Judged with added `package, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-763 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:77`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 77-86 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-764 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:173`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 173-186 (`<div className='flex justify-center items-center'>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-765 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:226`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 226-237 (`<svg width={size} height={size}>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-766 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-767 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 29-42 (`const Component = ({ buffer }: { buffer: ArrayBuffer }) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-768 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-769 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 153-164 (`<Panel.Content classNames='flex flex-col'>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-770 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:370`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 370-381 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-771 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 97-108 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-772 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-773 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 346-357 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-774 extract-non-rendering-logic-from-component `packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 153-164 (`let cancelled = false;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-775 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:143`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 143-154 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-776 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-777 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 156-179 (`<div`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-778 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 246-269 (`}`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-779 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 89-100 (`}, [date]);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-780 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-781 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-782 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:163`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 163-174 (`<div className='flex flex-col h-full overflow-hidden divide-y divider-separat...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-783 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 190-201 (`const meta = {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-784 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-785 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-786 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 88-99 (`);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-787 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 124-135 (`{sidebar && (`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-788 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-789 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-790 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-791 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-792 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 76-90 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-793 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-794 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-795 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-796 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 50-61 (`const handleClick: Icon.RootProps['onClick'] = (ev) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-797 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 15-26 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-798 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.83. The likeliest place is lines 33-44 (`}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-799 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-56 (`}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-800 no-casts `packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 28-39 (`export const ShapeComponent = (props: ShapeComponentProps<any>) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-801 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-802 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-803 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:43`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 43-54 (`<ToolbarModule.Button onClick={() => handleAction({ type: 'zoom-out' })} titl...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-804 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-37 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-805 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-61 (`)}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-806 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-807 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-808 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`setDragging(true);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-809 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 120-131 (`useEffect(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-810 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-811 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.87. The likeliest place is lines 82-93 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-812 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 106-117 (`commit(key, next);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-813 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 194-205 (`const fiber = Effect.runFork(`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-814 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-815 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-816 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:222`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 222-236 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-817 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 346-357 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-818 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:42`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 42-53 (`{item}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-819 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 16-27 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-820 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 114-125 (`export const Controller: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-821 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-822 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 240-247 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-823 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-28 (`const DefaultStory = (props: MatrixProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-824 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-825 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-826 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-827 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-828 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 169-180 (`const progress = (current: number, total: number) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-829 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 40-51 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-830 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 14-25 (`const DefaultStory = ({ state: _state }: SpinnerProps) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-831 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 28-39 (`let cancelled = false;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-832 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 15-26 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-833 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 27-33 (`const sizes: Record<number, { range: Range; classNames: string; h: string }> = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-834 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:270`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 270-281 (`const DashboardActivity = Util.composable<HTMLDivElement, DashboardActivityCu...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-835 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:127`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 127-138 (`useEffect(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-836 event-handler-naming-convention `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:163`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 163-174 (`const copyAll = useCallback(() => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-837 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:290`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 290-301 (`<Popover.Trigger asChild>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-838 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:491`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 491-502 (`</div>`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-839 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 95-106 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-840 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-841 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 93-104 (`return;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-842 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:281`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 281-291 (`{group.items.map((item) => (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-843 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-844 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-845 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 61-72 (`[debug, extensionsProp],`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-846 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 29-40 (`],`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-847 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 278-289 (`</>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-848 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:20`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.92. The likeliest place is lines 20-31 (`export const createRenderer =`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-849 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-850 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-851 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-852 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 440-451 (`const observer = new ResizeObserver((entries) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-853 reactive-state-via-atom-bridge `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 452-463 (`useEffect(() => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-854 no-casts `packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 607-630 (`const texture = gl.createTexture()!;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-855 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 56-70 (`export const Default: Story = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-856 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 120-128 (`onPointerMove={onMove}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-857 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-858 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 228-239 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-859 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:410`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 410-433 (`const scroller = scrollerRef.current;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-860 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 162-173 (`useEffect(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-861 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/debug/Debug.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 52-63 (`const tick = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-862 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/debug/Debug.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 64-75 (`}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-863 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-864 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-865 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.93. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-866 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 83-94 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-867 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:204`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 204-215 (`void (async () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-868 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 398-409 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-869 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/scenarios.tsx:421`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 421-437 (`const PlainChrome = ({ index, children }: MessageChromeProps) => (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-870 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:62`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 62-73 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-871 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-872 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-873 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-874 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-875 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Card.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 76-82 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-876 no-casts `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 111-116 (`} satisfies Meta<StoryArgs<any>>;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-877 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 188-199 (`export const Variants: Story<Schema.Schema.Type<typeof SettingsSchema>> = {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-878 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 218-229 (`const InlineMarkdownTextStory = (args: StoryArgs<any>) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-879 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 254-265 (`<>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-880 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 18-29 (`export const getDefaultValue = (ast?: SchemaAST.AST): any => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-881 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 98-110 (`<div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretc...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-882 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 53-64 (`);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-883 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.stories.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 64-75 (`<Panel.Content>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-884 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:52`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 52-63 (`const reference = value as Ref.Ref<any> | undefined;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-885 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:119`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 119-130 (`const StringMarkdownEditor = ({ value, placeholder, readonly, onChange }: Str...`, location confidence 0.94). Judged with added `package, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-886 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 99-110 (`const handleChange = useCallback(`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-887 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 31-42 (`const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-888 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:192`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.84. The likeliest place is lines 192-203 (`<Field.Root key={item.id}>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-889 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx:155`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 155-166 (`/>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-890 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:434`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 434-445 (`override render() {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-891 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:157`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 157-166 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-892 no-casts `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 87-98 (`}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-893 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 135-146 (`const DefaultStory = ({ schema, template }: StoryArgs) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-894 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:213`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 213-224 (`<div className='flex flex-col gap-2'>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-895 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-48 (`expect(resolved!.segments).toEqual(['origin']);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-896 no-casts `packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 37-48 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-897 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 116-127 (`<TestLayout json={snapshot}>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-898 no-casts `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 69-80 (`) => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-899 no-casts `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 60-71 (`})),`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-900 structured-logging-not-console `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 60-71 (`})),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-901 no-casts `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 31-35 (`onCreate?: (values: any) => unknown | Promise<unknown>;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-902 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 137-150 (`const meta = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-903 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 63-74 (`const handleCreate = useCallback(`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-904 no-casts `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 48-57 (`export const ObjectTree = ObjectTreeImpl as unknown as <T>(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-905 no-invented-theme-tokens `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:172`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 172-183 (`return <span className='text-blue-text'>{JSON.stringify(value)}</span>;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-906 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:112`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 112-123 (`[objects, getObjectLabel],`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-907 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:280`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 280-291 (`filter={false}`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-908 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 99-110 (`view.projection = Obj.getSnapshot(newView).projection as Obj.Mutable<typeof v...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-909 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 116-127 (`Match.when({ type: 'from' }, ({ from }) => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-910 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:200`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 200-211 (`const query =`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-911 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-912 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-913 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-914 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 21-32 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-915 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 68-81 (`<div className='h-full aspect-square mx-auto'>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-916 no-casts `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 58-69 (`}, [orientation, rows, cols]);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-917 extract-non-rendering-logic-from-component `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 82-93 (`return Object.values(pieces)`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-918 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 92-103 (`const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-919 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-920 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-921 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 59-74 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-922 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 123-134 (`queueMicrotask(() => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-923 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:207`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 207-218 (`if (node) {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-924 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 317-328 (`<Toolbar.Root>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-925 extract-non-rendering-logic-from-component `packages/ui/react-ui-graph/src/components/SVG/Root.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 43-54 (`if (!entry) {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-926 no-casts `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 20-30 (`export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-927 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHie...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-928 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 207-218 (`nodeMerge`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-929 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 119-130 (`const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: Render...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-930 comment-hygiene `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 23-34 (`const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-931 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 35-46 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-932 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:225`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 225-236 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-933 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 98-109 (`key={tool.title}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-934 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 55-66 (`);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-935 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 102-113 (`setFilter('');`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-936 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 114-125 (`return (`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-937 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 74-85 (`setClient(next);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-938 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 58-69 (`{items.map((item, i) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-939 no-casts `packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:223`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 223-236 (`Hooks.useMergeRefs([forwardedRef, navigation.containerProps.ref]) as unknown ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-940 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Listbox/ListItemContent.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 13-24 (`const meta = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-941 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 20-37 (`export type OrderedListContextValue<T extends ListItemRecord> = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-942 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 19-30 (`export type OrderedListRootProps<T extends ListItemRecord> = Util.ThemedClass...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-943 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:115`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 115-129 (`const meta = {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-944 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 293-316 (`}, [rootTree, childIdsFamily, registry]);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-945 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 711-734 (`await expect(row(child)!.getAttribute('aria-setsize')).toEqual('20');`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-946 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 91-108 (`const NO_MODIFIERS: SelectModifiers = { option: false, shift: false, meta: fa...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-947 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:359`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 359-378 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-948 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:912`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 912-935 (`useEffect(() => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-949 no-casts `packages/ui/react-ui-list/src/next/Tree/Tree.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 54-60 (`export type TreeDropEvent<T extends { id: string } = any> = {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-950 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-951 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 61-72 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-952 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 88-99 (`Tile={Tile!}`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-953 no-casts `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 34-45 (`export const ToolForm = <S extends Schema.Codec<any, any>>({`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-954 no-casts `packages/ui/react-ui-menu/src/components/action-label.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 17-21 (`export const actionLabel = (action: Action, t: ThemeProvider.TFunction) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-955 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-30 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-956 no-styling-wrapper-divs `packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 108-119 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-957 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 87-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-958 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 268-279 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-959 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:103`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 103-114 (`<Card.Block>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-960 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 173-184 (`if (!rootRef.current) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-961 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-962 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-963 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 255-266 (`: (index) => getId(visibleItems![index]),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-964 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 119-130 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-965 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 101-112 (`return (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-966 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 40-49 (`const HuePreview = ({ value, size = 5 }: { value: string; size?: Icon.RootPro...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-967 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-968 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 84-95 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-969 structured-logging-not-console `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 115-126 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-970 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 115-126 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-971 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-513 (`const meta = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-972 no-casts `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-36 (`const generator: ValueGenerator = random as any;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-973 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 97-108 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-974 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 118-129 (`if (!schema || !table?.view.target) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-975 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:229`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 229-240 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-976 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 48-59 (`useEffect(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-977 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:798`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 798-821 (`const draftRow = this._registry.get(this._draftRows)[row];`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-978 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-979 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-980 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 53-63 (`const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-981 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 133-144 (`{/* The hue comes from the event table, through the same palette the status a...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-982 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:713`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 713-736 (`return (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-983 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1970-1993 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-984 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:497`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 497-512 (`const TaskListGroupLabel = Util.composable<HTMLDivElement>(({ children, ...pr...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-985 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:464`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 464-478 (`className={mx(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-986 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 99-110 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-987 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-988 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:145`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 145-156 (`return () => {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-989 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 75-86 (`ref={forwardedRef}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-990 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:315`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 315-329 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-991 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 341-358 (`type GanttLegendProps = Util.ThemedClassName<PropsWithChildren>;`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-992 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 359-382 (`key={lane.id}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-993 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 505-528 (`const element = viewportRef.current;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-994 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 184-195 (`const makeColumnRenderer =`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-995 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:152`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 152-163 (`useEffect(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-996 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-997 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 64-75 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-998 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 148-159 (`>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-999 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:228`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 228-239 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1000 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 311-322 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1001 moon-yml-entrypoint-registration `packages/ui/react-ui/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 25-36 (`".": {`, location confidence 0.45). Judged with added `diff, package, siblings` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1002 no-casts `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-40 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1003 no-styling-wrapper-divs `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 77-91 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1004 no-styling-wrapper-divs `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 89-100 (`const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1005 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Default = () => (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1006 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 24-35 (`const DefaultStory = ({ valence, title, body, button }: StoryArgs) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1007 no-casts `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:44`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 44-55 (`const meta = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1008 no-casts `packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 42-52 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1009 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Button/Button.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 13-24 (`const DefaultStory = ({ children, ...args }: Omit<Button.RootProps, 'ref'>) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1010 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 18-30 (`const DefaultStory = (props: IconButton.RootProps) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1011 no-casts `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 135-149 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1012 structured-logging-not-console `packages/ui/react-ui/src/components/Card/Card.stories.tsx:24`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 24-35 (`const DefaultStory = ({ title, description, image, fullWidth, elevation }: St...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1013 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 23-34 (`const DefaultStory = ({ count = IMAGES.length, continuous, autoAdvance }: Sto...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1014 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Carousel/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Carousel from './Carousel.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1015 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 48-59 (`return ids;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1016 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Column/Column.stories.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 90-99 (`const InputList = ({ items = 50 }: { items?: number }) => (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1017 no-casts `packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 51-61 (`const meta = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1018 no-casts `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 103-116 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1019 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Drawer/Drawer.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 41-55 (`const Body = ({ title, description, grabber, filler = 0 }: StoryArgs) => (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1020 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1021 no-casts `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 35-42 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1022 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 22-33 (`const ErrorFallback = ({ children, error, title, data }: ErrorFallbackProps) ...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1023 no-casts `packages/ui/react-ui/src/components/Field/Field.stories.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 142-156 (`const meta = {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1024 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Field/Field.stories.tsx:231`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 231-242 (`export const Input: Story = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1025 themed-primitives-take-classNames `packages/ui/react-ui/src/components/Field/PinInput.tsx:24`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.84. The likeliest place is lines 24-30 (`type PinInputProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'maxLength...`, location confidence 0.84). Judged with added `package` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1026 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Field/PinInput.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 55-66 (`const charPattern = useMemo(() => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1027 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Field/SegmentedInput.tsx:78`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 78-87 (`const segmentClassNames =`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1028 no-styling-wrapper-divs `packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 30-41 (`const DefaultStory = ({ draggable = true, resizable = true, persistRect = tru...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1029 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Focus/Focus.stories.tsx:26`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 26-39 (`const Container = ({ classNames, children }: ThemedClassName<PropsWithChildre...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1030 no-styling-wrapper-divs `packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 15-26 (`const DefaultStory = ({ openDelay, closeDelay, side = 'top' }: StoryProps) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1031 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Icon/Icon.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 88-99 (`export const Brand: Story = {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1032 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Image/Image.stories.tsx:41`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 41-47 (`const classNames = 'h-[12rem] w-[18rem]';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1033 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Image/Image.stories.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 69-80 (`export const Many: Story = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1034 bounded-live-state `packages/ui/react-ui/src/components/Image/Image.tsx:69`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 69-80 (`if (color) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1035 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Main/Main.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 76-87 (`<ComplementarySidebarToggle />`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1036 event-handler-naming-convention `packages/ui/react-ui/src/components/Main/Main.tsx:54`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 54-67 (`const prevents = (handler: ((event: Event) => void) | undefined) => {`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1037 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/MediaPlayer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as MediaPlayer from './MediaPlayer.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1038 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Menu/Menu.stories.tsx:210`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 210-221 (`export const TestSelect: StoryObj = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1039 no-styling-wrapper-divs `packages/ui/react-ui/src/components/MenuButton/MenuButton.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 51-61 (`classNames='w-4'`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1040 no-hand-rolled-lists `packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:17`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 17-28 (`const List = composable<HTMLDivElement, ScrollArea.RootProps>((props, forward...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1041 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 102-113 (`const ElevationStory = () => (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1042 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:17`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 17-28 (`const DefaultStory = ({`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1043 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 122-133 (`export const TestVirtualAnchor: StoryObj = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1044 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Progress/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Progress from './Progress.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1045 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:130`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 130-141 (`const meta = {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1046 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/QrCode/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as QrCode from './QrCode.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1047 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 47-58 (`const Grid = ({ items = 50 }: { items?: number }) => (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1048 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:142`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 142-153 (`return (`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1049 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Select/Select.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 57-68 (`const TestStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1050 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 19-32 (`export const Default = {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1051 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 19-32 (`export const Default = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1052 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Slider/Slider.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 84-95 (`export const ThumbVisibility: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1053 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 181-192 (`const HandoverStory = ({ stages = 3 }: StoryArgs) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1054 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/TextCrawl/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as TextCrawl from './TextCrawl.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1055 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 35-42 (`export const Default: Story = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1056 no-styling-wrapper-divs `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 90-101 (`{textCrawlSizes.map((size) => (`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1057 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.tsx:182`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 182-187 (`const sizeClassNames: Record<TextCrawlSize, { lineHeight: number; className: ...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1058 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 28-39 (`const DefaultStory = () => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1059 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Toast/Toast.tsx:186`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 186-197 (`queueMicrotask(() => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1060 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Toc/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Toc from './Toc.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1061 no-casts `packages/ui/react-ui/src/components/Toolbar/Toolbar.stories.tsx:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 69-82 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1062 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 40-53 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1063 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 55-66 (`test('keeps a description the trigger already carries', async ({ expect }) => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1064 no-sleep-in-test `packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:79`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 79-90 (`</Tooltip.Provider>,`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1065 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Tooltip/Tooltip.tsx:183`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 183-194 (`useEffect(() => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1066 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Tour/Tour.stories.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 98-109 (`<Tour.Arrow />`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1067 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:48`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 48-59 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e17bfaea11-1068 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 107-118 (`const ScrollToolbar = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1069 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 119-130 (`<div className='flex justify-center gap-1'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1070 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 16-27 (`const ShowStory = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1071 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:49`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 49-63 (`type ToggleGroupSingleSelectMenuItemGroupProperties,`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1072 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Container/Container.stories.tsx:11`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 11-16 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1073 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 14-19 (`const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1074 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 61-67 (`const CenterStory = () => (`, location confidence 0.92). Judged with added `imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1075 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/playground/Elevation.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 50-63 (`const meta = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1076 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 116-134 (`const Section = ({ title, fields = false, children }: PropsWithChildren<{ tit...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1077 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/DensityProvider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as DensityProvider from './DensityProvider.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1078 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/ElevationProvider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as ElevationProvider from './ElevationProvider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1079 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1080 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 51-62 (`const layouts: Record<ContainerType, FC<ContainerProps>> = {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1081 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 63-70 (`column: ({ classNames, children }: ContainerProps) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1082 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`className={mx(`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1083 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN e17bfaea11-1084 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 54-63 (`))}`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f20abf2340494295458ef52b0a6917d68c77e4fd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1084 violations written to fragments, 8522 uncertain, 71087 clean, 0 unanswered
- left for an agentic reviewer: 621 batch(es)

```text
requests: 32182 (6005 verdicts re-asked with context the model requested)
estimated input tokens: 208412520
billed input tokens: 196258410 (cost $8.2429)
measured chars per token: 3.19
```

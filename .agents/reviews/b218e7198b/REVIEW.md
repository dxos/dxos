---
branch: HEAD
commit: b218e7198b7f5bd512562e82ab2525d1a15d21b9
base: 1b40b48e6290c98b7ce6a8c46ac6eb46bcf4623c
mode: fast
createdAt: 2026-10-03T00:47:55.279Z
isFinalized: true
groups: 6246
rules: [barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-native-form-controls, no-pointless-indirection, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, reactive-state-via-atom-bridge, schema-declare-and-brand, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: b218e7198b
---

_299 error(s), 781 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b218e7198b-1 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:163
- b218e7198b-2 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- b218e7198b-3 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- b218e7198b-4 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- b218e7198b-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:34
- b218e7198b-6 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:68
- b218e7198b-7 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:80
- b218e7198b-8 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- b218e7198b-9 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:78
- b218e7198b-10 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:25
- b218e7198b-11 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/index.ts:1
- b218e7198b-12 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/internal/index.ts:1
- b218e7198b-13 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:1
- b218e7198b-14 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- b218e7198b-15 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:129
- b218e7198b-16 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:1
- b218e7198b-17 - ignored - structured-logging-not-console - packages/core/compute/agent-claude/src/Demo.test.ts:42
- b218e7198b-18 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- b218e7198b-19 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- b218e7198b-20 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- b218e7198b-21 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- b218e7198b-22 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- b218e7198b-23 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- b218e7198b-24 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237
- b218e7198b-25 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- b218e7198b-26 - ignored - error-messages-carry-context - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957
- b218e7198b-27 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- b218e7198b-28 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- b218e7198b-29 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- b218e7198b-30 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- b218e7198b-31 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- b218e7198b-32 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- b218e7198b-33 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:77
- b218e7198b-34 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- b218e7198b-35 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- b218e7198b-36 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- b218e7198b-37 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- b218e7198b-38 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- b218e7198b-39 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- b218e7198b-40 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426
- b218e7198b-41 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455
- b218e7198b-42 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- b218e7198b-43 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- b218e7198b-44 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- b218e7198b-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- b218e7198b-46 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- b218e7198b-47 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- b218e7198b-48 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- b218e7198b-49 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- b218e7198b-50 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- b218e7198b-51 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- b218e7198b-52 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- b218e7198b-53 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- b218e7198b-54 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- b218e7198b-55 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- b218e7198b-56 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- b218e7198b-57 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:327
- b218e7198b-58 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.test.ts:68
- b218e7198b-59 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- b218e7198b-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- b218e7198b-61 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- b218e7198b-62 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- b218e7198b-63 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- b218e7198b-64 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- b218e7198b-65 - ignored - options-object-with-defaults - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:42
- b218e7198b-66 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- b218e7198b-67 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- b218e7198b-68 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- b218e7198b-69 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- b218e7198b-70 - ignored - test-asserts-real-behavior - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- b218e7198b-71 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- b218e7198b-72 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- b218e7198b-73 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- b218e7198b-74 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- b218e7198b-75 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- b218e7198b-76 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- b218e7198b-77 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- b218e7198b-78 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- b218e7198b-79 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- b218e7198b-80 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- b218e7198b-81 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- b218e7198b-82 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:131
- b218e7198b-83 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- b218e7198b-84 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- b218e7198b-85 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- b218e7198b-86 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- b218e7198b-87 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- b218e7198b-88 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- b218e7198b-89 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- b218e7198b-90 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- b218e7198b-91 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- b218e7198b-92 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- b218e7198b-93 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- b218e7198b-94 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- b218e7198b-95 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- b218e7198b-96 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1008
- b218e7198b-97 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1272
- b218e7198b-98 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1728
- b218e7198b-99 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- b218e7198b-100 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:195
- b218e7198b-101 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- b218e7198b-102 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:205
- b218e7198b-103 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- b218e7198b-104 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- b218e7198b-105 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- b218e7198b-106 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- b218e7198b-107 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- b218e7198b-108 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- b218e7198b-109 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- b218e7198b-110 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- b218e7198b-111 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- b218e7198b-112 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:38
- b218e7198b-113 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- b218e7198b-114 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- b218e7198b-115 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- b218e7198b-116 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- b218e7198b-117 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- b218e7198b-118 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- b218e7198b-119 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- b218e7198b-120 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- b218e7198b-121 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- b218e7198b-122 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- b218e7198b-123 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- b218e7198b-124 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- b218e7198b-125 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- b218e7198b-126 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- b218e7198b-127 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- b218e7198b-128 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo/src/internal/common/proxy/schema-validator.test.ts:85
- b218e7198b-129 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- b218e7198b-130 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- b218e7198b-131 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- b218e7198b-132 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- b218e7198b-133 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- b218e7198b-134 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- b218e7198b-135 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- b218e7198b-136 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- b218e7198b-137 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- b218e7198b-138 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- b218e7198b-139 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo/src/internal/JsonSchema/effect-schema.test.ts:25
- b218e7198b-140 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- b218e7198b-141 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- b218e7198b-142 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- b218e7198b-143 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- b218e7198b-144 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- b218e7198b-145 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- b218e7198b-146 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- b218e7198b-147 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- b218e7198b-148 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- b218e7198b-149 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- b218e7198b-150 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- b218e7198b-151 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- b218e7198b-152 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- b218e7198b-153 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- b218e7198b-154 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- b218e7198b-155 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- b218e7198b-156 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- b218e7198b-157 - ignored - error-messages-carry-context - packages/core/mesh/edge-client/src/edge-http-client.ts:157
- b218e7198b-158 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:481
- b218e7198b-159 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- b218e7198b-160 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- b218e7198b-161 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- b218e7198b-162 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- b218e7198b-163 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- b218e7198b-164 - ignored - test-asserts-real-behavior - packages/devtools/cli-util/src/util/form-builder.test.ts:49
- b218e7198b-165 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- b218e7198b-166 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/components/ControlledSelector.tsx:9
- b218e7198b-167 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:132
- b218e7198b-168 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:37
- b218e7198b-169 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:30
- b218e7198b-170 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84
- b218e7198b-171 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113
- b218e7198b-172 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46
- b218e7198b-173 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78
- b218e7198b-174 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:46
- b218e7198b-175 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89
- b218e7198b-176 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- b218e7198b-177 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39
- b218e7198b-178 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60
- b218e7198b-179 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:133
- b218e7198b-180 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100
- b218e7198b-181 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214
- b218e7198b-182 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- b218e7198b-183 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:41
- b218e7198b-184 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123
- b218e7198b-185 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:378
- b218e7198b-186 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- b218e7198b-187 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- b218e7198b-188 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:44
- b218e7198b-189 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:613
- b218e7198b-190 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193
- b218e7198b-191 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117
- b218e7198b-192 - ignored - no-invented-theme-tokens - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:95
- b218e7198b-193 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:51
- b218e7198b-194 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53
- b218e7198b-195 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113
- b218e7198b-196 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- b218e7198b-197 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131
- b218e7198b-198 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:66
- b218e7198b-199 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- b218e7198b-200 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:154
- b218e7198b-201 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:287
- b218e7198b-202 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:109
- b218e7198b-203 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- b218e7198b-204 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- b218e7198b-205 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- b218e7198b-206 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131
- b218e7198b-207 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- b218e7198b-208 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- b218e7198b-209 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99
- b218e7198b-210 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:279
- b218e7198b-211 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:111
- b218e7198b-212 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:134
- b218e7198b-213 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121
- b218e7198b-214 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:205
- b218e7198b-215 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:89
- b218e7198b-216 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:185
- b218e7198b-217 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- b218e7198b-218 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- b218e7198b-219 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- b218e7198b-220 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- b218e7198b-221 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- b218e7198b-222 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- b218e7198b-223 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- b218e7198b-224 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61
- b218e7198b-225 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109
- b218e7198b-226 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:133
- b218e7198b-227 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31
- b218e7198b-228 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55
- b218e7198b-229 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94
- b218e7198b-230 - ignored - no-casts - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34
- b218e7198b-231 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46
- b218e7198b-232 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:54
- b218e7198b-233 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- b218e7198b-234 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- b218e7198b-235 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96
- b218e7198b-236 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44
- b218e7198b-237 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:65
- b218e7198b-238 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:77
- b218e7198b-239 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- b218e7198b-240 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:72
- b218e7198b-241 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:96
- b218e7198b-242 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- b218e7198b-243 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- b218e7198b-244 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- b218e7198b-245 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- b218e7198b-246 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48
- b218e7198b-247 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96
- b218e7198b-248 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:93
- b218e7198b-249 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:257
- b218e7198b-250 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47
- b218e7198b-251 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:35
- b218e7198b-252 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:71
- b218e7198b-253 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47
- b218e7198b-254 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41
- b218e7198b-255 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- b218e7198b-256 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:74
- b218e7198b-257 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67
- b218e7198b-258 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102
- b218e7198b-259 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:190
- b218e7198b-260 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18
- b218e7198b-261 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79
- b218e7198b-262 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130
- b218e7198b-263 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- b218e7198b-264 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- b218e7198b-265 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- b218e7198b-266 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- b218e7198b-267 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166
- b218e7198b-268 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- b218e7198b-269 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62
- b218e7198b-270 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- b218e7198b-271 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:71
- b218e7198b-272 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:80
- b218e7198b-273 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54
- b218e7198b-274 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- b218e7198b-275 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75
- b218e7198b-276 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- b218e7198b-277 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx:26
- b218e7198b-278 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:64
- b218e7198b-279 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:88
- b218e7198b-280 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70
- b218e7198b-281 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82
- b218e7198b-282 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- b218e7198b-283 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- b218e7198b-284 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- b218e7198b-285 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49
- b218e7198b-286 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:97
- b218e7198b-287 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:181
- b218e7198b-288 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- b218e7198b-289 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- b218e7198b-290 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- b218e7198b-291 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- b218e7198b-292 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45
- b218e7198b-293 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:49
- b218e7198b-294 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:137
- b218e7198b-295 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:24
- b218e7198b-296 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- b218e7198b-297 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30
- b218e7198b-298 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188
- b218e7198b-299 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- b218e7198b-300 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83
- b218e7198b-301 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:169
- b218e7198b-302 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:22
- b218e7198b-303 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- b218e7198b-304 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- b218e7198b-305 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:102
- b218e7198b-306 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- b218e7198b-307 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55
- b218e7198b-308 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67
- b218e7198b-309 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157
- b218e7198b-310 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- b218e7198b-311 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- b218e7198b-312 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- b218e7198b-313 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- b218e7198b-314 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- b218e7198b-315 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- b218e7198b-316 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- b218e7198b-317 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111
- b218e7198b-318 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- b218e7198b-319 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- b218e7198b-320 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- b218e7198b-321 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- b218e7198b-322 - ignored - no-native-form-controls - packages/plugins/plugin-file/src/components/FileInput/FileInput.tsx:29
- b218e7198b-323 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297
- b218e7198b-324 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- b218e7198b-325 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:109
- b218e7198b-326 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278
- b218e7198b-327 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- b218e7198b-328 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:44
- b218e7198b-329 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:80
- b218e7198b-330 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- b218e7198b-331 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- b218e7198b-332 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- b218e7198b-333 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:91
- b218e7198b-334 - ignored - no-invented-theme-tokens - packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:15
- b218e7198b-335 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:91
- b218e7198b-336 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- b218e7198b-337 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- b218e7198b-338 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:91
- b218e7198b-339 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- b218e7198b-340 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- b218e7198b-341 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- b218e7198b-342 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78
- b218e7198b-343 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- b218e7198b-344 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:138
- b218e7198b-345 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:162
- b218e7198b-346 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95
- b218e7198b-347 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:181
- b218e7198b-348 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74
- b218e7198b-349 - ignored - subscribe-where-you-read - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:34
- b218e7198b-350 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- b218e7198b-351 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- b218e7198b-352 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:159
- b218e7198b-353 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- b218e7198b-354 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297
- b218e7198b-355 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:428
- b218e7198b-356 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:171
- b218e7198b-357 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:207
- b218e7198b-358 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:299
- b218e7198b-359 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- b218e7198b-360 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- b218e7198b-361 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- b218e7198b-362 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:240
- b218e7198b-363 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx:27
- b218e7198b-364 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:31
- b218e7198b-365 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:175
- b218e7198b-366 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- b218e7198b-367 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- b218e7198b-368 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- b218e7198b-369 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- b218e7198b-370 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:36
- b218e7198b-371 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- b218e7198b-372 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- b218e7198b-373 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/skills/InboxSendSkill.ts:1
- b218e7198b-374 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- b218e7198b-375 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- b218e7198b-376 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- b218e7198b-377 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:53
- b218e7198b-378 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77
- b218e7198b-379 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77
- b218e7198b-380 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- b218e7198b-381 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- b218e7198b-382 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- b218e7198b-383 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- b218e7198b-384 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- b218e7198b-385 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-kanban/src/skills/KanbanSkill.ts:1
- b218e7198b-386 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:39
- b218e7198b-387 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- b218e7198b-388 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:150
- b218e7198b-389 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109
- b218e7198b-390 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109
- b218e7198b-391 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- b218e7198b-392 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- b218e7198b-393 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28
- b218e7198b-394 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74
- b218e7198b-395 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36
- b218e7198b-396 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110
- b218e7198b-397 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:53
- b218e7198b-398 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:74
- b218e7198b-399 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- b218e7198b-400 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- b218e7198b-401 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:86
- b218e7198b-402 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:75
- b218e7198b-403 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:99
- b218e7198b-404 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- b218e7198b-405 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- b218e7198b-406 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76
- b218e7198b-407 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- b218e7198b-408 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188
- b218e7198b-409 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:120
- b218e7198b-410 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:336
- b218e7198b-411 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- b218e7198b-412 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- b218e7198b-413 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- b218e7198b-414 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- b218e7198b-415 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59
- b218e7198b-416 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71
- b218e7198b-417 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- b218e7198b-418 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- b218e7198b-419 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.stories.tsx:68
- b218e7198b-420 - ignored - comment-hygiene - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23
- b218e7198b-421 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132
- b218e7198b-422 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:48
- b218e7198b-423 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:88
- b218e7198b-424 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:100
- b218e7198b-425 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:128
- b218e7198b-426 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190
- b218e7198b-427 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:238
- b218e7198b-428 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:96
- b218e7198b-429 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:151
- b218e7198b-430 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:23
- b218e7198b-431 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41
- b218e7198b-432 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313
- b218e7198b-433 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:124
- b218e7198b-434 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:190
- b218e7198b-435 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216
- b218e7198b-436 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- b218e7198b-437 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82
- b218e7198b-438 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- b218e7198b-439 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69
- b218e7198b-440 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22
- b218e7198b-441 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16
- b218e7198b-442 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:36
- b218e7198b-443 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:158
- b218e7198b-444 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:374
- b218e7198b-445 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:870
- b218e7198b-446 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- b218e7198b-447 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:47
- b218e7198b-448 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:84
- b218e7198b-449 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:109
- b218e7198b-450 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- b218e7198b-451 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16
- b218e7198b-452 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78
- b218e7198b-453 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- b218e7198b-454 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- b218e7198b-455 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- b218e7198b-456 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- b218e7198b-457 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- b218e7198b-458 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- b218e7198b-459 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-preview/src/components/UnsupportedType/UnsupportedType.tsx:24
- b218e7198b-460 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:23
- b218e7198b-461 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- b218e7198b-462 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- b218e7198b-463 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130
- b218e7198b-464 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-projects/src/index.ts:1
- b218e7198b-465 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109
- b218e7198b-466 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69
- b218e7198b-467 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- b218e7198b-468 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- b218e7198b-469 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- b218e7198b-470 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:107
- b218e7198b-471 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:155
- b218e7198b-472 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:180
- b218e7198b-473 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:43
- b218e7198b-474 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55
- b218e7198b-475 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:138
- b218e7198b-476 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:150
- b218e7198b-477 - ignored - no-casts - packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:32
- b218e7198b-478 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- b218e7198b-479 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- b218e7198b-480 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138
- b218e7198b-481 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47
- b218e7198b-482 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35
- b218e7198b-483 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:104
- b218e7198b-484 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- b218e7198b-485 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456
- b218e7198b-486 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226
- b218e7198b-487 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- b218e7198b-488 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- b218e7198b-489 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- b218e7198b-490 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:39
- b218e7198b-491 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:265
- b218e7198b-492 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:311
- b218e7198b-493 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60
- b218e7198b-494 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60
- b218e7198b-495 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:188
- b218e7198b-496 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42
- b218e7198b-497 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309
- b218e7198b-498 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164
- b218e7198b-499 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx:32
- b218e7198b-500 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- b218e7198b-501 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- b218e7198b-502 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- b218e7198b-503 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- b218e7198b-504 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38
- b218e7198b-505 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62
- b218e7198b-506 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:106
- b218e7198b-507 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:84
- b218e7198b-508 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- b218e7198b-509 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141
- b218e7198b-510 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:134
- b218e7198b-511 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:71
- b218e7198b-512 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92
- b218e7198b-513 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:78
- b218e7198b-514 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- b218e7198b-515 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:80
- b218e7198b-516 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188
- b218e7198b-517 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40
- b218e7198b-518 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:36
- b218e7198b-519 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60
- b218e7198b-520 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- b218e7198b-521 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- b218e7198b-522 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:59
- b218e7198b-523 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- b218e7198b-524 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81
- b218e7198b-525 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87
- b218e7198b-526 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:303
- b218e7198b-527 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471
- b218e7198b-528 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:39
- b218e7198b-529 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:75
- b218e7198b-530 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270
- b218e7198b-531 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42
- b218e7198b-532 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- b218e7198b-533 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- b218e7198b-534 - ignored - comment-hygiene - packages/plugins/plugin-sheet/src/translations.ts:47
- b218e7198b-535 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:22
- b218e7198b-536 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- b218e7198b-537 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- b218e7198b-538 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- b218e7198b-539 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- b218e7198b-540 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- b218e7198b-541 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250
- b218e7198b-542 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/ForeignKeys/ForeignKeys.tsx:37
- b218e7198b-543 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50
- b218e7198b-544 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:114
- b218e7198b-545 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:98
- b218e7198b-546 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- b218e7198b-547 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- b218e7198b-548 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/CreateSpaceDialog/CreateSpaceDialog.tsx:47
- b218e7198b-549 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40
- b218e7198b-550 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:264
- b218e7198b-551 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- b218e7198b-552 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:239
- b218e7198b-553 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:51
- b218e7198b-554 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:227
- b218e7198b-555 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:79
- b218e7198b-556 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- b218e7198b-557 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- b218e7198b-558 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60
- b218e7198b-559 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:205
- b218e7198b-560 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:182
- b218e7198b-561 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:229
- b218e7198b-562 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32
- b218e7198b-563 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- b218e7198b-564 - ignored - comment-hygiene - packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13
- b218e7198b-565 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- b218e7198b-566 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:51
- b218e7198b-567 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:88
- b218e7198b-568 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:100
- b218e7198b-569 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:44
- b218e7198b-570 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:35
- b218e7198b-571 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58
- b218e7198b-572 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:118
- b218e7198b-573 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:77
- b218e7198b-574 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:113
- b218e7198b-575 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45
- b218e7198b-576 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- b218e7198b-577 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- b218e7198b-578 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:95
- b218e7198b-579 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:65
- b218e7198b-580 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137
- b218e7198b-581 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113
- b218e7198b-582 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:149
- b218e7198b-583 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15
- b218e7198b-584 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:39
- b218e7198b-585 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- b218e7198b-586 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- b218e7198b-587 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- b218e7198b-588 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60
- b218e7198b-589 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:82
- b218e7198b-590 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:94
- b218e7198b-591 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:36
- b218e7198b-592 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:161
- b218e7198b-593 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- b218e7198b-594 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-table/src/index.ts:1
- b218e7198b-595 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69
- b218e7198b-596 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125
- b218e7198b-597 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:21
- b218e7198b-598 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61
- b218e7198b-599 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:87
- b218e7198b-600 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40
- b218e7198b-601 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59
- b218e7198b-602 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:204
- b218e7198b-603 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- b218e7198b-604 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78
- b218e7198b-605 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330
- b218e7198b-606 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- b218e7198b-607 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- b218e7198b-608 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107
- b218e7198b-609 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86
- b218e7198b-610 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- b218e7198b-611 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247
- b218e7198b-612 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- b218e7198b-613 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:135
- b218e7198b-614 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- b218e7198b-615 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- b218e7198b-616 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- b218e7198b-617 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- b218e7198b-618 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253
- b218e7198b-619 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- b218e7198b-620 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:153
- b218e7198b-621 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- b218e7198b-622 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- b218e7198b-623 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- b218e7198b-624 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139
- b218e7198b-625 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- b218e7198b-626 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- b218e7198b-627 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- b218e7198b-628 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- b218e7198b-629 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- b218e7198b-630 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:57
- b218e7198b-631 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:41
- b218e7198b-632 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- b218e7198b-633 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- b218e7198b-634 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- b218e7198b-635 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56
- b218e7198b-636 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:30
- b218e7198b-637 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- b218e7198b-638 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- b218e7198b-639 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- b218e7198b-640 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:70
- b218e7198b-641 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:154
- b218e7198b-642 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:232
- b218e7198b-643 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- b218e7198b-644 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- b218e7198b-645 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- b218e7198b-646 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- b218e7198b-647 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- b218e7198b-648 - ignored - structured-logging-not-console - packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:20
- b218e7198b-649 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:61
- b218e7198b-650 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- b218e7198b-651 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- b218e7198b-652 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- b218e7198b-653 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- b218e7198b-654 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351
- b218e7198b-655 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- b218e7198b-656 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- b218e7198b-657 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- b218e7198b-658 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- b218e7198b-659 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- b218e7198b-660 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- b218e7198b-661 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:227
- b218e7198b-662 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- b218e7198b-663 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:194
- b218e7198b-664 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- b218e7198b-665 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- b218e7198b-666 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:396
- b218e7198b-667 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- b218e7198b-668 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- b218e7198b-669 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- b218e7198b-670 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- b218e7198b-671 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:88
- b218e7198b-672 - ignored - test-asserts-real-behavior - packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33
- b218e7198b-673 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- b218e7198b-674 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- b218e7198b-675 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- b218e7198b-676 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- b218e7198b-677 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- b218e7198b-678 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- b218e7198b-679 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/spaces.ts:73
- b218e7198b-680 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- b218e7198b-681 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- b218e7198b-682 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- b218e7198b-683 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- b218e7198b-684 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- b218e7198b-685 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- b218e7198b-686 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- b218e7198b-687 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- b218e7198b-688 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- b218e7198b-689 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- b218e7198b-690 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- b218e7198b-691 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- b218e7198b-692 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25
- b218e7198b-693 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- b218e7198b-694 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- b218e7198b-695 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- b218e7198b-696 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- b218e7198b-697 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- b218e7198b-698 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- b218e7198b-699 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- b218e7198b-700 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- b218e7198b-701 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- b218e7198b-702 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- b218e7198b-703 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/space/space-manager.ts:97
- b218e7198b-704 - ignored - no-casts - packages/sdk/client-services/src/internal/space/space-manager.ts:181
- b218e7198b-705 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- b218e7198b-706 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157
- b218e7198b-707 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- b218e7198b-708 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- b218e7198b-709 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- b218e7198b-710 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- b218e7198b-711 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- b218e7198b-712 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- b218e7198b-713 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- b218e7198b-714 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- b218e7198b-715 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- b218e7198b-716 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:211
- b218e7198b-717 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- b218e7198b-718 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- b218e7198b-719 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- b218e7198b-720 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- b218e7198b-721 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- b218e7198b-722 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- b218e7198b-723 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- b218e7198b-724 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- b218e7198b-725 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- b218e7198b-726 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- b218e7198b-727 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- b218e7198b-728 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- b218e7198b-729 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:274
- b218e7198b-730 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- b218e7198b-731 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- b218e7198b-732 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- b218e7198b-733 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- b218e7198b-734 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- b218e7198b-735 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- b218e7198b-736 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- b218e7198b-737 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- b218e7198b-738 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- b218e7198b-739 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- b218e7198b-740 - ignored - comment-hygiene - packages/sdk/shell/src/components/Panel/Action.tsx:106
- b218e7198b-741 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:34
- b218e7198b-742 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- b218e7198b-743 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- b218e7198b-744 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- b218e7198b-745 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- b218e7198b-746 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- b218e7198b-747 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61
- b218e7198b-748 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- b218e7198b-749 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:337
- b218e7198b-750 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- b218e7198b-751 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- b218e7198b-752 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- b218e7198b-753 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- b218e7198b-754 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- b218e7198b-755 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- b218e7198b-756 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- b218e7198b-757 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- b218e7198b-758 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112
- b218e7198b-759 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:77
- b218e7198b-760 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:173
- b218e7198b-761 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:226
- b218e7198b-762 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- b218e7198b-763 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:29
- b218e7198b-764 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- b218e7198b-765 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:153
- b218e7198b-766 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:370
- b218e7198b-767 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97
- b218e7198b-768 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:32
- b218e7198b-769 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346
- b218e7198b-770 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153
- b218e7198b-771 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:143
- b218e7198b-772 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- b218e7198b-773 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156
- b218e7198b-774 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246
- b218e7198b-775 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- b218e7198b-776 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- b218e7198b-777 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- b218e7198b-778 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:163
- b218e7198b-779 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:190
- b218e7198b-780 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- b218e7198b-781 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- b218e7198b-782 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88
- b218e7198b-783 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124
- b218e7198b-784 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- b218e7198b-785 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- b218e7198b-786 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- b218e7198b-787 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- b218e7198b-788 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76
- b218e7198b-789 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- b218e7198b-790 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- b218e7198b-791 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- b218e7198b-792 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50
- b218e7198b-793 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15
- b218e7198b-794 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Thread.tsx:15
- b218e7198b-795 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- b218e7198b-796 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:45
- b218e7198b-797 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28
- b218e7198b-798 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- b218e7198b-799 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- b218e7198b-800 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:43
- b218e7198b-801 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24
- b218e7198b-802 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- b218e7198b-803 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- b218e7198b-804 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- b218e7198b-805 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57
- b218e7198b-806 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120
- b218e7198b-807 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- b218e7198b-808 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82
- b218e7198b-809 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106
- b218e7198b-810 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194
- b218e7198b-811 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- b218e7198b-812 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- b218e7198b-813 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:222
- b218e7198b-814 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:346
- b218e7198b-815 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:42
- b218e7198b-816 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16
- b218e7198b-817 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:105
- b218e7198b-818 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114
- b218e7198b-819 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161
- b218e7198b-820 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240
- b218e7198b-821 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14
- b218e7198b-822 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- b218e7198b-823 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- b218e7198b-824 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- b218e7198b-825 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- b218e7198b-826 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169
- b218e7198b-827 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40
- b218e7198b-828 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14
- b218e7198b-829 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28
- b218e7198b-830 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:15
- b218e7198b-831 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27
- b218e7198b-832 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:270
- b218e7198b-833 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:127
- b218e7198b-834 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:290
- b218e7198b-835 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:491
- b218e7198b-836 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95
- b218e7198b-837 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- b218e7198b-838 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:93
- b218e7198b-839 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:281
- b218e7198b-840 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83
- b218e7198b-841 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- b218e7198b-842 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:61
- b218e7198b-843 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- b218e7198b-844 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:278
- b218e7198b-845 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:20
- b218e7198b-846 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- b218e7198b-847 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80
- b218e7198b-848 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- b218e7198b-849 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- b218e7198b-850 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440
- b218e7198b-851 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607
- b218e7198b-852 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56
- b218e7198b-853 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120
- b218e7198b-854 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- b218e7198b-855 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228
- b218e7198b-856 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:410
- b218e7198b-857 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162
- b218e7198b-858 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/debug/Debug.tsx:52
- b218e7198b-859 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/debug/Debug.tsx:64
- b218e7198b-860 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45
- b218e7198b-861 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- b218e7198b-862 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- b218e7198b-863 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:83
- b218e7198b-864 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:204
- b218e7198b-865 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:398
- b218e7198b-866 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:62
- b218e7198b-867 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- b218e7198b-868 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- b218e7198b-869 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- b218e7198b-870 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- b218e7198b-871 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Card.stories.tsx:76
- b218e7198b-872 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111
- b218e7198b-873 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188
- b218e7198b-874 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218
- b218e7198b-875 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254
- b218e7198b-876 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18
- b218e7198b-877 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.tsx:98
- b218e7198b-878 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.tsx:53
- b218e7198b-879 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.stories.tsx:64
- b218e7198b-880 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:52
- b218e7198b-881 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:119
- b218e7198b-882 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:99
- b218e7198b-883 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:31
- b218e7198b-884 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:192
- b218e7198b-885 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx:155
- b218e7198b-886 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:434
- b218e7198b-887 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:157
- b218e7198b-888 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87
- b218e7198b-889 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:135
- b218e7198b-890 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:213
- b218e7198b-891 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37
- b218e7198b-892 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37
- b218e7198b-893 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.stories.tsx:116
- b218e7198b-894 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:69
- b218e7198b-895 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60
- b218e7198b-896 - ignored - structured-logging-not-console - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60
- b218e7198b-897 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:137
- b218e7198b-898 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63
- b218e7198b-899 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:48
- b218e7198b-900 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:100
- b218e7198b-901 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:280
- b218e7198b-902 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:99
- b218e7198b-903 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:200
- b218e7198b-904 - ignored - comment-hygiene - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:224
- b218e7198b-905 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- b218e7198b-906 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- b218e7198b-907 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- b218e7198b-908 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21
- b218e7198b-909 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68
- b218e7198b-910 - ignored - no-casts - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58
- b218e7198b-911 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82
- b218e7198b-912 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92
- b218e7198b-913 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- b218e7198b-914 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- b218e7198b-915 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:59
- b218e7198b-916 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:123
- b218e7198b-917 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:207
- b218e7198b-918 - ignored - no-casts - packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20
- b218e7198b-919 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116
- b218e7198b-920 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207
- b218e7198b-921 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119
- b218e7198b-922 - ignored - comment-hygiene - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23
- b218e7198b-923 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35
- b218e7198b-924 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:225
- b218e7198b-925 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98
- b218e7198b-926 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:55
- b218e7198b-927 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:194
- b218e7198b-928 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74
- b218e7198b-929 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:58
- b218e7198b-930 - ignored - no-casts - packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:223
- b218e7198b-931 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Listbox/ListItemContent.stories.tsx:13
- b218e7198b-932 - ignored - no-casts - packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:20
- b218e7198b-933 - ignored - no-casts - packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:19
- b218e7198b-934 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:115
- b218e7198b-935 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293
- b218e7198b-936 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711
- b218e7198b-937 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:91
- b218e7198b-938 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:359
- b218e7198b-939 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:912
- b218e7198b-940 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- b218e7198b-941 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61
- b218e7198b-942 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:88
- b218e7198b-943 - ignored - no-casts - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- b218e7198b-944 - ignored - no-casts - packages/ui/react-ui-menu/src/components/action-label.ts:17
- b218e7198b-945 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20
- b218e7198b-946 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:108
- b218e7198b-947 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:87
- b218e7198b-948 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268
- b218e7198b-949 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:103
- b218e7198b-950 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173
- b218e7198b-951 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- b218e7198b-952 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- b218e7198b-953 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255
- b218e7198b-954 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177
- b218e7198b-955 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:119
- b218e7198b-956 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:101
- b218e7198b-957 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40
- b218e7198b-958 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- b218e7198b-959 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:84
- b218e7198b-960 - ignored - structured-logging-not-console - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115
- b218e7198b-961 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115
- b218e7198b-962 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:500
- b218e7198b-963 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-syntax-highlighter/src/Syntax/Syntax.tsx:98
- b218e7198b-964 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31
- b218e7198b-965 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97
- b218e7198b-966 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118
- b218e7198b-967 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118
- b218e7198b-968 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:229
- b218e7198b-969 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:48
- b218e7198b-970 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- b218e7198b-971 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- b218e7198b-972 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- b218e7198b-973 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53
- b218e7198b-974 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:133
- b218e7198b-975 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:713
- b218e7198b-976 - ignored - error-messages-carry-context - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1328
- b218e7198b-977 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970
- b218e7198b-978 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:497
- b218e7198b-979 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:435
- b218e7198b-980 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:99
- b218e7198b-981 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- b218e7198b-982 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133
- b218e7198b-983 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:75
- b218e7198b-984 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:315
- b218e7198b-985 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341
- b218e7198b-986 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341
- b218e7198b-987 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505
- b218e7198b-988 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184
- b218e7198b-989 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- b218e7198b-990 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:64
- b218e7198b-991 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:148
- b218e7198b-992 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:228
- b218e7198b-993 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:311
- b218e7198b-994 - ignored - no-casts - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:30
- b218e7198b-995 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:77
- b218e7198b-996 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.tsx:89
- b218e7198b-997 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:78
- b218e7198b-998 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24
- b218e7198b-999 - ignored - no-casts - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:44
- b218e7198b-1000 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Banner/index.ts:1
- b218e7198b-1001 - ignored - no-casts - packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx:42
- b218e7198b-1002 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Button/Button.stories.tsx:13
- b218e7198b-1003 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:18
- b218e7198b-1004 - ignored - no-casts - packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:135
- b218e7198b-1005 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui/src/components/Button/IconButton.tsx:15
- b218e7198b-1006 - ignored - structured-logging-not-console - packages/ui/react-ui/src/components/Card/Card.stories.tsx:24
- b218e7198b-1007 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Card/Card.stories.tsx:59
- b218e7198b-1008 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx:23
- b218e7198b-1009 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx:48
- b218e7198b-1010 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Column/Column.stories.tsx:90
- b218e7198b-1011 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:51
- b218e7198b-1012 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103
- b218e7198b-1013 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Drawer/Drawer.stories.tsx:41
- b218e7198b-1014 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Drawer/index.ts:1
- b218e7198b-1015 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:38
- b218e7198b-1016 - ignored - no-casts - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:35
- b218e7198b-1017 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.tsx:22
- b218e7198b-1018 - ignored - no-casts - packages/ui/react-ui/src/components/Field/Field.stories.tsx:142
- b218e7198b-1019 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Field/Field.stories.tsx:231
- b218e7198b-1020 - ignored - themed-primitives-take-classNames - packages/ui/react-ui/src/components/Field/PinInput.tsx:24
- b218e7198b-1021 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Field/PinInput.tsx:55
- b218e7198b-1022 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Field/SegmentedInput.tsx:80
- b218e7198b-1023 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx:30
- b218e7198b-1024 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Focus/Focus.stories.tsx:26
- b218e7198b-1025 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Focus/index.ts:1
- b218e7198b-1026 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx:15
- b218e7198b-1027 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Icon/Icon.stories.tsx:88
- b218e7198b-1028 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Image/Image.stories.tsx:41
- b218e7198b-1029 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Image/Image.stories.tsx:69
- b218e7198b-1030 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Image/index.ts:1
- b218e7198b-1031 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Main/Main.stories.tsx:76
- b218e7198b-1032 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/components/Main/Main.tsx:54
- b218e7198b-1033 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Menu/Menu.stories.tsx:210
- b218e7198b-1034 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/MenuButton/MenuButton.stories.tsx:39
- b218e7198b-1035 - ignored - no-hand-rolled-lists - packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:17
- b218e7198b-1036 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:102
- b218e7198b-1037 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:122
- b218e7198b-1038 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:153
- b218e7198b-1039 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/QrCode/index.ts:1
- b218e7198b-1040 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:47
- b218e7198b-1041 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:142
- b218e7198b-1042 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/ScrollContainer/index.ts:1
- b218e7198b-1043 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Select/Select.stories.tsx:57
- b218e7198b-1044 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19
- b218e7198b-1045 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19
- b218e7198b-1046 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Slider/index.ts:1
- b218e7198b-1047 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Slider/Slider.stories.tsx:84
- b218e7198b-1048 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Steps/index.ts:1
- b218e7198b-1049 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:181
- b218e7198b-1050 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Tag/index.ts:1
- b218e7198b-1051 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/TextCrawl/index.ts:1
- b218e7198b-1052 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:35
- b218e7198b-1053 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:90
- b218e7198b-1054 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.tsx:182
- b218e7198b-1055 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:28
- b218e7198b-1056 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Toast/Toast.tsx:186
- b218e7198b-1057 - ignored - no-casts - packages/ui/react-ui/src/components/Toolbar/Toolbar.stories.tsx:69
- b218e7198b-1058 - ignored - no-casts - packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:40
- b218e7198b-1059 - ignored - no-casts - packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:55
- b218e7198b-1060 - ignored - no-sleep-in-test - packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:79
- b218e7198b-1061 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Tooltip/Tooltip.tsx:184
- b218e7198b-1062 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Tour/Tour.stories.tsx:98
- b218e7198b-1063 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:48
- b218e7198b-1064 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:107
- b218e7198b-1065 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:119
- b218e7198b-1066 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- b218e7198b-1067 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- b218e7198b-1068 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Container/Container.stories.tsx:11
- b218e7198b-1069 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14
- b218e7198b-1070 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/layout/Flex/index.ts:1
- b218e7198b-1071 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/playground/Elevation.stories.tsx:50
- b218e7198b-1072 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:116
- b218e7198b-1073 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/DensityProvider/index.ts:1
- b218e7198b-1074 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/ElevationProvider/index.ts:1
- b218e7198b-1075 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- b218e7198b-1076 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51
- b218e7198b-1077 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63
- b218e7198b-1078 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- b218e7198b-1079 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- b218e7198b-1080 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# WARN b218e7198b-1 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:163`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 163-174 (`context.push(`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-2 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-3 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-4 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:34`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 34-47 (`)}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-6 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:68`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 68-79 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-7 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`</Field.Root>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-8 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-9 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:78`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 78-89 (`multiUse: true,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-10 moon-yml-entrypoint-registration `packages/common/effect/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.81. The likeliest place is lines 25-36 (`"./DynamicRuntime": {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-11 import-as-namespace-is-all-or-nothing `packages/common/effect/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`export * as AtomEx from './AtomEx.ts';`, location confidence 0.56). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-12 import-as-namespace-is-all-or-nothing `packages/common/effect/src/internal/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-11 (`export * as GlobalValue from './GlobalValue.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-13 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:1`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 1-38 (`import * as Duration from 'effect/Duration';`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-14 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-15 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 129-140 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-16 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:1`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.83. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-17 structured-logging-not-console `packages/core/compute/agent-claude/src/Demo.test.ts:42`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 42-53 (`for (const message of collected) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-18 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.86. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-19 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-20 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-21 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-22 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 148-154 (`),`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-23 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-24 no-casts `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 237-245 (`const readBody = async (init?: RequestInit): Promise<any> => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-25 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-26 error-messages-carry-context `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:957`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 957-965 (`const error = (patch?: string) =>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-27 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 293-304 (`);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-28 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-29 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-30 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-31 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-32 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-33 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:77`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 77-88 (`export const loadInstructions = (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-34 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-35 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-36 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-37 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-38 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-39 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-40 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 426-449 (`const manager = yield* ProcessManager.Service;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-41 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1455-1478 (`);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-42 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-43 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.81. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-44 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 350-361 (`};`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-45 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 362-373 (`};`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-46 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-47 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-48 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.81. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.61). Judged with added `imports, package, public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-49 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-50 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-51 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-52 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-53 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-54 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-55 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-56 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-57 no-casts `packages/core/compute/compute/src/Process.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 327-346 (`[ProcessTypeId]: {} as any,`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-58 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.test.ts:68`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 68-79 (`const resolve = ({ registry = [], space = [] }: { registry?: Skill.Skill[]; s...`, location confidence 0.99). Judged with added `test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-59 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.92. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-60 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-61 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 73-83 (`}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-62 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-63 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-64 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-65 options-object-with-defaults `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:42`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.80. The likeliest place is lines 42-53 (`this._serviceContainer = new ServiceContainer(`, location confidence 0.59). Judged with added `importers, imports` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-66 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-67 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-68 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-69 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-70 test-asserts-real-behavior `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.29). Judged with added `pr, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-71 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-72 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 112-123 (`},`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-73 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-74 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-75 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-76 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-77 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-78 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-79 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-80 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-81 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-82 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:131`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 131-142 (`Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-83 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-84 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-85 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-86 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 154-164 (`});`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-87 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-88 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-89 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-90 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-91 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-92 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-93 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-94 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-95 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-96 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1008`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1008-1031 (`return this._afterCreate<T>(handle.documentId);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-97 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1272`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1272-1295 (`private async _getContainingSpaceForDocument(documentId: string): Promise<Pub...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-98 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1728`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 1728-1751 (`private _leaseUntilSettled(documentId: DocumentId): void {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-99 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-100 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:195`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 195-206 (`const heads = ['hash1', 'hash2'];`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-101 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 29-36 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-102 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:205`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.92. The likeliest place is lines 205-216 (`removeRangeEffect(keyPrefix: StorageKey): Effect.Effect<void, SqlError.SqlErr...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-103 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-104 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 93-104 (`});`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-105 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-106 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-107 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-108 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-109 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-110 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-111 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.92. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-112 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:38`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 38-49 (`updateIndexes: () => Promise<void>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-113 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-114 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-115 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-116 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-117 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-118 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 884-907 (`break;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-119 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-120 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-121 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-122 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-123 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.89. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-124 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-125 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-126 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 666-687 (`return {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-127 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-128 namespace-brand-key-prefixing `packages/core/echo/echo/src/internal/common/proxy/schema-validator.test.ts:85`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 85-96 (`const annotationId = 'test.annotation.foo';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-129 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-130 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-131 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-132 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-133 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-134 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-135 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-136 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-137 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-138 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-139 namespace-brand-key-prefixing `packages/core/echo/echo/src/internal/JsonSchema/effect-schema.test.ts:25`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 25-33 (`test('custom annotation keys are emitted when opted in', () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-140 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-141 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-142 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-143 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-144 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-145 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-146 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-147 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-148 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-149 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-150 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-151 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-152 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-153 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-154 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-155 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-156 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-157 error-messages-carry-context `packages/core/mesh/edge-client/src/edge-http-client.ts:157`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 157-174 (`const parseFinalizeResponse = (body: unknown): FinalizedUpload => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-158 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:481`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 481-504 (`body: data as BodyInit,`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-159 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-160 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-161 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-162 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-163 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-164 test-asserts-real-behavior `packages/devtools/cli-util/src/util/form-builder.test.ts:49`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 49-60 (`yield* Console.log(print(doc));`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-165 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-166 event-handler-naming-convention `packages/devtools/devtools/src/components/ControlledSelector.tsx:9`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 9-15 (`export type ControlledSelectorProps<T> = {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-167 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:132`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 132-143 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-168 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-169 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`const [recording, setRecording] = useState(false);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-170 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 84-95 (`const data = useMemo(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-171 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const dataRows = useMemo(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-172 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 46-57 (`const handleRowClicked = (row: any) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-173 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 78-89 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.93). Judged with added `siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-174 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 46-57 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-175 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 89-100 (`async (spaceId: string) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-176 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-177 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 39-50 (`</Banner.Content>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-178 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 60-71 (`try {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-179 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:133`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 133-144 (`let response: any;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-180 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 100-111 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-181 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 214-225 (`export const SignalMessageTable = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-182 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-183 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 41-52 (`return feedSchemas.length === 0`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-184 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 123-146 (`const feedMessages = useQuery(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-185 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:378`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 378-410 (`>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-186 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-187 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-188 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:44`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 44-48 (`const styles = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-189 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:613`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 613-624 (`<div className={mx('flex flex-col', styles.toolbar)}>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-190 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 193-204 (`'flex flex-col w-full dx-density-md',`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-191 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 117-128 (`interval={500}`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-192 no-invented-theme-tokens `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:95`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 95-106 (`<div className={subGridClassNames}>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-193 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:51`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 51-62 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-194 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 53-64 (`}, [manager]);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-195 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.86. The likeliest place is lines 113-124 (`const loadedLabel = running`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-196 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-197 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 131-142 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-198 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:66`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 66-77 (`{roles.map((role) => (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-199 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-200 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:154`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 154-165 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-201 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:287`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 287-298 (`<IconButton.Root icon='ph--skip-back--regular' iconOnly label='Reset (R)' onC...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-202 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 109-120 (`const TriggerStatusPopover = ({`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-203 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`.action(`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-204 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-205 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.87. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-206 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 131-142 (`const authorize = (server: McpServer.McpServer, popup: Window | null) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-207 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-208 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-209 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 99-110 (`useEffect(() => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-210 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:279`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 279-290 (`<Banner.Body>{t('mirror-unresolved.label')}</Banner.Body>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-211 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-212 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 134-145 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-213 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 121-132 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-214 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 205-216 (`<Panel.Toolbar asChild>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-215 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 89-100 (`objects`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-216 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:185`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 185-196 (`<Toolbar.IconButton`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-217 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-218 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-219 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-220 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-221 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-222 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-92 (`);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-223 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-224 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-225 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 109-120 (`<div>{participants}</div>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-226 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:133`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 133-144 (`{actions`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-227 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 31-42 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-228 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 55-66 (`const timeout = setTimeout(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-229 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 94-105 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-230 no-casts `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 34-45 (`const screenshare: UserState = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-231 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 46-57 (`});`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-232 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 54-59 (`const defaultGetId: ResponsiveGridProps<any>['getId'] = (item: any) => item.id;`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-233 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-234 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-235 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 96-107 (`iconOnly`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-236 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-237 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:65`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 65-76 (`<Toolbar.IconButton`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-238 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 77-88 (`</Toolbar.Root>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-239 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-240 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:72`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 72-83 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-241 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 96-107 (`)}`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-242 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-243 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-244 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-245 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-246 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 48-59 (`const closedRef = useRef(false);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-247 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 96-107 (`}`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-248 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 93-104 (`onValueChange={(value) =>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-249 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:257`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 257-268 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-250 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 47-58 (`if (!hubClient) {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-251 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 35-51 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-252 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:71`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 71-81 (`<div className='w-4 text-xs text-center text-subdued'>{i + 1}</div>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-253 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-52 (`export const Default: Story = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-254 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.87. The likeliest place is lines 41-52 (`setFetchState((previous) => (previous.state === 'ready' ? previous : { state:...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-255 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-48 (`return (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-256 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 74-85 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-257 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.96. The likeliest place is lines 67-78 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-258 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 102-113 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-259 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:190`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 190-201 (`let cancelled = false;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-260 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 18-29 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-261 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 79-90 (`return (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-262 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 130-141 (`AiService.AiService,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-263 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 494-517 (`);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-264 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-265 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-266 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-267 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 166-182 (`const openCreateSyncRoutineDialog = (`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-268 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-269 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-270 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-271 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 71-82 (`</Toolbar.Root>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-272 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:80`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 80-91 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-273 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 54-65 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-274 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-275 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 75-86 (`iconOnly`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-276 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-277 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx:26`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 26-37 (`export const DebugPanelHeader = ({ mode, onModeChange, onClose, density }: De...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-278 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 64-75 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-279 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 88-99 (`{/* The settings variant puts the control in a right-hand column; log rows ne...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-280 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 70-81 (`});`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-281 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 82-93 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-282 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-283 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-284 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-285 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 49-60 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-286 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:97`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 97-108 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-287 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:181`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 181-192 (`<Panel.Root {...Util.composableProps(props)} ref={forwardedRef}>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-288 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-289 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 31-40 (`export const useDrawerState = () =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-290 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-291 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-292 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 45-56 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-293 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:49`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 49-60 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-294 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:137`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 137-148 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-295 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:24`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 24-35 (`const MainPane = ({ id, label }: { id: string; label: string }) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-296 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 44-55 (`const SplitStory = () => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-297 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 30-41 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-298 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 188-213 (`return (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-299 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-300 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 83-94 (`data-tauri-drag-region='deep'`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-301 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:169`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 169-180 (`<IconButton.Root`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-302 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:22`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 22-33 (`export const useBreadcrumbs = (ids: string[]): Breadcrumb[] => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-303 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-304 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-305 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:102`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 102-107 (`});`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-306 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-307 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 55-66 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-308 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.92. The likeliest place is lines 67-78 (`url.searchParams.set('sort', 'updated');`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-309 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 157-171 (`const Content = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-310 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-311 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-312 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-313 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-314 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-315 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-316 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-317 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-318 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-319 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-320 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-321 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-322 no-native-form-controls `packages/plugins/plugin-file/src/components/FileInput/FileInput.tsx:29`

System One judges this a likely violation of `no-native-form-controls` (Edit objects with the schema-driven `Form`, never a native input), p=0.81. The likeliest place is lines 29-40 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-323 extract-non-rendering-logic-from-component `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 297-308 (`let task: PDFDocumentLoadingTask | undefined;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-324 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-325 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:109`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 109-120 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-326 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 278-289 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-327 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-328 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:44`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 44-55 (`setPending(true);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-329 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 80-91 (`<Field.Input readOnly value={reference} classNames='grow' />`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-330 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-331 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-332 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-333 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:91`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 91-102 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-334 no-invented-theme-tokens `packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:15`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 15-26 (`const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; class...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-335 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:91`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 91-102 (`/>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-336 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-337 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-338 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 91-102 (`setPhase('idle');`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-339 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-340 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`try {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-341 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-342 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 78-98 (`const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Laye...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-343 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-344 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:138`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 138-149 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-345 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 162-173 (`<div className='dx-expand flex flex-col gap-2 overflow-y-auto'>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-346 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 95-106 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-347 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 181-194 (`</div>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-348 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 74-85 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-349 subscribe-where-you-read `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:34`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 34-45 (`export const PortfolioReportDetail = ({ role, subject, companionTo }: Portfol...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-350 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-351 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.82. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-352 extract-non-rendering-logic-from-component `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:159`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 159-170 (`MermaidEngine.layout(source, {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-353 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-354 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 297-320 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-355 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:428`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 428-451 (`'dx-document dx-attention-surface border border-subdued-separator rounded ove...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-356 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:171`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.88. The likeliest place is lines 171-182 (`setShowBcc(true);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-357 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:207`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 207-218 (`return (`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-358 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:299`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 299-310 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-359 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-360 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-361 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-362 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:240`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 240-263 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-363 subscribe-where-you-read `packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx:27`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 27-38 (`export const RelatedToContact = ({ subject: contact }: RelatedToContactProps)...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-364 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 31-42 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-365 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:175`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 175-186 (`onCheckedChange={toggleAll}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-366 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-367 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-368 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-369 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.87. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.67). Judged with added `test` context after a first pass of 0.55. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-370 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:36`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 36-40 (`export const ANALYZE_CURSOR_KEY_ID = 'analyzeMailbox';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-371 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-372 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-373 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/skills/InboxSendSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-15 (`import type * as Operation from '@dxos/compute/Operation';`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-374 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-375 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-376 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-377 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 53-64 (`const BeaconPopover = () => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-378 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 77-88 (`<div className='flex flex-col gap-1'>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-379 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.86. The likeliest place is lines 77-88 (`<div className='flex flex-col gap-1'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-380 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-381 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-382 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-383 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`if (target == null) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-384 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-385 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-kanban/src/skills/KanbanSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-14 (`import * as Skill from '@dxos/compute/Skill';`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-386 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:39`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 39-50 (`<Toolbar.IconButton`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-387 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 114-125 (`() =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-388 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:150`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 150-161 (`<img src={cover} alt='' className='w-[6rem] aspect-[2/3] shrink-0 self-start ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-389 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 109-120 (`}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-390 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 109-120 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-391 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-392 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-393 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 28-39 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-394 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 74-80 (`<div className='dx-expand grid grid-cols-2 gap-2 px-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-395 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 36-47 (`{words.map((word) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-396 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 110-123 (`/>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-397 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 53-64 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-398 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 74-88 (`</Card.Row>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-399 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-400 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-401 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:86`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 86-97 (`});`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-402 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 75-86 (`void handleFetch();`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-403 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:99`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 99-110 (`</Select.Viewport>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-404 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-405 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-406 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 76-87 (`const features = useMemo(`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-407 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-408 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 188-196 (`const useTest = (view: EditorView | null) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-409 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 120-131 (`const [missing, setMissing] = useState(false);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-410 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:336`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 336-347 (`if (mode === 'section') {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-411 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-412 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-413 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-414 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-415 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 59-70 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-416 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 71-82 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-417 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 119-130 (`return (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-418 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 119-130 (`return (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-419 toolbars-are-menu-actions `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.stories.tsx:68`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 68-80 (`label={splitterMode === 'end' ? 'Collapse' : 'Expand'}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-420 comment-hygiene `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 23-33 (`type MobileLayoutRootProps = Util.ThemedClassName<`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-421 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`const description = describeScrollTarget(event.target);`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-422 toolbars-are-menu-actions `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:48`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 48-59 (`const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-423 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 88-99 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-424 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 100-111 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-425 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 128-137 (`monolithicAction ? monolithicAction.properties!.label : props.label,`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-426 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 190-201 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-427 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:238`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 238-249 (`'flex justify-center items-center dx-focus-ring-group-indicator transition-co...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-428 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 96-107 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-429 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:151`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 151-162 (`<Tree`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-430 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 23-34 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-431 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 41-52 (`const current = getHotkeyScope() ?? '';`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-432 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 313-324 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-433 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 124-135 (`parent = node;`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-434 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:190`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 190-201 (`const meta = {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-435 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 216-227 (`export const Visitor = () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-436 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-437 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 82-92 (`(event) =>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-438 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-439 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 69-80 (`</Dialog.Title>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-440 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 22-33 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-441 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 16-27 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-442 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 36-50 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-443 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:158`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 158-181 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-444 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:374`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 374-397 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-445 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:870`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 870-893 (`const InlineForm = ({`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-446 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.49). Judged with added `diff, imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-447 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 47-58 (`} else {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-448 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-95 (`const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-449 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:109`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 109-120 (`export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootPr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-450 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.89. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-451 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 16-27 (`export const Layout = Util.composable<HTMLDivElement, LayoutProps>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-452 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 78-89 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-453 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-454 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-455 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-456 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-457 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-458 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-459 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-preview/src/components/UnsupportedType/UnsupportedType.tsx:24`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 24-35 (`export const UnsupportedType = ({ role, typename }: UnsupportedTypeProps) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-460 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 23-34 (`export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-461 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-462 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-463 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 130-141 (`const fiber = Effect.runFork(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-464 namespace-export-with-internal-hiding `packages/plugins/plugin-projects/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as ProjectsPlugin from './ProjectsPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-465 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 109-120 (`{`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-466 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 69-80 (`expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox....`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-467 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-468 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 58-69 (`return (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-469 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-470 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 107-118 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-471 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:155`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 155-166 (`) : (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-472 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:180`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 180-191 (`<div className='flex items-center gap-2'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-473 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:43`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 43-54 (`label={t('failure-badge.label')}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-474 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 55-68 (`reason:`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-475 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:138`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 138-149 (`return (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-476 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:150`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 150-161 (`)}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-477 no-casts `packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-478 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-479 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 130-141 (`}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-480 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 138-149 (`[anchor, onComment],`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-481 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 47-58 (`standalone`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-482 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-483 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 104-115 (`</div>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-484 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-485 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 456-467 (`const filteredAnchors = showResolvedThreads`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-486 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 226-237 (`<IconButton.Root icon='ph--trash--regular' label={t('discard-branch.label')} ...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-487 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-488 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-489 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-490 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:39`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 39-50 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-491 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:265`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 265-275 (`const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-492 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:311`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 311-317 (`const LabelledRow = ({ label, children, classNames }: Util.ThemedClassName<Pr...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-493 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 60-71 (`},`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-494 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 60-71 (`},`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-495 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 188-199 (`if (inputIndex !== -1) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-496 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 42-48 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-497 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 309-320 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-498 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 164-177 (`}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-499 no-invented-theme-tokens `packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx:32`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 32-38 (`const STATUS_CLASSES: Record<RunStatus, string> = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-500 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.93. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-501 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-502 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-503 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 32-46 (`);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-504 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.94. The likeliest place is lines 38-49 (`return (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-505 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 62-76 (`);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-506 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 106-117 (`selectedPath={selectedPath}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-507 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 84-95 (`case 'script':`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-508 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 13-28 (`import * as ScrollArea from '@dxos/react-ui/ScrollArea';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-509 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 141-152 (`{/* Side rail */}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-510 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:134`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 134-143 (`<Toolbar.IconButton icon='ph--play--regular' label='Execute' iconOnly onClick...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-511 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 71-84 (`<Toolbar.Root>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-512 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 92-103 (`keymap.of(lintKeymap),`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-513 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:78`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 78-89 (`</Dialog.Header>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-514 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-515 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`});`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-516 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 188-199 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-517 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.95. The likeliest place is lines 40-51 (`if (!token || !gistId) {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-518 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 36-47 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-519 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 60-71 (`onClientInitialized: ({ client }) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-520 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-521 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.84. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-522 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 59-70 (`Object.entries(fields).some(([, value]) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-523 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-524 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 81-92 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-525 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-526 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:303`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 303-314 (`}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-527 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 471-482 (`<div`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-528 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 39-50 (`}, [space]);`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-529 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 75-86 (`<Field.Root>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-530 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 270-281 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-531 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 42-55 (`>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-532 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-533 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-534 comment-hygiene `packages/plugins/plugin-sheet/src/translations.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 47-60 (`'add-row-after.label': 'Add row after',`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-535 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:22`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 22-33 (`export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][n...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-536 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-537 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-538 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-539 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-540 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-541 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 250-261 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-542 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/ForeignKeys/ForeignKeys.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-48 (`const KeyItem = ({ forignKey, onDelete }: KeyItemProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-543 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 50-61 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-subdued'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-544 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:114`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 114-125 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-545 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:98`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.85. The likeliest place is lines 98-109 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-546 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-547 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-548 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/CreateSpaceDialog/CreateSpaceDialog.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 47-58 (`.filter(({ hidden }) => !hidden)`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-549 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 40-51 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-550 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 264-275 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-551 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-552 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:239`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 239-250 (`useEffect(() => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-553 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 51-62 (`}, [schemas]);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-554 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 227-238 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-555 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:79`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 79-90 (`const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-556 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-557 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-558 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 60-70 (`}, [updateState]);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-559 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 205-216 (`const rail = (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-560 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:182`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 182-193 (`<Panel.Toolbar classNames='dx-toolbar-surface'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-561 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:229`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 229-237 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-562 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-47 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-563 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-564 comment-hygiene `packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 13-24 (`export const StatusBarActions = (_props: StatusBarActionsProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-565 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-566 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 51-65 (`<div role='img' aria-label={label} className='dx-fill flex items-center justi...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-567 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 88-99 (`<div className='flex items-center gap-1'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-568 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 100-111 (`<Toolbar.IconButton`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-569 no-invented-theme-tokens `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:44`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 44-55 (`const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-570 no-invented-theme-tokens `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:35`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 35-49 (`const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boole...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-571 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 58-69 (`export const GalleryArticle = ({ role, subject: collection }: GalleryArticleP...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-572 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 118-129 (`<Panel.Toolbar asChild>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-573 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:77`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 77-88 (`(id: string) =>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-574 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 113-124 (`return;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-575 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 45-56 (`export const MediaArtifactVariants = ({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-576 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-577 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-578 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:95`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 95-106 (`const operationService = (): Operation.OperationService => ({`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-579 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 65-76 (`<Select.Viewport>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-580 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 137-148 (`}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-581 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 113-124 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-582 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:149`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 149-160 (`classNames='w-60 min-h-40 gap-0 p-2 border-accent-bg bg-accent-bg text-accent...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-583 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-24 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-584 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.92. The likeliest place is lines 39-53 (`export const Key = ({ binding }: { binding: string }) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-585 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-586 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-587 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 228-241 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-588 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 60-71 (`Obj.update(subject, (subject) => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-589 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 82-93 (`const registrars = manager`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-590 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 94-105 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-591 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:36`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 36-50 (`data-testid='supportPlugin.startTour'`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-592 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:161`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 161-172 (`const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-593 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 165-176 (`return {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-594 namespace-export-with-internal-hiding `packages/plugins/plugin-table/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as TablePlugin from './TablePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-595 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 69-80 (`<JournalEntry`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-596 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 125-136 (`<div`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-597 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:21`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 21-32 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-598 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-599 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 87-98 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-600 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 40-51 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-601 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-602 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:204`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 204-215 (`onFiles(files);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-603 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 136-151 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-604 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 78-89 (`const [filterText, setFilterText] = useFilterQuery(taskSet.id, filterEditorRef);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-605 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 330-341 (`>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-606 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-607 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-608 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 107-118 (`export const TerraForm = ({ config, onChange, onWaterSheen }: TerraFormProps)...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-609 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 86-97 (`engine.evaluateAt(simNow());`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-610 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-611 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 247-258 (`const manager = managerRef.current;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-612 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-613 no-styling-wrapper-divs `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:135`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 135-146 (`<Tooltip.Provider>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-614 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-615 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-616 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-617 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-618 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-619 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-620 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 153-164 (`? t('microphone-denied.label')`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-621 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-622 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-623 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-624 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 139-150 (`disabled={!stream}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-625 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-626 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-627 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-628 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-629 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-630 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 57-68 (`<Card.Header>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-631 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 41-52 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-632 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-633 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 264-275 (`<div`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-634 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-635 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-636 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:30`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 30-41 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-637 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-638 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-639 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-640 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 70-81 (`useEffect(() => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-641 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:154`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 154-165 (`<Splitter.Panel asChild position='start'>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-642 no-styling-wrapper-divs `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:232`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 232-243 (`<Icon.Root icon={sourceIcon[item.source.type] ?? 'ph--question--regular'} />`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-643 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-644 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-645 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.92. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-646 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 114-125 (`}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-647 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-648 structured-logging-not-console `packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:20`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 20-29 (`const DefaultStory = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-649 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 61-70 (`export const Crashes: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-650 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-651 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-652 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-653 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-654 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 351-362 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-655 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-656 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-657 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 893-917 (`release();`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-658 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-659 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-660 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-661 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:227`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 227-238 (`</Field.Root>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-662 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-663 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:194`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 194-205 (`const type = Obj.getType(object) ?? registered;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-664 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-665 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-666 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:396`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 396-419 (`});`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-667 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-668 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-669 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.90. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-670 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-671 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:88`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 88-101 (`export const EdgeAgentServiceLayer: Layer.Layer<`, location confidence 0.84). Judged with added `importers, imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-672 test-asserts-real-behavior `packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 33-44 (`});`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-673 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-674 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-675 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-676 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-677 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-678 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.83. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-679 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/spaces.ts:73`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 73-85 (`unsubscribe = dataSpaceManager.updated.on(() => update());`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-680 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-681 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-682 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-683 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-684 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-685 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-686 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-687 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 93-104 (`update();`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-688 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-689 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-690 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-691 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-692 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 25-32 (`export interface CrossDeviceSpaceSynchronizer extends CredentialProcessor, Li...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-693 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-694 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 488-499 (`});`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-695 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-696 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-697 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-698 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 429-452 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-699 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-700 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-701 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-702 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-703 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/space/space-manager.ts:97`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 97-108 (`async close(): Promise<void> {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-704 no-casts `packages/sdk/client-services/src/internal/space/space-manager.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 181-193 (`public findSpaceByRootDocumentId(documentId: string): Space | undefined {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-705 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-706 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 1157-1180 (`const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-707 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 188-199 (`);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-708 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-709 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-710 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-711 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-712 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-713 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-714 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-715 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-716 no-casts `packages/sdk/client/src/services/local-client-services.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 211-222 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-717 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 23-34 (`target='_blank'`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-718 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-719 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-720 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-721 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-722 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-723 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-724 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-725 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`import * as Button from '@dxos/react-ui/Button';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-726 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-727 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 44-55 (`}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-728 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-729 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 274-285 (`const mutableParent = parent as Obj.Mutable<JsonSchema.JsonSchema>;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-730 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-731 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-732 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-733 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-734 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-735 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-736 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-737 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-738 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-739 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.85. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-740 comment-hygiene `packages/sdk/shell/src/components/Panel/Action.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 106-117 (`/>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-741 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:34`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 34-45 (`export const InvitationManager = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-742 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.82. The likeliest place is lines 13-31 (`import { type Space, SpaceMember_PresenceState, useSpaces } from '@dxos/react...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-743 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.83. The likeliest place is lines 13-31 (`import { type Space, SpaceMember_PresenceState, useSpaces } from '@dxos/react...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-744 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-745 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-746 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-747 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 61-73 (`const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-748 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 79-85 (`}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-749 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:337`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 337-348 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-750 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.93. The likeliest place is lines 116-127 (`{`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-751 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.89. The likeliest place is lines 200-207 (`}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-752 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.44). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-753 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-754 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-755 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-756 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-757 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-758 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 112-118 (`export const Default: Story = {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-759 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:77`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 77-86 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-760 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:173`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 173-186 (`<div className='flex justify-center items-center'>`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-761 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:226`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 226-237 (`<svg width={size} height={size}>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-762 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-763 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 29-42 (`const Component = ({ buffer }: { buffer: ArrayBuffer }) => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-764 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-765 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 153-164 (`<Panel.Content classNames='flex flex-col'>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-766 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:370`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 370-381 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-767 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 97-108 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-768 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 32-43 (`items.push(...(newItems as Message.Message[]));`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-769 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 346-357 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-770 extract-non-rendering-logic-from-component `packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 153-164 (`let cancelled = false;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-771 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:143`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 143-154 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-772 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-773 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 156-179 (`<div`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-774 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 246-269 (`}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-775 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-776 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-777 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-778 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:163`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 163-174 (`<div className='flex flex-col h-full overflow-hidden divide-y divider-separat...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-779 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 190-201 (`const meta = {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-780 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-781 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-782 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 88-99 (`);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-783 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`{sidebar && (`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-784 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-785 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-786 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-787 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-788 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 76-90 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-789 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-790 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-791 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-792 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 50-61 (`const handleClick: Icon.RootProps['onClick'] = (ev) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-793 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 15-26 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-794 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Thread.tsx:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 15-26 (`export const ThreadComponent = ({ shape }: ShapeComponentProps<ThreadShape>) ...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-795 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 33-44 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-796 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-56 (`}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-797 no-casts `packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 28-39 (`export const ShapeComponent = (props: ShapeComponentProps<any>) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-798 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-799 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-800 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:43`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 43-54 (`<ToolbarModule.Button onClick={() => handleAction({ type: 'zoom-out' })} titl...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-801 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-37 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-802 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-61 (`)}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-803 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-804 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-805 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`setDragging(true);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-806 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 120-131 (`useEffect(() => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-807 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-808 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.90. The likeliest place is lines 82-93 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-809 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 106-117 (`commit(key, next);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-810 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 194-205 (`const fiber = Effect.runFork(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-811 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-812 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-813 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:222`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 222-236 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-814 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 346-357 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-815 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:42`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.82. The likeliest place is lines 42-53 (`{item}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-816 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 16-27 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-817 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:105`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.81. The likeliest place is lines 105-116 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-818 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 114-125 (`export const Controller: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-819 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-820 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 240-247 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-821 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-28 (`const DefaultStory = (props: MatrixProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-822 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-823 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-824 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-825 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-826 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 169-180 (`const progress = (current: number, total: number) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-827 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 40-51 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-828 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 14-25 (`const DefaultStory = ({ state: _state }: SpinnerProps) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-829 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 28-39 (`let cancelled = false;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-830 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-26 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-831 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 27-33 (`const sizes: Record<number, { range: Range; classNames: string; h: string }> = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-832 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:270`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 270-281 (`const DashboardActivity = Util.composable<HTMLDivElement, DashboardActivityCu...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-833 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:127`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 127-138 (`useEffect(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-834 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:290`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 290-301 (`<Popover.Trigger asChild>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-835 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:491`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 491-502 (`</div>`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-836 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 95-106 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-837 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-838 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-104 (`return;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-839 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:281`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 281-291 (`{group.items.map((item) => (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-840 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-841 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-842 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 61-72 (`[debug, extensionsProp],`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-843 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 29-40 (`],`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-844 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 278-289 (`</>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-845 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:20`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.92. The likeliest place is lines 20-31 (`export const createRenderer =`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-846 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-847 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 80-87 (`export const Default: Story = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-848 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-849 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-850 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 440-451 (`const observer = new ResizeObserver((entries) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-851 no-casts `packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 607-630 (`const texture = gl.createTexture()!;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-852 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 56-70 (`export const Default: Story = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-853 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 120-128 (`onPointerMove={onMove}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-854 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-855 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 228-239 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-856 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:410`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 410-433 (`const scroller = scrollerRef.current;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-857 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 162-173 (`useEffect(() => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-858 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/debug/Debug.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 52-63 (`const tick = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-859 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/debug/Debug.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 64-75 (`}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-860 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-861 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-862 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.92. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-863 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 83-94 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-864 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:204`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 204-215 (`void (async () => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-865 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 398-409 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-866 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:62`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 62-73 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-867 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-868 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-869 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-870 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-871 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Card.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 76-82 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-872 no-casts `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 111-116 (`} satisfies Meta<StoryArgs<any>>;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-873 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 188-199 (`export const Variants: Story<Schema.Schema.Type<typeof SettingsSchema>> = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-874 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 218-229 (`const InlineMarkdownTextStory = (args: StoryArgs<any>) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-875 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 254-265 (`<>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-876 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 18-29 (`export const getDefaultValue = (ast?: SchemaAST.AST): any => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-877 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 98-110 (`<div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretc...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-878 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 53-64 (`);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-879 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.stories.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 64-75 (`<Panel.Content>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-880 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:52`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 52-63 (`const reference = value as Ref.Ref<any> | undefined;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-881 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:119`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 119-130 (`const StringMarkdownEditor = ({ value, placeholder, readonly, onChange }: Str...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-882 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 99-110 (`const handleChange = useCallback(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-883 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 31-42 (`const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-884 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:192`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.88. The likeliest place is lines 192-203 (`<Field.Root key={item.id}>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-885 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx:155`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 155-166 (`/>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-886 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:434`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 434-445 (`override render() {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-887 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:157`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 157-166 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-888 no-casts `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 87-98 (`}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-889 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 135-146 (`const DefaultStory = ({ schema, template }: StoryArgs) => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-890 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:213`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 213-224 (`<div className='flex flex-col gap-2'>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-891 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 37-48 (`expect(resolved!.segments).toEqual(['origin']);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-892 no-casts `packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 37-48 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-893 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 116-127 (`<TestLayout json={snapshot}>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-894 no-casts `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 69-80 (`) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-895 no-casts `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 60-71 (`})),`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-896 structured-logging-not-console `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 60-71 (`})),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-897 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 137-150 (`const meta = {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-898 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 63-74 (`const handleCreate = useCallback(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-899 no-casts `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 48-57 (`export const ObjectTree = ObjectTreeImpl as unknown as <T>(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-900 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:100`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 100-111 (`[getLabel],`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-901 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:280`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 280-291 (`filter={false}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-902 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 99-110 (`view.projection = Obj.getSnapshot(newView).projection as Obj.Mutable<typeof v...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-903 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:200`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 200-211 (`const query =`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-904 comment-hygiene `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:224`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 224-235 (`<Form.Content>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-905 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-906 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-907 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-908 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 21-32 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-909 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 68-81 (`<div className='h-full aspect-square mx-auto'>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-910 no-casts `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 58-69 (`}, [orientation, rows, cols]);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-911 extract-non-rendering-logic-from-component `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 82-93 (`return Object.values(pieces)`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-912 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 92-103 (`const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-913 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-914 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-915 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 59-74 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-916 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 123-134 (`queueMicrotask(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-917 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:207`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 207-218 (`if (node) {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-918 no-casts `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 20-30 (`export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-919 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHie...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-920 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 207-218 (`nodeMerge`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-921 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 119-130 (`const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: Render...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-922 comment-hygiene `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 23-34 (`const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-923 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 35-46 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-924 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:225`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 225-236 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-925 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 98-109 (`key={tool.title}`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-926 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 55-66 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-927 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 194-205 (`<>`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-928 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 74-85 (`setClient(next);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-929 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 58-69 (`{items.map((item, i) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-930 no-casts `packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:223`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 223-236 (`Hooks.useMergeRefs([forwardedRef, navigation.containerProps.ref]) as unknown ...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-931 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Listbox/ListItemContent.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 13-24 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-932 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 20-37 (`export type OrderedListContextValue<T extends ListItemRecord> = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-933 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 19-30 (`export type OrderedListRootProps<T extends ListItemRecord> = Util.ThemedClass...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-934 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:115`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 115-129 (`const meta = {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-935 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 293-316 (`}, [rootTree, childIdsFamily, registry]);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-936 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 711-734 (`await expect(row(child)!.getAttribute('aria-setsize')).toEqual('20');`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-937 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 91-108 (`const NO_MODIFIERS: SelectModifiers = { option: false, shift: false, meta: fa...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-938 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:359`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 359-378 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-939 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:912`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 912-935 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-940 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-941 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 61-72 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-942 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 88-99 (`Tile={Tile!}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-943 no-casts `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 34-45 (`export const ToolForm = <S extends Schema.Codec<any, any>>({`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-944 no-casts `packages/ui/react-ui-menu/src/components/action-label.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 17-21 (`export const actionLabel = (action: Action, t: ThemeProvider.TFunction) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-945 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-30 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-946 no-styling-wrapper-divs `packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 108-119 (`);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-947 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 87-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-948 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 268-279 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-949 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:103`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 103-114 (`<Card.Block>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-950 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 173-184 (`if (!rootRef.current) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-951 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-952 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-953 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 255-266 (`: (index) => getId(visibleItems![index]),`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-954 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 177-188 (`const handleNativeDragStart = (event: DragEvent) => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-955 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 119-130 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-956 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 101-112 (`return (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-957 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 40-49 (`const HuePreview = ({ value, size = 5 }: { value: string; size?: Icon.RootPro...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-958 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-959 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 84-95 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-960 structured-logging-not-console `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 115-126 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-961 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 115-126 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-962 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-513 (`const meta = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-963 extract-non-rendering-logic-from-component `packages/ui/react-ui-syntax-highlighter/src/Syntax/Syntax.tsx:98`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 98-109 (`try {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-964 no-casts `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-36 (`const generator: ValueGenerator = random as any;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-965 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 97-108 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-966 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 118-129 (`if (!schema || !table?.view.target) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-967 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 118-129 (`if (!schema || !table?.view.target) {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-968 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:229`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 229-240 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-969 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 48-59 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-970 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-971 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-972 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-973 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 53-63 (`const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-974 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 133-144 (`{/* The hue comes from the event table, through the same palette the status a...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-975 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:713`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 713-736 (`return (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-976 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1328`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 1328-1351 (`throw new Error('Task mnemonic not found.');`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-977 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1970-1993 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-978 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:497`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 497-512 (`const TaskListGroupLabel = Util.composable<HTMLDivElement>(({ children, ...pr...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-979 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:435`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 435-446 (`and it spans the artifacts column (a PR chip is only row 1) but stops short o...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-980 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 99-110 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-981 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-982 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 133-144 (`const bridge = new XtermBridge(xterm);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-983 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 75-86 (`ref={forwardedRef}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-984 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:315`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 315-329 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-985 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 341-358 (`type GanttLegendProps = Util.ThemedClassName<PropsWithChildren>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-986 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 341-358 (`type GanttLegendProps = Util.ThemedClassName<PropsWithChildren>;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-987 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 505-528 (`const element = viewportRef.current;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-988 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 184-195 (`const makeColumnRenderer =`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-989 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-990 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 64-75 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-991 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 148-159 (`>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-992 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:228`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 228-239 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-993 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 311-322 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-994 no-casts `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-40 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-995 no-styling-wrapper-divs `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 77-91 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-996 no-styling-wrapper-divs `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 89-100 (`const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-997 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 78-89 (`export const Default = () => (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-998 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 24-35 (`const DefaultStory = ({ valence, title, body, button }: StoryArgs) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-999 no-casts `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:44`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 44-55 (`const meta = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1000 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Banner/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Banner from './Banner.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1001 no-casts `packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 42-52 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1002 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Button/Button.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 13-24 (`const DefaultStory = ({ children, ...args }: Omit<Button.RootProps, 'ref'>) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1003 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 18-30 (`const DefaultStory = (props: IconButton.RootProps) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1004 no-casts `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 135-149 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1005 deprecated-tag-must-be-accurate `packages/ui/react-ui/src/components/Button/IconButton.tsx:15`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.80. The likeliest place is lines 15-28 (`type IconButtonProps = Omit<Button.RootProps, 'children'> &`, location confidence 0.97). Judged with added `diff, public-api` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1006 structured-logging-not-console `packages/ui/react-ui/src/components/Card/Card.stories.tsx:24`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 24-35 (`const DefaultStory = ({ title, description, image, fullWidth, elevation }: St...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1007 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Card/Card.stories.tsx:59`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 59-70 (`const meta = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1008 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 23-34 (`const DefaultStory = ({ count = IMAGES.length, continuous, autoAdvance }: Sto...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1009 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 48-59 (`return ids;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1010 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Column/Column.stories.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 90-99 (`const InputList = ({ items = 50 }: { items?: number }) => (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1011 no-casts `packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 51-61 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1012 no-casts `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 103-116 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1013 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Drawer/Drawer.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 41-55 (`const Body = ({ title, description, grabber, filler = 0 }: StoryArgs) => (`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1014 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Drawer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Drawer from './Drawer.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1015 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 38-49 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1016 no-casts `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 35-42 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1017 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 22-33 (`const ErrorFallback = ({ children, error, title, data }: ErrorFallbackProps) ...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1018 no-casts `packages/ui/react-ui/src/components/Field/Field.stories.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 142-156 (`const meta = {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1019 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Field/Field.stories.tsx:231`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 231-242 (`export const Input: Story = {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1020 themed-primitives-take-classNames `packages/ui/react-ui/src/components/Field/PinInput.tsx:24`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.82. The likeliest place is lines 24-30 (`type PinInputProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'maxLength...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1021 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Field/PinInput.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 55-66 (`const charPattern = useMemo(() => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1022 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Field/SegmentedInput.tsx:80`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 80-89 (`const segmentClassNames =`, location confidence 0.69). Judged with added `imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1023 no-styling-wrapper-divs `packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 30-41 (`const DefaultStory = ({ draggable = true, resizable = true, persistRect = tru...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1024 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Focus/Focus.stories.tsx:26`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 26-39 (`const Container = ({ classNames, children }: ThemedClassName<PropsWithChildre...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1025 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Focus/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Focus from './Focus.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1026 no-styling-wrapper-divs `packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 15-26 (`const DefaultStory = ({ openDelay, closeDelay, side = 'top' }: StoryProps) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1027 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Icon/Icon.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 88-99 (`export const Brand: Story = {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1028 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Image/Image.stories.tsx:41`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 41-47 (`const classNames = 'h-[12rem] w-[18rem]';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1029 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Image/Image.stories.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 69-80 (`export const Many: Story = {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1030 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Image/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Image from './Image.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1031 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Main/Main.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 76-87 (`<ComplementarySidebarToggle />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1032 event-handler-naming-convention `packages/ui/react-ui/src/components/Main/Main.tsx:54`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 54-67 (`const prevents = (handler: ((event: Event) => void) | undefined) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1033 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Menu/Menu.stories.tsx:210`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 210-221 (`export const TestSelect: StoryObj = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1034 no-styling-wrapper-divs `packages/ui/react-ui/src/components/MenuButton/MenuButton.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 39-50 (`testId: 'story.extraction',`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1035 no-hand-rolled-lists `packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:17`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 17-28 (`const List = composable<HTMLDivElement, ScrollArea.RootProps>((props, forward...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1036 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 102-113 (`const ElevationStory = () => (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1037 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 122-133 (`export const TestVirtualAnchor: StoryObj = {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1038 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:153`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 153-164 (`export const TestVirtualAnchorFollowsScroll: StoryObj = {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1039 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/QrCode/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as QrCode from './QrCode.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1040 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 47-58 (`const Grid = ({ items = 50 }: { items?: number }) => (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1041 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:142`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 142-153 (`return (`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1042 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/ScrollContainer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as ScrollContainer from './ScrollContainer.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1043 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Select/Select.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 57-68 (`const TestStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1044 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 19-32 (`export const Default = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1045 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 19-32 (`export const Default = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1046 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Slider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Slider from './Slider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1047 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Slider/Slider.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 84-95 (`export const ThumbVisibility: Story = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1048 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Steps/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as Steps from './Steps.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1049 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 181-192 (`const HandoverStory = ({ stages = 3 }: StoryArgs) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1050 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Tag/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Tag from './Tag.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1051 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/TextCrawl/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as TextCrawl from './TextCrawl.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1052 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 35-42 (`export const Default: Story = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1053 no-styling-wrapper-divs `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 90-101 (`{textCrawlSizes.map((size) => (`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1054 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.tsx:182`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 182-187 (`const sizeClassNames: Record<TextCrawlSize, { lineHeight: number; className: ...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1055 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 28-39 (`const DefaultStory = () => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1056 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Toast/Toast.tsx:186`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 186-197 (`queueMicrotask(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1057 no-casts `packages/ui/react-ui/src/components/Toolbar/Toolbar.stories.tsx:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 69-82 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1058 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 40-53 (`const meta = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1059 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 55-66 (`test('keeps a description the trigger already carries', async ({ expect }) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1060 no-sleep-in-test `packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:79`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 79-90 (`</Tooltip.Provider>,`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1061 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Tooltip/Tooltip.tsx:184`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 184-195 (`useEffect(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1062 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Tour/Tour.stories.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 98-109 (`<Tour.Arrow />`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1063 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:48`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 48-59 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b218e7198b-1064 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 107-118 (`const ScrollToolbar = ({`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1065 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 119-130 (`<div className='flex justify-center gap-1'>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1066 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 16-27 (`const ShowStory = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1067 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1068 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Container/Container.stories.tsx:11`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 11-16 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1069 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 14-19 (`const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1070 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/layout/Flex/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Flex from './Flex.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1071 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/playground/Elevation.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 50-63 (`const meta = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1072 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 116-134 (`const Section = ({ title, fields = false, children }: PropsWithChildren<{ tit...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1073 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/DensityProvider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as DensityProvider from './DensityProvider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1074 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/ElevationProvider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-6 (`export * as ElevationProvider from './ElevationProvider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1075 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1076 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 51-62 (`const layouts: Record<ContainerType, FC<ContainerProps>> = {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1077 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 63-70 (`column: ({ classNames, children }: ContainerProps) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1078 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`className={mx(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1079 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN b218e7198b-1080 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 54-63 (`))}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1b40b48e6290c98b7ce6a8c46ac6eb46bcf4623c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1080 violations written to fragments, 8496 uncertain, 71044 clean, 0 unanswered
- left for an agentic reviewer: 617 batch(es)

```text
requests: 32110 (5938 verdicts re-asked with context the model requested)
estimated input tokens: 207954294
billed input tokens: 195801642 (cost $8.2237)
measured chars per token: 3.19
```

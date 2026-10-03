---
branch: HEAD
commit: 48b9fb002d72cc4933a88753464df011d04827b9
base: e36e44b0088c707d9a27fb4ccd4bfb757347e1c5
mode: fast
createdAt: 2026-10-03T16:46:35.951Z
isFinalized: true
groups: 7385
rules: [barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, isolate-benchmark-setup-and-flaky-tests, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, reactive-state-via-atom-bridge, schema-declare-and-brand, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 48b9fb002d
---

_284 error(s), 782 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 48b9fb002d-1 - ignored - no-casts - packages/apps/composer-app/src/vite/trace-boot-leak.ts:65
- 48b9fb002d-2 - ignored - structured-logging-not-console - packages/apps/composer-app/src/vite/trace-boot-leak.ts:89
- 48b9fb002d-3 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:163
- 48b9fb002d-4 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- 48b9fb002d-5 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- 48b9fb002d-6 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- 48b9fb002d-7 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:35
- 48b9fb002d-8 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:69
- 48b9fb002d-9 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:81
- 48b9fb002d-10 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:55
- 48b9fb002d-11 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:91
- 48b9fb002d-12 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:25
- 48b9fb002d-13 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/internal/index.ts:1
- 48b9fb002d-14 - ignored - namespace-export-with-internal-hiding - packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1
- 48b9fb002d-15 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:467
- 48b9fb002d-16 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- 48b9fb002d-17 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- 48b9fb002d-18 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:11
- 48b9fb002d-19 - ignored - structured-logging-not-console - packages/core/compute/agent-claude/src/Demo.test.ts:42
- 48b9fb002d-20 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- 48b9fb002d-21 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- 48b9fb002d-22 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- 48b9fb002d-23 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- 48b9fb002d-24 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- 48b9fb002d-25 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- 48b9fb002d-26 - ignored - no-casts - packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237
- 48b9fb002d-27 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- 48b9fb002d-28 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- 48b9fb002d-29 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- 48b9fb002d-30 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- 48b9fb002d-31 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- 48b9fb002d-32 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:113
- 48b9fb002d-33 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- 48b9fb002d-34 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- 48b9fb002d-35 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:348
- 48b9fb002d-36 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- 48b9fb002d-37 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- 48b9fb002d-38 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- 48b9fb002d-39 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79
- 48b9fb002d-40 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- 48b9fb002d-41 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- 48b9fb002d-42 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- 48b9fb002d-43 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426
- 48b9fb002d-44 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455
- 48b9fb002d-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- 48b9fb002d-46 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- 48b9fb002d-47 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- 48b9fb002d-48 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- 48b9fb002d-49 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- 48b9fb002d-50 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- 48b9fb002d-51 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 48b9fb002d-52 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 48b9fb002d-53 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- 48b9fb002d-54 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- 48b9fb002d-55 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- 48b9fb002d-56 - ignored - no-casts - packages/core/compute/compute-runtime/src/services/service-registry.ts:54
- 48b9fb002d-57 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- 48b9fb002d-58 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142
- 48b9fb002d-59 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- 48b9fb002d-60 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- 48b9fb002d-61 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- 48b9fb002d-62 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- 48b9fb002d-63 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- 48b9fb002d-64 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:327
- 48b9fb002d-65 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.test.ts:68
- 48b9fb002d-66 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- 48b9fb002d-67 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- 48b9fb002d-68 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- 48b9fb002d-69 - ignored - no-casts - packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136
- 48b9fb002d-70 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- 48b9fb002d-71 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- 48b9fb002d-72 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- 48b9fb002d-73 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- 48b9fb002d-74 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- 48b9fb002d-75 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- 48b9fb002d-76 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- 48b9fb002d-77 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- 48b9fb002d-78 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- 48b9fb002d-79 - ignored - no-casts - packages/core/compute/operation/src/invoker.test.ts:23
- 48b9fb002d-80 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/invoker.test.ts:63
- 48b9fb002d-81 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- 48b9fb002d-82 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- 48b9fb002d-83 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- 48b9fb002d-84 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- 48b9fb002d-85 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- 48b9fb002d-86 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- 48b9fb002d-87 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- 48b9fb002d-88 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- 48b9fb002d-89 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- 48b9fb002d-90 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- 48b9fb002d-91 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116
- 48b9fb002d-92 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:107
- 48b9fb002d-93 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- 48b9fb002d-94 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- 48b9fb002d-95 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75
- 48b9fb002d-96 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- 48b9fb002d-97 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- 48b9fb002d-98 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- 48b9fb002d-99 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- 48b9fb002d-100 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- 48b9fb002d-101 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:266
- 48b9fb002d-102 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- 48b9fb002d-103 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- 48b9fb002d-104 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- 48b9fb002d-105 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- 48b9fb002d-106 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- 48b9fb002d-107 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- 48b9fb002d-108 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:860
- 48b9fb002d-109 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- 48b9fb002d-110 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- 48b9fb002d-111 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- 48b9fb002d-112 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- 48b9fb002d-113 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- 48b9fb002d-114 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- 48b9fb002d-115 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- 48b9fb002d-116 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- 48b9fb002d-117 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- 48b9fb002d-118 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- 48b9fb002d-119 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- 48b9fb002d-120 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- 48b9fb002d-121 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- 48b9fb002d-122 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- 48b9fb002d-123 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- 48b9fb002d-124 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- 48b9fb002d-125 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- 48b9fb002d-126 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- 48b9fb002d-127 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- 48b9fb002d-128 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- 48b9fb002d-129 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:1669
- 48b9fb002d-130 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46
- 48b9fb002d-131 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- 48b9fb002d-132 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- 48b9fb002d-133 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- 48b9fb002d-134 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- 48b9fb002d-135 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- 48b9fb002d-136 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- 48b9fb002d-137 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- 48b9fb002d-138 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- 48b9fb002d-139 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- 48b9fb002d-140 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- 48b9fb002d-141 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- 48b9fb002d-142 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo/src/internal/common/types/base.ts:34
- 48b9fb002d-143 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- 48b9fb002d-144 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- 48b9fb002d-145 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- 48b9fb002d-146 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- 48b9fb002d-147 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- 48b9fb002d-148 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- 48b9fb002d-149 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- 48b9fb002d-150 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- 48b9fb002d-151 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- 48b9fb002d-152 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- 48b9fb002d-153 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- 48b9fb002d-154 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- 48b9fb002d-155 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- 48b9fb002d-156 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- 48b9fb002d-157 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- 48b9fb002d-158 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- 48b9fb002d-159 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- 48b9fb002d-160 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- 48b9fb002d-161 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- 48b9fb002d-162 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- 48b9fb002d-163 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- 48b9fb002d-164 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- 48b9fb002d-165 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- 48b9fb002d-166 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- 48b9fb002d-167 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:481
- 48b9fb002d-168 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- 48b9fb002d-169 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- 48b9fb002d-170 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- 48b9fb002d-171 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- 48b9fb002d-172 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- 48b9fb002d-173 - ignored - test-asserts-real-behavior - packages/devtools/cli-util/src/util/form-builder.test.ts:49
- 48b9fb002d-174 - ignored - no-casts - packages/devtools/cli/src/bin.ts:239
- 48b9fb002d-175 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:239
- 48b9fb002d-176 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- 48b9fb002d-177 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:133
- 48b9fb002d-178 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:38
- 48b9fb002d-179 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:31
- 48b9fb002d-180 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84
- 48b9fb002d-181 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113
- 48b9fb002d-182 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46
- 48b9fb002d-183 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78
- 48b9fb002d-184 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:47
- 48b9fb002d-185 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89
- 48b9fb002d-186 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- 48b9fb002d-187 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51
- 48b9fb002d-188 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60
- 48b9fb002d-189 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:135
- 48b9fb002d-190 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100
- 48b9fb002d-191 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:215
- 48b9fb002d-192 - ignored - no-casts - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118
- 48b9fb002d-193 - ignored - error-messages-carry-context - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130
- 48b9fb002d-194 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- 48b9fb002d-195 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:30
- 48b9fb002d-196 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:122
- 48b9fb002d-197 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:377
- 48b9fb002d-198 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:129
- 48b9fb002d-199 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:47
- 48b9fb002d-200 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:62
- 48b9fb002d-201 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- 48b9fb002d-202 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92
- 48b9fb002d-203 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193
- 48b9fb002d-204 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117
- 48b9fb002d-205 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52
- 48b9fb002d-206 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53
- 48b9fb002d-207 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113
- 48b9fb002d-208 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- 48b9fb002d-209 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131
- 48b9fb002d-210 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:55
- 48b9fb002d-211 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- 48b9fb002d-212 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:152
- 48b9fb002d-213 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:285
- 48b9fb002d-214 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- 48b9fb002d-215 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- 48b9fb002d-216 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- 48b9fb002d-217 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131
- 48b9fb002d-218 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- 48b9fb002d-219 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- 48b9fb002d-220 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:144
- 48b9fb002d-221 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- 48b9fb002d-222 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- 48b9fb002d-223 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:100
- 48b9fb002d-224 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:268
- 48b9fb002d-225 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:180
- 48b9fb002d-226 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- 48b9fb002d-227 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:120
- 48b9fb002d-228 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:204
- 48b9fb002d-229 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:90
- 48b9fb002d-230 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174
- 48b9fb002d-231 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- 48b9fb002d-232 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- 48b9fb002d-233 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- 48b9fb002d-234 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- 48b9fb002d-235 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- 48b9fb002d-236 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- 48b9fb002d-237 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44
- 48b9fb002d-238 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- 48b9fb002d-239 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61
- 48b9fb002d-240 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:73
- 48b9fb002d-241 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109
- 48b9fb002d-242 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31
- 48b9fb002d-243 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55
- 48b9fb002d-244 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94
- 48b9fb002d-245 - ignored - no-casts - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34
- 48b9fb002d-246 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46
- 48b9fb002d-247 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20
- 48b9fb002d-248 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- 48b9fb002d-249 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108
- 48b9fb002d-250 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- 48b9fb002d-251 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:108
- 48b9fb002d-252 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44
- 48b9fb002d-253 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:89
- 48b9fb002d-254 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- 48b9fb002d-255 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73
- 48b9fb002d-256 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97
- 48b9fb002d-257 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- 48b9fb002d-258 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- 48b9fb002d-259 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58
- 48b9fb002d-260 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- 48b9fb002d-261 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- 48b9fb002d-262 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48
- 48b9fb002d-263 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96
- 48b9fb002d-264 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:95
- 48b9fb002d-265 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256
- 48b9fb002d-266 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47
- 48b9fb002d-267 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:33
- 48b9fb002d-268 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:21
- 48b9fb002d-269 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- 48b9fb002d-270 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41
- 48b9fb002d-271 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/schema-defs.test.ts:39
- 48b9fb002d-272 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- 48b9fb002d-273 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72
- 48b9fb002d-274 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67
- 48b9fb002d-275 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102
- 48b9fb002d-276 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189
- 48b9fb002d-277 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:19
- 48b9fb002d-278 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79
- 48b9fb002d-279 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130
- 48b9fb002d-280 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- 48b9fb002d-281 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- 48b9fb002d-282 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- 48b9fb002d-283 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- 48b9fb002d-284 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:94
- 48b9fb002d-285 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- 48b9fb002d-286 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:50
- 48b9fb002d-287 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- 48b9fb002d-288 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66
- 48b9fb002d-289 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:72
- 48b9fb002d-290 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm-project.ts:59
- 48b9fb002d-291 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm.ts:25
- 48b9fb002d-292 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:80
- 48b9fb002d-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54
- 48b9fb002d-294 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- 48b9fb002d-295 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75
- 48b9fb002d-296 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- 48b9fb002d-297 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- 48b9fb002d-298 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:89
- 48b9fb002d-299 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70
- 48b9fb002d-300 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82
- 48b9fb002d-301 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- 48b9fb002d-302 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- 48b9fb002d-303 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- 48b9fb002d-304 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50
- 48b9fb002d-305 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62
- 48b9fb002d-306 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194
- 48b9fb002d-307 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- 48b9fb002d-308 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- 48b9fb002d-309 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- 48b9fb002d-310 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- 48b9fb002d-311 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45
- 48b9fb002d-312 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:50
- 48b9fb002d-313 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:138
- 48b9fb002d-314 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- 48b9fb002d-315 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- 48b9fb002d-316 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30
- 48b9fb002d-317 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161
- 48b9fb002d-318 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512
- 48b9fb002d-319 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- 48b9fb002d-320 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133
- 48b9fb002d-321 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83
- 48b9fb002d-322 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:173
- 48b9fb002d-323 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:22
- 48b9fb002d-324 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- 48b9fb002d-325 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39
- 48b9fb002d-326 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- 48b9fb002d-327 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- 48b9fb002d-328 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:113
- 48b9fb002d-329 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- 48b9fb002d-330 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32
- 48b9fb002d-331 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55
- 48b9fb002d-332 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67
- 48b9fb002d-333 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157
- 48b9fb002d-334 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- 48b9fb002d-335 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- 48b9fb002d-336 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- 48b9fb002d-337 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- 48b9fb002d-338 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- 48b9fb002d-339 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- 48b9fb002d-340 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- 48b9fb002d-341 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111
- 48b9fb002d-342 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- 48b9fb002d-343 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- 48b9fb002d-344 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- 48b9fb002d-345 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:30
- 48b9fb002d-346 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297
- 48b9fb002d-347 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- 48b9fb002d-348 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:111
- 48b9fb002d-349 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:280
- 48b9fb002d-350 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- 48b9fb002d-351 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:45
- 48b9fb002d-352 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:81
- 48b9fb002d-353 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- 48b9fb002d-354 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- 48b9fb002d-355 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- 48b9fb002d-356 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:93
- 48b9fb002d-357 - ignored - no-invented-theme-tokens - packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:14
- 48b9fb002d-358 - ignored - no-invented-theme-tokens - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:27
- 48b9fb002d-359 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:92
- 48b9fb002d-360 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- 48b9fb002d-361 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- 48b9fb002d-362 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync.test.ts:94
- 48b9fb002d-363 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:92
- 48b9fb002d-364 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- 48b9fb002d-365 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- 48b9fb002d-366 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- 48b9fb002d-367 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- 48b9fb002d-368 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210
- 48b9fb002d-369 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- 48b9fb002d-370 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- 48b9fb002d-371 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:163
- 48b9fb002d-372 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95
- 48b9fb002d-373 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:157
- 48b9fb002d-374 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:75
- 48b9fb002d-375 - ignored - subscribe-where-you-read - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:34
- 48b9fb002d-376 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- 48b9fb002d-377 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- 48b9fb002d-378 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- 48b9fb002d-379 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-illustrator/src/skills/index.ts:1
- 48b9fb002d-380 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:274
- 48b9fb002d-381 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:624
- 48b9fb002d-382 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174
- 48b9fb002d-383 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:318
- 48b9fb002d-384 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102
- 48b9fb002d-385 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- 48b9fb002d-386 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:301
- 48b9fb002d-387 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- 48b9fb002d-388 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- 48b9fb002d-389 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- 48b9fb002d-390 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:239
- 48b9fb002d-391 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- 48b9fb002d-392 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:32
- 48b9fb002d-393 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:178
- 48b9fb002d-394 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts:112
- 48b9fb002d-395 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- 48b9fb002d-396 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:66
- 48b9fb002d-397 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- 48b9fb002d-398 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- 48b9fb002d-399 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- 48b9fb002d-400 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- 48b9fb002d-401 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- 48b9fb002d-402 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/skills/InboxSendSkill.ts:1
- 48b9fb002d-403 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- 48b9fb002d-404 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- 48b9fb002d-405 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- 48b9fb002d-406 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- 48b9fb002d-407 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- 48b9fb002d-408 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- 48b9fb002d-409 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-jmap/src/index.ts:1
- 48b9fb002d-410 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32
- 48b9fb002d-411 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60
- 48b9fb002d-412 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- 48b9fb002d-413 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- 48b9fb002d-414 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88
- 48b9fb002d-415 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124
- 48b9fb002d-416 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- 48b9fb002d-417 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84
- 48b9fb002d-418 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- 48b9fb002d-419 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87
- 48b9fb002d-420 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- 48b9fb002d-421 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:41
- 48b9fb002d-422 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:90
- 48b9fb002d-423 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- 48b9fb002d-424 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110
- 48b9fb002d-425 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110
- 48b9fb002d-426 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- 48b9fb002d-427 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- 48b9fb002d-428 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28
- 48b9fb002d-429 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74
- 48b9fb002d-430 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36
- 48b9fb002d-431 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110
- 48b9fb002d-432 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77
- 48b9fb002d-433 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:63
- 48b9fb002d-434 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- 48b9fb002d-435 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- 48b9fb002d-436 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:87
- 48b9fb002d-437 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:76
- 48b9fb002d-438 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:100
- 48b9fb002d-439 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28
- 48b9fb002d-440 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- 48b9fb002d-441 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- 48b9fb002d-442 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76
- 48b9fb002d-443 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- 48b9fb002d-444 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:187
- 48b9fb002d-445 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121
- 48b9fb002d-446 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337
- 48b9fb002d-447 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- 48b9fb002d-448 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- 48b9fb002d-449 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- 48b9fb002d-450 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- 48b9fb002d-451 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- 48b9fb002d-452 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59
- 48b9fb002d-453 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71
- 48b9fb002d-454 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- 48b9fb002d-455 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- 48b9fb002d-456 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- 48b9fb002d-457 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- 48b9fb002d-458 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- 48b9fb002d-459 - ignored - comment-hygiene - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23
- 48b9fb002d-460 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132
- 48b9fb002d-461 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:89
- 48b9fb002d-462 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:101
- 48b9fb002d-463 - ignored - structured-logging-not-console - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27
- 48b9fb002d-464 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:107
- 48b9fb002d-465 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193
- 48b9fb002d-466 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:368
- 48b9fb002d-467 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:72
- 48b9fb002d-468 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200
- 48b9fb002d-469 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22
- 48b9fb002d-470 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41
- 48b9fb002d-471 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313
- 48b9fb002d-472 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88
- 48b9fb002d-473 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216
- 48b9fb002d-474 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128
- 48b9fb002d-475 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- 48b9fb002d-476 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82
- 48b9fb002d-477 - ignored - no-casts - packages/plugins/plugin-observability/src/plugin.test.ts:14
- 48b9fb002d-478 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- 48b9fb002d-479 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69
- 48b9fb002d-480 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22
- 48b9fb002d-481 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16
- 48b9fb002d-482 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30
- 48b9fb002d-483 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:160
- 48b9fb002d-484 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:376
- 48b9fb002d-485 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:862
- 48b9fb002d-486 - ignored - inline-obj-parent - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65
- 48b9fb002d-487 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- 48b9fb002d-488 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:85
- 48b9fb002d-489 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:110
- 48b9fb002d-490 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:47
- 48b9fb002d-491 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:191
- 48b9fb002d-492 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16
- 48b9fb002d-493 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78
- 48b9fb002d-494 - ignored - no-casts - packages/plugins/plugin-presenter/src/useExitPresenter.ts:16
- 48b9fb002d-495 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:27
- 48b9fb002d-496 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:171
- 48b9fb002d-497 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- 48b9fb002d-498 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- 48b9fb002d-499 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 48b9fb002d-500 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 48b9fb002d-501 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:24
- 48b9fb002d-502 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- 48b9fb002d-503 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- 48b9fb002d-504 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:131
- 48b9fb002d-505 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109
- 48b9fb002d-506 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69
- 48b9fb002d-507 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/templates/inbox-research.ts:55
- 48b9fb002d-508 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59
- 48b9fb002d-509 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59
- 48b9fb002d-510 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- 48b9fb002d-511 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:109
- 48b9fb002d-512 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:157
- 48b9fb002d-513 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:300
- 48b9fb002d-514 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:39
- 48b9fb002d-515 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51
- 48b9fb002d-516 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- 48b9fb002d-517 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- 48b9fb002d-518 - ignored - no-casts - packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41
- 48b9fb002d-519 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:90
- 48b9fb002d-520 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138
- 48b9fb002d-521 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47
- 48b9fb002d-522 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35
- 48b9fb002d-523 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:105
- 48b9fb002d-524 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- 48b9fb002d-525 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456
- 48b9fb002d-526 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226
- 48b9fb002d-527 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- 48b9fb002d-528 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- 48b9fb002d-529 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- 48b9fb002d-530 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:40
- 48b9fb002d-531 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:292
- 48b9fb002d-532 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:314
- 48b9fb002d-533 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61
- 48b9fb002d-534 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184
- 48b9fb002d-535 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42
- 48b9fb002d-536 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309
- 48b9fb002d-537 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164
- 48b9fb002d-538 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- 48b9fb002d-539 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- 48b9fb002d-540 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- 48b9fb002d-541 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sample/src/containers/SampleCompanionPanel.tsx:54
- 48b9fb002d-542 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- 48b9fb002d-543 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38
- 48b9fb002d-544 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62
- 48b9fb002d-545 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:106
- 48b9fb002d-546 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74
- 48b9fb002d-547 - ignored - no-sleep-in-test - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226
- 48b9fb002d-548 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- 48b9fb002d-549 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- 48b9fb002d-550 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141
- 48b9fb002d-551 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136
- 48b9fb002d-552 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:72
- 48b9fb002d-553 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92
- 48b9fb002d-554 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:79
- 48b9fb002d-555 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- 48b9fb002d-556 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- 48b9fb002d-557 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- 48b9fb002d-558 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188
- 48b9fb002d-559 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40
- 48b9fb002d-560 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:37
- 48b9fb002d-561 - ignored - no-casts - packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40
- 48b9fb002d-562 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:57
- 48b9fb002d-563 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- 48b9fb002d-564 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- 48b9fb002d-565 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:59
- 48b9fb002d-566 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- 48b9fb002d-567 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81
- 48b9fb002d-568 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:88
- 48b9fb002d-569 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:304
- 48b9fb002d-570 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:472
- 48b9fb002d-571 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:28
- 48b9fb002d-572 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:40
- 48b9fb002d-573 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:76
- 48b9fb002d-574 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23
- 48b9fb002d-575 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270
- 48b9fb002d-576 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42
- 48b9fb002d-577 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- 48b9fb002d-578 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- 48b9fb002d-579 - ignored - comment-hygiene - packages/plugins/plugin-sheet/src/translations.ts:47
- 48b9fb002d-580 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:22
- 48b9fb002d-581 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- 48b9fb002d-582 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- 48b9fb002d-583 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- 48b9fb002d-584 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- 48b9fb002d-585 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- 48b9fb002d-586 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- 48b9fb002d-587 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250
- 48b9fb002d-588 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50
- 48b9fb002d-589 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:115
- 48b9fb002d-590 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107
- 48b9fb002d-591 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- 48b9fb002d-592 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- 48b9fb002d-593 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40
- 48b9fb002d-594 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:263
- 48b9fb002d-595 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- 48b9fb002d-596 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:254
- 48b9fb002d-597 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52
- 48b9fb002d-598 - ignored - comment-hygiene - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:54
- 48b9fb002d-599 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:236
- 48b9fb002d-600 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- 48b9fb002d-601 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- 48b9fb002d-602 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- 48b9fb002d-603 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60
- 48b9fb002d-604 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:203
- 48b9fb002d-605 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:183
- 48b9fb002d-606 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:228
- 48b9fb002d-607 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32
- 48b9fb002d-608 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- 48b9fb002d-609 - ignored - comment-hygiene - packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13
- 48b9fb002d-610 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- 48b9fb002d-611 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:51
- 48b9fb002d-612 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89
- 48b9fb002d-613 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89
- 48b9fb002d-614 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:57
- 48b9fb002d-615 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:78
- 48b9fb002d-616 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:114
- 48b9fb002d-617 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45
- 48b9fb002d-618 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-studio/src/index.ts:1
- 48b9fb002d-619 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- 48b9fb002d-620 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- 48b9fb002d-621 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:95
- 48b9fb002d-622 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79
- 48b9fb002d-623 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137
- 48b9fb002d-624 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:148
- 48b9fb002d-625 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15
- 48b9fb002d-626 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- 48b9fb002d-627 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- 48b9fb002d-628 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- 48b9fb002d-629 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:62
- 48b9fb002d-630 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:59
- 48b9fb002d-631 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:95
- 48b9fb002d-632 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:37
- 48b9fb002d-633 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:13
- 48b9fb002d-634 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- 48b9fb002d-635 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-table/src/index.ts:1
- 48b9fb002d-636 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69
- 48b9fb002d-637 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125
- 48b9fb002d-638 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:22
- 48b9fb002d-639 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61
- 48b9fb002d-640 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86
- 48b9fb002d-641 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40
- 48b9fb002d-642 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59
- 48b9fb002d-643 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:107
- 48b9fb002d-644 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:217
- 48b9fb002d-645 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- 48b9fb002d-646 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78
- 48b9fb002d-647 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330
- 48b9fb002d-648 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- 48b9fb002d-649 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107
- 48b9fb002d-650 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- 48b9fb002d-651 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247
- 48b9fb002d-652 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- 48b9fb002d-653 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- 48b9fb002d-654 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- 48b9fb002d-655 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- 48b9fb002d-656 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- 48b9fb002d-657 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253
- 48b9fb002d-658 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- 48b9fb002d-659 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116
- 48b9fb002d-660 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- 48b9fb002d-661 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- 48b9fb002d-662 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- 48b9fb002d-663 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139
- 48b9fb002d-664 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- 48b9fb002d-665 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- 48b9fb002d-666 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- 48b9fb002d-667 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- 48b9fb002d-668 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- 48b9fb002d-669 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:59
- 48b9fb002d-670 - ignored - structured-logging-not-console - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34
- 48b9fb002d-671 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:42
- 48b9fb002d-672 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- 48b9fb002d-673 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- 48b9fb002d-674 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- 48b9fb002d-675 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- 48b9fb002d-676 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- 48b9fb002d-677 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- 48b9fb002d-678 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71
- 48b9fb002d-679 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155
- 48b9fb002d-680 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- 48b9fb002d-681 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- 48b9fb002d-682 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- 48b9fb002d-683 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- 48b9fb002d-684 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- 48b9fb002d-685 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56
- 48b9fb002d-686 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- 48b9fb002d-687 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- 48b9fb002d-688 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- 48b9fb002d-689 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- 48b9fb002d-690 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- 48b9fb002d-691 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351
- 48b9fb002d-692 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:162
- 48b9fb002d-693 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- 48b9fb002d-694 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- 48b9fb002d-695 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- 48b9fb002d-696 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- 48b9fb002d-697 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- 48b9fb002d-698 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- 48b9fb002d-699 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:103
- 48b9fb002d-700 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-solid/src/index.ts:1
- 48b9fb002d-701 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- 48b9fb002d-702 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:194
- 48b9fb002d-703 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- 48b9fb002d-704 - ignored - declare-optional-services-with-noop-layers - packages/sdk/app-toolkit/src/types/DefaultParent.ts:24
- 48b9fb002d-705 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324
- 48b9fb002d-706 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- 48b9fb002d-707 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:128
- 48b9fb002d-708 - ignored - no-sleep-in-test - packages/sdk/client-e2e/src/spaces.test.ts:65
- 48b9fb002d-709 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- 48b9fb002d-710 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- 48b9fb002d-711 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- 48b9fb002d-712 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- 48b9fb002d-713 - ignored - test-asserts-real-behavior - packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33
- 48b9fb002d-714 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- 48b9fb002d-715 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- 48b9fb002d-716 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- 48b9fb002d-717 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- 48b9fb002d-718 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- 48b9fb002d-719 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- 48b9fb002d-720 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- 48b9fb002d-721 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- 48b9fb002d-722 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- 48b9fb002d-723 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- 48b9fb002d-724 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- 48b9fb002d-725 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- 48b9fb002d-726 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- 48b9fb002d-727 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- 48b9fb002d-728 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- 48b9fb002d-729 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- 48b9fb002d-730 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- 48b9fb002d-731 - ignored - no-casts - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137
- 48b9fb002d-732 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- 48b9fb002d-733 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- 48b9fb002d-734 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:148
- 48b9fb002d-735 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- 48b9fb002d-736 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- 48b9fb002d-737 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- 48b9fb002d-738 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- 48b9fb002d-739 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- 48b9fb002d-740 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- 48b9fb002d-741 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- 48b9fb002d-742 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- 48b9fb002d-743 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- 48b9fb002d-744 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- 48b9fb002d-745 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- 48b9fb002d-746 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/space/space-manager.ts:97
- 48b9fb002d-747 - ignored - no-casts - packages/sdk/client-services/src/internal/space/space-manager.ts:181
- 48b9fb002d-748 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- 48b9fb002d-749 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- 48b9fb002d-750 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- 48b9fb002d-751 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- 48b9fb002d-752 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- 48b9fb002d-753 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- 48b9fb002d-754 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- 48b9fb002d-755 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- 48b9fb002d-756 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- 48b9fb002d-757 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- 48b9fb002d-758 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:211
- 48b9fb002d-759 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/testing/test-worker-factory.ts:70
- 48b9fb002d-760 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- 48b9fb002d-761 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- 48b9fb002d-762 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/observability/src/ai/AiObservability.test.ts:372
- 48b9fb002d-763 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- 48b9fb002d-764 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- 48b9fb002d-765 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- 48b9fb002d-766 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- 48b9fb002d-767 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- 48b9fb002d-768 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- 48b9fb002d-769 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- 48b9fb002d-770 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- 48b9fb002d-771 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- 48b9fb002d-772 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- 48b9fb002d-773 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- 48b9fb002d-774 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- 48b9fb002d-775 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- 48b9fb002d-776 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- 48b9fb002d-777 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- 48b9fb002d-778 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- 48b9fb002d-779 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- 48b9fb002d-780 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- 48b9fb002d-781 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- 48b9fb002d-782 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- 48b9fb002d-783 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- 48b9fb002d-784 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- 48b9fb002d-785 - ignored - comment-hygiene - packages/sdk/shell/src/components/Panel/Action.tsx:106
- 48b9fb002d-786 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:34
- 48b9fb002d-787 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:25
- 48b9fb002d-788 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:25
- 48b9fb002d-789 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:33
- 48b9fb002d-790 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- 48b9fb002d-791 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- 48b9fb002d-792 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61
- 48b9fb002d-793 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- 48b9fb002d-794 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169
- 48b9fb002d-795 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70
- 48b9fb002d-796 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134
- 48b9fb002d-797 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- 48b9fb002d-798 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- 48b9fb002d-799 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- 48b9fb002d-800 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- 48b9fb002d-801 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- 48b9fb002d-802 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- 48b9fb002d-803 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- 48b9fb002d-804 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- 48b9fb002d-805 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- 48b9fb002d-806 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112
- 48b9fb002d-807 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/storybook-testing/src/test/startup.test.ts:73
- 48b9fb002d-808 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:76
- 48b9fb002d-809 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:172
- 48b9fb002d-810 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:225
- 48b9fb002d-811 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- 48b9fb002d-812 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:29
- 48b9fb002d-813 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- 48b9fb002d-814 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:154
- 48b9fb002d-815 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:371
- 48b9fb002d-816 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97
- 48b9fb002d-817 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- 48b9fb002d-818 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:362
- 48b9fb002d-819 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153
- 48b9fb002d-820 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:144
- 48b9fb002d-821 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- 48b9fb002d-822 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156
- 48b9fb002d-823 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246
- 48b9fb002d-824 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- 48b9fb002d-825 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- 48b9fb002d-826 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- 48b9fb002d-827 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:115
- 48b9fb002d-828 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:188
- 48b9fb002d-829 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- 48b9fb002d-830 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- 48b9fb002d-831 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88
- 48b9fb002d-832 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124
- 48b9fb002d-833 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- 48b9fb002d-834 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- 48b9fb002d-835 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- 48b9fb002d-836 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- 48b9fb002d-837 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:77
- 48b9fb002d-838 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- 48b9fb002d-839 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- 48b9fb002d-840 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- 48b9fb002d-841 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62
- 48b9fb002d-842 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16
- 48b9fb002d-843 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- 48b9fb002d-844 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57
- 48b9fb002d-845 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28
- 48b9fb002d-846 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- 48b9fb002d-847 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- 48b9fb002d-848 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:67
- 48b9fb002d-849 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24
- 48b9fb002d-850 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- 48b9fb002d-851 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- 48b9fb002d-852 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- 48b9fb002d-853 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57
- 48b9fb002d-854 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120
- 48b9fb002d-855 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- 48b9fb002d-856 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:83
- 48b9fb002d-857 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:107
- 48b9fb002d-858 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194
- 48b9fb002d-859 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- 48b9fb002d-860 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- 48b9fb002d-861 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:220
- 48b9fb002d-862 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:344
- 48b9fb002d-863 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:44
- 48b9fb002d-864 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16
- 48b9fb002d-865 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:106
- 48b9fb002d-866 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114
- 48b9fb002d-867 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161
- 48b9fb002d-868 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240
- 48b9fb002d-869 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14
- 48b9fb002d-870 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- 48b9fb002d-871 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- 48b9fb002d-872 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- 48b9fb002d-873 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- 48b9fb002d-874 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169
- 48b9fb002d-875 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40
- 48b9fb002d-876 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.tsx:57
- 48b9fb002d-877 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14
- 48b9fb002d-878 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28
- 48b9fb002d-879 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:14
- 48b9fb002d-880 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27
- 48b9fb002d-881 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:269
- 48b9fb002d-882 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:129
- 48b9fb002d-883 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:237
- 48b9fb002d-884 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:338
- 48b9fb002d-885 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95
- 48b9fb002d-886 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- 48b9fb002d-887 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- 48b9fb002d-888 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:96
- 48b9fb002d-889 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:276
- 48b9fb002d-890 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83
- 48b9fb002d-891 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- 48b9fb002d-892 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60
- 48b9fb002d-893 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- 48b9fb002d-894 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:275
- 48b9fb002d-895 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:19
- 48b9fb002d-896 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- 48b9fb002d-897 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80
- 48b9fb002d-898 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- 48b9fb002d-899 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- 48b9fb002d-900 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440
- 48b9fb002d-901 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452
- 48b9fb002d-902 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607
- 48b9fb002d-903 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56
- 48b9fb002d-904 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120
- 48b9fb002d-905 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- 48b9fb002d-906 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228
- 48b9fb002d-907 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:413
- 48b9fb002d-908 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162
- 48b9fb002d-909 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/debug/Debug.tsx:52
- 48b9fb002d-910 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/debug/Debug.tsx:64
- 48b9fb002d-911 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45
- 48b9fb002d-912 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- 48b9fb002d-913 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- 48b9fb002d-914 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:90
- 48b9fb002d-915 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:217
- 48b9fb002d-916 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:398
- 48b9fb002d-917 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:62
- 48b9fb002d-918 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- 48b9fb002d-919 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- 48b9fb002d-920 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- 48b9fb002d-921 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- 48b9fb002d-922 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:66
- 48b9fb002d-923 - ignored - no-casts - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:48
- 48b9fb002d-924 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:72
- 48b9fb002d-925 - ignored - comment-hygiene - packages/ui/react-ui-form/src/components/RefField.stories.tsx:118
- 48b9fb002d-926 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- 48b9fb002d-927 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- 48b9fb002d-928 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- 48b9fb002d-929 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21
- 48b9fb002d-930 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68
- 48b9fb002d-931 - ignored - no-casts - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58
- 48b9fb002d-932 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82
- 48b9fb002d-933 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- 48b9fb002d-934 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- 48b9fb002d-935 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:60
- 48b9fb002d-936 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:124
- 48b9fb002d-937 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:256
- 48b9fb002d-938 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:321
- 48b9fb002d-939 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-graph/src/components/SVG/FPS.tsx:44
- 48b9fb002d-940 - ignored - no-casts - packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20
- 48b9fb002d-941 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116
- 48b9fb002d-942 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207
- 48b9fb002d-943 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119
- 48b9fb002d-944 - ignored - comment-hygiene - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:24
- 48b9fb002d-945 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:36
- 48b9fb002d-946 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:219
- 48b9fb002d-947 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:231
- 48b9fb002d-948 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98
- 48b9fb002d-949 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67
- 48b9fb002d-950 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:102
- 48b9fb002d-951 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:192
- 48b9fb002d-952 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74
- 48b9fb002d-953 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:110
- 48b9fb002d-954 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:150
- 48b9fb002d-955 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:113
- 48b9fb002d-956 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:335
- 48b9fb002d-957 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:520
- 48b9fb002d-958 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- 48b9fb002d-959 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61
- 48b9fb002d-960 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:90
- 48b9fb002d-961 - ignored - no-casts - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- 48b9fb002d-962 - ignored - no-casts - packages/ui/react-ui-menu/src/components/action-label.ts:17
- 48b9fb002d-963 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20
- 48b9fb002d-964 - ignored - leaf-owns-its-subscription - packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89
- 48b9fb002d-965 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:88
- 48b9fb002d-966 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:269
- 48b9fb002d-967 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:105
- 48b9fb002d-968 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173
- 48b9fb002d-969 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- 48b9fb002d-970 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- 48b9fb002d-971 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255
- 48b9fb002d-972 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177
- 48b9fb002d-973 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:120
- 48b9fb002d-974 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:99
- 48b9fb002d-975 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:42
- 48b9fb002d-976 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- 48b9fb002d-977 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85
- 48b9fb002d-978 - ignored - structured-logging-not-console - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117
- 48b9fb002d-979 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117
- 48b9fb002d-980 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:502
- 48b9fb002d-981 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-syntax-highlighter/src/Syntax/Syntax.tsx:88
- 48b9fb002d-982 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31
- 48b9fb002d-983 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97
- 48b9fb002d-984 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:119
- 48b9fb002d-985 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:230
- 48b9fb002d-986 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:49
- 48b9fb002d-987 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:43
- 48b9fb002d-988 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- 48b9fb002d-989 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- 48b9fb002d-990 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53
- 48b9fb002d-991 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:146
- 48b9fb002d-992 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:712
- 48b9fb002d-993 - ignored - error-messages-carry-context - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1195
- 48b9fb002d-994 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1954
- 48b9fb002d-995 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:495
- 48b9fb002d-996 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskListEditor.tsx:345
- 48b9fb002d-997 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:418
- 48b9fb002d-998 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:100
- 48b9fb002d-999 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- 48b9fb002d-1000 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133
- 48b9fb002d-1001 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:74
- 48b9fb002d-1002 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:314
- 48b9fb002d-1003 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341
- 48b9fb002d-1004 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359
- 48b9fb002d-1005 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505
- 48b9fb002d-1006 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- 48b9fb002d-1007 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162
- 48b9fb002d-1008 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:64
- 48b9fb002d-1009 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:148
- 48b9fb002d-1010 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:228
- 48b9fb002d-1011 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:311
- 48b9fb002d-1012 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:50
- 48b9fb002d-1013 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- 48b9fb002d-1014 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- 48b9fb002d-1015 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui/src/exemplars/slot.stories.tsx:94
- 48b9fb002d-1016 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108
- 48b9fb002d-1017 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- 48b9fb002d-1018 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- 48b9fb002d-1019 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14
- 48b9fb002d-1020 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:132
- 48b9fb002d-1021 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/AttentionGlyph/AttentionGlyph.stories.tsx:20
- 48b9fb002d-1022 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28
- 48b9fb002d-1023 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Banner/index.ts:1
- 48b9fb002d-1024 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96
- 48b9fb002d-1025 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:110
- 48b9fb002d-1026 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/ControlFrame/index.ts:1
- 48b9fb002d-1027 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/DateInput/index.ts:1
- 48b9fb002d-1028 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:116
- 48b9fb002d-1029 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/DragHandle/index.ts:1
- 48b9fb002d-1030 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:200
- 48b9fb002d-1031 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36
- 48b9fb002d-1032 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:44
- 48b9fb002d-1033 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/next/components/Main/Main.tsx:532
- 48b9fb002d-1034 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/MediaPlayer/index.ts:1
- 48b9fb002d-1035 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21
- 48b9fb002d-1036 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:102
- 48b9fb002d-1037 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:117
- 48b9fb002d-1038 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18
- 48b9fb002d-1039 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:32
- 48b9fb002d-1040 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16
- 48b9fb002d-1041 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:78
- 48b9fb002d-1042 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/ScrollContainer/index.ts:1
- 48b9fb002d-1043 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollContainer/ScrollContainer.stories.tsx:21
- 48b9fb002d-1044 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18
- 48b9fb002d-1045 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Slider/index.ts:1
- 48b9fb002d-1046 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:20
- 48b9fb002d-1047 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:27
- 48b9fb002d-1048 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:64
- 48b9fb002d-1049 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/SystemButton/index.ts:1
- 48b9fb002d-1050 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:43
- 48b9fb002d-1051 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:34
- 48b9fb002d-1052 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:53
- 48b9fb002d-1053 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:24
- 48b9fb002d-1054 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:215
- 48b9fb002d-1055 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Toolbar/index.ts:1
- 48b9fb002d-1056 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Tour/index.ts:1
- 48b9fb002d-1057 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/components.stories.tsx:101
- 48b9fb002d-1058 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/testing/components.stories.tsx:101
- 48b9fb002d-1059 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/stories.tsx:45
- 48b9fb002d-1060 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:540
- 48b9fb002d-1061 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- 48b9fb002d-1062 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51
- 48b9fb002d-1063 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63
- 48b9fb002d-1064 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- 48b9fb002d-1065 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- 48b9fb002d-1066 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# ERROR 48b9fb002d-1 no-casts `packages/apps/composer-app/src/vite/trace-boot-leak.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 65-76 (`while (queue.length > 0) {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-2 structured-logging-not-console `packages/apps/composer-app/src/vite/trace-boot-leak.ts:89`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 89-100 (`const path: string[] = [];`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-3 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:163`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 163-174 (`context.push(`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-4 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-5 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-6 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-7 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:35`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 35-48 (`)}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-8 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:69`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 69-80 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-9 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-92 (`</Field.Root>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-10 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:55`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 55-66 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-11 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:91`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 91-102 (`queueMicrotask(async () => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-12 moon-yml-entrypoint-registration `packages/common/effect/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.81. The likeliest place is lines 25-36 (`"./DynamicRuntime": {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-13 import-as-namespace-is-all-or-nothing `packages/common/effect/src/internal/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-11 (`export * as GlobalValue from './GlobalValue.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-14 namespace-export-with-internal-hiding `packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-10 (`export * as Alpha from './Alpha.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-15 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:467`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 467-514 (`try {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-16 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-17 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-18 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:11`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.87. The likeliest place is lines 11-19 (`export type TestProps = {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-19 structured-logging-not-console `packages/core/compute/agent-claude/src/Demo.test.ts:42`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 42-53 (`for (const message of collected) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-20 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.86. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-21 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-22 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-23 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-24 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 148-154 (`),`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-25 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.90. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-26 no-casts `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.test.ts:237`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 237-245 (`const readBody = async (init?: RequestInit): Promise<any> => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-27 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-28 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 293-304 (`);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-29 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-30 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-31 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-32 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:113`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 113-124 (`export const formatUserPrompt = ({`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-33 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-34 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-35 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:348`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 348-356 (`typeof value === 'object' && value !== null ? statePropertyOpenness(value as ...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-36 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-37 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-38 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-39 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 79-90 (`),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-40 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-41 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-42 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-43 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 426-449 (`const manager = yield* ProcessManager.Service;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-44 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1455-1478 (`);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-45 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-46 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.80. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-47 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 350-361 (`};`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-48 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-373 (`};`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-49 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-50 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-51 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-52 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.81. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.73). Judged with added `imports, package, public-api` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-53 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-54 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-55 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-56 no-casts `packages/core/compute/compute-runtime/src/services/service-registry.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-63 (`A,`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-57 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-58 flat-layer-composition `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 1142-1165 (`}, Effect.provide(TestLayer())),`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-59 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-60 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-61 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

System One judges this a likely violation of `namespace-service-layers` (Layer constructors are module-level exports, never class statics), p=0.87. The likeliest place is lines 40-51 (`static layerKv = Layer.effect(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-62 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-63 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-64 no-casts `packages/core/compute/compute/src/Process.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 327-346 (`[ProcessTypeId]: {} as any,`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-65 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.test.ts:68`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 68-79 (`const resolve = ({ registry = [], space = [] }: { registry?: Skill.Skill[]; s...`, location confidence 0.99). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-66 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-67 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-68 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-69 no-casts `packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 136-147 (`const versionMeta = safeParseJson<any>(latest.versionMetaJSON);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-70 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-83 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-71 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-72 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-73 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-74 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-75 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-76 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-77 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-78 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-79 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 23-28 (`const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRun...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-80 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/invoker.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 63-75 (`const computeHandler = Operation.withHandler(Compute, (data) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-81 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 112-123 (`},`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-82 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-83 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-84 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-85 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-86 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-87 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-88 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-89 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-90 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-91 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 116-127 (`export const makeExtractionStage = (): Stage<ExtractionInput> => ({`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-92 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:107`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 107-118 (`test('per-stage sliding overflow coalesces stale input while a slow run is in...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-93 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-94 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-95 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.85. The likeliest place is lines 75-86 (`bench(`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-96 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-97 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 154-164 (`});`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-98 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-99 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-100 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-101 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:266`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 266-277 (`});`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-102 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-103 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-104 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-105 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-106 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-107 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-108 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:860`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 860-883 (`await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress, abort....`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-109 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-110 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-111 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-112 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.84. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-113 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-114 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-115 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 93-104 (`});`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-116 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-117 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-118 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-119 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-120 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-121 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-122 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-123 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.38). Judged with added `imports, public-api` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-124 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-125 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-126 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-127 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-128 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-129 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:1669`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 1669-1692 (`break;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-130 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 46-57 (`export const createTestSqliteStorageAdapter = async (`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-131 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-132 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-133 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-134 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-135 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.90. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-136 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-137 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-138 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 666-687 (`return {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-139 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-140 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-141 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-142 namespace-brand-key-prefixing `packages/core/echo/echo/src/internal/common/types/base.ts:34`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 34-40 (`type WithMeta = { [ATTR_META]?: EntityMeta };`, location confidence 0.97). Judged with added `imports` context after a first pass of 0.51. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-143 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-144 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-145 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-146 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-147 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-148 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-149 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-150 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-151 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-152 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-153 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-154 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-155 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-156 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-157 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-158 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-159 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-160 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-161 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-162 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-163 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-164 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-165 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-166 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-167 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:481`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 481-504 (`body: data as BodyInit,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-168 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-169 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-170 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-171 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-172 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-173 test-asserts-real-behavior `packages/devtools/cli-util/src/util/form-builder.test.ts:49`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 49-60 (`yield* Console.log(print(doc));`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-174 no-casts `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-175 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-176 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-177 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:133`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 133-144 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-178 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:38`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 38-49 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-179 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-42 (`const [recording, setRecording] = useState(false);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-180 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 84-95 (`const data = useMemo(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-181 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const dataRows = useMemo(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-182 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 46-57 (`const handleRowClicked = (row: any) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-183 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 78-89 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-184 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-185 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 89-100 (`async (spaceId: string) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-186 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-187 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 51-62 (`const stack = context?.stack;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-188 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 60-71 (`try {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-189 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 135-146 (`let response: any;`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-190 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 100-111 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-191 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:215`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 215-226 (`export const SignalMessageTable = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-192 no-casts `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 118-129 (`condition: () => this._client!.spaces.get(response.spaceId as SpaceId),`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-193 error-messages-carry-context `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 130-141 (`if (buildResult.error || !buildResult.bundle) {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-194 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-195 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:30`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 30-41 (`export const AgentProperties = ({ agent, onSubscriptionsChanged }: AgentPrope...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-196 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 122-145 (`const feedMessages = useQuery(`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-197 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:377`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 377-409 (`>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-198 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 129-140 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-199 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 47-51 (`const styles = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-200 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 62-73 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-201 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-202 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 92-103 (`const meta = {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-203 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 193-204 (`'flex flex-col w-full dx-density-md',`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-204 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 117-128 (`interval={500}`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-205 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 52-63 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-206 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 53-64 (`}, [manager]);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-207 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.88. The likeliest place is lines 113-124 (`const loadedLabel = running`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-208 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-209 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 131-142 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-210 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 55-66 (`const DefaultStory = () => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-211 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 57-68 (`});`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-212 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:152`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 152-163 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-213 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:285`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 285-296 (`<Button.Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onCli...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-214 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 73-84 (`.action(`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-215 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-216 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.88. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-217 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 131-142 (`const authorize = (server: McpServer.McpServer, popup: Window | null) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-218 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-219 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-220 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:144`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 144-155 (`AssistantPlugin({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-221 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-222 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-223 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:100`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 100-111 (`useEffect(() => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-224 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 268-279 (`<Banner.Root valence='warning'>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-225 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:180`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 180-191 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-226 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-227 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:120`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 120-131 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-228 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:204`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 204-215 (`<Panel.Header>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-229 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:90`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 90-101 (`.map((obj) => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-230 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 174-185 (`iconOnly`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-231 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-232 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-233 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-234 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-235 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-236 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-92 (`);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-237 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`export const mailboxFacts: ProjectCapabilities.Template = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-238 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-239 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 61-72 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-240 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 73-84 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-241 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 109-120 (`<div>{participants}</div>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-242 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 31-42 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-243 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 55-66 (`const timeout = setTimeout(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-244 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 94-105 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-245 no-casts `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 34-45 (`const screenshare: UserState = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-246 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 46-57 (`});`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-247 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 20-24 (`const maxImageSize = 'w-[2560px] h-[1440px]';`, location confidence 0.98). Judged with added `imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-248 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-249 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 108-119 (`}`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-250 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-251 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 108-119 (`{/* TODO(burdon): Replace with avatar for everyone. */}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-252 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-253 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:89`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 89-100 (`</Panel.Header>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-254 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-255 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 73-84 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-256 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 97-108 (`)}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-257 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-258 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-259 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 58-69 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-260 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-261 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-262 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 48-59 (`const closedRef = useRef(false);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-263 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 96-107 (`}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-264 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:95`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 95-106 (`onValueChange={({ value: [value] }) =>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-265 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 256-267 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-266 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 47-58 (`if (!hubClient) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-267 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:33`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 33-49 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-268 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 21-32 (`export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-269 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-270 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 41-52 (`setFetchState((previous) => (previous.state === 'ready' ? previous : { state:...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-271 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/schema-defs.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 39-50 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-272 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-46 (`<div className='dx-expand grid grid-rows-[auto_1fr] text-xs'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-273 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 72-83 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-274 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.95. The likeliest place is lines 67-78 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-275 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 102-113 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-276 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 189-200 (`let cancelled = false;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-277 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 19-30 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-278 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 79-90 (`return (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-279 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 130-141 (`AiService.AiService,`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-280 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 494-517 (`);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-281 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-282 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-283 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-284 flat-layer-composition `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:94`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 94-117 (`const runOnTokenCreated = (`, location confidence 0.97). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-285 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-286 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 50-61 (`const db = Obj.getDatabase(connectionObj);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-287 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-288 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.88. The likeliest place is lines 66-77 (`void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] }, { sp...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-289 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 72-83 (`</Toolbar.Root>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-290 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm-project.ts:59`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 59-70 (`export const crmProject: ProjectCapabilities.Template = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-291 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 25-36 (`export const crm: RoutineCapabilities.Template = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-292 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:80`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 80-91 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-293 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 54-65 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-294 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-295 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 75-86 (`iconOnly`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-296 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-297 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-298 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 89-100 (`/>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-299 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 70-81 (`});`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-300 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 82-93 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-301 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 39-49 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-302 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 39-49 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-303 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-304 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 50-61 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-305 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 62-73 (`useEffect(() => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-306 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 194-205 (`value={count}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-307 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-308 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 31-40 (`export const useDrawerState = (): Main.DrawerState =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-309 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-310 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-311 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 45-56 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-312 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 50-61 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-313 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:138`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 138-149 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-314 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 44-55 (`const SplitStory = () => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-315 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-316 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 30-41 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-317 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 161-179 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-318 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 512-535 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-319 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-320 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 133-144 (`classNames={[`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-321 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 83-94 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-322 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:173`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 173-184 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-323 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:22`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 22-33 (`export const useBreadcrumbs = (ids: string[]): Breadcrumb[] => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-324 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-325 no-sleep-in-test `packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 39-46 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sub...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-326 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-327 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 42-54 (`applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-328 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:113`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 113-118 (`});`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-329 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-330 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 32-43 (`const sampleProfiler = useCallback(() => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-331 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 55-66 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-332 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.92. The likeliest place is lines 67-78 (`url.searchParams.set('sort', 'updated');`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-333 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 157-171 (`const Content = () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-334 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-335 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-336 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-337 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-338 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-339 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-340 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-341 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-342 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-343 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-344 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-345 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-33 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-346 extract-non-rendering-logic-from-component `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 297-308 (`let task: PDFDocumentLoadingTask | undefined;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-347 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-348 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:111`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 111-122 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-349 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:280`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 280-291 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-350 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-351 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:45`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 45-56 (`setPending(true);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-352 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 81-92 (`<Input.Input readOnly value={reference} classNames='grow' />`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-353 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-354 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-355 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-356 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 93-104 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-357 no-invented-theme-tokens `packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:14`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 14-25 (`const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; class...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-358 no-invented-theme-tokens `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:27`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 27-38 (`export const useRelatedItems = ({ artifacts, claudeCode, previewUrl }: Relate...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-359 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 92-103 (`/>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-360 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-361 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-362 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync.test.ts:94`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 94-105 (`throw new Error('expected external-sync cursor');`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-363 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 92-103 (`setPhase('idle');`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-364 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-365 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-366 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`try {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-367 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-368 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 210-233 (`expect(afterRerun.length).toBe(feedMessages.length);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-369 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-370 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 139-150 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-371 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:163`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 163-174 (`<div className='dx-expand flex flex-col gap-2 overflow-y-auto'>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-372 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 95-106 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-373 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:157`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 157-168 (`if (!sections.some((section) => section.id === selected)) {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-374 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 75-86 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-375 subscribe-where-you-read `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:34`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 34-45 (`export const PortfolioReportDetail = ({ role, subject, companionTo }: Portfol...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-376 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-377 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.82. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-378 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-379 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-illustrator/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-7 (`export * as DrawingSkill from './DrawingSkill.ts';`, location confidence 1.00). Judged with added `imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-380 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:274`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 274-297 (`const getId = useCallback((item: ConversationTileData) => item.id, []);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-381 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:624`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 624-647 (`<div className='col-span-full grid grid-cols-subgrid items-start'>`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-382 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.88. The likeliest place is lines 174-185 (`setShowBcc(true);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-383 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:318`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 318-329 (`<div className='flex flex-col dx-grow py-3'>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-384 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 102-113 (`const CompanionStory = () => {`, location confidence 0.31). Judged with added `imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-385 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 126-134 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-386 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-387 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-388 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-389 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-390 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:239`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 239-262 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-391 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-392 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 32-43 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-393 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:178`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 178-189 (`onCheckedChange={() => toggleAll()}`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-394 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 112-123 (`const generateClassification = (prompt: string, useStrict: boolean) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-395 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-396 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:66`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 66-77 (`const runExtractMailbox = (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-397 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-398 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-399 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.87. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.71). Judged with added `test` context after a first pass of 0.66. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-400 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-401 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-402 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/skills/InboxSendSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-15 (`import type * as Operation from '@dxos/compute/Operation';`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-403 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-404 effect-requirement-type-not-erased `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-405 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-406 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-407 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 74-85 (`<div className='flex flex-col gap-1'>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-408 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 74-85 (`<div className='flex flex-col gap-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-409 namespace-export-with-internal-hiding `packages/plugins/plugin-jmap/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as JmapPlugin from './JmapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-410 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 32-43 (`Layer.provide(JmapMailApi.Live),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-411 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 60-71 (`export const jmapMailSyncProvider = (): Layer.Layer<MailSync.MailSyncProvider...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-412 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-413 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-414 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.88. The likeliest place is lines 88-99 (`const DefaultComponent = () => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-415 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`return null;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-416 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-417 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 84-95 (`[invokePromise],`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-418 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`if (target == null) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-419 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`const settingsSchema = (isView ? KanbanSchema.KanbanViewSettingsSchema : Kanb...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-420 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-421 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:41`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 41-52 (`<Button.Button`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-422 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:90`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 90-101 (`useLayoutEffect(() => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-423 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 114-125 (`() =>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-424 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 110-121 (`}`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-425 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 110-121 (`}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-426 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-427 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-428 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.97. The likeliest place is lines 28-39 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-429 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 74-80 (`<div className='dx-expand grid grid-cols-2 gap-2 px-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-430 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 36-47 (`{words.map((word) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-431 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 110-123 (`/>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-432 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 77-88 (`() =>`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-433 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 63-74 (`<Card.Row>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-434 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-435 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-436 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:87`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 87-98 (`});`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-437 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:76`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 76-87 (`void handleFetch();`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-438 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 100-111 (`label='Fetch'`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-439 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 28-39 (`export const magazineCuration: RoutineCapabilities.Template = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-440 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-441 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-442 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 76-87 (`const features = useMemo(`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-443 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-444 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:187`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 187-195 (`const useTest = (view: EditorView | null) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-445 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 121-132 (`const [missing, setMissing] = useState(false);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-446 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 337-348 (`if (mode === 'section') {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-447 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-48 (`import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-448 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-449 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-450 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-451 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-452 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 59-70 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-453 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 71-82 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-454 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 119-130 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-455 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 119-130 (`return (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-456 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-457 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-458 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-459 comment-hygiene `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 23-33 (`type MobileLayoutRootProps = Util.ThemedClassName<`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-460 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`const description = describeScrollTarget(event.target);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-461 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 89-100 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-462 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 101-112 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-463 structured-logging-not-console `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 27-38 (`const menuActions = random.helpers.multiple(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-464 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 107-116 (`monolithicAction ? monolithicAction.properties!.label : props.label,`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-465 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 193-204 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-466 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:368`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 368-379 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-467 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:72`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 72-83 (`value={id}`, location confidence 0.13). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-468 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 200-211 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-469 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 22-33 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-470 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 41-52 (`const current = getHotkeyScope() ?? '';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-471 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 313-324 (`useEffect(() => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-472 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 88-99 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-473 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 216-227 (`export const Visitor = () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-474 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 128-139 (`id: 'appGraphBuilder',`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-475 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-476 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 82-92 (`(event) =>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-477 no-casts `packages/plugins/plugin-observability/src/plugin.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-25 (`describe('ObservabilityPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-478 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-479 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 69-80 (`</Dialog.Title>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-480 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 22-33 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-481 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 16-27 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-482 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-44 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-483 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:160`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 160-183 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-484 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:376`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 376-399 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-485 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:862`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 862-885 (`const InlineForm = ({`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-486 inline-obj-parent `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 65-74 (`objects: seed.objects.map((object) => Ref.make(object)),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-487 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 49-60 (`} else {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-488 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 85-96 (`const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-489 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:110`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 110-121 (`export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootPr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-490 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 47-58 (`annotation: {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-491 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:191`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.91. The likeliest place is lines 191-202 (`<Form.Fields />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-492 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 16-27 (`export const Layout = Util.composable<HTMLDivElement, LayoutProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-493 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-494 no-casts `packages/plugins/plugin-presenter/src/useExitPresenter.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 16-24 (`export const useExitPresenter = (object: any) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-495 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 27-38 (`const resolveLink = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-496 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:171`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 171-182 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-497 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-498 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`}`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-499 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-500 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-501 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-35 (`export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-502 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-503 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-504 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:131`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 131-142 (`const fiber = Effect.runFork(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-505 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 109-120 (`{`, location confidence 0.45). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-506 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 69-80 (`expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox....`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-507 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/templates/inbox-research.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 55-66 (`export const inboxResearch: ProjectCapabilities.Template = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-508 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-509 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 59-70 (`return (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-510 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-511 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 109-120 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-512 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 157-168 (`<ul data-testid='qa.plan.runs'>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-513 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:300`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 300-311 (`<div className='flex flex-wrap gap-1'>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-514 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 39-50 (`label={t('failure-badge.label')}`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-515 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-61 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-516 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-517 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 130-141 (`}`, location confidence 0.43). Judged with added `diff, imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-518 no-casts `packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 41-48 (`const { plugins } = await harness.runPromise(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-519 leaf-owns-its-subscription `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:90`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.80. The likeliest place is lines 90-101 (`const loadedMessages = useMemo(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-520 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 138-149 (`[anchor, onComment],`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-521 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 47-58 (`standalone`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-522 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 35-46 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-523 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 105-116 (`</div>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-524 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-525 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 456-467 (`const filteredAnchors = showResolvedThreads`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-526 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 226-237 (`<Button.Button icon='ph--trash--regular' label={t('discard-branch.label')} on...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-527 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-528 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-529 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-530 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:40`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 40-51 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-531 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:292`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 292-302 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-532 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:314`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 314-320 (`const LabelledRow = ({ label, children, classNames }: Util.ThemedClassName<Pr...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-533 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 61-72 (`},`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-534 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 184-195 (`if (inputIndex !== -1) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-535 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 42-48 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-536 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 309-320 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-537 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 164-177 (`}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-538 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-539 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.92. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-540 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-541 toolbars-are-menu-actions `packages/plugins/plugin-sample/src/containers/SampleCompanionPanel.tsx:54`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 54-65 (`</Panel.Header>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-542 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 32-46 (`);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-543 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.94. The likeliest place is lines 38-49 (`return (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-544 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 62-76 (`);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-545 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 106-117 (`selectedPath={selectedPath}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-546 extract-non-rendering-logic-from-component `packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 74-85 (`useEffect(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-547 no-sleep-in-test `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 226-237 (`yield* Effect.sleep('6 seconds');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-548 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-549 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 13-28 (`import * as ScrollArea from '@dxos/react-ui/ScrollArea';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-550 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 141-152 (`{/* Side rail */}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-551 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 136-145 (`<Button.Button icon='ph--play--regular' label='Execute' iconOnly onClick={() ...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-552 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-85 (`<Toolbar.Root>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-553 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 92-103 (`keymap.of(lintKeymap),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-554 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:79`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.82. The likeliest place is lines 79-90 (`</Dialog.Header>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-555 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-556 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-557 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-558 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 188-199 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-559 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 40-51 (`if (!token || !gistId) {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-560 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:37`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 37-48 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-561 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-562 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`onClientInitialized: ({ client }) =>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-563 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-564 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.84. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-565 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 59-70 (`Object.entries(fields).some(([, value]) => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-566 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-567 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 81-92 (`return (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-568 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 88-99 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-569 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:304`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 304-315 (`}`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-570 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:472`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 472-483 (`<div`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-571 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 28-39 (`const DefaultStory = () => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-572 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:40`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 40-51 (`}, [space]);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-573 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 76-87 (`<Field.Root>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-574 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 23-34 (`export const Basic = () => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-575 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 270-281 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-576 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 42-55 (`>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-577 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-578 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-579 comment-hygiene `packages/plugins/plugin-sheet/src/translations.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 47-60 (`'add-row-after.label': 'Add row after',`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-580 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:22`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.89. The likeliest place is lines 22-33 (`export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][n...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-581 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-582 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-583 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-584 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-585 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-586 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-587 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 250-261 (`onSelect={() => onChange(option.id)}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-588 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 50-61 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-fg-subtle'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-589 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:115`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 115-126 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-590 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.82. The likeliest place is lines 107-118 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-591 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-592 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-593 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 40-51 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-594 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:263`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 263-274 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-595 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-596 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:254`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 254-265 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-597 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 52-63 (`}, [schemas]);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-598 comment-hygiene `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:54`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 54-65 (`return () => clearInterval(interval);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-599 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:236`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 236-247 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-600 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-601 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-602 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-603 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 60-71 (`}, [updateState]);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-604 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:203`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 203-214 (`const rail = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-605 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:183`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 183-194 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-606 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:228`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.83. The likeliest place is lines 228-236 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-607 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-47 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-608 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-609 comment-hygiene `packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 13-24 (`export const StatusBarActions = (_props: StatusBarActionsProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-610 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-611 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 51-65 (`<div role='img' aria-label={label} className='dx-fill flex items-center justi...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-612 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 89-100 (`<div className='flex items-center gap-1'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-613 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 89-100 (`<div className='flex items-center gap-1'>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-614 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:57`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 57-68 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-615 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:78`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 78-89 (`(id: string) =>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-616 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:114`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 114-125 (`return;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-617 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 45-56 (`export const MediaArtifactVariants = ({`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-618 namespace-export-with-internal-hiding `packages/plugins/plugin-studio/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as StudioPlugin from './StudioPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-619 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-620 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.81. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-621 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:95`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 95-106 (`const operationService = (): Operation.OperationService => ({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-622 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 79-90 (`) : (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-623 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 137-148 (`}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-624 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 148-159 (`<div className='flex items-start'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-625 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-24 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-626 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-627 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-628 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 228-239 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-629 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:62`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 62-73 (`Obj.update(subject, (subject) => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-630 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:59`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 59-70 (`if (!typename) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-631 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:95`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 95-106 (`return (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-632 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 37-51 (`data-testid='supportPlugin.startTour'`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-633 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-16 (`const observabilityWith = (support: Observability.Observability['support']): ...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-634 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 165-176 (`return {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-635 namespace-export-with-internal-hiding `packages/plugins/plugin-table/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as TablePlugin from './TablePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-636 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 69-80 (`<JournalEntry`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-637 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 125-136 (`<div`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-638 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:22`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 22-33 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-639 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-640 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 86-97 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-641 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 40-51 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-642 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-643 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 107-118 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-644 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:217`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 217-227 (`'onDragLeaveCapture': handleDragLeave,`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-645 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 136-151 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-646 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 78-89 (`const [filterText, setFilterText] = useFilterQuery(taskSet.id, filterEditorRef);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-647 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 330-341 (`<Match.Case when={AppSurface.Section.role}>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-648 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-649 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 107-118 (`export const TerraForm = ({ config, onChange, onWaterSheen }: TerraFormProps)...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-650 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-651 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 247-258 (`const manager = managerRef.current;`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-652 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-653 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-654 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-655 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-656 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-657 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-658 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-659 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 116-127 (`useEffect(() => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-660 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-661 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-662 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-663 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 139-150 (`disabled={!stream}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-664 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-665 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-666 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-667 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.37). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-668 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-669 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 59-70 (`<Card.Header>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-670 structured-logging-not-console `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 34-45 (`const DefaultStory = ({ segmentIndex, current }: StoryArgs) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-671 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 42-53 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-672 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-673 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-674 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-675 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-676 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-677 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-678 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 71-82 (`useEffect(() => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-679 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 155-166 (`<Button.Button icon='ph--plus--regular' iconOnly label='Add layer' onClick={h...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-680 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-681 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-682 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-683 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-684 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 114-125 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-685 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 56-61 (`const resolveWith = <S>(manager: PluginManager.PluginManager, tag: Context.Ke...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-686 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-687 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-688 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-689 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-690 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-691 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 351-362 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-692 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 162-173 (`if (!withHandler) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-693 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-694 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-695 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 893-917 (`release();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-696 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-697 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-698 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-699 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 103-117 (`},`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-700 namespace-export-with-internal-hiding `packages/sdk/app-solid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.90. The likeliest place is lines 1-8 (`export * from './common.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-701 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-702 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:194`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 194-205 (`const type = Obj.getType(object) ?? registered;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-703 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-704 declare-optional-services-with-noop-layers `packages/sdk/app-toolkit/src/types/DefaultParent.ts:24`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 24-35 (`export const resolve = (object: Obj.Unknown): Effect.Effect<Obj.Unknown | und...`, location confidence 0.99). Judged with added `importers, package` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-705 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-706 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-707 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 128-154 (`const peerFromClient = async (client: Client): Promise<InvitationPeer> => {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-708 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-709 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-710 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-711 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-712 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-713 test-asserts-real-behavior `packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 33-44 (`});`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-714 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-715 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.82. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-716 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-717 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-718 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-719 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-720 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-721 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-722 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-723 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-724 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-725 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-726 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-727 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-728 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 93-104 (`update();`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-729 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-730 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-731 no-casts `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 137-148 (`log.error('failed to load metadata from SQLite', { err });`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-732 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-733 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-734 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 148-159 (`yield* Hook.on(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-735 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-736 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-737 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 488-499 (`});`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-738 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-739 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-740 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-741 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 429-452 (`}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-742 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-743 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-744 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-745 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-746 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/space/space-manager.ts:97`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 97-108 (`async close(): Promise<void> {`, location confidence 0.28). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-747 no-casts `packages/sdk/client-services/src/internal/space/space-manager.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 181-193 (`public findSpaceByRootDocumentId(documentId: string): Space | undefined {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-748 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-749 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 188-199 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-750 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-751 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-752 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-753 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-754 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-755 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-756 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-757 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-758 no-casts `packages/sdk/client/src/services/local-client-services.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 211-222 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-759 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/testing/test-worker-factory.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-81 (`createSession: ({ isOwner }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-760 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-761 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 23-34 (`<>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-762 effect-fn-not-hand-wrapped-gen `packages/sdk/observability/src/ai/AiObservability.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 372-383 (`const setupWired = ({`, location confidence 0.91). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-763 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-764 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-765 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-766 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-767 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-768 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-769 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.85. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-770 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`import * as Button from '@dxos/react-ui/Button';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-771 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-772 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 44-55 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-773 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-774 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-775 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-776 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-777 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-778 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-779 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-780 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-781 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-782 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-783 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.88. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-784 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-785 comment-hygiene `packages/sdk/shell/src/components/Panel/Action.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 106-117 (`/>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-786 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:34`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 34-45 (`export const InvitationManager = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-787 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:25`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.83. The likeliest place is lines 25-32 (`import { IdentityPanel, JoinPanel, SpacePanel } from '../panels/index.ts';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-788 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:25`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 25-32 (`import { IdentityPanel, JoinPanel, SpacePanel } from '../panels/index.ts';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-789 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:33`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 33-44 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-790 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-791 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-792 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 61-73 (`const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-793 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-794 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 169-176 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-795 no-casts `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-796 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 134-145 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-797 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-798 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.93. The likeliest place is lines 116-127 (`{`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-799 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.91. The likeliest place is lines 200-207 (`}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-800 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-801 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.51). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-802 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-803 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-804 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-805 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-806 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 112-118 (`export const Default: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-807 effect-fn-not-hand-wrapped-gen `packages/stories/storybook-testing/src/test/startup.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 73-84 (`const clientPlugin = ClientPlugin.make({`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-808 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:76`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 76-85 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-809 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:172`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 172-185 (`<div className='flex justify-center items-center'>`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-810 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:225`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 225-236 (`<svg width={size} height={size}>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-811 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-812 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 29-42 (`const Component = ({ buffer }: { buffer: ArrayBuffer }) => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-813 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-814 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:154`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 154-165 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-815 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:371`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 371-382 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-816 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 97-108 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-817 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-818 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:362`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 362-373 (`const ToolSection = ({ label, data }: { label: string; data: unknown }) => (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-819 extract-non-rendering-logic-from-component `packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 153-164 (`let cancelled = false;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-820 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 144-155 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-821 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-822 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 156-179 (`<div`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-823 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 246-269 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-824 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-825 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-826 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-827 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:115`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 115-126 (`if (!controller) {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-828 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 188-199 (`const meta = {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-829 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-830 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-831 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 88-99 (`);`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-832 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`{sidebar && (`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-833 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-834 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-835 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-836 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-837 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 77-91 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-838 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-839 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-840 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-841 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 62-68 (`onPointerDown={stopGesture}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-842 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 16-27 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-843 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 33-44 (`}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-844 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-62 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-845 no-casts `packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 28-39 (`export const ShapeComponent = (props: ShapeComponentProps<any>) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-846 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-847 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-848 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:67`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 67-78 (`items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-849 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 24-37 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-850 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-61 (`)}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-851 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-852 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-853 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`setDragging(true);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-854 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 120-131 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-855 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-856 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:83`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.89. The likeliest place is lines 83-94 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-857 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 107-118 (`commit(key, next);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-858 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 194-205 (`const fiber = Effect.runFork(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-859 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-860 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-861 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:220`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 220-234 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-862 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:344`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 344-355 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-863 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:44`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 44-55 (`{item}`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-864 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 16-27 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-865 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:106`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 106-117 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.69). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-866 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 114-125 (`export const Controller: Story = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-867 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-868 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 240-247 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-869 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-28 (`const DefaultStory = (props: MatrixProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-870 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-871 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-872 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-873 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-874 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 169-180 (`const progress = (current: number, total: number) =>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-875 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 40-51 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-876 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 57-68 (`const builder = useMemo(() => (onFilterChange ? new QueryBuilder(tags) : unde...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-877 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 14-25 (`const DefaultStory = ({ state: _state }: SpinnerProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-878 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 28-39 (`let cancelled = false;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-879 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-880 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 27-33 (`const sizes: Record<number, { range: Range; classNames: string; h: string }> = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-881 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:269`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 269-280 (`const DashboardActivity = Util.composable<HTMLDivElement, DashboardActivityCu...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-882 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:129`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 129-140 (`useEffect(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-883 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:237`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 237-248 (`value={filter}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-884 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:338`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 338-349 (`<Listbox.Content classNames='dx-density-sm'>`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-885 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 95-106 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-886 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-887 reactive-state-via-atom-bridge `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.84). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-888 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:96`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 96-107 (`return;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-889 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:276`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 276-285 (`<MenuItem key={item.id} item={item} current={currentItem === item.id} onSelec...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-890 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 83-94 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-891 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-892 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 60-71 (`[debug, extensionsProp],`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-893 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 29-40 (`],`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-894 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:275`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 275-286 (`</>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-895 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:19`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.92. The likeliest place is lines 19-28 (`export const createRenderer =`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-896 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-897 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 80-87 (`export const Default: Story = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-898 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-899 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-900 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 440-451 (`const observer = new ResizeObserver((entries) => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-901 reactive-state-via-atom-bridge `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 452-463 (`useEffect(() => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-902 no-casts `packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 607-630 (`const texture = gl.createTexture()!;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-903 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 56-70 (`export const Default: Story = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-904 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 120-128 (`onPointerMove={onMove}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-905 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-906 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 228-239 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-907 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:413`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 413-436 (`const scroller = scrollerRef.current;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-908 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 162-173 (`useEffect(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-909 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/debug/Debug.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 52-63 (`const tick = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-910 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/debug/Debug.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 64-75 (`}`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-911 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 45-56 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-912 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-913 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.93. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-914 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 90-101 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-915 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 217-228 (`void (async () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-916 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 398-409 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-917 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:62`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 62-73 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-918 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-919 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-920 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-921 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-922 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:66`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 66-77 (`const current = value && !results.some((option) => option.value === value);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-923 no-casts `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 48-59 (`const DefaultStory = ({ display, ordered }: StoryArgs) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-924 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:72`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 72-83 (`const [activated, setActivated] = useState<string>();`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-925 comment-hygiene `packages/ui/react-ui-form/src/components/RefField.stories.tsx:118`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 118-129 (`await expect(within(popup).getAllByRole('option')).toHaveLength(OPTIONS.length);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-926 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-927 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-928 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-929 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 21-32 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-930 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 68-81 (`<div className='h-full aspect-square mx-auto'>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-931 no-casts `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 58-69 (`}, [orientation, rows, cols]);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-932 extract-non-rendering-logic-from-component `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 82-93 (`return Object.values(pieces)`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-933 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-934 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-935 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 60-75 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-936 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 124-135 (`queueMicrotask(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-937 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:256`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 256-267 (`{debug && (`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-938 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:321`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.81. The likeliest place is lines 321-332 (`<Toolbar.Root>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-939 extract-non-rendering-logic-from-component `packages/ui/react-ui-graph/src/components/SVG/FPS.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-940 no-casts `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 20-30 (`export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-941 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHie...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-942 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 207-218 (`nodeMerge`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-943 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 119-130 (`const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: Render...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-944 comment-hygiene `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:24`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 24-35 (`const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-945 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:36`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 36-47 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-946 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:219`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 219-230 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-947 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:231`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 231-236 (`<GridStory {...args} />`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-948 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 98-109 (`key={tool.title}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-949 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 67-79 (`<div className='font-mono text-xs text-info-text'>{name}</div>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-950 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 102-113 (`setFilter('');`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-951 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:192`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 192-203 (`<>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-952 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 74-85 (`setClient(next);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-953 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:110`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 110-122 (`const meta = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-954 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:150`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 150-161 (`const ScrollableStory = () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-955 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:113`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 113-127 (`const meta = {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-956 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:335`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 335-360 (`export const Multiline: Story = {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-957 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:520`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 520-567 (`useEffect(() => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-958 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-959 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 61-72 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-960 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 90-101 (`Tile={Tile!}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-961 no-casts `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`export const ToolForm = <S extends Schema.Codec<any, any>>({`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-962 no-casts `packages/ui/react-ui-menu/src/components/action-label.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 17-21 (`export const actionLabel = (action: Action, t: ThemeProvider.TFunction) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-963 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-30 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-964 leaf-owns-its-subscription `packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.81. The likeliest place is lines 89-100 (`return [...ordered, ...appended];`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-965 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 88-99 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-966 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:269`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 269-280 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-967 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 105-116 (`<Block.Block>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-968 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 173-184 (`if (!rootRef.current) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-969 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-970 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-971 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 255-266 (`: (index) => getId(visibleItems![index]),`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-972 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 177-188 (`const handleNativeDragStart = (event: DragEvent) => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-973 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 120-131 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-974 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 99-110 (`return (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-975 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 42-52 (`const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-976 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-977 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 85-96 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-978 structured-logging-not-console `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 117-128 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-979 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 117-128 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-980 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:502`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 502-515 (`const meta = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-981 extract-non-rendering-logic-from-component `packages/ui/react-ui-syntax-highlighter/src/Syntax/Syntax.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 88-99 (`);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-982 no-casts `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-36 (`const generator: ValueGenerator = random as any;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-983 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 97-108 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-984 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 119-130 (`if (!schema || !table?.view.target) {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-985 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 230-241 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-986 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 49-60 (`useEffect(() => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-987 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 43-68 (`export type TableChangeCallback<T extends TableRow> = {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-988 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-989 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-990 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 53-63 (`const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-991 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:146`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 146-157 (`against the content's edge is where the eye reads it, and a third track would...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-992 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:712`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 712-735 (`return (`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-993 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1195`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 1195-1215 (`throw new Error('Pull request pill not on a row.');`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-994 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1954`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1954-1977 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-995 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:495`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 495-519 (`<>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-996 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskListEditor.tsx:345`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 345-356 (`dragOver && 'ring-2 ring-inset ring-accent-bg',`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-997 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:418`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 418-429 (`>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-998 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 100-111 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-999 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1000 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 133-144 (`const bridge = new XtermBridge(xterm);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1001 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 74-85 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1002 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:314`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 314-328 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1003 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 341-358 (`type GanttLegendProps = Util.ThemedClassName<PropsWithChildren>;`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1004 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 359-382 (`key={lane.id}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1005 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 505-528 (`const element = viewportRef.current;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1006 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-1007 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 162-188 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1008 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 64-75 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1009 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 148-159 (`>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1010 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:228`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 228-239 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-1011 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 311-322 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1012 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 50-61 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1013 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1014 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1015 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui/src/exemplars/slot.stories.tsx:94`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.83. The likeliest place is lines 94-105 (`export const Inner: Story = {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 48b9fb002d-1016 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 108-119 (`const ScrollToolbar = ({`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1017 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 16-27 (`const ShowStory = () => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1018 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './flow/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1019 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 14-19 (`const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1020 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:132`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 132-143 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1021 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/AttentionGlyph/AttentionGlyph.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 20-31 (`const DefaultStory = ({ attended, containsAttended, syncing }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1022 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 28-39 (`const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: S...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1023 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Banner/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as Banner from './Banner.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1024 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1025 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 110-133 (`unmountOnExit = true,`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1026 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/ControlFrame/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as ControlFrame from './ControlFrame.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1027 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/DateInput/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as DateInput from './DateInput.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1028 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 116-122 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1029 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/DragHandle/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as DragHandle from './DragHandle.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1030 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 200-211 (`return (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1031 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 36-42 (`const DefaultStory = ({ title, message }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1032 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 44-55 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1033 event-handler-naming-convention `packages/ui/react-ui/src/next/components/Main/Main.tsx:532`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 532-543 (`const handleHandleKeyDown = useCallback(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1034 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/MediaPlayer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as MediaPlayer from './MediaPlayer.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1035 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 21-32 (`const DefaultStory = ({ fit, controls, muted, loop }: StoryArgs) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1036 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 102-111 (`const BlurStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1037 comment-hygiene `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:117`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 117-123 (`};`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1038 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 18-31 (`const DefaultStory = ({ value, indeterminate, error, countdown, paused }: Sto...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1039 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:32`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 32-50 (`const meta = {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1040 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 16-25 (`const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1041 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 78-89 (`const Strip = ({ prefix, ...props }: StripProps) => (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1042 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/ScrollContainer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as ScrollContainer from './ScrollContainer.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1043 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollContainer/ScrollContainer.stories.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 21-32 (`const DefaultStory = ({ pin }: StoryArgs) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1044 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1045 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Slider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Slider from './Slider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1046 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 20-26 (`const Pane = ({ label }: { label: string }) => (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1047 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 27-38 (`const DefaultStory = ({ defaultSize = 12, ...args }: StoryArgs) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1048 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 64-75 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1049 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/SystemButton/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as SystemButton from './SystemButton.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1050 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 43-54 (`<Button.Button`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1051 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:34`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 34-45 (`const DefaultStory = ({ live }: StoryArgs) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1052 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 53-67 (`const meta = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1053 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 24-35 (`const DefaultStory = ({ size, duration, title, description }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1054 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:215`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 215-226 (`() => () => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1055 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Toolbar/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Toolbar from './Toolbar.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1056 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Tour/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Tour from './Tour.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1057 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/components.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1058 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/testing/components.stories.tsx:101`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.97). Judged with added `imports, siblings` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1059 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1060 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:540`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 540-566 (`const SkeletonSection = () => (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1061 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1062 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-62 (`const layouts: Record<ContainerType, FC<ContainerProps>> = {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1063 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 63-70 (`column: ({ classNames, children }: ContainerProps) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1064 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`className={mx(`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1065 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 48b9fb002d-1066 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 54-63 (`))}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e36e44b0088c707d9a27fb4ccd4bfb757347e1c5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1066 violations written to fragments, 10001 uncertain, 84345 clean, 0 unanswered
- left for an agentic reviewer: 716 batch(es)

```text
requests: 38072 (7010 verdicts re-asked with context the model requested)
estimated input tokens: 239466473
billed input tokens: 224447231 (cost $9.4268)
measured chars per token: 3.20
```

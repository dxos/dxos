---
branch: HEAD
commit: bc2e11908241ede3a7da416f5dfed4a6c4c88551
base: 7fb4a257bc354f9b32ffb4c3f76accbd1451a32e
mode: fast
createdAt: 2026-10-03T12:59:20.714Z
isFinalized: true
groups: 7360
rules: [bounded-live-state, business-logic-out-of-ui, canonical-api-surface, collect-dead-entities, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, isolate-benchmark-setup-and-flaky-tests, key-chords-live-in-the-table, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, reactive-state-via-atom-bridge, schema-declare-and-brand, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: bc2e119082
---

_321 error(s), 828 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bc2e119082-1 - ignored - no-casts - packages/apps/composer-app/src/vite/trace-boot-leak.ts:65
- bc2e119082-2 - ignored - structured-logging-not-console - packages/apps/composer-app/src/vite/trace-boot-leak.ts:89
- bc2e119082-3 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:163
- bc2e119082-4 - ignored - error-messages-carry-context - packages/apps/composer-crx/src/core/image/image.ts:60
- bc2e119082-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- bc2e119082-6 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- bc2e119082-7 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- bc2e119082-8 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:34
- bc2e119082-9 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:68
- bc2e119082-10 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:80
- bc2e119082-11 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Main.tsx:85
- bc2e119082-12 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- bc2e119082-13 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:78
- bc2e119082-14 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:25
- bc2e119082-15 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/internal/index.ts:1
- bc2e119082-16 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:1
- bc2e119082-17 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- bc2e119082-18 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- bc2e119082-19 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:1
- bc2e119082-20 - ignored - structured-logging-not-console - packages/core/compute/agent-claude/src/Demo.test.ts:42
- bc2e119082-21 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- bc2e119082-22 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- bc2e119082-23 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- bc2e119082-24 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- bc2e119082-25 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203
- bc2e119082-26 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- bc2e119082-27 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- bc2e119082-28 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- bc2e119082-29 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- bc2e119082-30 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- bc2e119082-31 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- bc2e119082-32 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- bc2e119082-33 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:113
- bc2e119082-34 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- bc2e119082-35 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- bc2e119082-36 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- bc2e119082-37 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:77
- bc2e119082-38 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- bc2e119082-39 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- bc2e119082-40 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- bc2e119082-41 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79
- bc2e119082-42 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- bc2e119082-43 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- bc2e119082-44 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- bc2e119082-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426
- bc2e119082-46 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455
- bc2e119082-47 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- bc2e119082-48 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- bc2e119082-49 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- bc2e119082-50 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- bc2e119082-51 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- bc2e119082-52 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- bc2e119082-53 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- bc2e119082-54 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- bc2e119082-55 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- bc2e119082-56 - ignored - no-casts - packages/core/compute/compute-runtime/src/services/service-registry.ts:54
- bc2e119082-57 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- bc2e119082-58 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142
- bc2e119082-59 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- bc2e119082-60 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- bc2e119082-61 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- bc2e119082-62 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- bc2e119082-63 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:327
- bc2e119082-64 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.test.ts:68
- bc2e119082-65 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- bc2e119082-66 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- bc2e119082-67 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- bc2e119082-68 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:20
- bc2e119082-69 - ignored - no-casts - packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136
- bc2e119082-70 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73
- bc2e119082-71 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- bc2e119082-72 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- bc2e119082-73 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- bc2e119082-74 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- bc2e119082-75 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- bc2e119082-76 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- bc2e119082-77 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- bc2e119082-78 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- bc2e119082-79 - ignored - no-casts - packages/core/compute/operation/src/invoker.test.ts:23
- bc2e119082-80 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/invoker.test.ts:63
- bc2e119082-81 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- bc2e119082-82 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- bc2e119082-83 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- bc2e119082-84 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- bc2e119082-85 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- bc2e119082-86 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/pipeline.test.ts:13
- bc2e119082-87 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- bc2e119082-88 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- bc2e119082-89 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- bc2e119082-90 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- bc2e119082-91 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- bc2e119082-92 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116
- bc2e119082-93 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:131
- bc2e119082-94 - ignored - namespace-brand-key-prefixing - packages/core/compute/pipeline/src/Stage.test.ts:14
- bc2e119082-95 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- bc2e119082-96 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- bc2e119082-97 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75
- bc2e119082-98 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- bc2e119082-99 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- bc2e119082-100 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- bc2e119082-101 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- bc2e119082-102 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- bc2e119082-103 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- bc2e119082-104 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- bc2e119082-105 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- bc2e119082-106 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- bc2e119082-107 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- bc2e119082-108 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- bc2e119082-109 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- bc2e119082-110 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:860
- bc2e119082-111 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- bc2e119082-112 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- bc2e119082-113 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- bc2e119082-114 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- bc2e119082-115 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- bc2e119082-116 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- bc2e119082-117 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- bc2e119082-118 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- bc2e119082-119 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- bc2e119082-120 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- bc2e119082-121 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- bc2e119082-122 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- bc2e119082-123 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- bc2e119082-124 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- bc2e119082-125 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- bc2e119082-126 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- bc2e119082-127 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- bc2e119082-128 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- bc2e119082-129 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- bc2e119082-130 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- bc2e119082-131 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- bc2e119082-132 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46
- bc2e119082-133 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- bc2e119082-134 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- bc2e119082-135 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- bc2e119082-136 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- bc2e119082-137 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- bc2e119082-138 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Database.ts:583
- bc2e119082-139 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- bc2e119082-140 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- bc2e119082-141 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- bc2e119082-142 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- bc2e119082-143 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- bc2e119082-144 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- bc2e119082-145 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- bc2e119082-146 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- bc2e119082-147 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- bc2e119082-148 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- bc2e119082-149 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- bc2e119082-150 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- bc2e119082-151 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- bc2e119082-152 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- bc2e119082-153 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- bc2e119082-154 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- bc2e119082-155 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- bc2e119082-156 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- bc2e119082-157 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- bc2e119082-158 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- bc2e119082-159 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- bc2e119082-160 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- bc2e119082-161 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- bc2e119082-162 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- bc2e119082-163 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- bc2e119082-164 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- bc2e119082-165 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- bc2e119082-166 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- bc2e119082-167 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- bc2e119082-168 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- bc2e119082-169 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- bc2e119082-170 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/index-tracker.ts:79
- bc2e119082-171 - ignored - error-messages-carry-context - packages/core/mesh/edge-client/src/edge-http-client.ts:157
- bc2e119082-172 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:481
- bc2e119082-173 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- bc2e119082-174 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- bc2e119082-175 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- bc2e119082-176 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- bc2e119082-177 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- bc2e119082-178 - ignored - no-casts - packages/devtools/cli/src/bin.ts:239
- bc2e119082-179 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:239
- bc2e119082-180 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- bc2e119082-181 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/components/ControlledSelector.tsx:9
- bc2e119082-182 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:132
- bc2e119082-183 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:37
- bc2e119082-184 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:22
- bc2e119082-185 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:30
- bc2e119082-186 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84
- bc2e119082-187 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113
- bc2e119082-188 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46
- bc2e119082-189 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78
- bc2e119082-190 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:46
- bc2e119082-191 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89
- bc2e119082-192 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- bc2e119082-193 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39
- bc2e119082-194 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60
- bc2e119082-195 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:133
- bc2e119082-196 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100
- bc2e119082-197 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214
- bc2e119082-198 - ignored - no-casts - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118
- bc2e119082-199 - ignored - error-messages-carry-context - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130
- bc2e119082-200 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- bc2e119082-201 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:41
- bc2e119082-202 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123
- bc2e119082-203 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:378
- bc2e119082-204 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- bc2e119082-205 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- bc2e119082-206 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:44
- bc2e119082-207 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:613
- bc2e119082-208 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- bc2e119082-209 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193
- bc2e119082-210 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117
- bc2e119082-211 - ignored - no-invented-theme-tokens - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:95
- bc2e119082-212 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:51
- bc2e119082-213 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53
- bc2e119082-214 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113
- bc2e119082-215 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- bc2e119082-216 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131
- bc2e119082-217 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:66
- bc2e119082-218 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- bc2e119082-219 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:142
- bc2e119082-220 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:154
- bc2e119082-221 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:287
- bc2e119082-222 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:109
- bc2e119082-223 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- bc2e119082-224 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- bc2e119082-225 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- bc2e119082-226 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131
- bc2e119082-227 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- bc2e119082-228 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- bc2e119082-229 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:144
- bc2e119082-230 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- bc2e119082-231 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- bc2e119082-232 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99
- bc2e119082-233 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:279
- bc2e119082-234 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:111
- bc2e119082-235 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:134
- bc2e119082-236 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121
- bc2e119082-237 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:205
- bc2e119082-238 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:89
- bc2e119082-239 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:185
- bc2e119082-240 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- bc2e119082-241 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- bc2e119082-242 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- bc2e119082-243 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- bc2e119082-244 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- bc2e119082-245 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- bc2e119082-246 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44
- bc2e119082-247 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- bc2e119082-248 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61
- bc2e119082-249 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109
- bc2e119082-250 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:133
- bc2e119082-251 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31
- bc2e119082-252 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55
- bc2e119082-253 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94
- bc2e119082-254 - ignored - no-casts - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34
- bc2e119082-255 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46
- bc2e119082-256 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20
- bc2e119082-257 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- bc2e119082-258 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108
- bc2e119082-259 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- bc2e119082-260 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96
- bc2e119082-261 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44
- bc2e119082-262 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:65
- bc2e119082-263 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:77
- bc2e119082-264 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- bc2e119082-265 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:72
- bc2e119082-266 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:96
- bc2e119082-267 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- bc2e119082-268 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-claude/src/index.ts:1
- bc2e119082-269 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- bc2e119082-270 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58
- bc2e119082-271 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- bc2e119082-272 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- bc2e119082-273 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48
- bc2e119082-274 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96
- bc2e119082-275 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:93
- bc2e119082-276 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:257
- bc2e119082-277 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47
- bc2e119082-278 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:35
- bc2e119082-279 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47
- bc2e119082-280 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41
- bc2e119082-281 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/schema-defs.test.ts:39
- bc2e119082-282 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- bc2e119082-283 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:74
- bc2e119082-284 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67
- bc2e119082-285 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102
- bc2e119082-286 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:190
- bc2e119082-287 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18
- bc2e119082-288 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79
- bc2e119082-289 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130
- bc2e119082-290 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- bc2e119082-291 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- bc2e119082-292 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- bc2e119082-293 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- bc2e119082-294 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- bc2e119082-295 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62
- bc2e119082-296 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- bc2e119082-297 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66
- bc2e119082-298 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:71
- bc2e119082-299 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm-project.ts:59
- bc2e119082-300 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm.ts:25
- bc2e119082-301 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54
- bc2e119082-302 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- bc2e119082-303 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75
- bc2e119082-304 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- bc2e119082-305 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx:26
- bc2e119082-306 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:64
- bc2e119082-307 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70
- bc2e119082-308 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82
- bc2e119082-309 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- bc2e119082-310 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- bc2e119082-311 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- bc2e119082-312 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49
- bc2e119082-313 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:61
- bc2e119082-314 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:181
- bc2e119082-315 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- bc2e119082-316 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- bc2e119082-317 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- bc2e119082-318 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45
- bc2e119082-319 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:49
- bc2e119082-320 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:137
- bc2e119082-321 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:24
- bc2e119082-322 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- bc2e119082-323 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- bc2e119082-324 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30
- bc2e119082-325 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188
- bc2e119082-326 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- bc2e119082-327 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83
- bc2e119082-328 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:169
- bc2e119082-329 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:46
- bc2e119082-330 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- bc2e119082-331 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39
- bc2e119082-332 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- bc2e119082-333 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- bc2e119082-334 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- bc2e119082-335 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32
- bc2e119082-336 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55
- bc2e119082-337 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67
- bc2e119082-338 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157
- bc2e119082-339 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- bc2e119082-340 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- bc2e119082-341 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- bc2e119082-342 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- bc2e119082-343 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- bc2e119082-344 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- bc2e119082-345 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- bc2e119082-346 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111
- bc2e119082-347 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- bc2e119082-348 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- bc2e119082-349 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- bc2e119082-350 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- bc2e119082-351 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:97
- bc2e119082-352 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297
- bc2e119082-353 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- bc2e119082-354 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:109
- bc2e119082-355 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278
- bc2e119082-356 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- bc2e119082-357 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:44
- bc2e119082-358 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:80
- bc2e119082-359 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- bc2e119082-360 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- bc2e119082-361 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- bc2e119082-362 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:91
- bc2e119082-363 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:91
- bc2e119082-364 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- bc2e119082-365 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- bc2e119082-366 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:91
- bc2e119082-367 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- bc2e119082-368 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- bc2e119082-369 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- bc2e119082-370 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- bc2e119082-371 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78
- bc2e119082-372 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- bc2e119082-373 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:138
- bc2e119082-374 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:162
- bc2e119082-375 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95
- bc2e119082-376 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:181
- bc2e119082-377 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74
- bc2e119082-378 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- bc2e119082-379 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- bc2e119082-380 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- bc2e119082-381 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297
- bc2e119082-382 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:428
- bc2e119082-383 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:171
- bc2e119082-384 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:207
- bc2e119082-385 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:86
- bc2e119082-386 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:114
- bc2e119082-387 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- bc2e119082-388 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:299
- bc2e119082-389 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- bc2e119082-390 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- bc2e119082-391 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- bc2e119082-392 - ignored - error-messages-carry-context - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.stories.tsx:292
- bc2e119082-393 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:240
- bc2e119082-394 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- bc2e119082-395 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:31
- bc2e119082-396 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:175
- bc2e119082-397 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-inbox/src/index.ts:1
- bc2e119082-398 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- bc2e119082-399 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:66
- bc2e119082-400 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- bc2e119082-401 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- bc2e119082-402 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- bc2e119082-403 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:36
- bc2e119082-404 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- bc2e119082-405 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- bc2e119082-406 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/templates/analyze-mailbox.ts:33
- bc2e119082-407 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- bc2e119082-408 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- bc2e119082-409 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- bc2e119082-410 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- bc2e119082-411 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:53
- bc2e119082-412 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77
- bc2e119082-413 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77
- bc2e119082-414 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32
- bc2e119082-415 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60
- bc2e119082-416 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- bc2e119082-417 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- bc2e119082-418 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88
- bc2e119082-419 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124
- bc2e119082-420 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- bc2e119082-421 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- bc2e119082-422 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87
- bc2e119082-423 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- bc2e119082-424 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:39
- bc2e119082-425 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- bc2e119082-426 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:150
- bc2e119082-427 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109
- bc2e119082-428 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:145
- bc2e119082-429 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- bc2e119082-430 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- bc2e119082-431 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-linear/src/operations/sync.test.ts:48
- bc2e119082-432 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28
- bc2e119082-433 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74
- bc2e119082-434 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36
- bc2e119082-435 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110
- bc2e119082-436 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77
- bc2e119082-437 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:74
- bc2e119082-438 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- bc2e119082-439 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:86
- bc2e119082-440 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:75
- bc2e119082-441 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:99
- bc2e119082-442 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28
- bc2e119082-443 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- bc2e119082-444 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- bc2e119082-445 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76
- bc2e119082-446 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-map/src/index.ts:1
- bc2e119082-447 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- bc2e119082-448 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188
- bc2e119082-449 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:120
- bc2e119082-450 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:336
- bc2e119082-451 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- bc2e119082-452 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- bc2e119082-453 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- bc2e119082-454 - ignored - test-asserts-real-behavior - packages/plugins/plugin-markdown/src/plugin.test.ts:15
- bc2e119082-455 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- bc2e119082-456 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59
- bc2e119082-457 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71
- bc2e119082-458 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- bc2e119082-459 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- bc2e119082-460 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- bc2e119082-461 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- bc2e119082-462 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- bc2e119082-463 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.stories.tsx:68
- bc2e119082-464 - ignored - comment-hygiene - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23
- bc2e119082-465 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132
- bc2e119082-466 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:48
- bc2e119082-467 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:88
- bc2e119082-468 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:100
- bc2e119082-469 - ignored - structured-logging-not-console - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27
- bc2e119082-470 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:128
- bc2e119082-471 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190
- bc2e119082-472 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:238
- bc2e119082-473 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:96
- bc2e119082-474 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:151
- bc2e119082-475 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:23
- bc2e119082-476 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41
- bc2e119082-477 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313
- bc2e119082-478 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88
- bc2e119082-479 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:190
- bc2e119082-480 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216
- bc2e119082-481 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128
- bc2e119082-482 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- bc2e119082-483 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82
- bc2e119082-484 - ignored - no-casts - packages/plugins/plugin-observability/src/plugin.test.ts:14
- bc2e119082-485 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- bc2e119082-486 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69
- bc2e119082-487 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22
- bc2e119082-488 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16
- bc2e119082-489 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:36
- bc2e119082-490 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:158
- bc2e119082-491 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:374
- bc2e119082-492 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:870
- bc2e119082-493 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- bc2e119082-494 - ignored - inline-obj-parent - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65
- bc2e119082-495 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101
- bc2e119082-496 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:47
- bc2e119082-497 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:84
- bc2e119082-498 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:109
- bc2e119082-499 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- bc2e119082-500 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16
- bc2e119082-501 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78
- bc2e119082-502 - ignored - no-casts - packages/plugins/plugin-presenter/src/useExitPresenter.ts:16
- bc2e119082-503 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- bc2e119082-504 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- bc2e119082-505 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- bc2e119082-506 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/FormCard.tsx:1
- bc2e119082-507 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- bc2e119082-508 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- bc2e119082-509 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:35
- bc2e119082-510 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- bc2e119082-511 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- bc2e119082-512 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130
- bc2e119082-513 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109
- bc2e119082-514 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81
- bc2e119082-515 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/templates/inbox-research.ts:55
- bc2e119082-516 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- bc2e119082-517 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- bc2e119082-518 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- bc2e119082-519 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:107
- bc2e119082-520 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:155
- bc2e119082-521 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:180
- bc2e119082-522 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55
- bc2e119082-523 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55
- bc2e119082-524 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:138
- bc2e119082-525 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:150
- bc2e119082-526 - ignored - no-casts - packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:32
- bc2e119082-527 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- bc2e119082-528 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- bc2e119082-529 - ignored - no-casts - packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41
- bc2e119082-530 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138
- bc2e119082-531 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47
- bc2e119082-532 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35
- bc2e119082-533 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:104
- bc2e119082-534 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- bc2e119082-535 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456
- bc2e119082-536 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226
- bc2e119082-537 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- bc2e119082-538 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- bc2e119082-539 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- bc2e119082-540 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:39
- bc2e119082-541 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:265
- bc2e119082-542 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:378
- bc2e119082-543 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60
- bc2e119082-544 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60
- bc2e119082-545 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:188
- bc2e119082-546 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42
- bc2e119082-547 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309
- bc2e119082-548 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164
- bc2e119082-549 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx:32
- bc2e119082-550 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- bc2e119082-551 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- bc2e119082-552 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- bc2e119082-553 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- bc2e119082-554 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38
- bc2e119082-555 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62
- bc2e119082-556 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:106
- bc2e119082-557 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74
- bc2e119082-558 - ignored - no-sleep-in-test - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226
- bc2e119082-559 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:84
- bc2e119082-560 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- bc2e119082-561 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141
- bc2e119082-562 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:134
- bc2e119082-563 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:71
- bc2e119082-564 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92
- bc2e119082-565 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:78
- bc2e119082-566 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- bc2e119082-567 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- bc2e119082-568 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- bc2e119082-569 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188
- bc2e119082-570 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40
- bc2e119082-571 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:36
- bc2e119082-572 - ignored - no-casts - packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40
- bc2e119082-573 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60
- bc2e119082-574 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- bc2e119082-575 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- bc2e119082-576 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:59
- bc2e119082-577 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- bc2e119082-578 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81
- bc2e119082-579 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87
- bc2e119082-580 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:303
- bc2e119082-581 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471
- bc2e119082-582 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:27
- bc2e119082-583 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:39
- bc2e119082-584 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:75
- bc2e119082-585 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23
- bc2e119082-586 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270
- bc2e119082-587 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42
- bc2e119082-588 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- bc2e119082-589 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- bc2e119082-590 - ignored - comment-hygiene - packages/plugins/plugin-sheet/src/translations.ts:47
- bc2e119082-591 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:22
- bc2e119082-592 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- bc2e119082-593 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- bc2e119082-594 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- bc2e119082-595 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- bc2e119082-596 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- bc2e119082-597 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- bc2e119082-598 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250
- bc2e119082-599 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/ForeignKeys/ForeignKeys.tsx:37
- bc2e119082-600 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50
- bc2e119082-601 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:114
- bc2e119082-602 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:98
- bc2e119082-603 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- bc2e119082-604 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- bc2e119082-605 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40
- bc2e119082-606 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:264
- bc2e119082-607 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- bc2e119082-608 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:239
- bc2e119082-609 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:51
- bc2e119082-610 - ignored - comment-hygiene - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:55
- bc2e119082-611 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:227
- bc2e119082-612 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:79
- bc2e119082-613 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- bc2e119082-614 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- bc2e119082-615 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- bc2e119082-616 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60
- bc2e119082-617 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:205
- bc2e119082-618 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:182
- bc2e119082-619 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:229
- bc2e119082-620 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32
- bc2e119082-621 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- bc2e119082-622 - ignored - comment-hygiene - packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13
- bc2e119082-623 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- bc2e119082-624 - ignored - options-object-with-defaults - packages/plugins/plugin-stream-deck/src/render/frame.ts:27
- bc2e119082-625 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:88
- bc2e119082-626 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:100
- bc2e119082-627 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:44
- bc2e119082-628 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:35
- bc2e119082-629 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58
- bc2e119082-630 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:118
- bc2e119082-631 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:77
- bc2e119082-632 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:113
- bc2e119082-633 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45
- bc2e119082-634 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-studio/src/index.ts:1
- bc2e119082-635 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- bc2e119082-636 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- bc2e119082-637 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:65
- bc2e119082-638 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137
- bc2e119082-639 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113
- bc2e119082-640 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:149
- bc2e119082-641 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15
- bc2e119082-642 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:39
- bc2e119082-643 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- bc2e119082-644 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- bc2e119082-645 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- bc2e119082-646 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60
- bc2e119082-647 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:58
- bc2e119082-648 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:94
- bc2e119082-649 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:36
- bc2e119082-650 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:13
- bc2e119082-651 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- bc2e119082-652 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-table/src/index.ts:1
- bc2e119082-653 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69
- bc2e119082-654 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125
- bc2e119082-655 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:21
- bc2e119082-656 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61
- bc2e119082-657 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:87
- bc2e119082-658 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40
- bc2e119082-659 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59
- bc2e119082-660 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:204
- bc2e119082-661 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- bc2e119082-662 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78
- bc2e119082-663 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330
- bc2e119082-664 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- bc2e119082-665 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- bc2e119082-666 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107
- bc2e119082-667 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86
- bc2e119082-668 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- bc2e119082-669 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247
- bc2e119082-670 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- bc2e119082-671 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:135
- bc2e119082-672 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- bc2e119082-673 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- bc2e119082-674 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- bc2e119082-675 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- bc2e119082-676 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253
- bc2e119082-677 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- bc2e119082-678 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116
- bc2e119082-679 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:153
- bc2e119082-680 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- bc2e119082-681 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- bc2e119082-682 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- bc2e119082-683 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139
- bc2e119082-684 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- bc2e119082-685 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- bc2e119082-686 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- bc2e119082-687 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- bc2e119082-688 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:57
- bc2e119082-689 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:41
- bc2e119082-690 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- bc2e119082-691 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- bc2e119082-692 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- bc2e119082-693 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56
- bc2e119082-694 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- bc2e119082-695 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- bc2e119082-696 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- bc2e119082-697 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:70
- bc2e119082-698 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:154
- bc2e119082-699 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:232
- bc2e119082-700 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- bc2e119082-701 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- bc2e119082-702 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- bc2e119082-703 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- bc2e119082-704 - ignored - bounded-live-state - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:78
- bc2e119082-705 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- bc2e119082-706 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- bc2e119082-707 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:61
- bc2e119082-708 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- bc2e119082-709 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- bc2e119082-710 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- bc2e119082-711 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- bc2e119082-712 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351
- bc2e119082-713 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82
- bc2e119082-714 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- bc2e119082-715 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- bc2e119082-716 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.test.ts:459
- bc2e119082-717 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- bc2e119082-718 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- bc2e119082-719 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- bc2e119082-720 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- bc2e119082-721 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:227
- bc2e119082-722 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-solid/src/index.ts:1
- bc2e119082-723 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- bc2e119082-724 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206
- bc2e119082-725 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- bc2e119082-726 - ignored - declare-optional-services-with-noop-layers - packages/sdk/app-toolkit/src/types/DefaultParent.ts:24
- bc2e119082-727 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324
- bc2e119082-728 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- bc2e119082-729 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:396
- bc2e119082-730 - ignored - no-sleep-in-test - packages/sdk/client-e2e/src/spaces.test.ts:65
- bc2e119082-731 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- bc2e119082-732 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- bc2e119082-733 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- bc2e119082-734 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- bc2e119082-735 - ignored - test-asserts-real-behavior - packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33
- bc2e119082-736 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- bc2e119082-737 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- bc2e119082-738 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- bc2e119082-739 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- bc2e119082-740 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- bc2e119082-741 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- bc2e119082-742 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/spaces.ts:73
- bc2e119082-743 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- bc2e119082-744 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- bc2e119082-745 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- bc2e119082-746 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- bc2e119082-747 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- bc2e119082-748 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- bc2e119082-749 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- bc2e119082-750 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- bc2e119082-751 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- bc2e119082-752 - ignored - no-casts - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137
- bc2e119082-753 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- bc2e119082-754 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- bc2e119082-755 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25
- bc2e119082-756 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- bc2e119082-757 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- bc2e119082-758 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- bc2e119082-759 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- bc2e119082-760 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- bc2e119082-761 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- bc2e119082-762 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- bc2e119082-763 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- bc2e119082-764 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- bc2e119082-765 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- bc2e119082-766 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- bc2e119082-767 - ignored - no-casts - packages/sdk/client-services/src/internal/space/space-manager.ts:181
- bc2e119082-768 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- bc2e119082-769 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- bc2e119082-770 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- bc2e119082-771 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- bc2e119082-772 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- bc2e119082-773 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- bc2e119082-774 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- bc2e119082-775 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- bc2e119082-776 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- bc2e119082-777 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- bc2e119082-778 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:211
- bc2e119082-779 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/testing/test-worker-factory.ts:70
- bc2e119082-780 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- bc2e119082-781 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- bc2e119082-782 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/observability/src/ai/AiObservability.test.ts:372
- bc2e119082-783 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- bc2e119082-784 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- bc2e119082-785 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- bc2e119082-786 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- bc2e119082-787 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- bc2e119082-788 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- bc2e119082-789 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- bc2e119082-790 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- bc2e119082-791 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- bc2e119082-792 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- bc2e119082-793 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- bc2e119082-794 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- bc2e119082-795 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- bc2e119082-796 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- bc2e119082-797 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- bc2e119082-798 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- bc2e119082-799 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- bc2e119082-800 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- bc2e119082-801 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- bc2e119082-802 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- bc2e119082-803 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- bc2e119082-804 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- bc2e119082-805 - ignored - comment-hygiene - packages/sdk/shell/src/components/Panel/Action.tsx:106
- bc2e119082-806 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:34
- bc2e119082-807 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- bc2e119082-808 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- bc2e119082-809 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- bc2e119082-810 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- bc2e119082-811 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- bc2e119082-812 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- bc2e119082-813 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169
- bc2e119082-814 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70
- bc2e119082-815 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- bc2e119082-816 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134
- bc2e119082-817 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- bc2e119082-818 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- bc2e119082-819 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- bc2e119082-820 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- bc2e119082-821 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- bc2e119082-822 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- bc2e119082-823 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- bc2e119082-824 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- bc2e119082-825 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- bc2e119082-826 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112
- bc2e119082-827 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/storybook-testing/src/test/startup.test.ts:73
- bc2e119082-828 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:77
- bc2e119082-829 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:173
- bc2e119082-830 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:226
- bc2e119082-831 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- bc2e119082-832 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:29
- bc2e119082-833 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- bc2e119082-834 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:153
- bc2e119082-835 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:370
- bc2e119082-836 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97
- bc2e119082-837 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- bc2e119082-838 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346
- bc2e119082-839 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153
- bc2e119082-840 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:143
- bc2e119082-841 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- bc2e119082-842 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156
- bc2e119082-843 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246
- bc2e119082-844 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- bc2e119082-845 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- bc2e119082-846 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- bc2e119082-847 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:163
- bc2e119082-848 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:190
- bc2e119082-849 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- bc2e119082-850 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- bc2e119082-851 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88
- bc2e119082-852 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124
- bc2e119082-853 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- bc2e119082-854 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- bc2e119082-855 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- bc2e119082-856 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- bc2e119082-857 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76
- bc2e119082-858 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- bc2e119082-859 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- bc2e119082-860 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- bc2e119082-861 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50
- bc2e119082-862 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15
- bc2e119082-863 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- bc2e119082-864 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57
- bc2e119082-865 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28
- bc2e119082-866 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- bc2e119082-867 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- bc2e119082-868 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:43
- bc2e119082-869 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24
- bc2e119082-870 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- bc2e119082-871 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- bc2e119082-872 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- bc2e119082-873 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57
- bc2e119082-874 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120
- bc2e119082-875 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- bc2e119082-876 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82
- bc2e119082-877 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106
- bc2e119082-878 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194
- bc2e119082-879 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- bc2e119082-880 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- bc2e119082-881 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:222
- bc2e119082-882 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:346
- bc2e119082-883 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:42
- bc2e119082-884 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16
- bc2e119082-885 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:105
- bc2e119082-886 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114
- bc2e119082-887 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161
- bc2e119082-888 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240
- bc2e119082-889 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14
- bc2e119082-890 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- bc2e119082-891 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- bc2e119082-892 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- bc2e119082-893 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- bc2e119082-894 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169
- bc2e119082-895 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40
- bc2e119082-896 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14
- bc2e119082-897 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:15
- bc2e119082-898 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27
- bc2e119082-899 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:270
- bc2e119082-900 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:127
- bc2e119082-901 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:290
- bc2e119082-902 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:491
- bc2e119082-903 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95
- bc2e119082-904 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- bc2e119082-905 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:93
- bc2e119082-906 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:281
- bc2e119082-907 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83
- bc2e119082-908 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- bc2e119082-909 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:61
- bc2e119082-910 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- bc2e119082-911 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:278
- bc2e119082-912 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:20
- bc2e119082-913 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- bc2e119082-914 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- bc2e119082-915 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- bc2e119082-916 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440
- bc2e119082-917 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452
- bc2e119082-918 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:1217
- bc2e119082-919 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56
- bc2e119082-920 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120
- bc2e119082-921 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- bc2e119082-922 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228
- bc2e119082-923 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:410
- bc2e119082-924 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162
- bc2e119082-925 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/debug/Debug.tsx:52
- bc2e119082-926 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/debug/Debug.tsx:64
- bc2e119082-927 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45
- bc2e119082-928 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- bc2e119082-929 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- bc2e119082-930 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:83
- bc2e119082-931 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:204
- bc2e119082-932 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:398
- bc2e119082-933 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/scenarios.tsx:421
- bc2e119082-934 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:62
- bc2e119082-935 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- bc2e119082-936 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- bc2e119082-937 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- bc2e119082-938 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49
- bc2e119082-939 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Card.stories.tsx:76
- bc2e119082-940 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111
- bc2e119082-941 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188
- bc2e119082-942 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218
- bc2e119082-943 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254
- bc2e119082-944 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18
- bc2e119082-945 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.tsx:98
- bc2e119082-946 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.tsx:53
- bc2e119082-947 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.stories.tsx:64
- bc2e119082-948 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:52
- bc2e119082-949 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:119
- bc2e119082-950 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:99
- bc2e119082-951 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:31
- bc2e119082-952 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:192
- bc2e119082-953 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx:155
- bc2e119082-954 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:434
- bc2e119082-955 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:157
- bc2e119082-956 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87
- bc2e119082-957 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:135
- bc2e119082-958 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:213
- bc2e119082-959 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37
- bc2e119082-960 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37
- bc2e119082-961 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.stories.tsx:116
- bc2e119082-962 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:81
- bc2e119082-963 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60
- bc2e119082-964 - ignored - structured-logging-not-console - packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60
- bc2e119082-965 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:59
- bc2e119082-966 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63
- bc2e119082-967 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:48
- bc2e119082-968 - ignored - no-invented-theme-tokens - packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:172
- bc2e119082-969 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:112
- bc2e119082-970 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:280
- bc2e119082-971 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:99
- bc2e119082-972 - ignored - no-casts - packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:200
- bc2e119082-973 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- bc2e119082-974 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- bc2e119082-975 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- bc2e119082-976 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21
- bc2e119082-977 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68
- bc2e119082-978 - ignored - no-casts - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58
- bc2e119082-979 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92
- bc2e119082-980 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- bc2e119082-981 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- bc2e119082-982 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:59
- bc2e119082-983 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:123
- bc2e119082-984 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:207
- bc2e119082-985 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-graph/src/components/SVG/Root.tsx:43
- bc2e119082-986 - ignored - no-casts - packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20
- bc2e119082-987 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116
- bc2e119082-988 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207
- bc2e119082-989 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119
- bc2e119082-990 - ignored - comment-hygiene - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23
- bc2e119082-991 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35
- bc2e119082-992 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:225
- bc2e119082-993 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98
- bc2e119082-994 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:55
- bc2e119082-995 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:114
- bc2e119082-996 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74
- bc2e119082-997 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:58
- bc2e119082-998 - ignored - no-casts - packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:223
- bc2e119082-999 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Listbox/ListItemContent.stories.tsx:13
- bc2e119082-1000 - ignored - no-casts - packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:20
- bc2e119082-1001 - ignored - no-casts - packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:19
- bc2e119082-1002 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:115
- bc2e119082-1003 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293
- bc2e119082-1004 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711
- bc2e119082-1005 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:359
- bc2e119082-1006 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:912
- bc2e119082-1007 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1068
- bc2e119082-1008 - ignored - no-casts - packages/ui/react-ui-list/src/next/Tree/Tree.tsx:54
- bc2e119082-1009 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- bc2e119082-1010 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61
- bc2e119082-1011 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:88
- bc2e119082-1012 - ignored - no-casts - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- bc2e119082-1013 - ignored - no-casts - packages/ui/react-ui-menu/src/components/action-label.ts:17
- bc2e119082-1014 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20
- bc2e119082-1015 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:108
- bc2e119082-1016 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:87
- bc2e119082-1017 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268
- bc2e119082-1018 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:103
- bc2e119082-1019 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173
- bc2e119082-1020 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- bc2e119082-1021 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- bc2e119082-1022 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255
- bc2e119082-1023 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177
- bc2e119082-1024 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:119
- bc2e119082-1025 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:101
- bc2e119082-1026 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40
- bc2e119082-1027 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- bc2e119082-1028 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:84
- bc2e119082-1029 - ignored - structured-logging-not-console - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115
- bc2e119082-1030 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115
- bc2e119082-1031 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:500
- bc2e119082-1032 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31
- bc2e119082-1033 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97
- bc2e119082-1034 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118
- bc2e119082-1035 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:229
- bc2e119082-1036 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:48
- bc2e119082-1037 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- bc2e119082-1038 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- bc2e119082-1039 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- bc2e119082-1040 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53
- bc2e119082-1041 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:133
- bc2e119082-1042 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:713
- bc2e119082-1043 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970
- bc2e119082-1044 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:497
- bc2e119082-1045 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:435
- bc2e119082-1046 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:99
- bc2e119082-1047 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- bc2e119082-1048 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133
- bc2e119082-1049 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:75
- bc2e119082-1050 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:315
- bc2e119082-1051 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341
- bc2e119082-1052 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359
- bc2e119082-1053 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505
- bc2e119082-1054 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184
- bc2e119082-1055 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- bc2e119082-1056 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162
- bc2e119082-1057 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:100
- bc2e119082-1058 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:148
- bc2e119082-1059 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:228
- bc2e119082-1060 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:311
- bc2e119082-1061 - ignored - no-casts - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:30
- bc2e119082-1062 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:77
- bc2e119082-1063 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.tsx:89
- bc2e119082-1064 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/AttentionGlyph/index.ts:1
- bc2e119082-1065 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:78
- bc2e119082-1066 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24
- bc2e119082-1067 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24
- bc2e119082-1068 - ignored - no-casts - packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:44
- bc2e119082-1069 - ignored - no-casts - packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx:42
- bc2e119082-1070 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Button/Button.stories.tsx:13
- bc2e119082-1071 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:18
- bc2e119082-1072 - ignored - no-casts - packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:135
- bc2e119082-1073 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui/src/components/Button/IconButton.tsx:15
- bc2e119082-1074 - ignored - structured-logging-not-console - packages/ui/react-ui/src/components/Card/Card.stories.tsx:24
- bc2e119082-1075 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Card/Card.stories.tsx:59
- bc2e119082-1076 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx:23
- bc2e119082-1077 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx:48
- bc2e119082-1078 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Column/Column.stories.tsx:75
- bc2e119082-1079 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Column/Column.stories.tsx:90
- bc2e119082-1080 - ignored - no-invented-theme-tokens - packages/ui/react-ui/src/components/Column/Column.stories.tsx:200
- bc2e119082-1081 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/DatePicker/index.ts:1
- bc2e119082-1082 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:51
- bc2e119082-1083 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103
- bc2e119082-1084 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Drawer/Drawer.stories.tsx:41
- bc2e119082-1085 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:38
- bc2e119082-1086 - ignored - no-casts - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:35
- bc2e119082-1087 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.tsx:22
- bc2e119082-1088 - ignored - no-casts - packages/ui/react-ui/src/components/Field/Field.stories.tsx:142
- bc2e119082-1089 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Field/Field.stories.tsx:231
- bc2e119082-1090 - ignored - themed-primitives-take-classNames - packages/ui/react-ui/src/components/Field/PinInput.tsx:24
- bc2e119082-1091 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Field/PinInput.tsx:55
- bc2e119082-1092 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Field/SegmentedInput.tsx:80
- bc2e119082-1093 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx:30
- bc2e119082-1094 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Focus/Focus.stories.tsx:26
- bc2e119082-1095 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx:15
- bc2e119082-1096 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Icon/Icon.stories.tsx:88
- bc2e119082-1097 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Image/Image.stories.tsx:69
- bc2e119082-1098 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Main/Main.stories.tsx:76
- bc2e119082-1099 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/components/Main/Main.tsx:54
- bc2e119082-1100 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Menu/Menu.stories.tsx:210
- bc2e119082-1101 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/MenuButton/MenuButton.stories.tsx:39
- bc2e119082-1102 - ignored - no-hand-rolled-lists - packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:17
- bc2e119082-1103 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:102
- bc2e119082-1104 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:122
- bc2e119082-1105 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:153
- bc2e119082-1106 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:130
- bc2e119082-1107 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:47
- bc2e119082-1108 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:142
- bc2e119082-1109 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/ScrollArea/ScrollAreaThumbs.tsx:1
- bc2e119082-1110 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/ScrollContainer/index.ts:1
- bc2e119082-1111 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Select/Select.stories.tsx:57
- bc2e119082-1112 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Separator/index.ts:1
- bc2e119082-1113 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19
- bc2e119082-1114 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19
- bc2e119082-1115 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Slider/Slider.stories.tsx:84
- bc2e119082-1116 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:181
- bc2e119082-1117 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/TextCrawl/index.ts:1
- bc2e119082-1118 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:35
- bc2e119082-1119 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:52
- bc2e119082-1120 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:28
- bc2e119082-1121 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Toast/Toast.tsx:186
- bc2e119082-1122 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Toc/index.ts:1
- bc2e119082-1123 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Toolbar/index.ts:1
- bc2e119082-1124 - ignored - no-casts - packages/ui/react-ui/src/components/Toolbar/Toolbar.stories.tsx:69
- bc2e119082-1125 - ignored - no-casts - packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:40
- bc2e119082-1126 - ignored - no-casts - packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:55
- bc2e119082-1127 - ignored - no-sleep-in-test - packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:79
- bc2e119082-1128 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Tooltip/Tooltip.tsx:184
- bc2e119082-1129 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Tour/Tour.stories.tsx:98
- bc2e119082-1130 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:48
- bc2e119082-1131 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:107
- bc2e119082-1132 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:119
- bc2e119082-1133 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- bc2e119082-1134 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- bc2e119082-1135 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Container/Container.stories.tsx:11
- bc2e119082-1136 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14
- bc2e119082-1137 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:61
- bc2e119082-1138 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/layout/Flex/index.ts:1
- bc2e119082-1139 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/layout/Grid/index.ts:1
- bc2e119082-1140 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/playground/Elevation.stories.tsx:50
- bc2e119082-1141 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:116
- bc2e119082-1142 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/DensityProvider/index.ts:1
- bc2e119082-1143 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/providers/ElevationProvider/index.ts:1
- bc2e119082-1144 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- bc2e119082-1145 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51
- bc2e119082-1146 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63
- bc2e119082-1147 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- bc2e119082-1148 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- bc2e119082-1149 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# ERROR bc2e119082-1 no-casts `packages/apps/composer-app/src/vite/trace-boot-leak.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 65-76 (`while (queue.length > 0) {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-2 structured-logging-not-console `packages/apps/composer-app/src/vite/trace-boot-leak.ts:89`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 89-100 (`const path: string[] = [];`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-3 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:163`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 163-174 (`context.push(`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-4 error-messages-carry-context `packages/apps/composer-crx/src/core/image/image.ts:60`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 60-71 (`const contentType =`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-6 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-7 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-8 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:34`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 34-47 (`)}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-9 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:68`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.87. The likeliest place is lines 68-79 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-10 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`</Field.Root>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-11 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Main.tsx:85`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 85-96 (`setSpace(space);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-12 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-13 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:78`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 78-89 (`multiUse: true,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-14 moon-yml-entrypoint-registration `packages/common/effect/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 25-36 (`"./DynamicRuntime": {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-15 import-as-namespace-is-all-or-nothing `packages/common/effect/src/internal/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-11 (`export * as GlobalValue from './GlobalValue.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-16 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:1`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 1-38 (`import * as Duration from 'effect/Duration';`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-17 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-18 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-19 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:1`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.83. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-20 structured-logging-not-console `packages/core/compute/agent-claude/src/Demo.test.ts:42`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 42-53 (`for (const message of collected) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-21 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.87. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-22 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-23 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-24 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-25 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 203-210 (`return result.error ?? Schema.decodeUnknownSync(Schema.String)(JSON.parse(Str...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-26 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 148-154 (`),`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-27 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.88. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-28 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-29 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 293-304 (`);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-30 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-31 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-32 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-33 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:113`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 113-124 (`export const formatUserPrompt = ({`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-34 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-35 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-36 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-37 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:77`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 77-88 (`export const loadInstructions = (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-38 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-39 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-40 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-41 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 79-90 (`),`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-42 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-43 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-44 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-45 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 426-449 (`const manager = yield* ProcessManager.Service;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-46 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 1455-1478 (`);`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-47 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-48 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.82. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-49 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 350-361 (`};`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-50 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-373 (`};`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-51 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-52 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-53 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.81. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-54 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-55 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-56 no-casts `packages/core/compute/compute-runtime/src/services/service-registry.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-63 (`A,`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-57 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-58 flat-layer-composition `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 1142-1165 (`}, Effect.provide(TestLayer())),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-59 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-60 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

System One judges this a likely violation of `namespace-service-layers` (Layer constructors are module-level exports, never class statics), p=0.88. The likeliest place is lines 40-51 (`static layerKv = Layer.effect(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-61 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-62 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-63 no-casts `packages/core/compute/compute/src/Process.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 327-346 (`[ProcessTypeId]: {} as any,`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-64 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.test.ts:68`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 68-79 (`const resolve = ({ registry = [], space = [] }: { registry?: Skill.Skill[]; s...`, location confidence 0.99). Judged with added `test` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-65 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.92. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-66 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-67 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-68 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:20`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 20-32 (`const make = (getEdgeClient: () => EdgeClient, spaceId?: SpaceId): RemoteOper...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-69 no-casts `packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 136-147 (`const versionMeta = safeParseJson<any>(latest.versionMetaJSON);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-70 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-83 (`}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-71 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-72 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-73 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-74 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-75 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-76 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-77 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-78 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-79 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-28 (`const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRun...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-80 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/invoker.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 63-75 (`const computeHandler = Operation.withHandler(Compute, (data) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-81 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 112-123 (`},`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-82 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-83 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-84 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-85 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-86 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/pipeline.test.ts:13`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.81. The likeliest place is lines 13-22 (`import { EmailPipeline } from './pipeline.ts';`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-87 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-88 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-89 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-90 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-91 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-92 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 116-127 (`export const makeExtractionStage = (): Stage<ExtractionInput> => ({`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-93 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:131`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 131-142 (`Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-94 namespace-brand-key-prefixing `packages/core/compute/pipeline/src/Stage.test.ts:14`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 14-25 (`describe('Stage.map', () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-95 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-96 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-97 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.82. The likeliest place is lines 75-86 (`bench(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-98 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-99 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 154-164 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-100 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-101 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-102 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-103 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-104 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-105 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-106 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-107 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-108 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-109 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-110 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:860`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 860-883 (`await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress, abort....`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-111 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-112 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-113 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-114 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.84. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-115 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-116 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-117 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 93-104 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-118 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-119 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-120 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-121 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-122 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-123 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-124 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-125 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-126 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-127 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-128 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-129 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-130 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-131 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 884-907 (`break;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-132 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/testing/sqlite-test-runtime.ts:46`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 46-57 (`export const createTestSqliteStorageAdapter = async (`, location confidence 0.33). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-133 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-134 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-135 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-136 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-137 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.89. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-138 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Database.ts:583`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 583-606 (`export const resolve: {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-139 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-140 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-141 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 666-687 (`return {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-142 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-143 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-144 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-145 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-146 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-147 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-148 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-149 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-150 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-151 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-152 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-153 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-154 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-155 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-156 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-157 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-158 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-159 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-160 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-161 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-162 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-163 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-164 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-165 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-166 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-167 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-168 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-169 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-170 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/index-tracker.ts:79`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.80. The likeliest place is lines 79-90 (`AND (${spaceIdParam} IS NULL OR spaceId = ${spaceIdParam})`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-171 error-messages-carry-context `packages/core/mesh/edge-client/src/edge-http-client.ts:157`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 157-174 (`const parseFinalizeResponse = (body: unknown): FinalizedUpload => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-172 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:481`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 481-504 (`body: data as BodyInit,`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-173 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-174 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-175 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-176 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-177 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-178 no-casts `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-179 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-180 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-181 event-handler-naming-convention `packages/devtools/devtools/src/components/ControlledSelector.tsx:9`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 9-15 (`export type ControlledSelectorProps<T> = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-182 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:132`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 132-143 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-183 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-184 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:22`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 22-31 (`const rowIcon = (row: IndexerRow): { icon: string; className: string } => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-185 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`const [recording, setRecording] = useState(false);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-186 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 84-95 (`const data = useMemo(() => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-187 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const dataRows = useMemo(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-188 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 46-57 (`const handleRowClicked = (row: any) => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-189 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 78-89 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-190 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 46-57 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-191 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 89-100 (`async (spaceId: string) => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-192 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-193 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 39-50 (`</Banner.Content>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-194 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 60-71 (`try {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-195 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:133`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 133-144 (`let response: any;`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-196 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 100-111 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-197 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 214-225 (`export const SignalMessageTable = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-198 no-casts `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 118-129 (`condition: () => this._client!.spaces.get(response.spaceId as SpaceId),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-199 error-messages-carry-context `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 130-141 (`if (buildResult.error || !buildResult.bundle) {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-200 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-201 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 41-52 (`return feedSchemas.length === 0`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-202 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 123-146 (`const feedMessages = useQuery(`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-203 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:378`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 378-410 (`>`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-204 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-205 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-206 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:44`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 44-48 (`const styles = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-207 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:613`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 613-624 (`<div className={mx('flex flex-col', styles.toolbar)}>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-208 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-209 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:193`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 193-204 (`'flex flex-col w-full dx-density-md',`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-210 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 117-128 (`interval={500}`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-211 no-invented-theme-tokens `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:95`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 95-106 (`<div className={subGridClassNames}>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-212 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:51`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 51-62 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-213 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 53-64 (`}, [manager]);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-214 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.88. The likeliest place is lines 113-124 (`const loadedLabel = running`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-215 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-216 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:131`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 131-142 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-217 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:66`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 66-77 (`{roles.map((role) => (`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-218 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 57-68 (`});`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-219 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:142`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 142-153 (`const SnapshotStory = () => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-220 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:154`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 154-165 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-221 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:287`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 287-298 (`<IconButton.Root icon='ph--skip-back--regular' iconOnly label='Reset (R)' onC...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-222 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 109-120 (`const TriggerStatusPopover = ({`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-223 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`.action(`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-224 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-225 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-226 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:131`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 131-142 (`const authorize = (server: McpServer.McpServer, popup: Window | null) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-227 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-228 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-229 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:144`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 144-155 (`AssistantPlugin({`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-230 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-231 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-232 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 99-110 (`useEffect(() => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-233 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:279`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 279-290 (`<Banner.Body>{t('mirror-unresolved.label')}</Banner.Body>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-234 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-235 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 134-145 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-236 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 121-132 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-237 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 205-216 (`<Panel.Toolbar asChild>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-238 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 89-100 (`objects`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-239 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:185`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 185-196 (`<Toolbar.IconButton`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-240 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-241 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-242 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-243 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-244 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-245 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-92 (`);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-246 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`export const mailboxFacts: ProjectCapabilities.Template = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-247 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-248 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-249 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 109-120 (`<div>{participants}</div>`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-250 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:133`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 133-144 (`{actions`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-251 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 31-42 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-252 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 55-66 (`const timeout = setTimeout(() => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-253 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 94-105 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-254 no-casts `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 34-45 (`const screenshare: UserState = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-255 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 46-57 (`});`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-256 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 20-24 (`const maxImageSize = 'w-[2560px] h-[1440px]';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-257 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-258 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 108-119 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-259 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-260 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 96-107 (`iconOnly`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-261 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-262 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:65`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 65-76 (`<Toolbar.IconButton`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-263 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 77-88 (`</Toolbar.Root>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-264 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-265 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:72`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 72-83 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-266 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 96-107 (`)}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-267 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-268 namespace-export-with-internal-hiding `packages/plugins/plugin-claude/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as ClaudePlugin from './ClaudePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-269 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-270 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 58-69 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-271 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-272 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-273 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 48-59 (`const closedRef = useRef(false);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-274 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 96-107 (`}`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-275 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 93-104 (`onValueChange={(value) =>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-276 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:257`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 257-268 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-277 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 47-58 (`if (!hubClient) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-278 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 35-51 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-279 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-52 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-280 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 41-52 (`setFetchState((previous) => (previous.state === 'ready' ? previous : { state:...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-281 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/schema-defs.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 39-50 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-282 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`return (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-283 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.88. The likeliest place is lines 74-85 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-284 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.96. The likeliest place is lines 67-78 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-285 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 102-113 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-286 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:190`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 190-201 (`let cancelled = false;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-287 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 18-29 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-288 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 79-90 (`return (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-289 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 130-141 (`AiService.AiService,`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-290 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 494-517 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-291 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-292 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-293 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-294 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-295 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-296 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-297 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.84. The likeliest place is lines 66-77 (`void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] }, { sp...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-298 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 71-82 (`</Toolbar.Root>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-299 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm-project.ts:59`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 59-70 (`export const crmProject: ProjectCapabilities.Template = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-300 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 25-36 (`export const crm: RoutineCapabilities.Template = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-301 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 54-65 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-302 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-303 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 75-86 (`iconOnly`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-304 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-305 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx:26`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 26-37 (`export const DebugPanelHeader = ({ mode, onModeChange, onClose, density }: De...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-306 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 64-75 (`useEffect(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-307 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 70-81 (`});`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-308 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 82-93 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-309 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-310 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-311 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-312 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 49-60 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-313 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:61`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 61-72 (`useEffect(() => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-314 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:181`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 181-192 (`<Panel.Root {...Util.composableProps(props)} ref={forwardedRef}>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-315 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 31-40 (`export const useDrawerState = () =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-316 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-317 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-318 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 45-56 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-319 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:49`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 49-60 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-320 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:137`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 137-148 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-321 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:24`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 24-35 (`const MainPane = ({ id, label }: { id: string; label: string }) => {`, location confidence 0.82). Judged with added `imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-322 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 44-55 (`const SplitStory = () => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-323 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-324 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 30-41 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-325 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 188-213 (`return (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-326 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-327 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 83-94 (`data-tauri-drag-region='deep'`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-328 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:169`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 169-180 (`<IconButton.Root`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-329 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:46`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 46-55 (`};`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-330 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-331 no-sleep-in-test `packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 39-46 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sub...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-332 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-333 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 42-51 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sta...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-334 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-335 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 32-43 (`const sampleProfiler = useCallback(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-336 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 55-66 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-337 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 67-78 (`url.searchParams.set('sort', 'updated');`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-338 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 157-171 (`const Content = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-339 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-340 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-341 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-342 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-343 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-344 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-345 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-346 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-347 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-348 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-349 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-350 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-351 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:97`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 97-108 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-352 extract-non-rendering-logic-from-component `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 297-308 (`let task: PDFDocumentLoadingTask | undefined;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-353 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-354 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:109`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 109-120 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-355 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 278-289 (`return (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-356 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-357 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:44`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 44-55 (`setPending(true);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-358 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 80-91 (`<Field.Input readOnly value={reference} classNames='grow' />`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-359 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-360 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-361 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-362 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:91`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 91-102 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-363 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:91`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 91-102 (`/>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-364 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-365 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-366 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 91-102 (`setPhase('idle');`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-367 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-368 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-369 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`try {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-370 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-371 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 78-98 (`const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Laye...`, location confidence 0.26). Judged with added `test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-372 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-373 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:138`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 138-149 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-374 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 162-173 (`<div className='dx-expand flex flex-col gap-2 overflow-y-auto'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-375 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 95-106 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-376 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 181-194 (`</div>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-377 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 74-85 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-378 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-379 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.77). Judged with added `test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-380 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-381 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 297-320 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-382 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:428`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 428-451 (`'dx-document dx-attention-surface border border-subdued-separator rounded ove...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-383 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:171`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.87. The likeliest place is lines 171-182 (`setShowBcc(true);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-384 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:207`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 207-218 (`return (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-385 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`.map((message) => [message.sender?.email?.toLowerCase(), message.sender] as c...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-386 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:114`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 114-125 (`const mailboxData = useMemo(() => ({ subject: mailbox, attendableId: mailbox?...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-387 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 126-134 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-388 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:299`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 299-310 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-389 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-390 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-391 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-392 error-messages-carry-context `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.stories.tsx:292`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 292-303 (`await waitFor(() => expect(getTileCount()).toBeGreaterThan(0), { timeout: 12_...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-393 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:240`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 240-263 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-394 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-395 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 31-42 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-396 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:175`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.96. The likeliest place is lines 175-186 (`onCheckedChange={toggleAll}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-397 namespace-export-with-internal-hiding `packages/plugins/plugin-inbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-12 (`export * as InboxPlugin from './InboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-398 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-399 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:66`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 66-77 (`const runExtractMailbox = (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-400 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-401 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-402 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.87. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.74). Judged with added `test` context after a first pass of 0.60. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-403 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:36`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 36-40 (`export const ANALYZE_CURSOR_KEY_ID = 'analyzeMailbox';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-404 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-405 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-406 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/templates/analyze-mailbox.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 33-44 (`export const analyzeMailbox: RoutineCapabilities.Template = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-407 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-408 effect-requirement-type-not-erased `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.81. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). Judged with added `test` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-409 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-410 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-411 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 53-64 (`const BeaconPopover = () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-412 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 77-88 (`<div className='flex flex-col gap-1'>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-413 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:77`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 77-88 (`<div className='flex flex-col gap-1'>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-414 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 32-43 (`Layer.provide(JmapMailApi.Live),`, location confidence 0.53). Judged with added `imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-415 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 60-71 (`export const jmapMailSyncProvider = (): Layer.Layer<MailSync.MailSyncProvider...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-416 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-417 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-418 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.84. The likeliest place is lines 88-99 (`const DefaultComponent = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-419 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`return null;`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-420 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-421 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`if (target == null) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-422 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`const settingsSchema = (isView ? KanbanSchema.KanbanViewSettingsSchema : Kanb...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-423 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-424 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:39`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 39-50 (`<Toolbar.IconButton`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-425 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 114-125 (`() =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-426 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:150`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 150-161 (`<img src={cover} alt='' className='w-[6rem] aspect-[2/3] shrink-0 self-start ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-427 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 109-120 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-428 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:145`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 145-156 (`const handleFile = useCallback(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-429 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-430 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-431 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-linear/src/operations/sync.test.ts:48`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 48-59 (`describe('plugin-linear sync', () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-432 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 28-39 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-433 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 74-80 (`<div className='dx-expand grid grid-cols-2 gap-2 px-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-434 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 36-47 (`{words.map((word) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-435 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 110-123 (`/>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-436 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 77-88 (`() =>`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-437 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-88 (`</Card.Row>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-438 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-439 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:86`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 86-97 (`});`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-440 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 75-86 (`void handleFetch();`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-441 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:99`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 99-110 (`</Select.Viewport>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-442 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 28-39 (`export const magazineCuration: RoutineCapabilities.Template = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-443 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-444 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-445 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 76-87 (`const features = useMemo(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-446 namespace-export-with-internal-hiding `packages/plugins/plugin-map/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-9 (`export * as MapPlugin from './MapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-447 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-448 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 188-196 (`const useTest = (view: EditorView | null) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-449 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 120-131 (`const [missing, setMissing] = useState(false);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-450 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:336`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 336-347 (`if (mode === 'section') {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-451 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-452 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-453 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-454 test-asserts-real-behavior `packages/plugins/plugin-markdown/src/plugin.test.ts:15`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 15-26 (`describe('MarkdownPlugin', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-455 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-456 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 59-70 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-457 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 71-82 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-458 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 119-130 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-459 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 119-130 (`return (`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-460 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-461 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-462 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-463 toolbars-are-menu-actions `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.stories.tsx:68`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 68-80 (`label={splitterMode === 'end' ? 'Collapse' : 'Expand'}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-464 comment-hygiene `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 23-33 (`type MobileLayoutRootProps = Util.ThemedClassName<`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-465 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`const description = describeScrollTarget(event.target);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-466 toolbars-are-menu-actions `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:48`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 48-59 (`const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-467 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 88-99 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-468 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 100-111 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-469 structured-logging-not-console `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 27-38 (`const menuActions = random.helpers.multiple(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-470 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 128-137 (`monolithicAction ? monolithicAction.properties!.label : props.label,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-471 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 190-201 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-472 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:238`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 238-249 (`'flex justify-center items-center dx-focus-ring-group-indicator transition-co...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-473 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 96-107 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-474 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:151`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 151-162 (`<Tree`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-475 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 23-34 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-476 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 41-52 (`const current = getHotkeyScope() ?? '';`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-477 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 313-324 (`useEffect(() => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-478 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 88-99 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-479 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:190`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 190-201 (`const meta = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-480 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 216-227 (`export const Visitor = () => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-481 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 128-139 (`id: 'appGraphBuilder',`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-482 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-483 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 82-92 (`(event) =>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-484 no-casts `packages/plugins/plugin-observability/src/plugin.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-25 (`describe('ObservabilityPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-485 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-486 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 69-80 (`</Dialog.Title>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-487 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 22-33 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-488 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 16-27 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-489 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 36-50 (`const meta = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-490 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:158`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 158-181 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-491 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:374`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 374-397 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-492 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:870`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 870-893 (`const InlineForm = ({`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-493 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.54). Judged with added `diff, imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-494 inline-obj-parent `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.86. The likeliest place is lines 65-74 (`objects: seed.objects.map((object) => Ref.make(object)),`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-495 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 101-112 (`export const Projects: SampleSpace.Phase<ProjectsResult, ProjectsInput> = Sam...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-496 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 47-58 (`} else {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-497 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-95 (`const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-498 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:109`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 109-120 (`export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootPr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-499 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.90. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-500 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 16-27 (`export const Layout = Util.composable<HTMLDivElement, LayoutProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-501 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 78-89 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-502 no-casts `packages/plugins/plugin-presenter/src/useExitPresenter.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 16-24 (`export const useExitPresenter = (object: any) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-503 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-504 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-505 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-506 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/FormCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-507 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-508 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-509 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`{roles.map((role, i) => (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-510 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-511 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-512 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 130-141 (`const fiber = Effect.runFork(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-513 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 109-120 (`{`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-514 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-92 (`const routineSkills = routineInstructions?.skills.map((ref) => ref.uri.toStri...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-515 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/templates/inbox-research.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 55-66 (`export const inboxResearch: ProjectCapabilities.Template = {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-516 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 58-69 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-517 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 58-69 (`return (`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-518 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-519 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 107-118 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-520 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:155`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 155-166 (`) : (`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-521 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:180`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 180-191 (`<div className='flex items-center gap-2'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-522 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 55-68 (`reason:`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-523 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:55`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 55-68 (`reason:`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-524 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:138`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 138-149 (`return (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-525 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:150`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 150-161 (`)}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-526 no-casts `packages/plugins/plugin-registry/src/components/PluginList/PluginList.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-527 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-528 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 130-141 (`}`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-529 no-casts `packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 41-48 (`const { plugins } = await harness.runPromise(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-530 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 138-149 (`[anchor, onComment],`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-531 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 47-58 (`standalone`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-532 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-533 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 104-115 (`</div>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-534 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-535 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 456-467 (`const filteredAnchors = showResolvedThreads`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-536 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 226-237 (`<IconButton.Root icon='ph--trash--regular' label={t('discard-branch.label')} ...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-537 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-538 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-539 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-540 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:39`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 39-50 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-541 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:265`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 265-275 (`const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-542 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:378`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 378-389 (`<span className='shrink-0 text-sm'>{t('schedule.on.label')}</span>`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-543 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 60-71 (`},`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-544 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:60`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 60-71 (`},`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-545 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 188-199 (`if (inputIndex !== -1) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-546 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 42-48 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-547 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 309-320 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-548 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 164-177 (`}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-549 no-invented-theme-tokens `packages/plugins/plugin-routine/src/containers/RoutineTraceCompanion/RoutineTraceCompanion.tsx:32`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 32-38 (`const STATUS_CLASSES: Record<RunStatus, string> = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-550 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-551 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-552 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-553 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 32-46 (`);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-554 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.93. The likeliest place is lines 38-49 (`return (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-555 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 62-76 (`);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-556 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 106-117 (`selectedPath={selectedPath}`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-557 extract-non-rendering-logic-from-component `packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 74-85 (`useEffect(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-558 no-sleep-in-test `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.test.ts:226`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 226-237 (`yield* Effect.sleep('6 seconds');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-559 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 84-95 (`case 'script':`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-560 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 13-28 (`import * as ScrollArea from '@dxos/react-ui/ScrollArea';`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-561 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 141-152 (`{/* Side rail */}`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-562 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:134`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 134-143 (`<Toolbar.IconButton icon='ph--play--regular' label='Execute' iconOnly onClick...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-563 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 71-84 (`<Toolbar.Root>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-564 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 92-103 (`keymap.of(lintKeymap),`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-565 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:78`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 78-89 (`</Dialog.Header>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-566 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-567 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-568 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-569 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 188-199 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-570 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 40-51 (`if (!token || !gistId) {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-571 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 36-47 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-572 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-573 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 60-71 (`onClientInitialized: ({ client }) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-574 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-575 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.81. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-576 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 59-70 (`Object.entries(fields).some(([, value]) => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-577 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-578 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 81-92 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-579 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-580 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:303`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 303-314 (`}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-581 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 471-482 (`<div`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-582 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 27-38 (`const DefaultStory = () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-583 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 39-50 (`}, [space]);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-584 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 75-86 (`<Field.Root>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-585 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 23-34 (`export const Basic = () => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-586 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 270-281 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-587 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 42-55 (`>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-588 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-589 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 81-92 (`});`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-590 comment-hygiene `packages/plugins/plugin-sheet/src/translations.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 47-60 (`'add-row-after.label': 'Add row after',`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-591 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:22`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.88. The likeliest place is lines 22-33 (`export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][n...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-592 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-593 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-594 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-595 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-596 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-597 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-598 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 250-261 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-599 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/ForeignKeys/ForeignKeys.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 37-48 (`const KeyItem = ({ forignKey, onDelete }: KeyItemProps) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-600 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 50-61 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-subdued'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-601 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:114`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 114-125 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-602 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:98`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 98-109 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-603 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-604 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-605 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 40-51 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-606 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 264-275 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-607 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-608 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:239`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 239-250 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-609 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 51-62 (`}, [schemas]);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-610 comment-hygiene `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:55`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 55-66 (`return () => clearInterval(interval);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-611 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 227-238 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-612 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:79`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 79-90 (`const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-613 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-614 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-615 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-616 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 60-70 (`}, [updateState]);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-617 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 205-216 (`const rail = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-618 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:182`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 182-193 (`<Panel.Toolbar classNames='dx-toolbar-surface'>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-619 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:229`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 229-237 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-620 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-47 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-621 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-622 comment-hygiene `packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 13-24 (`export const StatusBarActions = (_props: StatusBarActionsProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-623 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-624 options-object-with-defaults `packages/plugins/plugin-stream-deck/src/render/frame.ts:27`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.81. The likeliest place is lines 27-36 (`export const buildFrame = ({ device, keys, dials, icons = {} }: BuildFrameOpt...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-625 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 88-99 (`<div className='flex items-center gap-1'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-626 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 100-111 (`<Toolbar.IconButton`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-627 no-invented-theme-tokens `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:44`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 44-55 (`const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-628 no-invented-theme-tokens `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:35`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 35-49 (`const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boole...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-629 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 58-69 (`export const GalleryArticle = ({ role, subject: collection }: GalleryArticleP...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-630 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 118-129 (`<Panel.Toolbar asChild>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-631 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:77`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 77-88 (`(id: string) =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-632 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 113-124 (`return;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-633 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 45-56 (`export const MediaArtifactVariants = ({`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-634 namespace-export-with-internal-hiding `packages/plugins/plugin-studio/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as StudioPlugin from './StudioPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-635 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-636 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.83. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-637 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 65-76 (`<Select.Viewport>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-638 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 137-148 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-639 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 113-124 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-640 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:149`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 149-160 (`classNames='w-60 min-h-40 gap-0 p-2 border-accent-bg bg-accent-bg text-accent...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-641 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-24 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-642 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.92. The likeliest place is lines 39-53 (`export const Key = ({ binding }: { binding: string }) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-643 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-644 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-645 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 228-241 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-646 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 60-71 (`Obj.update(subject, (subject) => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-647 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:58`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 58-69 (`if (!typename) {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-648 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 94-105 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-649 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:36`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 36-50 (`data-testid='supportPlugin.startTour'`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-650 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-16 (`const observabilityWith = (support: Observability.Observability['support']): ...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-651 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 165-176 (`return {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-652 namespace-export-with-internal-hiding `packages/plugins/plugin-table/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as TablePlugin from './TablePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-653 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 69-80 (`<JournalEntry`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-654 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 125-136 (`<div`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-655 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:21`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 21-32 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-656 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-657 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 87-98 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-658 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 40-51 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-659 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 59-70 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-660 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:204`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 204-215 (`onFiles(files);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-661 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 136-151 (`);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-662 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 78-89 (`const [filterText, setFilterText] = useFilterQuery(taskSet.id, filterEditorRef);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-663 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 330-341 (`>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-664 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-665 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-666 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 107-118 (`export const TerraForm = ({ config, onChange, onWaterSheen }: TerraFormProps)...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-667 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 86-97 (`engine.evaluateAt(simNow());`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-668 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-669 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 247-258 (`const manager = managerRef.current;`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-670 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-671 no-styling-wrapper-divs `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:135`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 135-146 (`<Tooltip.Provider>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-672 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-673 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-674 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-675 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-676 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-677 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-678 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 116-127 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-679 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 153-164 (`? t('microphone-denied.label')`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-680 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-681 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-682 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-683 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 139-150 (`disabled={!stream}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-684 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-685 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-686 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-687 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-688 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 57-68 (`<Card.Header>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-689 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 41-52 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-690 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-691 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 264-275 (`<div`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-692 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-693 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-694 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-695 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-696 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-697 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 70-81 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-698 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:154`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 154-165 (`<Splitter.Panel asChild position='start'>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-699 no-styling-wrapper-divs `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:232`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 232-243 (`<Icon.Root icon={sourceIcon[item.source.type] ?? 'ph--question--regular'} />`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-700 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-701 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-702 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-703 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-704 bounded-live-state `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:78`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 78-89 (`output: event.output,`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-705 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 114-125 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-706 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 250-261 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-707 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 61-70 (`export const Crashes: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-708 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-709 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-710 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-711 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-712 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 351-362 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-713 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-91 (`export const useOptionalAtomCapability = <T>(atomCapability: Capability.Inter...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-714 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-715 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.88. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-716 no-casts `packages/sdk/app-graph/src/AppGraph.test.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 459-482 (`});`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-717 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 893-917 (`release();`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-718 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-719 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-720 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-721 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:227`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 227-238 (`</Field.Root>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-722 namespace-export-with-internal-hiding `packages/sdk/app-solid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.90. The likeliest place is lines 1-8 (`export * from './common.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-723 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-724 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:206`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 206-217 (`}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-725 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-726 declare-optional-services-with-noop-layers `packages/sdk/app-toolkit/src/types/DefaultParent.ts:24`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 24-35 (`export const resolve = (object: Obj.Unknown): Effect.Effect<Obj.Unknown | und...`, location confidence 0.99). Judged with added `importers, package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-727 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-728 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-729 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:396`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 396-419 (`});`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-730 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-731 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-732 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-733 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-734 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-735 test-asserts-real-behavior `packages/sdk/client-services/src/internal/devices/devices-service.test.ts:33`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 33-44 (`});`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-736 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-737 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-738 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-739 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-740 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-741 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-742 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/spaces.ts:73`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 73-85 (`unsubscribe = dataSpaceManager.updated.on(() => update());`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-743 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-744 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-745 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-746 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-747 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.89). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-748 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.81. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-749 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 93-104 (`update();`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-750 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-751 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-752 no-casts `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.ts:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 137-148 (`log.error('failed to load metadata from SQLite', { err });`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-753 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-754 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-755 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 25-32 (`export interface CrossDeviceSpaceSynchronizer extends CredentialProcessor, Li...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-756 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-757 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-758 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 488-499 (`});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-759 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-760 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-761 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-762 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 429-452 (`}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-763 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-764 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-765 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-766 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-767 no-casts `packages/sdk/client-services/src/internal/space/space-manager.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 181-193 (`public findSpaceByRootDocumentId(documentId: string): Space | undefined {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-768 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-769 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 188-199 (`);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-770 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-771 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-772 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-773 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-774 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-775 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-776 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-777 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-778 no-casts `packages/sdk/client/src/services/local-client-services.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 211-222 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-779 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/testing/test-worker-factory.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-81 (`createSession: ({ isOwner }) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-780 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-781 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 23-34 (`target='_blank'`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-782 effect-fn-not-hand-wrapped-gen `packages/sdk/observability/src/ai/AiObservability.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 372-383 (`const setupWired = ({`, location confidence 0.93). Judged with added `test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-783 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-784 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-785 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-786 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-787 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-788 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-789 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.85. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-790 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`import * as Button from '@dxos/react-ui/Button';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-791 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-792 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 44-55 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-793 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-794 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-795 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-796 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-797 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-798 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-799 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.84. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-800 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.83. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-801 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-802 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-803 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-804 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.80. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-805 comment-hygiene `packages/sdk/shell/src/components/Panel/Action.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 106-117 (`/>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-806 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:34`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.84. The likeliest place is lines 34-45 (`export const InvitationManager = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-807 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.81. The likeliest place is lines 13-31 (`import { type Space, SpaceMember_PresenceState, useSpaces } from '@dxos/react...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-808 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.83. The likeliest place is lines 13-31 (`import { type Space, SpaceMember_PresenceState, useSpaces } from '@dxos/react...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-809 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-810 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-811 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-812 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-813 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 169-176 (`}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-814 no-casts `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-815 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 79-85 (`}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-816 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 134-145 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-817 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-818 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 116-127 (`{`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-819 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.90. The likeliest place is lines 200-207 (`}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-820 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-821 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-822 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-823 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-824 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-825 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-826 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 112-118 (`export const Default: Story = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-827 effect-fn-not-hand-wrapped-gen `packages/stories/storybook-testing/src/test/startup.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 73-84 (`const clientPlugin = ClientPlugin.make({`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-828 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:77`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 77-86 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.63). Judged with added `imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-829 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:173`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 173-186 (`<div className='flex justify-center items-center'>`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-830 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:226`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 226-237 (`<svg width={size} height={size}>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-831 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-832 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 29-42 (`const Component = ({ buffer }: { buffer: ArrayBuffer }) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-833 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-834 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 153-164 (`<Panel.Content classNames='flex flex-col'>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-835 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:370`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 370-381 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-836 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 97-108 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-837 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-838 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 346-357 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-839 extract-non-rendering-logic-from-component `packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 153-164 (`let cancelled = false;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-840 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:143`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 143-154 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-841 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-842 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 156-179 (`<div`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-843 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 246-269 (`}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-844 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-845 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-846 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-847 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:163`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 163-174 (`<div className='flex flex-col h-full overflow-hidden divide-y divider-separat...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-848 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 190-201 (`const meta = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-849 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-850 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-851 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 88-99 (`);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-852 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`{sidebar && (`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-853 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-854 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-855 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-856 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-857 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 76-90 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-858 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-859 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-860 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-861 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 50-61 (`const handleClick: Icon.RootProps['onClick'] = (ev) => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-862 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 15-26 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-863 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.84. The likeliest place is lines 33-44 (`}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-864 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-64 (`}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-865 no-casts `packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 28-39 (`export const ShapeComponent = (props: ShapeComponentProps<any>) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-866 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-867 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-868 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:43`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 43-54 (`<ToolbarModule.Button onClick={() => handleAction({ type: 'zoom-out' })} titl...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-869 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-37 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-870 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 50-61 (`)}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-871 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-872 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-873 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`setDragging(true);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-874 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 120-131 (`useEffect(() => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-875 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-876 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.88. The likeliest place is lines 82-93 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-877 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 106-117 (`commit(key, next);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-878 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:194`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 194-205 (`const fiber = Effect.runFork(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-879 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-880 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-881 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:222`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 222-236 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-882 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:346`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 346-357 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-883 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:42`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.85. The likeliest place is lines 42-53 (`{item}`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-884 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 16-27 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-885 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:105`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.82. The likeliest place is lines 105-116 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-886 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 114-125 (`export const Controller: Story = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-887 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-888 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:240`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 240-247 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-889 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-28 (`const DefaultStory = (props: MatrixProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-890 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-891 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-892 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-893 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-894 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:169`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 169-180 (`const progress = (current: number, total: number) =>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-895 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 40-51 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-896 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-25 (`const DefaultStory = ({ state: _state }: SpinnerProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-897 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-26 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-898 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 27-33 (`const sizes: Record<number, { range: Range; classNames: string; h: string }> = {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-899 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:270`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 270-281 (`const DashboardActivity = Util.composable<HTMLDivElement, DashboardActivityCu...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-900 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:127`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 127-138 (`useEffect(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-901 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:290`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 290-301 (`<Popover.Trigger asChild>`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-902 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:491`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 491-502 (`</div>`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-903 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 95-106 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-904 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-905 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-104 (`return;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-906 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:281`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 281-291 (`{group.items.map((item) => (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-907 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-908 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-909 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 61-72 (`[debug, extensionsProp],`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-910 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 29-40 (`],`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-911 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 278-289 (`</>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-912 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:20`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.93. The likeliest place is lines 20-31 (`export const createRenderer =`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-913 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-914 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-915 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-916 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 440-451 (`const observer = new ResizeObserver((entries) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-917 reactive-state-via-atom-bridge `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 452-463 (`useEffect(() => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-918 no-casts `packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:1217`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1217-1240 (`canvas.getContext('experimental-webgl', params)) as WebGL2RenderingContext;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-919 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:56`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 56-70 (`export const Default: Story = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-920 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 120-128 (`onPointerMove={onMove}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-921 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-922 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 228-239 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-923 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:410`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 410-433 (`const scroller = scrollerRef.current;`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-924 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:162`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 162-173 (`useEffect(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-925 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/debug/Debug.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 52-63 (`const tick = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-926 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/debug/Debug.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 64-75 (`}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-927 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-928 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-929 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.93. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-930 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 83-94 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-931 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:204`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 204-215 (`void (async () => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-932 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 398-409 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-933 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/scenarios.tsx:421`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 421-437 (`const PlainChrome = ({ index, children }: MessageChromeProps) => (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-934 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:62`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 62-73 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-935 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-936 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-937 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-938 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor/FieldEditor.tsx:49`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 49-60 (`.query(Filter.type(Type.Type))`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-939 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Card.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 76-82 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-940 no-casts `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 111-116 (`} satisfies Meta<StoryArgs<any>>;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-941 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 188-199 (`export const Variants: Story<Schema.Schema.Type<typeof SettingsSchema>> = {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-942 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 218-229 (`const InlineMarkdownTextStory = (args: StoryArgs<any>) => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-943 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.tsx:254`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 254-265 (`<>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-944 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/default-value.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 18-29 (`export const getDefaultValue = (ast?: SchemaAST.AST): any => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-945 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 98-110 (`<div className='grid grid-cols-[minmax(0,1fr)_min-content] gap-1 items-stretc...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-946 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 53-64 (`);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-947 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.stories.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 64-75 (`<Panel.Content>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-948 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:52`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 52-63 (`const reference = value as Ref.Ref<any> | undefined;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-949 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-form/src/components/Form/FormField/fields/MarkdownField/MarkdownField.tsx:119`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 119-130 (`const StringMarkdownEditor = ({ value, placeholder, readonly, onChange }: Str...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-950 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/InlineRefField.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 99-110 (`const handleChange = useCallback(`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-951 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 31-42 (`const defaultGetOptions: NonNullable<RefFieldProps['getOptions']> = (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-952 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui-form/src/components/Form/FormField/fields/RefField/RefField.tsx:192`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.87. The likeliest place is lines 192-203 (`<Field.Root key={item.id}>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-953 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx:155`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 155-166 (`/>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-954 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx:434`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 434-445 (`override render() {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-955 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:157`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 157-166 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-956 no-casts `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 87-98 (`}`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-957 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 135-146 (`const DefaultStory = ({ schema, template }: StoryArgs) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-958 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:213`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 213-224 (`<div className='flex flex-col gap-2'>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-959 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`expect(resolved!.segments).toEqual(['origin']);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-960 no-casts `packages/ui/react-ui-form/src/components/Form/meta-tags.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 37-48 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-961 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 116-127 (`<TestLayout json={snapshot}>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-962 no-casts `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 81-92 (`Obj.update(object, (object) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-963 no-casts `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 60-71 (`})),`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-964 structured-logging-not-console `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.stories.tsx:60`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 60-71 (`})),`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-965 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 59-71 (`const Note = Schema.Struct({`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-966 no-casts `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.tsx:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 63-74 (`const handleCreate = useCallback(`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-967 no-casts `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 48-57 (`export const ObjectTree = ObjectTreeImpl as unknown as <T>(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-968 no-invented-theme-tokens `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx:172`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 172-183 (`return <span className='text-blue-text'>{JSON.stringify(value)}</span>;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-969 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:112`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 112-123 (`[objects, getObjectLabel],`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-970 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-form/src/components/RefEditor/RefEditor.tsx:280`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 280-291 (`filter={false}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-971 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 99-110 (`view.projection = Obj.getSnapshot(newView).projection as Obj.Mutable<typeof v...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-972 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:200`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 200-211 (`const query =`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-973 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-974 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-975 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-976 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 21-32 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-977 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 68-81 (`<div className='h-full aspect-square mx-auto'>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-978 no-casts `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 58-69 (`}, [orientation, rows, cols]);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-979 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 92-103 (`const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(`, location confidence 0.94). Judged with added `imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-980 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-981 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-982 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 59-74 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-983 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 123-134 (`queueMicrotask(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-984 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:207`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 207-218 (`if (node) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-985 extract-non-rendering-logic-from-component `packages/ui/react-ui-graph/src/components/SVG/Root.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 43-54 (`if (!entry) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-986 no-casts `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 20-30 (`export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-987 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHie...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-988 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 207-218 (`nodeMerge`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-989 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 119-130 (`const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: Render...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-990 comment-hygiene `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 23-34 (`const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-991 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 35-46 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-992 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:225`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 225-236 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-993 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 98-109 (`key={tool.title}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-994 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 55-66 (`);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-995 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 114-125 (`return (`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-996 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 74-85 (`setClient(next);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-997 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 58-69 (`{items.map((item, i) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-998 no-casts `packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:223`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 223-236 (`Hooks.useMergeRefs([forwardedRef, navigation.containerProps.ref]) as unknown ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-999 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Listbox/ListItemContent.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 13-24 (`const meta = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1000 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 20-37 (`export type OrderedListContextValue<T extends ListItemRecord> = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1001 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 19-30 (`export type OrderedListRootProps<T extends ListItemRecord> = Util.ThemedClass...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1002 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:115`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 115-129 (`const meta = {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1003 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 293-316 (`}, [rootTree, childIdsFamily, registry]);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1004 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 711-734 (`await expect(row(child)!.getAttribute('aria-setsize')).toEqual('20');`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1005 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:359`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 359-378 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1006 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:912`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 912-935 (`useEffect(() => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1007 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1068`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 1068-1091 (`'col-[tree-row] grid grid-cols-subgrid gap-0.5 [&[hidden]]:hidden empty:hidden',`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1008 no-casts `packages/ui/react-ui-list/src/next/Tree/Tree.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 54-60 (`export type TreeDropEvent<T extends { id: string } = any> = {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1009 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1010 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 61-72 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1011 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 88-99 (`Tile={Tile!}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1012 no-casts `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 34-45 (`export const ToolForm = <S extends Schema.Codec<any, any>>({`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1013 no-casts `packages/ui/react-ui-menu/src/components/action-label.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-21 (`export const actionLabel = (action: Action, t: ThemeProvider.TFunction) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1014 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-30 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1015 no-styling-wrapper-divs `packages/ui/react-ui-menu/src/components/ActionMenu.stories.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 108-119 (`);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1016 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 87-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1017 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 268-279 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1018 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:103`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 103-114 (`<Card.Block>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1019 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 173-184 (`if (!rootRef.current) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1020 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1021 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1022 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 255-266 (`: (index) => getId(visibleItems![index]),`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1023 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 177-188 (`const handleNativeDragStart = (event: DragEvent) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1024 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 119-130 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1025 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 101-112 (`return (`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1026 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-49 (`const HuePreview = ({ value, size = 5 }: { value: string; size?: Icon.RootPro...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1027 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1028 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 84-95 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1029 structured-logging-not-console `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 115-126 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1030 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:115`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 115-126 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1031 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-513 (`const meta = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1032 no-casts `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-36 (`const generator: ValueGenerator = random as any;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1033 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 97-108 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1034 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 118-129 (`if (!schema || !table?.view.target) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1035 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:229`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 229-240 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1036 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 48-59 (`useEffect(() => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1037 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1038 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1039 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1040 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 53-63 (`const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1041 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 133-144 (`{/* The hue comes from the event table, through the same palette the status a...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1042 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:713`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 713-736 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1043 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1970`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1970-1993 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1044 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:497`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 497-512 (`const TaskListGroupLabel = Util.composable<HTMLDivElement>(({ children, ...pr...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1045 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:435`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 435-446 (`and it spans the artifacts column (a PR chip is only row 1) but stops short o...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1046 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 99-110 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1047 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1048 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 133-144 (`const bridge = new XtermBridge(xterm);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1049 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 75-86 (`ref={forwardedRef}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1050 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:315`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 315-329 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1051 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 341-358 (`type GanttLegendProps = Util.ThemedClassName<PropsWithChildren>;`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1052 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 359-382 (`key={lane.id}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1053 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 505-528 (`const element = viewportRef.current;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1054 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 184-195 (`const makeColumnRenderer =`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1055 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1056 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 162-188 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1057 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:100`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 100-111 (`if (!viewport || !follower) {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1058 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 148-159 (`>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1059 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:228`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 228-239 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1060 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 311-322 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1061 no-casts `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 30-40 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1062 no-styling-wrapper-divs `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 77-91 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1063 no-styling-wrapper-divs `packages/ui/react-ui/src/components/AttentionGlyph/AttentionGlyph.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 89-100 (`const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1064 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/AttentionGlyph/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as AttentionGlyph from './AttentionGlyph.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1065 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 78-89 (`export const Default = () => (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1066 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 24-35 (`const DefaultStory = ({ valence, title, body, button }: StoryArgs) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1067 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:24`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.80. The likeliest place is lines 24-35 (`const DefaultStory = ({ valence, title, body, button }: StoryArgs) => {`, location confidence 0.73). Judged with added `imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1068 no-casts `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:44`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 44-55 (`const meta = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1069 no-casts `packages/ui/react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 42-52 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1070 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Button/Button.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 13-24 (`const DefaultStory = ({ children, ...args }: Omit<Button.RootProps, 'ref'>) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1071 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 18-30 (`const DefaultStory = (props: IconButton.RootProps) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1072 no-casts `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 135-149 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1073 deprecated-tag-must-be-accurate `packages/ui/react-ui/src/components/Button/IconButton.tsx:15`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.81. The likeliest place is lines 15-28 (`type IconButtonProps = Omit<Button.RootProps, 'children'> &`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1074 structured-logging-not-console `packages/ui/react-ui/src/components/Card/Card.stories.tsx:24`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 24-35 (`const DefaultStory = ({ title, description, image, fullWidth, elevation }: St...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1075 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Card/Card.stories.tsx:59`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 59-70 (`const meta = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1076 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Carousel/Carousel.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 23-34 (`const DefaultStory = ({ count = IMAGES.length, continuous, autoAdvance }: Sto...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1077 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Collapsible/Collapsible.stories.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 48-59 (`return ids;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1078 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Column/Column.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 75-89 (`const meta: Meta = {`, location confidence 0.58). Judged with added `imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1079 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Column/Column.stories.tsx:90`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 90-99 (`const InputList = ({ items = 50 }: { items?: number }) => (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1080 no-invented-theme-tokens `packages/ui/react-ui/src/components/Column/Column.stories.tsx:200`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 200-211 (`export const Experimental = {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1081 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/DatePicker/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as DatePicker from './DatePicker.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1082 no-casts `packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 51-61 (`const meta = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1083 no-casts `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 103-116 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1084 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Drawer/Drawer.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 41-55 (`const Body = ({ title, description, grabber, filler = 0 }: StoryArgs) => (`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1085 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 38-49 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1086 no-casts `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 35-42 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1087 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 22-33 (`const ErrorFallback = ({ children, error, title, data }: ErrorFallbackProps) ...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1088 no-casts `packages/ui/react-ui/src/components/Field/Field.stories.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 142-156 (`const meta = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1089 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Field/Field.stories.tsx:231`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 231-242 (`export const Input: Story = {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1090 themed-primitives-take-classNames `packages/ui/react-ui/src/components/Field/PinInput.tsx:24`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.81. The likeliest place is lines 24-30 (`type PinInputProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'maxLength...`, location confidence 0.90). Judged with added `package` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1091 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Field/PinInput.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 55-66 (`const charPattern = useMemo(() => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1092 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Field/SegmentedInput.tsx:80`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 80-89 (`const segmentClassNames =`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1093 no-styling-wrapper-divs `packages/ui/react-ui/src/components/FloatingPanel/FloatingPanel.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 30-41 (`const DefaultStory = ({ draggable = true, resizable = true, persistRect = tru...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1094 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Focus/Focus.stories.tsx:26`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 26-39 (`const Container = ({ classNames, children }: ThemedClassName<PropsWithChildre...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1095 no-styling-wrapper-divs `packages/ui/react-ui/src/components/HoverCard/HoverCard.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 15-26 (`const DefaultStory = ({ openDelay, closeDelay, side = 'top' }: StoryProps) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1096 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Icon/Icon.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-99 (`export const Brand: Story = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1097 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Image/Image.stories.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 69-80 (`export const Many: Story = {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1098 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Main/Main.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 76-87 (`<ComplementarySidebarToggle />`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1099 event-handler-naming-convention `packages/ui/react-ui/src/components/Main/Main.tsx:54`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 54-67 (`const prevents = (handler: ((event: Event) => void) | undefined) => {`, location confidence 0.23). Judged with added `siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1100 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Menu/Menu.stories.tsx:210`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 210-221 (`export const TestSelect: StoryObj = {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1101 no-styling-wrapper-divs `packages/ui/react-ui/src/components/MenuButton/MenuButton.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 39-50 (`testId: 'story.extraction',`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1102 no-hand-rolled-lists `packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:17`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 17-28 (`const List = composable<HTMLDivElement, ScrollArea.RootProps>((props, forward...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1103 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Panel/Panel.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 102-113 (`const ElevationStory = () => (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1104 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 122-133 (`export const TestVirtualAnchor: StoryObj = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1105 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:153`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 153-164 (`export const TestVirtualAnchorFollowsScroll: StoryObj = {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1106 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:130`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 130-141 (`const meta = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1107 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 47-58 (`const Grid = ({ items = 50 }: { items?: number }) => (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1108 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:142`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 142-153 (`return (`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1109 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/ScrollArea/ScrollAreaThumbs.tsx:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-16 (`import React, { useCallback, useEffect, useRef, useState } from 'react';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1110 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/ScrollContainer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as ScrollContainer from './ScrollContainer.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1111 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Select/Select.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 57-68 (`const TestStory = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1112 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Separator/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Separator from './Separator.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1113 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 19-32 (`export const Default = {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1114 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:19`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 19-32 (`export const Default = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1115 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Slider/Slider.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 84-95 (`export const ThumbVisibility: Story = {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1116 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 181-192 (`const HandoverStory = ({ stages = 3 }: StoryArgs) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1117 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/TextCrawl/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as TextCrawl from './TextCrawl.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1118 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 35-42 (`export const Default: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1119 no-styling-wrapper-divs `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 52-63 (`export const Controlled: Story = {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1120 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 28-39 (`const DefaultStory = () => (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1121 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Toast/Toast.tsx:186`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 186-197 (`queueMicrotask(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1122 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Toc/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Toc from './Toc.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1123 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Toolbar/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Toolbar from './Toolbar.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1124 no-casts `packages/ui/react-ui/src/components/Toolbar/Toolbar.stories.tsx:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 69-82 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1125 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-53 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1126 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 55-66 (`test('keeps a description the trigger already carries', async ({ expect }) => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1127 no-sleep-in-test `packages/ui/react-ui/src/components/Tooltip/Tooltip.test.tsx:79`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 79-90 (`</Tooltip.Provider>,`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1128 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Tooltip/Tooltip.tsx:184`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 184-195 (`useEffect(() => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1129 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Tour/Tour.stories.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 98-109 (`<Tour.Arrow />`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1130 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:48`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 48-59 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bc2e119082-1131 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 107-118 (`const ScrollToolbar = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1132 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 119-130 (`<div className='flex justify-center gap-1'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1133 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 16-27 (`const ShowStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1134 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 1-11 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1135 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Container/Container.stories.tsx:11`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 11-16 (`const DefaultStory = () => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1136 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 14-19 (`const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1137 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 61-67 (`const CenterStory = () => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1138 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/layout/Flex/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as Flex from './Flex.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1139 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/layout/Grid/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Grid from './Grid.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1140 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/playground/Elevation.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 50-63 (`const meta = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1141 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 116-134 (`const Section = ({ title, fields = false, children }: PropsWithChildren<{ tit...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1142 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/DensityProvider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-6 (`export * as DensityProvider from './DensityProvider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1143 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/providers/ElevationProvider/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as ElevationProvider from './ElevationProvider.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1144 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1145 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-62 (`const layouts: Record<ContainerType, FC<ContainerProps>> = {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1146 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 63-70 (`column: ({ classNames, children }: ContainerProps) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1147 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`className={mx(`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1148 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bc2e119082-1149 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 54-63 (`))}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7fb4a257bc354f9b32ffb4c3f76accbd1451a32e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1149 violations written to fragments, 10071 uncertain, 83937 clean, 0 unanswered
- left for an agentic reviewer: 723 batch(es)

```text
requests: 38075 (7100 verdicts re-asked with context the model requested)
estimated input tokens: 239281610
billed input tokens: 224529978 (cost $9.4303)
measured chars per token: 3.20
```

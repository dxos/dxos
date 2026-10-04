---
branch: HEAD
commit: be45a6b12c150e117d37782e86b13d3cc9fe52be
base: d97e88e9739a678073488d174642ea6291191f21
mode: fast
createdAt: 2026-10-04T15:04:04.364Z
isFinalized: true
groups: 5774
rules: [barrel-imports-not-internal-paths, business-logic-out-of-ui, canonical-api-surface, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, isolate-benchmark-setup-and-flaky-tests, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, options-object-with-defaults, reactive-state-via-atom-bridge, reuse-shared-test-layer, schema-declare-and-brand, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: be45a6b12c
---

_241 error(s), 492 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- be45a6b12c-1 - ignored - moon-yml-entrypoint-registration - packages/common/effect/package.json:85
- be45a6b12c-2 - ignored - import-as-namespace-is-all-or-nothing - packages/common/effect/src/KvsStore.ts:1
- be45a6b12c-3 - ignored - namespace-export-with-internal-hiding - packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1
- be45a6b12c-4 - ignored - moon-yml-entrypoint-registration - packages/common/graph/package.json:49
- be45a6b12c-5 - ignored - no-sleep-in-test - packages/common/graph/src/GraphBuilder.test.ts:1
- be45a6b12c-6 - ignored - no-casts - packages/common/graph/src/GraphModel.ts:871
- be45a6b12c-7 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- be45a6b12c-8 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- be45a6b12c-9 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- be45a6b12c-10 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- be45a6b12c-11 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- be45a6b12c-12 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- be45a6b12c-13 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25
- be45a6b12c-14 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459
- be45a6b12c-15 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- be45a6b12c-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- be45a6b12c-17 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119
- be45a6b12c-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126
- be45a6b12c-19 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- be45a6b12c-20 - ignored - moon-yml-entrypoint-registration - packages/core/compute/assistant-toolkit/package.json:37
- be45a6b12c-21 - ignored - namespace-export-with-internal-hiding - packages/core/compute/assistant-toolkit/src/index.ts:1
- be45a6b12c-22 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1
- be45a6b12c-23 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/automation/index.ts:1
- be45a6b12c-24 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/skill-manager/index.ts:1
- be45a6b12c-25 - ignored - test-asserts-real-behavior - packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23
- be45a6b12c-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140
- be45a6b12c-27 - ignored - inline-obj-parent - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:175
- be45a6b12c-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- be45a6b12c-29 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:113
- be45a6b12c-30 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- be45a6b12c-31 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.test.ts:62
- be45a6b12c-32 - ignored - no-casts - packages/core/compute/assistant/src/tool-runtime/services.ts:185
- be45a6b12c-33 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/assistant/src/util/artifact.ts:18
- be45a6b12c-34 - ignored - no-casts - packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62
- be45a6b12c-35 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- be45a6b12c-36 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79
- be45a6b12c-37 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- be45a6b12c-38 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- be45a6b12c-39 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:405
- be45a6b12c-40 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429
- be45a6b12c-41 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462
- be45a6b12c-42 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:738
- be45a6b12c-43 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:351
- be45a6b12c-44 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:363
- be45a6b12c-45 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390
- be45a6b12c-46 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- be45a6b12c-47 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- be45a6b12c-48 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- be45a6b12c-49 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:487
- be45a6b12c-50 - ignored - no-casts - packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13
- be45a6b12c-51 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224
- be45a6b12c-52 - ignored - no-casts - packages/core/compute/compute-runtime/src/services/service-registry.ts:42
- be45a6b12c-53 - ignored - no-casts - packages/core/compute/compute-runtime/src/testing/layer.ts:78
- be45a6b12c-54 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381
- be45a6b12c-55 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111
- be45a6b12c-56 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- be45a6b12c-57 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:235
- be45a6b12c-58 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1044
- be45a6b12c-59 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- be45a6b12c-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- be45a6b12c-61 - ignored - no-casts - packages/core/compute/compute/src/ServiceResolver.ts:85
- be45a6b12c-62 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/ServiceResolver.ts:115
- be45a6b12c-63 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/util/ast.ts:65
- be45a6b12c-64 - ignored - namespace-brand-key-prefixing - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40
- be45a6b12c-65 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:52
- be45a6b12c-66 - ignored - no-casts - packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136
- be45a6b12c-67 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:61
- be45a6b12c-68 - ignored - no-casts - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- be45a6b12c-69 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84
- be45a6b12c-70 - ignored - deprecated-tag-must-be-accurate - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30
- be45a6b12c-71 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93
- be45a6b12c-72 - ignored - no-casts - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77
- be45a6b12c-73 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:327
- be45a6b12c-74 - ignored - comment-hygiene - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- be45a6b12c-75 - ignored - test-asserts-real-behavior - packages/core/compute/mcp-client/src/McpToolkit.test.ts:76
- be45a6b12c-76 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- be45a6b12c-77 - ignored - no-casts - packages/core/compute/operation/src/invoker.test.ts:23
- be45a6b12c-78 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/invoker.test.ts:63
- be45a6b12c-79 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/operation.test.ts:112
- be45a6b12c-80 - ignored - no-sleep-in-test - packages/core/compute/operation/src/operation.test.ts:196
- be45a6b12c-81 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- be45a6b12c-82 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- be45a6b12c-83 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- be45a6b12c-84 - ignored - no-casts - packages/core/compute/pipeline-email/src/stages/stats.test.ts:17
- be45a6b12c-85 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156
- be45a6b12c-86 - ignored - test-asserts-real-behavior - packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368
- be45a6b12c-87 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17
- be45a6b12c-88 - ignored - no-casts - packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15
- be45a6b12c-89 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116
- be45a6b12c-90 - ignored - no-sleep-in-test - packages/core/compute/pipeline/src/Pipeline.test.ts:131
- be45a6b12c-91 - ignored - inline-obj-parent - packages/core/echo/echo-client-e2e/src/merge.test.ts:147
- be45a6b12c-92 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/merge.test.ts:219
- be45a6b12c-93 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75
- be45a6b12c-94 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47
- be45a6b12c-95 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154
- be45a6b12c-96 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46
- be45a6b12c-97 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718
- be45a6b12c-98 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- be45a6b12c-99 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- be45a6b12c-100 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/proxy-db/database.test.ts:782
- be45a6b12c-101 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/database.test.ts:926
- be45a6b12c-102 - ignored - no-casts - packages/core/echo/echo-client/src/testing/test-database-layer.ts:64
- be45a6b12c-103 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507
- be45a6b12c-104 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- be45a6b12c-105 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- be45a6b12c-106 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- be45a6b12c-107 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:860
- be45a6b12c-108 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- be45a6b12c-109 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79
- be45a6b12c-110 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- be45a6b12c-111 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- be45a6b12c-112 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- be45a6b12c-113 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73
- be45a6b12c-114 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- be45a6b12c-115 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421
- be45a6b12c-116 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82
- be45a6b12c-117 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146
- be45a6b12c-118 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- be45a6b12c-119 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/data-service.ts:109
- be45a6b12c-120 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49
- be45a6b12c-121 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182
- be45a6b12c-122 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270
- be45a6b12c-123 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- be45a6b12c-124 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- be45a6b12c-125 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32
- be45a6b12c-126 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- be45a6b12c-127 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- be45a6b12c-128 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- be45a6b12c-129 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- be45a6b12c-130 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/foreign-key.ts:9
- be45a6b12c-131 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- be45a6b12c-132 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662
- be45a6b12c-133 - ignored - no-casts - packages/core/echo/echo/src/Annotation.test.ts:331
- be45a6b12c-134 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- be45a6b12c-135 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- be45a6b12c-136 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- be45a6b12c-137 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:666
- be45a6b12c-138 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- be45a6b12c-139 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162
- be45a6b12c-140 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- be45a6b12c-141 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- be45a6b12c-142 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/typename.ts:56
- be45a6b12c-143 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- be45a6b12c-144 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:86
- be45a6b12c-145 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/relation.ts:210
- be45a6b12c-146 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/type-kind.ts:47
- be45a6b12c-147 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Format/date.ts:13
- be45a6b12c-148 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo/src/internal/Format/types.ts:54
- be45a6b12c-149 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30
- be45a6b12c-150 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75
- be45a6b12c-151 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123
- be45a6b12c-152 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584
- be45a6b12c-153 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71
- be45a6b12c-154 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/set-value.ts:16
- be45a6b12c-155 - ignored - comment-hygiene - packages/core/echo/echo/src/internal/Obj/set-value.ts:28
- be45a6b12c-156 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- be45a6b12c-157 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- be45a6b12c-158 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- be45a6b12c-159 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- be45a6b12c-160 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- be45a6b12c-161 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- be45a6b12c-162 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- be45a6b12c-163 - ignored - no-casts - packages/core/echo/echo/src/testing/util.ts:27
- be45a6b12c-164 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540
- be45a6b12c-165 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- be45a6b12c-166 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/index-tracker.ts:103
- be45a6b12c-167 - ignored - error-messages-carry-context - packages/core/mesh/edge-client/src/edge-http-client.ts:157
- be45a6b12c-168 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- be45a6b12c-169 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:865
- be45a6b12c-170 - ignored - no-casts - packages/core/mesh/edge-client/src/service/edge-service.test.ts:26
- be45a6b12c-171 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- be45a6b12c-172 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109
- be45a6b12c-173 - ignored - no-sleep-in-test - packages/core/mesh/rpc/src/effect-rpc.test.ts:73
- be45a6b12c-174 - ignored - no-casts - packages/devtools/cli/src/bin.ts:103
- be45a6b12c-175 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:239
- be45a6b12c-176 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- be45a6b12c-177 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- be45a6b12c-178 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:121
- be45a6b12c-179 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129
- be45a6b12c-180 - ignored - no-casts - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118
- be45a6b12c-181 - ignored - error-messages-carry-context - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130
- be45a6b12c-182 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- be45a6b12c-183 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/create-object.ts:37
- be45a6b12c-184 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405
- be45a6b12c-185 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- be45a6b12c-186 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- be45a6b12c-187 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73
- be45a6b12c-188 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50
- be45a6b12c-189 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- be45a6b12c-190 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22
- be45a6b12c-191 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26
- be45a6b12c-192 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82
- be45a6b12c-193 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49
- be45a6b12c-194 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50
- be45a6b12c-195 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:122
- be45a6b12c-196 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- be45a6b12c-197 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- be45a6b12c-198 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:53
- be45a6b12c-199 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- be45a6b12c-200 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- be45a6b12c-201 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- be45a6b12c-202 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- be45a6b12c-203 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- be45a6b12c-204 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31
- be45a6b12c-205 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- be45a6b12c-206 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- be45a6b12c-207 - ignored - no-casts - packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27
- be45a6b12c-208 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- be45a6b12c-209 - ignored - reuse-shared-test-layer - packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438
- be45a6b12c-210 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- be45a6b12c-211 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261
- be45a6b12c-212 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:182
- be45a6b12c-213 - ignored - no-invented-theme-tokens - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:278
- be45a6b12c-214 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118
- be45a6b12c-215 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202
- be45a6b12c-216 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/operations/sync.ts:48
- be45a6b12c-217 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217
- be45a6b12c-218 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- be45a6b12c-219 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171
- be45a6b12c-220 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- be45a6b12c-221 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30
- be45a6b12c-222 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-brain/src/index.ts:1
- be45a6b12c-223 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- be45a6b12c-224 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- be45a6b12c-225 - ignored - no-casts - packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83
- be45a6b12c-226 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44
- be45a6b12c-227 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- be45a6b12c-228 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:63
- be45a6b12c-229 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:75
- be45a6b12c-230 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:111
- be45a6b12c-231 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30
- be45a6b12c-232 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:54
- be45a6b12c-233 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93
- be45a6b12c-234 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42
- be45a6b12c-235 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:84
- be45a6b12c-236 - ignored - test-asserts-real-behavior - packages/plugins/plugin-chess-com/src/plugin.test.ts:17
- be45a6b12c-237 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70
- be45a6b12c-238 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94
- be45a6b12c-239 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-chess/src/index.ts:1
- be45a6b12c-240 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44
- be45a6b12c-241 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58
- be45a6b12c-242 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- be45a6b12c-243 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- be45a6b12c-244 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- be45a6b12c-245 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- be45a6b12c-246 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89
- be45a6b12c-247 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251
- be45a6b12c-248 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31
- be45a6b12c-249 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- be45a6b12c-250 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/schema-defs.test.ts:39
- be45a6b12c-251 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22
- be45a6b12c-252 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- be45a6b12c-253 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53
- be45a6b12c-254 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77
- be45a6b12c-255 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128
- be45a6b12c-256 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- be45a6b12c-257 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- be45a6b12c-258 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- be45a6b12c-259 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132
- be45a6b12c-260 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166
- be45a6b12c-261 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- be45a6b12c-262 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:50
- be45a6b12c-263 - ignored - no-casts - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61
- be45a6b12c-264 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:90
- be45a6b12c-265 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96
- be45a6b12c-266 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- be45a6b12c-267 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm-project.ts:59
- be45a6b12c-268 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:78
- be45a6b12c-269 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13
- be45a6b12c-270 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:807
- be45a6b12c-271 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71
- be45a6b12c-272 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- be45a6b12c-273 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- be45a6b12c-274 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- be45a6b12c-275 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66
- be45a6b12c-276 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78
- be45a6b12c-277 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- be45a6b12c-278 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:67
- be45a6b12c-279 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:103
- be45a6b12c-280 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:187
- be45a6b12c-281 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-debug/src/index.ts:1
- be45a6b12c-282 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- be45a6b12c-283 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27
- be45a6b12c-284 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61
- be45a6b12c-285 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- be45a6b12c-286 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- be45a6b12c-287 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- be45a6b12c-288 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- be45a6b12c-289 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29
- be45a6b12c-290 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161
- be45a6b12c-291 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512
- be45a6b12c-292 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- be45a6b12c-293 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136
- be45a6b12c-294 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:87
- be45a6b12c-295 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:177
- be45a6b12c-296 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:45
- be45a6b12c-297 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- be45a6b12c-298 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39
- be45a6b12c-299 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- be45a6b12c-300 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- be45a6b12c-301 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:113
- be45a6b12c-302 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73
- be45a6b12c-303 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32
- be45a6b12c-304 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/connector.ts:58
- be45a6b12c-305 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/DiscordSource.ts:1
- be45a6b12c-306 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-discord/src/errors.ts:16
- be45a6b12c-307 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/operations/sync.ts:217
- be45a6b12c-308 - ignored - no-casts - packages/plugins/plugin-discord/src/services/discord-source.test.ts:30
- be45a6b12c-309 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/services/discord-source.test.ts:136
- be45a6b12c-310 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62
- be45a6b12c-311 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38
- be45a6b12c-312 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57
- be45a6b12c-313 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108
- be45a6b12c-314 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26
- be45a6b12c-315 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- be45a6b12c-316 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29
- be45a6b12c-317 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23
- be45a6b12c-318 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39
- be45a6b12c-319 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75
- be45a6b12c-320 - ignored - no-casts - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27
- be45a6b12c-321 - ignored - no-casts - packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89
- be45a6b12c-322 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- be45a6b12c-323 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- be45a6b12c-324 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:147
- be45a6b12c-325 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/capabilities/connector.ts:29
- be45a6b12c-326 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39
- be45a6b12c-327 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-github/src/operations/sync.test.ts:94
- be45a6b12c-328 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101
- be45a6b12c-329 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/walkthrough/generate.ts:82
- be45a6b12c-330 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- be45a6b12c-331 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/operations/calendar/list/handler.ts:28
- be45a6b12c-332 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117
- be45a6b12c-333 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39
- be45a6b12c-334 - ignored - no-casts - packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117
- be45a6b12c-335 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210
- be45a6b12c-336 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/services/google-credentials.test.ts:115
- be45a6b12c-337 - ignored - no-casts - packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62
- be45a6b12c-338 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- be45a6b12c-339 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66
- be45a6b12c-340 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272
- be45a6b12c-341 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-illustrator/src/index.ts:1
- be45a6b12c-342 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74
- be45a6b12c-343 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- be45a6b12c-344 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53
- be45a6b12c-345 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188
- be45a6b12c-346 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146
- be45a6b12c-347 - ignored - error-messages-carry-context - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.stories.tsx:292
- be45a6b12c-348 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154
- be45a6b12c-349 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27
- be45a6b12c-350 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180
- be45a6b12c-351 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-inbox/src/index.ts:1
- be45a6b12c-352 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37
- be45a6b12c-353 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85
- be45a6b12c-354 - ignored - no-casts - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37
- be45a6b12c-355 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73
- be45a6b12c-356 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52
- be45a6b12c-357 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/sync.test.ts:457
- be45a6b12c-358 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- be45a6b12c-359 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47
- be45a6b12c-360 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30
- be45a6b12c-361 - ignored - no-casts - packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31
- be45a6b12c-362 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59
- be45a6b12c-363 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- be45a6b12c-364 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-jmap/src/index.ts:1
- be45a6b12c-365 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32
- be45a6b12c-366 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60
- be45a6b12c-367 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- be45a6b12c-368 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88
- be45a6b12c-369 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124
- be45a6b12c-370 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47
- be45a6b12c-371 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:83
- be45a6b12c-372 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137
- be45a6b12c-373 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87
- be45a6b12c-374 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-kanban/src/index.ts:1
- be45a6b12c-375 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- be45a6b12c-376 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109
- be45a6b12c-377 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- be45a6b12c-378 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- be45a6b12c-379 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-linear/src/capabilities/connector.ts:29
- be45a6b12c-380 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-linear/src/operations/sync.test.ts:48
- be45a6b12c-381 - ignored - inline-obj-parent - packages/plugins/plugin-linear/src/operations/sync.ts:248
- be45a6b12c-382 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- be45a6b12c-383 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52
- be45a6b12c-384 - ignored - no-casts - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:117
- be45a6b12c-385 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- be45a6b12c-386 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84
- be45a6b12c-387 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128
- be45a6b12c-388 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28
- be45a6b12c-389 - ignored - no-casts - packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166
- be45a6b12c-390 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- be45a6b12c-391 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186
- be45a6b12c-392 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117
- be45a6b12c-393 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333
- be45a6b12c-394 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- be45a6b12c-395 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- be45a6b12c-396 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87
- be45a6b12c-397 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-markdown/src/index.ts:1
- be45a6b12c-398 - ignored - test-asserts-real-behavior - packages/plugins/plugin-markdown/src/plugin.test.ts:15
- be45a6b12c-399 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91
- be45a6b12c-400 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:37
- be45a6b12c-401 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58
- be45a6b12c-402 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70
- be45a6b12c-403 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- be45a6b12c-404 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:130
- be45a6b12c-405 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- be45a6b12c-406 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- be45a6b12c-407 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- be45a6b12c-408 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- be45a6b12c-409 - ignored - structured-logging-not-console - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27
- be45a6b12c-410 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25
- be45a6b12c-411 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:196
- be45a6b12c-412 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371
- be45a6b12c-413 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25
- be45a6b12c-414 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194
- be45a6b12c-415 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38
- be45a6b12c-416 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312
- be45a6b12c-417 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128
- be45a6b12c-418 - ignored - no-casts - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70
- be45a6b12c-419 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82
- be45a6b12c-420 - ignored - no-casts - packages/plugins/plugin-observability/src/plugin.test.ts:14
- be45a6b12c-421 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- be45a6b12c-422 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- be45a6b12c-423 - ignored - inline-obj-parent - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65
- be45a6b12c-424 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101
- be45a6b12c-425 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43
- be45a6b12c-426 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- be45a6b12c-427 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- be45a6b12c-428 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123
- be45a6b12c-429 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118
- be45a6b12c-430 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- be45a6b12c-431 - ignored - no-casts - packages/plugins/plugin-presenter/src/useExitPresenter.ts:16
- be45a6b12c-432 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- be45a6b12c-433 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- be45a6b12c-434 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- be45a6b12c-435 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- be45a6b12c-436 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- be45a6b12c-437 - ignored - no-casts - packages/plugins/plugin-preview/src/stories/Card.stories.tsx:101
- be45a6b12c-438 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:35
- be45a6b12c-439 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37
- be45a6b12c-440 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- be45a6b12c-441 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- be45a6b12c-442 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458
- be45a6b12c-443 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124
- be45a6b12c-444 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-projects/src/index.ts:1
- be45a6b12c-445 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109
- be45a6b12c-446 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104
- be45a6b12c-447 - ignored - no-casts - packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81
- be45a6b12c-448 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/templates/inbox-research.ts:55
- be45a6b12c-449 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- be45a6b12c-450 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- be45a6b12c-451 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129
- be45a6b12c-452 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:185
- be45a6b12c-453 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- be45a6b12c-454 - ignored - business-logic-out-of-ui - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130
- be45a6b12c-455 - ignored - no-casts - packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41
- be45a6b12c-456 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- be45a6b12c-457 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99
- be45a6b12c-458 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54
- be45a6b12c-459 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448
- be45a6b12c-460 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222
- be45a6b12c-461 - ignored - no-casts - packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296
- be45a6b12c-462 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- be45a6b12c-463 - ignored - no-casts - packages/plugins/plugin-routine/src/commands/trigger/util.ts:76
- be45a6b12c-464 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- be45a6b12c-465 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- be45a6b12c-466 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290
- be45a6b12c-467 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:196
- be45a6b12c-468 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- be45a6b12c-469 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- be45a6b12c-470 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-s3/src/capabilities/connector.ts:95
- be45a6b12c-471 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66
- be45a6b12c-472 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- be45a6b12c-473 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74
- be45a6b12c-474 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-sandbox/src/index.ts:1
- be45a6b12c-475 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- be45a6b12c-476 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76
- be45a6b12c-477 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- be45a6b12c-478 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- be45a6b12c-479 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- be45a6b12c-480 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- be45a6b12c-481 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59
- be45a6b12c-482 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36
- be45a6b12c-483 - ignored - no-casts - packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40
- be45a6b12c-484 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- be45a6b12c-485 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- be45a6b12c-486 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54
- be45a6b12c-487 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58
- be45a6b12c-488 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- be45a6b12c-489 - ignored - name-for-general-behavior - packages/plugins/plugin-search/src/hooks/sync.ts:47
- be45a6b12c-490 - ignored - no-casts - packages/plugins/plugin-search/src/hooks/sync.ts:82
- be45a6b12c-491 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-search/src/index.ts:1
- be45a6b12c-492 - ignored - no-casts - packages/plugins/plugin-search/src/search/exa.ts:93
- be45a6b12c-493 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- be45a6b12c-494 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299
- be45a6b12c-495 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- be45a6b12c-496 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23
- be45a6b12c-497 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267
- be45a6b12c-498 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84
- be45a6b12c-499 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- be45a6b12c-500 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- be45a6b12c-501 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/capabilities/connector.ts:29
- be45a6b12c-502 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/operations/sync.ts:173
- be45a6b12c-503 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321
- be45a6b12c-504 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256
- be45a6b12c-505 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25
- be45a6b12c-506 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/join/util.ts:31
- be45a6b12c-507 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- be45a6b12c-508 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112
- be45a6b12c-509 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100
- be45a6b12c-510 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- be45a6b12c-511 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- be45a6b12c-512 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:259
- be45a6b12c-513 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- be45a6b12c-514 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:250
- be45a6b12c-515 - ignored - no-casts - packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95
- be45a6b12c-516 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48
- be45a6b12c-517 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242
- be45a6b12c-518 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- be45a6b12c-519 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58
- be45a6b12c-520 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:199
- be45a6b12c-521 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180
- be45a6b12c-522 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225
- be45a6b12c-523 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- be45a6b12c-524 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54
- be45a6b12c-525 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72
- be45a6b12c-526 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108
- be45a6b12c-527 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- be45a6b12c-528 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80
- be45a6b12c-529 - ignored - inline-obj-parent - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99
- be45a6b12c-530 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- be45a6b12c-531 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- be45a6b12c-532 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109
- be45a6b12c-533 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145
- be45a6b12c-534 - ignored - no-casts - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23
- be45a6b12c-535 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64
- be45a6b12c-536 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:77
- be45a6b12c-537 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89
- be45a6b12c-538 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31
- be45a6b12c-539 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:161
- be45a6b12c-540 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- be45a6b12c-541 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18
- be45a6b12c-542 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- be45a6b12c-543 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- be45a6b12c-544 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:73
- be45a6b12c-545 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- be45a6b12c-546 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139
- be45a6b12c-547 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- be45a6b12c-548 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- be45a6b12c-549 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:87
- be45a6b12c-550 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- be45a6b12c-551 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- be45a6b12c-552 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232
- be45a6b12c-553 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- be45a6b12c-554 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- be45a6b12c-555 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-thread/src/index.ts:1
- be45a6b12c-556 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116
- be45a6b12c-557 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-transcription/src/index.ts:1
- be45a6b12c-558 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- be45a6b12c-559 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- be45a6b12c-560 - ignored - no-casts - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- be45a6b12c-561 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trello/src/capabilities/connector.ts:31
- be45a6b12c-562 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- be45a6b12c-563 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:136
- be45a6b12c-564 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:151
- be45a6b12c-565 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trello/src/operations/handlers.test.ts:175
- be45a6b12c-566 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:199
- be45a6b12c-567 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.test.ts:240
- be45a6b12c-568 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.ts:191
- be45a6b12c-569 - ignored - no-casts - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54
- be45a6b12c-570 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102
- be45a6b12c-571 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- be45a6b12c-572 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- be45a6b12c-573 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- be45a6b12c-574 - ignored - no-casts - packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303
- be45a6b12c-575 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54
- be45a6b12c-576 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28
- be45a6b12c-577 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- be45a6b12c-578 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- be45a6b12c-579 - ignored - no-casts - packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17
- be45a6b12c-580 - ignored - moon-yml-entrypoint-registration - packages/sdk/app-framework/package.json:73
- be45a6b12c-581 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/common/index.ts:1
- be45a6b12c-582 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/core/capability-manager.ts:112
- be45a6b12c-583 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:403
- be45a6b12c-584 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:490
- be45a6b12c-585 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/capability.ts:535
- be45a6b12c-586 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin-manifest.ts:115
- be45a6b12c-587 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:474
- be45a6b12c-588 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:626
- be45a6b12c-589 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/core/registry.test.ts:35
- be45a6b12c-590 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- be45a6b12c-591 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- be45a6b12c-592 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114
- be45a6b12c-593 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/plugin-process-manager/index.ts:1
- be45a6b12c-594 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56
- be45a6b12c-595 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205
- be45a6b12c-596 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229
- be45a6b12c-597 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253
- be45a6b12c-598 - ignored - no-casts - packages/sdk/app-framework/src/testing/harness.ts:250
- be45a6b12c-599 - ignored - deprecated-tag-must-be-accurate - packages/sdk/app-framework/src/testing/withPluginManager.tsx:92
- be45a6b12c-600 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.tsx:107
- be45a6b12c-601 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54
- be45a6b12c-602 - ignored - no-casts - packages/sdk/app-framework/src/ui/components/Surface/types.ts:51
- be45a6b12c-603 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354
- be45a6b12c-604 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82
- be45a6b12c-605 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- be45a6b12c-606 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- be45a6b12c-607 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.test.ts:459
- be45a6b12c-608 - ignored - no-sleep-in-test - packages/sdk/app-graph/src/AppGraph.test.ts:893
- be45a6b12c-609 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:474
- be45a6b12c-610 - ignored - use-context-scoped-cancellation - packages/sdk/app-graph/src/AppGraph.ts:619
- be45a6b12c-611 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:619
- be45a6b12c-612 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-solid/src/index.ts:1
- be45a6b12c-613 - ignored - no-casts - packages/sdk/app-solid/src/useCapabilities.test.tsx:19
- be45a6b12c-614 - ignored - no-casts - packages/sdk/app-solid/src/usePluginManager.test.tsx:13
- be45a6b12c-615 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22
- be45a6b12c-616 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15
- be45a6b12c-617 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:194
- be45a6b12c-618 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/TypeSection.ts:159
- be45a6b12c-619 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39
- be45a6b12c-620 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324
- be45a6b12c-621 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- be45a6b12c-622 - ignored - no-casts - packages/sdk/client-e2e/src/invitations.test.ts:396
- be45a6b12c-623 - ignored - no-sleep-in-test - packages/sdk/client-e2e/src/spaces.test.ts:65
- be45a6b12c-624 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:449
- be45a6b12c-625 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:263
- be45a6b12c-626 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235
- be45a6b12c-627 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247
- be45a6b12c-628 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- be45a6b12c-629 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- be45a6b12c-630 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- be45a6b12c-631 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- be45a6b12c-632 - ignored - no-casts - packages/sdk/client-services/src/internal/devtools/feeds.ts:56
- be45a6b12c-633 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- be45a6b12c-634 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/devtools/feeds.ts:104
- be45a6b12c-635 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/devtools/spaces.ts:73
- be45a6b12c-636 - ignored - no-casts - packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248
- be45a6b12c-637 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- be45a6b12c-638 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:385
- be45a6b12c-639 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:614
- be45a6b12c-640 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:276
- be45a6b12c-641 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- be45a6b12c-642 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- be45a6b12c-643 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- be45a6b12c-644 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- be45a6b12c-645 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/logging/logging.test.ts:30
- be45a6b12c-646 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- be45a6b12c-647 - ignored - no-casts - packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80
- be45a6b12c-648 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25
- be45a6b12c-649 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92
- be45a6b12c-650 - ignored - no-casts - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299
- be45a6b12c-651 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488
- be45a6b12c-652 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- be45a6b12c-653 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- be45a6b12c-654 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.ts:189
- be45a6b12c-655 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/feed-syncer.ts:429
- be45a6b12c-656 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71
- be45a6b12c-657 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:107
- be45a6b12c-658 - ignored - no-casts - packages/sdk/client-services/src/internal/services/service-context.test.ts:32
- be45a6b12c-659 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:78
- be45a6b12c-660 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164
- be45a6b12c-661 - ignored - no-casts - packages/sdk/client-services/src/internal/space/space-manager.ts:181
- be45a6b12c-662 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390
- be45a6b12c-663 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157
- be45a6b12c-664 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- be45a6b12c-665 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- be45a6b12c-666 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:275
- be45a6b12c-667 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:489
- be45a6b12c-668 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- be45a6b12c-669 - ignored - no-casts - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123
- be45a6b12c-670 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:384
- be45a6b12c-671 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- be45a6b12c-672 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/invitations/host.ts:29
- be45a6b12c-673 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:211
- be45a6b12c-674 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/testing/test-worker-factory.ts:70
- be45a6b12c-675 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/config/src/config-service.test.ts:107
- be45a6b12c-676 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/observability/src/ai/AiObservability.test.ts:372
- be45a6b12c-677 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/observability/src/ai/index.ts:1
- be45a6b12c-678 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34
- be45a6b12c-679 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55
- be45a6b12c-680 - ignored - namespace-export-with-internal-hiding - packages/sdk/observability/src/index.ts:1
- be45a6b12c-681 - ignored - no-sleep-in-test - packages/sdk/observability/src/providers/object-events.test.ts:67
- be45a6b12c-682 - ignored - no-casts - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108
- be45a6b12c-683 - ignored - no-sleep-in-test - packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120
- be45a6b12c-684 - ignored - structured-logging-not-console - packages/sdk/schema/src/experimental/json-schema.test.ts:111
- be45a6b12c-685 - ignored - no-casts - packages/sdk/schema/src/experimental/json-schema.test.ts:274
- be45a6b12c-686 - ignored - no-casts - packages/sdk/schema/src/graph/graph.ts:28
- be45a6b12c-687 - ignored - no-casts - packages/sdk/schema/src/projection/format.ts:65
- be45a6b12c-688 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:596
- be45a6b12c-689 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- be45a6b12c-690 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/projection/projection.ts:1
- be45a6b12c-691 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/testing/generator.ts:13
- be45a6b12c-692 - ignored - no-casts - packages/sdk/schema/src/testing/generator.ts:260
- be45a6b12c-693 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/schema/src/testing/generator.ts:288
- be45a6b12c-694 - ignored - deprecated-tag-must-be-accurate - packages/sdk/schema/src/util/deprecated.ts:66
- be45a6b12c-695 - ignored - no-echo-internal-in-sdk - packages/sdk/schema/src/util/validate.test.ts:13
- be45a6b12c-696 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- be45a6b12c-697 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:116
- be45a6b12c-698 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61
- be45a6b12c-699 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- be45a6b12c-700 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169
- be45a6b12c-701 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70
- be45a6b12c-702 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79
- be45a6b12c-703 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134
- be45a6b12c-704 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- be45a6b12c-705 - ignored - comment-hygiene - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116
- be45a6b12c-706 - ignored - test-asserts-real-behavior - packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200
- be45a6b12c-707 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-facts.test.ts:85
- be45a6b12c-708 - ignored - no-mixed-promise-effect-lifecycle - packages/stories/stories-brain/src/test/feed-stats.test.ts:53
- be45a6b12c-709 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95
- be45a6b12c-710 - ignored - no-casts - packages/stories/stories-inbox/src/testing/archive.test.ts:78
- be45a6b12c-711 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/stories-inbox/src/testing/seed.ts:117
- be45a6b12c-712 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- be45a6b12c-713 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- be45a6b12c-714 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/storybook-testing/src/test/startup.test.ts:73
- be45a6b12c-715 - ignored - no-casts - packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66
- be45a6b12c-716 - ignored - flat-layer-composition - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297
- be45a6b12c-717 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441
- be45a6b12c-718 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26
- be45a6b12c-719 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20
- be45a6b12c-720 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24
- be45a6b12c-721 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- be45a6b12c-722 - ignored - no-casts - packages/ui/react-ui-form/src/util/omit.ts:21
- be45a6b12c-723 - ignored - no-casts - packages/ui/react-ui-form/src/util/properties.test.ts:114
- be45a6b12c-724 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:120
- be45a6b12c-725 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216
- be45a6b12c-726 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317
- be45a6b12c-727 - ignored - no-casts - packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76
- be45a6b12c-728 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47
- be45a6b12c-729 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- be45a6b12c-730 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- be45a6b12c-731 - ignored - no-casts - packages/ui/react-ui-table/src/util/schema.ts:18
- be45a6b12c-732 - ignored - no-sleep-in-test - packages/ui/react-ui-terminal/src/cli/shell.test.ts:24
- be45a6b12c-733 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162

## Issues

# WARN be45a6b12c-1 moon-yml-entrypoint-registration `packages/common/effect/package.json:85`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 85-96 (`"import": "./dist/lib/ns/KvsStore.mjs"`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-2 import-as-namespace-is-all-or-nothing `packages/common/effect/src/KvsStore.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-8 (`export { createKvsStore as make } from './atom-kvs.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-3 namespace-export-with-internal-hiding `packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as Alpha from './Alpha.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-4 moon-yml-entrypoint-registration `packages/common/graph/package.json:49`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 49-60 (`"import": "./dist/lib/Retention.mjs"`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-5 no-sleep-in-test `packages/common/graph/src/GraphBuilder.test.ts:1`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 1-38 (`import * as Duration from 'effect/Duration';`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-6 no-casts `packages/common/graph/src/GraphModel.ts:871`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 871-894 (`const remaining = inDegree.get(target)! - 1;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-7 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-8 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.85. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-9 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-10 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-11 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-12 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 148-154 (`),`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-13 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:25`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.90. The likeliest place is lines 25-47 (`import * as Wire from './Wire.ts';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-14 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 459-482 (`params.prompt,`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-15 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 293-304 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-17 errors-extend-base-error `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 119-125 (`export class SeedError extends Data.TaggedError('SeedError')<{ message: strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-18 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 126-137 (`export const seed = ({`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-19 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-20 moon-yml-entrypoint-registration `packages/core/compute/assistant-toolkit/package.json:37`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 37-48 (`"source": "./src/AgentOperationHandlerSet.ts",`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-21 namespace-export-with-internal-hiding `packages/core/compute/assistant-toolkit/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-11 (`export * from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-22 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/alarm/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as AlarmSkill from './AlarmSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-23 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/automation/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as AutomationSkill from './AutomationSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-24 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/skill-manager/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as SkillManagerSkill from './SkillManagerSkill.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-25 test-asserts-real-behavior `packages/core/compute/assistant-toolkit/src/skills/websearch/skill.test.ts:23`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 23-34 (`describe('WebSearchSkill', () => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:140`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 140-151 (`const addChecklist = (chat: Chat.Chat) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-27 inline-obj-parent `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:175`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.80. The likeliest place is lines 175-186 (`yield* Database.flush();`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-28 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-29 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:113`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 113-124 (`export const formatUserPrompt = ({`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-30 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-31 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 62-73 (`const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-32 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 185-192 (`Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-33 deprecated-tag-must-be-accurate `packages/core/compute/assistant/src/util/artifact.ts:18`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 18-25 (`export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-34 no-casts `packages/core/compute/compute-hyperformula/src/functions/edge-function.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 62-73 (`input = {} as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-35 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-36 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 79-90 (`),`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-37 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-38 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-39 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:405`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 405-428 (`}`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-40 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 429-452 (`const manager = yield* ProcessManager.Service;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-41 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 1462-1485 (`);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-42 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:738`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 738-761 (`yield* this.#store.putProcess({`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-43 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:351`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 351-362 (`};`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-44 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:363`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 363-374 (`};`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-45 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 390-401 (`export const layer: Layer.Layer<`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-46 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-47 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-48 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.84. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.55). Judged with added `imports, package, public-api` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-49 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 487-498 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-50 no-casts `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 13-26 (`describe('RemoteOperationInvoker', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-51 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:224`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 224-238 (`const makeHandle = (control: RemoteProcessManager.Control, remoteTrace?: Remo...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-52 no-casts `packages/core/compute/compute-runtime/src/services/service-registry.ts:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 42-53 (`E | ServiceResolver.ServiceNotAvailableError,`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-53 no-casts `packages/core/compute/compute-runtime/src/testing/layer.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-90 (`yield* Effect.promise(() => db!.flush());`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-54 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 381-404 (`#triggerQuery: QueryResult.QueryResult<Trigger.Trigger> | undefined;`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-55 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1111-1122 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-56 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

System One judges this a likely violation of `namespace-service-layers` (Layer constructors are module-level exports, never class statics), p=0.86. The likeliest place is lines 40-51 (`static layerKv = Layer.effect(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-57 no-casts `packages/core/compute/compute/src/Operation.ts:235`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 235-258 (`services: props.services ?? [],`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-58 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1044`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 1044-1067 (`export interface OperationService {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-59 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-60 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-61 no-casts `packages/core/compute/compute/src/ServiceResolver.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 85-96 (`export const succeed = <I, S>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-62 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/ServiceResolver.ts:115`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 115-129 (`export const fromContext = <Services>(ctx: Context.Context<Services>): Servic...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-63 error-messages-carry-context `packages/core/compute/conductor/src/util/ast.ts:65`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 65-76 (`let out: SchemaAST.PropertySignature | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-64 namespace-brand-key-prefixing `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:40`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 40-51 (`build.onResolve({ filter: /.*/, namespace: 'http-url' }, (args) => ({`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-65 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/bundler/plugins/http-plugin-esbuild.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 52-63 (`return yield* Effect.fail(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-66 no-casts `packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 136-147 (`const versionMeta = safeParseJson<any>(latest.versionMetaJSON);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-67 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 61-72 (`const contactExtractor = makeTemplateExtractor({`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-68 no-casts `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-69 no-mixed-promise-effect-lifecycle `packages/core/compute/extractor/src/ExtractionTemplate.test.ts:84`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 84-89 (`const operationServiceStub = Effect.provideService(Operation.Service, {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-70 deprecated-tag-must-be-accurate `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:30`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 30-41 (`export class FunctionsClient extends Resource {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-71 no-casts `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 93-102 (`export const createClientFromEnv = async (env: any): Promise<FunctionsClient>...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-72 no-casts `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:77`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 77-88 (`const decodeRequest = async (request: Request) => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-73 no-casts `packages/core/compute/link/src/Cursor.test.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 327-350 (`const { db } = await builder.createDatabase({ types: [Cursor.Cursor, AccessTo...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-74 comment-hygiene `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-75 test-asserts-real-behavior `packages/core/compute/mcp-client/src/McpToolkit.test.ts:76`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 76-87 (`output.toolCalls.length > 0`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-76 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-77 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-28 (`const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRun...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-78 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/invoker.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 63-75 (`const computeHandler = Operation.withHandler(Compute, (data) =>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-79 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/operation.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 112-123 (`},`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-80 no-sleep-in-test `packages/core/compute/operation/src/operation.test.ts:196`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 196-207 (`key: DXN.make('com.example.operation.test.asyncHandler'),`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-81 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-82 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-83 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-84 no-casts `packages/core/compute/pipeline-email/src/stages/stats.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 17-28 (`describe('statsStage', () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-85 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:156`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 156-167 (`const summarizeStage: Stage.Stage<Message.Message, Message.Message, never, Ct...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-86 test-asserts-real-behavior `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts:368`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 368-379 (`expect(indexedMessageCount).toBe(items.length);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-87 no-casts `packages/core/compute/pipeline-transcription/src/stages/correction-llm.test.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 17-29 (`const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-88 no-casts `packages/core/compute/pipeline-transcription/src/stages/extraction.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 15-29 (`describe('extraction', () => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-89 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 116-127 (`export const makeExtractionStage = (): Stage<ExtractionInput> => ({`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-90 no-sleep-in-test `packages/core/compute/pipeline/src/Pipeline.test.ts:131`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 131-142 (`Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-91 inline-obj-parent `packages/core/echo/echo-client-e2e/src/merge.test.ts:147`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 147-158 (`const loser = db.add(Obj.make(TestSchema.Person, { name: 'Alice (second write...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-92 no-casts `packages/core/echo/echo-client-e2e/src/merge.test.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 219-230 (`expect(referrer.previous!.target?.id).toBe(first.id);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-93 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.82. The likeliest place is lines 75-86 (`bench(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-94 no-casts `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`get(key: keyof any): unknown {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-95 test-asserts-real-behavior `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts:154`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 154-164 (`});`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-96 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 46-69 (`describe('RepoProxy', () => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-97 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:718`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 718-741 (`const [clientRepo] = createProxyRepos(dataService);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-98 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-99 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-100 no-sleep-in-test `packages/core/echo/echo-client/src/proxy-db/database.test.ts:782`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 782-805 (`await expect.poll(titles).toEqual(['three', 'one', 'two', 'four']);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-101 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:926`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 926-949 (`person.tasks = [person.tasks![2], person.tasks![0], person.tasks![1]];`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-102 no-casts `packages/core/echo/echo-client/src/testing/test-database-layer.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 64-75 (`log('starting persistant test db', { storagePath });`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-103 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:507`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 507-530 (`expect(loaded.doc()!.text).toEqual('authorized');`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-104 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-105 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-106 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-107 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:860`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 860-883 (`await cancelWithContext(ctx, asyncTimeout(this._waitForReady(progress, abort....`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-108 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-109 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.92. The likeliest place is lines 79-90 (`async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-110 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-111 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.84. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-112 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-113 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/index.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 73-81 (`const hasMigration = (name: string) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-114 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 93-104 (`});`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-115 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:421`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 421-432 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-116 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:82`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 82-93 (`await sleep(120);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-117 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 146-157 (`await linkExisting(holder, 'obj-shared', sharedHandle!.url);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-118 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-119 no-casts `packages/core/echo/echo-host/src/db-host/data-service.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 109-120 (`return Effect.tryPromise({`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-120 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 49-60 (`expect(JSON.parse(result.objects![1])).toMatchObject(object2);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-121 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-193 (`feedId: feedId!,`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-122 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:270`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 270-280 (`// ---------------------------------------------------------------------------`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-123 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-124 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-125 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/sqlite-health-check.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 32-43 (`export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClien...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-126 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-127 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-128 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-129 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 884-907 (`break;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-130 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/foreign-key.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 9-23 (`const ForeignKey_ = Schema.Struct({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-131 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-132 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-133 no-casts `packages/core/echo/echo/src/Annotation.test.ts:331`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 331-354 (`schema: Schema.String,`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-134 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.90. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-135 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-136 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-137 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:666`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 666-687 (`return {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-138 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-139 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 162-173 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-140 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-141 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-142 no-casts `packages/core/echo/echo/src/internal/common/types/typename.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 56-65 (`export const getSchema = (obj: unknown | undefined): Schema.Codec<any, any> |...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-143 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-144 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-145 no-casts `packages/core/echo/echo/src/internal/Entity/relation.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 210-216 (`})(options.schema);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-146 no-casts `packages/core/echo/echo/src/internal/Entity/type-kind.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-147 comment-hygiene `packages/core/echo/echo/src/internal/Format/date.ts:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 13-24 (`* Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-148 deprecated-tag-must-be-accurate `packages/core/echo/echo/src/internal/Format/types.ts:54`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 54-57 (`export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-149 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema-v3.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-35 (`const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.Pro...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-150 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:75`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 75-98 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-151 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 123-146 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-152 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:584`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 584-605 (`const refToEffectSchema = (root: any): Schema.Codec<any, any> => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-153 no-casts `packages/core/echo/echo/src/internal/Obj/parent-annotation.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 71-82 (`const setParent = (value: unknown, parent: unknown, override: boolean): void ...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-154 no-casts `packages/core/echo/echo/src/internal/Obj/set-value.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 16-27 (`export const setValue = (obj: Mutable<any>, path: readonly (string | number)[...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-155 comment-hygiene `packages/core/echo/echo/src/internal/Obj/set-value.ts:28`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 28-39 (`const key = typeof part === 'number' ? part : String(part);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-156 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-157 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-158 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-159 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-160 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-161 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-162 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-163 no-casts `packages/core/echo/echo/src/testing/util.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`export const createEchoSchema = (schema: Schema.Schema<any>, version = '0.1.0...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-164 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-165 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-166 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/index-tracker.ts:103`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.80. The likeliest place is lines 103-114 (`}): Effect.Effect<Map<string, IndexCursor[]>, SqlError.SqlError> =>`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-167 error-messages-carry-context `packages/core/mesh/edge-client/src/edge-http-client.ts:157`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 157-174 (`const parseFinalizeResponse = (body: unknown): FinalizedUpload => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-168 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-169 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:865`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 865-888 (`) as T;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-170 no-casts `packages/core/mesh/edge-client/src/service/edge-service.test.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-37 (`const stubFetch = (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-171 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-172 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 109-120 (`} catch (err: any) {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-173 no-sleep-in-test `packages/core/mesh/rpc/src/effect-rpc.test.ts:73`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 73-84 (`await sleep(options.serverDelay);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-174 no-casts `packages/devtools/cli/src/bin.ts:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 103-111 (`let leaksTracker: any;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-175 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-176 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-177 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-178 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:121`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 121-132 (`const toCompactGraph = (graph: ComputeGraph) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-179 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:129`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 129-140 (`let response: any;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-180 no-casts `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 118-129 (`condition: () => this._client!.spaces.get(response.spaceId as SpaceId),`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-181 error-messages-carry-context `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 130-141 (`if (buildResult.error || !buildResult.bundle) {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-182 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-183 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/create-object.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 37-48 (`{ name: props?.name },`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-184 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 405-426 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-185 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-186 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-187 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:73`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 73-84 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-188 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 50-53 (`const styles = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-189 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-190 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 22-25 (`const DefaultStory = (props: ToolboxProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-191 no-casts `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 26-37 (`const meta = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-192 no-casts `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`const factory = createObjectFactory(space.db, random as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-193 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 49-60 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-194 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 50-61 (`}, [manager]);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-195 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:122`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.81. The likeliest place is lines 122-133 (`<Button`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-196 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-197 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-198 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 53-64 (`const DefaultStory = () => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-199 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-200 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-201 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 284-295 (`<Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick={han...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-202 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 73-84 (`.action(`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-203 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-204 errors-extend-base-error `packages/plugins/plugin-assistant/src/hooks/useMcpServer.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 31-38 (`class McpSignInError extends Schema.TaggedError<McpSignInError>('McpSignInErr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-205 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-206 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-207 no-casts `packages/plugins/plugin-assistant/src/processor/processor.node.test.ts:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-38 (`describe('Chat processor', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-208 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-209 reuse-shared-test-layer `packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 438-449 (`const makeSpaceLayer = (agentService: AgentService.Service) =>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-210 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-211 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 261-272 (`<Banner.Root valence='warning'>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-212 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:182`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 182-193 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-213 no-invented-theme-tokens `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:278`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 278-289 (`<ObjectCard.Header subject={preview} />`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-214 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.88. The likeliest place is lines 118-129 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-215 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 202-213 (`<Panel.Header>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-216 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/operations/sync.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 48-59 (`const syncBinding = ({ binding }: { binding: Cursor.ExternalCursor }) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-217 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 217-228 (`const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: ...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-218 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 87-98 (`.map((obj) => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-219 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 171-182 (`iconOnly`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-220 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-221 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/FactsCompanion/use-facts.ts:30`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 30-41 (`export const useFacts = (registry: FactStoreRegistry, spaceId: string | undef...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-222 namespace-export-with-internal-hiding `packages/plugins/plugin-brain/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-9 (`export * as BrainPlugin from './BrainPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-223 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-224 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-225 no-casts `packages/plugins/plugin-brain/src/templates/mailbox-facts.test.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-92 (`);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-226 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 44-55 (`export const mailboxFacts: ProjectCapabilities.Template = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-227 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-228 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 63-74 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-229 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 75-86 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-230 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:111`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 111-122 (`<div>{participants}</div>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-231 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 30-41 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-232 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 54-65 (`const timeout = setTimeout(() => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-233 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.90. The likeliest place is lines 93-104 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-234 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 42-53 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-235 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:84`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 84-95 (`</Panel.Header>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-236 test-asserts-real-behavior `packages/plugins/plugin-chess-com/src/plugin.test.ts:17`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 17-28 (`describe('ChessComPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-237 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-238 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`)}`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-239 namespace-export-with-internal-hiding `packages/plugins/plugin-chess/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as ChessPlugin from './ChessPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-240 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/identity-lifecycle.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 44-55 (`const registry = yield* Capabilities.AtomRegistry;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-241 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 58-69 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-242 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-243 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-244 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-245 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 94-105 (`}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-246 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 89-100 (`onValueChange={({ value: [value] }) =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-247 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 251-262 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-248 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 31-42 (`return;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-249 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-250 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/schema-defs.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 39-50 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-251 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 22-33 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-252 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-253 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 53-64 (`const meta: Meta<typeof DefaultStory> = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-254 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 77-88 (`return (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-255 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 128-139 (`AiService.AiService,`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-256 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 494-517 (`);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-257 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-258 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-259 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-260 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 166-182 (`const openCreateSyncRoutineDialog = (`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-261 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-262 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 50-61 (`const db = Obj.getDatabase(connectionObj);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-263 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 61-72 (`const invoker = OperationInvoker.make(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-264 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:90`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.85. The likeliest place is lines 90-101 (`[subject],`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-265 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/capabilities/app-graph-builder.ts:96`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 96-107 (`data: () =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-266 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-267 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm-project.ts:59`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 59-70 (`export const crmProject: ProjectCapabilities.Template = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-268 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:78`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 78-89 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-269 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-28 (`import { OperationInvoker } from '@dxos/operation';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-270 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:807`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 807-823 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-271 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 71-82 (`iconOnly`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-272 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-273 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-274 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-275 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 66-77 (`});`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-276 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 78-89 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-277 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-278 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 67-78 (`useEffect(() => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-279 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 103-114 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-280 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:187`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 187-198 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-281 namespace-export-with-internal-hiding `packages/plugins/plugin-debug/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-8 (`export * as DebugPlugin from './DebugPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-282 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-283 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 27-41 (`const DefaultStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-284 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/app-graph-builder.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 61-72 (`Effect.gen(function* () {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-285 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-286 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-287 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 135-146 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-288 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-289 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 29-40 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-290 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 161-179 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-291 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 512-535 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-292 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-293 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 136-147 (`classNames={[`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-294 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 87-98 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-295 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:177`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 177-188 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-296 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:45`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 45-54 (`};`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-297 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-298 no-sleep-in-test `packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 39-46 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sub...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-299 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-300 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 42-54 (`applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-301 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:113`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 113-118 (`});`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-302 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-devtools/src/capabilities/app-graph-builder.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 73-84 (`export const createDevtoolsExtension = (appGraphAtom: Atom.Atom<AppCapabiliti...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-303 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 32-43 (`const sampleProfiler = useCallback(() => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-304 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/connector.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 58-69 (`const validateToken = (token: string) =>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-305 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/DiscordSource.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`export { discordSourceLayer as layer } from './services/discord-source.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-306 namespace-brand-key-prefixing `packages/plugins/plugin-discord/src/errors.ts:16`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 16-21 (`type DfxErrorResponseShape = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-307 flat-layer-composition `packages/plugins/plugin-discord/src/operations/sync.ts:217`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 217-228 (`yield* Feed.append(feed, mapped).pipe(Effect.provideService(Database.Origin, ...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-308 no-casts `packages/plugins/plugin-discord/src/services/discord-source.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-39 (`const sample = (over: Record<string, unknown> = {}): MessageResponse =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-309 structured-logging-not-console `packages/plugins/plugin-discord/src/services/discord-source.test.ts:136`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 136-147 (`if (dumpFacts) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-310 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:62`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 62-73 (`console.log(`channels: ${channels.join(', ')}`);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-311 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/generate-fixtures.ts:38`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 38-49 (`const program = Effect.gen(function* () {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-312 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:57`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 57-68 (`for (const question of questions) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-313 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 108-119 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-314 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 26-29 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-315 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-316 no-casts `packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 29-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-317 no-casts `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 23-26 (`const generator = random as any as ValueGenerator;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-318 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`let cancelled = false;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-319 no-styling-wrapper-divs `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 75-86 (`<div className='relative flex dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-320 no-casts `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-32 (`const generator = random as any as ValueGenerator;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-321 no-casts `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 89-101 (`export const Image: Story = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-322 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-323 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Input readOnly value={reference} classNames='grow' />`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-324 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:147`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 147-158 (`const bytes = yield* Blob.read(blob);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-325 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-326 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 39-48 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-327 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-github/src/operations/sync.test.ts:94`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 94-105 (`throw new Error('expected external-sync cursor');`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-328 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`value={url}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-329 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/walkthrough/generate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 82-93 (`export const generateWalkthrough = <R = never>({`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-330 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-331 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/operations/calendar/list/handler.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 28-42 (`const listGoogleCalendars = (token: string) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-332 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 117-128 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-333 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-google/src/operations/mail/sync/fetch-fixture.test.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 39-50 (`try {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-334 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 117-128 (`Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-335 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:210`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 210-233 (`expect(afterRerun.length).toBe(feedMessages.length);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-336 flat-layer-composition `packages/plugins/plugin-google/src/services/google-credentials.test.ts:115`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 115-126 (`const runFromAccessToken = (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-337 no-casts `packages/plugins/plugin-google/src/testing/gmail-fixtures.test.ts:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 62-73 (`expect(full.id).toBe(page1.messages![0].id);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-338 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-339 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 66-77 (`disabled={syncingLots}`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-340 effect-requirement-type-not-erased `packages/plugins/plugin-ibkr/src/operations/operations.test.ts:272`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.81. The likeliest place is lines 272-283 (`const run = <T>(`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-341 namespace-export-with-internal-hiding `packages/plugins/plugin-illustrator/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-10 (`export * as IllustratorPlugin from './IllustratorPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-342 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 74-85 (`const seeded = useRef(false);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-343 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 126-134 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-344 no-casts `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 53-64 (`const { defaultSpace } = yield* initializeIdentity(client);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-345 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 188-199 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-346 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-347 error-messages-carry-context `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.stories.tsx:292`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 292-303 (`await waitFor(() => expect(getTileCount()).toBeGreaterThan(0), { timeout: 12_...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-348 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 154-177 (`const filterTagUris = useMemo(() => getFilterTagUris(debouncedFilter), [debou...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-349 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 27-38 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-350 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 180-191 (`onCheckedChange={() => toggleAll()}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-351 namespace-export-with-internal-hiding `packages/plugins/plugin-inbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-12 (`export * as InboxPlugin from './InboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-352 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/create-project-from-message.ts:37`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 37-48 (`const threadId = deriveThreadId(message);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-353 no-casts `packages/plugins/plugin-inbox/src/operations/extractor/summarize-extractor.test.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-98 (`const mockAiServiceLayer = Layer.succeed(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-354 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 37-48 (`const { db } = await builder.createDatabase({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-355 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:73`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.87. The likeliest place is lines 73-84 (`const other = await run(db, FeedCursor.findOrCreateFeedCursor(mailbox, 'someO...`, location confidence 0.71). Judged with added `test` context after a first pass of 0.62. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-356 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/FeedCursor.ts:52`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 52-63 (`export const findFeedCursor = (owner: FeedOwner, id: string, subject: CursorS...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-357 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/sync.test.ts:457`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 457-468 (`const runReconcile = (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-358 no-casts `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-359 effect-requirement-type-not-erased `packages/plugins/plugin-inbox/src/types/apply-tag.test.ts:47`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 47-58 (`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>`, location confidence 1.00). Judged with added `test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-360 no-casts `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-41 (`const { db } = await builder.createDatabase({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-361 no-casts `packages/plugins/plugin-inbox/src/types/SystemTags.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 31-42 (`const { db } = await builder.createDatabase({`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-362 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-363 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 71-82 (`))}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-364 namespace-export-with-internal-hiding `packages/plugins/plugin-jmap/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-8 (`export * as JmapPlugin from './JmapPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-365 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 32-43 (`Layer.provide(JmapMailApi.Live),`, location confidence 0.56). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-366 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 60-71 (`export const jmapMailSyncProvider = (): Layer.Layer<MailSync.MailSyncProvider...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-367 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-368 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.86. The likeliest place is lines 88-99 (`const DefaultComponent = () => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-369 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`return null;`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-370 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 47-58 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-371 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:83`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 83-94 (`[invokePromise],`, location confidence 0.73). Judged with added `imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-372 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 137-148 (`if (target == null) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-373 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`const settingsSchema = (isView ? KanbanSchema.KanbanViewSettingsSchema : Kanb...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-374 namespace-export-with-internal-hiding `packages/plugins/plugin-kanban/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as KanbanPlugin from './KanbanPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-375 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 37-48 (`<Button`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-376 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:109`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 109-120 (`() =>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-377 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.87. The likeliest place is lines 106-117 (`}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-378 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 106-117 (`}`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-379 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-linear/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-380 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-linear/src/operations/sync.test.ts:48`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 48-59 (`describe('plugin-linear sync', () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-381 inline-obj-parent `packages/plugins/plugin-linear/src/operations/sync.ts:248`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 248-263 (`taskSet.milestones.push(Ref.make(milestone));`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-382 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 109-122 (`/>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-383 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 52-63 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-384 no-casts `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 117-128 (`const seedSpaceWithQueueItems = ({ client }: { client: Client }) =>`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-385 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-386 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 84-95 (`});`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-387 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 128-142 (`const loadValidFeeds = (magazine: Magazine.Magazine) =>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-388 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 28-39 (`export const magazineCuration: RoutineCapabilities.Template = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-389 no-casts `packages/plugins/plugin-magazine/src/types/Subscription.test.ts:166`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 166-171 (`const latest = await Subscription.findPostContent(subscription, queuePost!);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-390 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-391 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 186-194 (`const useTest = (view: EditorView | null) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-392 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 117-128 (`const [missing, setMissing] = useState(false);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-393 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 333-344 (`if (mode === 'section') {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-394 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-395 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-396 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-100 (`{subjects.map((subject) => (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-397 namespace-export-with-internal-hiding `packages/plugins/plugin-markdown/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-9 (`export * as MarkdownPlugin from './MarkdownPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-398 test-asserts-real-behavior `packages/plugins/plugin-markdown/src/plugin.test.ts:15`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 15-26 (`describe('MarkdownPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-399 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 91-102 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-400 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 37-48 (`const identity = Option.getOrUndefined(haloIdentity.getSnapshot());`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-401 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 58-69 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-402 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 70-81 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-403 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 118-129 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-404 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 130-141 (`<div className='grid grid-cols-2 gap-2 dx-grow'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-405 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-406 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-407 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-408 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-409 structured-logging-not-console `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 27-38 (`const menuActions = random.helpers.multiple(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-410 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 25-36 (`export const NavTreeItemActionDropdownMenu = composable<HTMLButtonElement, Na...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-411 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:196`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 196-207 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-412 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 371-382 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-413 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 25-35 (`const ITEM_END_SIZE = '1.25rem';`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-414 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 194-205 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-415 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 38-49 (`const current = getHotkeyScope() ?? '';`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-416 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 312-323 (`useEffect(() => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-417 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 128-139 (`id: 'appGraphBuilder',`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-418 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-419 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 82-92 (`(event) =>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-420 no-casts `packages/plugins/plugin-observability/src/plugin.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-25 (`describe('ObservabilityPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-421 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-422 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.60). Judged with added `diff, imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-423 inline-obj-parent `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 65-74 (`objects: seed.objects.map((object) => Ref.make(object)),`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-424 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 101-112 (`export const Projects: SampleSpace.Phase<ProjectsResult, ProjectsInput> = Sam...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-425 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 43-54 (`} else {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-426 no-styling-wrapper-divs `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-427 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-428 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 123-134 (`title: random.lorem.sentence(),`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-429 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 118-129 (`name: 'Messages',`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-430 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.88. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-431 no-casts `packages/plugins/plugin-presenter/src/useExitPresenter.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 16-24 (`export const useExitPresenter = (object: any) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-432 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-433 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-434 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-435 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-436 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-437 no-casts `packages/plugins/plugin-preview/src/stories/Card.stories.tsx:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 101-107 (`export const _FormTableEmpty: StoryObj<typeof DefaultStory<any>> = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-438 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`{roles.map((role, i) => (`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-439 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 37-48 (`const terminateLocal = (pid: string) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-440 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-441 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-442 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 458-475 (`if (!chat) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-443 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 124-135 (`const fiber = Effect.runFork(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-444 namespace-export-with-internal-hiding `packages/plugins/plugin-projects/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-10 (`export * as ProjectsPlugin from './ProjectsPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-445 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:109`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 109-120 (`{`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-446 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 104-115 (`const seed = () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-447 no-casts `packages/plugins/plugin-projects/src/templates/inbox-research.test.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 81-92 (`const routineSkills = routineInstructions?.skills.map((ref) => ref.uri.toStri...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-448 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/templates/inbox-research.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 55-66 (`export const inboxResearch: ProjectCapabilities.Template = {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-449 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 58-69 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-450 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-451 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.88. The likeliest place is lines 129-140 (`) : (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-452 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:185`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 185-196 (`/>`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-453 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-454 business-logic-out-of-ui `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:130`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 130-141 (`}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-455 no-casts `packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 41-48 (`const { plugins } = await harness.runPromise(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-456 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 46-57 (`standalone`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-457 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 99-110 (`</div>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-458 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 54-65 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-459 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 448-459 (`const filteredAnchors = showResolvedThreads`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-460 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 222-233 (`<Button icon='ph--trash--regular' label={t('discard-branch.label')} onClick={...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-461 no-casts `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 296-320 (`for (const { creator, content } of context.args.suggestions ?? []) {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-462 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-463 no-casts `packages/plugins/plugin-routine/src/commands/trigger/util.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 76-87 (`Match.when('not available', () => Ansi.yellow),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-464 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-465 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-466 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 290-300 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-467 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:196`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 196-207 (`const enabled = values.enabled ?? trigger?.enabled ?? false;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-468 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-469 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 162-175 (`}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-470 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-s3/src/capabilities/connector.ts:95`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 95-106 (`onValidate: ({ values }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-471 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/app-graph-builder.ts:66`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 66-77 (`AppGraphBuilder.createExtension({`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-472 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-473 extract-non-rendering-logic-from-component `packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 74-85 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-474 namespace-export-with-internal-hiding `packages/plugins/plugin-sandbox/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-9 (`export * as SandboxPlugin from './SandboxPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-475 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-476 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 76-87 (`</Dialog.Header>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-477 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-478 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-479 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-480 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-481 no-styling-wrapper-divs `packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-69 (`if (!script || !sourceReady) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-482 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 36-47 (`if (!token || !gistId) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-483 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-484 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-485 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-486 no-casts `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 54-65 (`onClientInitialized: ({ client }) =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-487 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 58-69 (`onClientInitialized: ({ client }) =>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-488 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-489 name-for-general-behavior `packages/plugins/plugin-search/src/hooks/sync.ts:47`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.83. The likeliest place is lines 47-58 (`export const filterObjectsSync = <T extends Entity.Unknown>(objects: T[], mat...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-490 no-casts `packages/plugins/plugin-search/src/hooks/sync.ts:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 82-93 (`export const getStringProperty = (object: any, keys: string[]): string | unde...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-491 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-search/src/index.ts:1`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 1-11 (`export * as SearchPlugin from './SearchPlugin.ts';`, location confidence 1.00). Judged with added `importers, imports, public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-492 no-casts `packages/plugins/plugin-search/src/search/exa.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 93-104 (`//     (rawObjects[i] as any[])?.map((object: any) => ({`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-493 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-494 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 299-310 (`}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-495 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 467-478 (`<div`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-496 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 23-34 (`export const Basic = () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-497 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 267-278 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-498 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 84-95 (`export const Spec = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-499 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-500 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-501 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-502 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/operations/sync.ts:173`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 173-184 (`const resolveUsers = (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-503 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:321`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 321-332 (`label: (snapshot as { name?: string }).name || [`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-504 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`const { graph } = appGraph;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-505 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/navigation-target-resolver.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 25-36 (`const resolver: AppCaps.NavigationTargetResolver = (query) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-506 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/join/util.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 31-42 (`export const acceptInvitation = ({ observable, callbacks }: AcceptInvitationP...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-507 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-508 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 112-123 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-509 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 100-111 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-510 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-511 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-512 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:259`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 259-270 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-513 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-514 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-515 no-casts `packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 95-106 (`StorybookPlugin.make({}),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-516 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 48-59 (`}, [schemas]);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-517 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 242-253 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-518 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-519 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 58-68 (`}, [updateState]);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-520 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:199`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 199-210 (`const rail = (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-521 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 180-191 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-522 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 225-233 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-523 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-524 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 54-65 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-525 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 72-83 (`(id: string) =>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-526 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 108-119 (`return;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-527 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.94. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-528 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 80-86 (`<div className='grid overflow-hidden border-s border-separator'>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-529 inline-obj-parent `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 99-110 (`yield* initializeIdentity(client);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-530 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-531 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-532 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 109-120 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-533 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 145-156 (`<div className='flex items-start'>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-534 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-36 (`const makeObservability = (): Observability.Observability =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-535 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 64-75 (`Obj.update(subject, (subject) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-536 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 77-88 (`const registrars = manager`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-537 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 89-100 (`return (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-538 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 31-45 (`data-testid='supportPlugin.startTour'`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-539 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:161`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 161-172 (`const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-540 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 165-176 (`return {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-541 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 18-29 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-542 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-543 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-544 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 73-82 (`disabled={!canSave}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-545 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-546 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 139-150 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-547 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-548 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 137-152 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-549 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 87-98 (`if (text.length === 0) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-550 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-551 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-552 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 232-243 (`useEffect(() => {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-553 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-554 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-555 namespace-export-with-internal-hiding `packages/plugins/plugin-thread/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as ThreadPlugin from './ThreadPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-556 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 116-127 (`useEffect(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-557 namespace-export-with-internal-hiding `packages/plugins/plugin-transcription/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-9 (`export * as TranscriptionPlugin from './TranscriptionPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-558 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-559 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 301-312 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-560 no-casts `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-561 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trello/src/capabilities/connector.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 31-42 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-562 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-563 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:136`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 136-150 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-564 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:151`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 151-162 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-565 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trello/src/operations/handlers.test.ts:175`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 175-186 (`const bindTarget = (`, location confidence 0.92). Judged with added `test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-566 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:199`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 199-210 (`return binding;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-567 no-casts `packages/plugins/plugin-trello/src/operations/sync.test.ts:240`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 240-251 (`const localItem = (kanban.spec.kind === 'items' ? kanban.spec.items[0]?.targe...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-568 no-casts `packages/plugins/plugin-trello/src/operations/sync.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 191-202 (`newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-569 no-casts `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`const extension = yield* AppGraphBuilder.createExtension({`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-570 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 102-113 (`const planTripExtension = yield* AppGraphBuilder.createExtension({`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-571 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-572 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-573 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-574 no-casts `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.test.ts:303`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 303-314 (`const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.S...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-575 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 54-65 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-576 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 28-39 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-577 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-578 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-579 no-casts `packages/plugins/plugin-zen/src/components/Editor/Editor.tsx:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 17-28 (`export const Editor = ({ dream }: EditorProps) => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-580 moon-yml-entrypoint-registration `packages/sdk/app-framework/package.json:73`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 73-84 (`"types": "./dist/types/src/plugin-process-manager/ProcessManagerPlugin.d.ts",`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-581 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/common/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-8 (`export * as Capabilities from './capabilities.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-582 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/core/capability-manager.ts:112`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 112-123 (`waitForPromise<T>(interfaceDef: Capability.InterfaceDef<T>): Promise<T>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-583 no-casts `packages/sdk/app-framework/src/core/capability.ts:403`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 403-422 (`[ContributionTypeId]: capability as unknown as IdentifierOf<C>,`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-584 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:490`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.82. The likeliest place is lines 490-515 (`export interface Module<Options = void> {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-585 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/capability.ts:535`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 535-556 (`export const lazyModule = <`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-586 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin-manifest.ts:115`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 115-126 (`export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedMan...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-587 no-casts `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-588 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:626`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 626-651 (`export const resolveLazy = (plugin: Plugin): Effect.Effect<Plugin, LazyPlugin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-589 no-sleep-in-test `packages/sdk/app-framework/src/core/registry.test.ts:35`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 35-47 (`const settled = (registry: AtomRegistry.AtomRegistry, manager: Registry.Manag...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-590 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-591 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-592 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 114-125 (`}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-593 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/plugin-process-manager/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-9 (`export * from './history/index.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-594 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 56-61 (`const resolveWith = <S>(manager: PluginManager.PluginManager, tag: Context.Ke...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-595 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 205-216 (`const remoteProcessManagerLayer = RemoteProcessManager.layerNoop.pipe(Layer.p...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-596 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.86. The likeliest place is lines 229-240 (`runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-597 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 253-264 (`const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.ru...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-598 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 250-261 (`}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-599 deprecated-tag-must-be-accurate `packages/sdk/app-framework/src/testing/withPluginManager.tsx:92`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 92-98 (`export type WithPluginManagerOptions = UseAppOptions & {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-600 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.tsx:107`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 107-118 (`export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<A...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-601 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-602 no-casts `packages/sdk/app-framework/src/ui/components/Surface/types.ts:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 51-62 (`export const makeFilter = <TData>(token: Role.Role<TData>, guard?: (data: TDa...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-603 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 354-365 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-604 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-91 (`export const useOptionalAtomCapability = <T>(atomCapability: Capability.Inter...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-605 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-606 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-607 no-casts `packages/sdk/app-graph/src/AppGraph.test.ts:459`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 459-482 (`});`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-608 no-sleep-in-test `packages/sdk/app-graph/src/AppGraph.test.ts:893`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 893-917 (`release();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-609 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-488 (`export const getInternal = (graph: BaseGraph): GraphImpl => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-610 use-context-scoped-cancellation `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-611 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:619`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 619-639 (`const i = setInterval(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-612 namespace-export-with-internal-hiding `packages/sdk/app-solid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-8 (`export * from './common.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-613 no-casts `packages/sdk/app-solid/src/useCapabilities.test.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 19-24 (`const mockManager = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-614 no-casts `packages/sdk/app-solid/src/usePluginManager.test.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-24 (`describe('usePluginManager', () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-615 no-casts `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 22-28 (`const statusMessage = (data: Trace.PayloadType<typeof Trace.StatusUpdate>, me...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-616 no-casts `packages/sdk/app-toolkit/src/app-framework/Tour.test.ts:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 15-26 (`describe('composeSteps', () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-617 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:194`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 194-205 (`const type = Obj.getType(object) ?? registered;`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-618 no-casts `packages/sdk/app-toolkit/src/app-graph/TypeSection.ts:159`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 159-170 (`return [];`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-619 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app/NavigationResolver.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-50 (`export const forType = <S extends Type.AnyObj>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-620 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-621 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-622 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:396`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 396-419 (`});`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-623 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:65`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 65-88 (`test('creates a space whose database opens only after a long stall', async ()...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-624 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:449`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 449-472 (`expect((space2.db.getObjectById(obj.id) as any).data).to.equal('test-reactive');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-625 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:263`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 263-275 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-626 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:235`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.90. The likeliest place is lines 235-246 (`const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-627 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:247`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 247-257 (`Effect.fn('EdgeAgentManager.onDataSpacesAvailable')(function* () {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-628 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-629 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.84. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-630 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.47). Judged with added `imports, public-api` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-631 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-632 no-casts `packages/sdk/client-services/src/internal/devtools/feeds.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 56-67 (`.forEach((feed) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-633 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-634 options-object-with-defaults `packages/sdk/client-services/src/internal/devtools/feeds.ts:104`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.81. The likeliest place is lines 104-115 (`export const subscribeToFeedBlocks = (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-635 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/devtools/spaces.ts:73`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 73-85 (`unsubscribe = dataSpaceManager.updated.on(() => update());`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-636 no-casts `packages/sdk/client-services/src/internal/diagnostics/diagnostics.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 248-259 (`const getStorageDiagnostics = async () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-637 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-638 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:385`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 385-396 (`await this._identity.ready();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-639 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:614`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 614-625 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-640 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:276`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 276-286 (`export const InboxServiceLayer = Layer.effect(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-641 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-642 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.82. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-643 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 93-104 (`update();`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-644 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-645 no-sleep-in-test `packages/sdk/client-services/src/internal/logging/logging.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 30-41 (`const readWhileEmitting = <A, E>(read: Effect.Effect<Option.Option<A>, E>, em...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-646 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-647 no-casts `packages/sdk/client-services/src/internal/services/client-services-stack.test.ts:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`test('write and query credentials', async () => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-648 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/cross-device-space-synchronizer.ts:25`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 25-32 (`export interface CrossDeviceSpaceSynchronizer extends CredentialProcessor, Li...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-649 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 92-103 (`const makeMessageChannel = () =>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-650 no-casts `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 299-310 (`const request = proxy.SystemService!.getConfig();`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-651 no-sleep-in-test `packages/sdk/client-services/src/internal/services/effect-rpc.test.ts:488`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 488-499 (`});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-652 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-653 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-654 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.ts:189`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 189-212 (`payloadByteLength: msg.payload?.value?.byteLength,`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-655 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/feed-syncer.ts:429`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 429-452 (`}`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-656 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:71`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 71-82 (`export const NetworkLifecycleLayer = (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-657 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:107`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 107-118 (`await setNetworkIdentity({ identity });`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-658 no-casts `packages/sdk/client-services/src/internal/services/service-context.test.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-43 (`await space2!.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.con...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-659 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:78`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 78-89 (`export const registerReplicator = <Self>(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-660 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-661 no-casts `packages/sdk/client-services/src/internal/space/space-manager.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 181-193 (`public findSpaceByRootDocumentId(documentId: string): Space | undefined {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-662 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:390`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 390-413 (`await Promise.all(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-663 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1157`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 1157-1180 (`const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-664 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.90. The likeliest place is lines 188-199 (`);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-665 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-666 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:275`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 275-286 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-667 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:489`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 489-500 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-668 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-669 no-casts `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 123-134 (`const ready = new Trigger<Error | undefined>();`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-670 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:384`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 384-395 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-671 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-672 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/invitations/host.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 29-40 (`export const hostInvitation = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-673 no-casts `packages/sdk/client/src/services/local-client-services.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 211-222 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-674 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/testing/test-worker-factory.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 70-81 (`createSession: ({ isOwner }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-675 effect-fn-not-hand-wrapped-gen `packages/sdk/config/src/config-service.test.ts:107`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 107-117 (`const load = (contents: string) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-676 effect-fn-not-hand-wrapped-gen `packages/sdk/observability/src/ai/AiObservability.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 372-383 (`const setupWired = ({`, location confidence 0.88). Judged with added `test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-677 import-as-namespace-is-all-or-nothing `packages/sdk/observability/src/ai/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-5 (`export * as AiObservability from './AiObservability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-678 no-casts `packages/sdk/observability/src/extensions/otel/ai-content.test.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 34-45 (`onStart: () => {},`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-679 no-casts `packages/sdk/observability/src/extensions/otel/OtelSpanSink.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`records.forEach((record) => sink!.append(record));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-680 namespace-export-with-internal-hiding `packages/sdk/observability/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-10 (`export * as Observability from './Observability.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-681 no-sleep-in-test `packages/sdk/observability/src/providers/object-events.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 67-78 (`yield* Effect.sleep(Duration.times(DRAFT_WINDOW, 3));`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-682 no-casts `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 108-119 (`await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-683 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 120-131 (`await sleep(15_000);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-684 structured-logging-not-console `packages/sdk/schema/src/experimental/json-schema.test.ts:111`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 111-122 (`console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-685 no-casts `packages/sdk/schema/src/experimental/json-schema.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 274-285 (`const mutableParent = parent as Obj.Mutable<JsonSchema.JsonSchema>;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-686 no-casts `packages/sdk/schema/src/graph/graph.ts:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 28-39 (`log('no schema for object', { id: object.id.slice(0, 8) });`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-687 no-casts `packages/sdk/schema/src/projection/format.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 65-76 (`export const formatToSchema: Record<Format.TypeFormat, Schema.Codec<FormatSch...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-688 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:596`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.82. The likeliest place is lines 596-619 (`{ id: 'draft', title: 'Draft', color: 'indigo' },`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-689 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-690 no-echo-internal-in-sdk `packages/sdk/schema/src/projection/projection.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-691 no-echo-internal-in-sdk `packages/sdk/schema/src/testing/generator.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.81. The likeliest place is lines 13-24 (`JsonSchema,`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-692 no-casts `packages/sdk/schema/src/testing/generator.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 260-269 (`export const addToDatabase = (db: Database.Database) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-693 effect-fn-not-hand-wrapped-gen `packages/sdk/schema/src/testing/generator.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 288-299 (`export const createObjectPipeline = <S extends Type.AnyObj>(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-694 deprecated-tag-must-be-accurate `packages/sdk/schema/src/util/deprecated.ts:66`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.87. The likeliest place is lines 66-77 (`export const mapSchemaToFields = (schema: Schema.Codec<any, any>): SchemaFiel...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-695 no-echo-internal-in-sdk `packages/sdk/schema/src/util/validate.test.ts:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.85. The likeliest place is lines 13-19 (`import { describe, test } from 'vitest';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-696 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-697 no-casts `packages/sdk/worker-framework/src/Worker.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-698 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Agent.stories.tsx:61`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 61-73 (`const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-699 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-700 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 169-176 (`}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-701 no-casts `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-702 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:79`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 79-85 (`}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-703 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 134-145 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-704 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-705 comment-hygiene `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:116`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.94. The likeliest place is lines 116-127 (`{`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-706 test-asserts-real-behavior `packages/stories/stories-brain/src/test/artifacts.bench.test.ts:200`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.91. The likeliest place is lines 200-207 (`}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-707 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-facts.test.ts:85`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 85-90 (`} finally {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-708 no-mixed-promise-effect-lifecycle `packages/stories/stories-brain/src/test/feed-stats.test.ts:53`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 53-65 (`durationMs,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-709 flat-layer-composition `packages/stories/stories-brain/src/testing/harness/pipelines/facts.ts:95`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 95-106 (`Effect.provideService(AiService.AiService, aiService),`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-710 no-casts `packages/stories/stories-inbox/src/testing/archive.test.ts:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 78-89 (`const originalIds = new Set(serialized.map((entry: any) => entry.id));`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-711 effect-fn-not-hand-wrapped-gen `packages/stories/stories-inbox/src/testing/seed.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-128 (`export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never,...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-712 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-713 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-714 effect-fn-not-hand-wrapped-gen `packages/stories/storybook-testing/src/test/startup.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 73-84 (`const clientPlugin = ClientPlugin.make({`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-715 no-casts `packages/ui/react-ui-assistant/src/testing/test-generator.test.ts:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 66-74 (`createMessageGenerator()[2]!.pipe(Effect.provide(Layer.mergeAll(Feed.layer(fe...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-716 flat-layer-composition `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:297`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 297-308 (`Layer.mergeAll(Layer.succeed(Trace.TraceService, this._createTraceWriter()), ...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-717 no-casts `packages/ui/react-ui-canvas-compute/src/graph/controller.ts:441`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 441-452 (`const traceEventToComputeEvent = (key: string, payload: unknown): ComputeEven...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-718 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 26-36 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-719 no-casts `packages/ui/react-ui-canvas-editor/src/shapes/defs.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-24 (`export const parseAnchorId = (id: string): [PropertyKind | undefined, string]...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-720 no-casts `packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`for (const id of Array.from(selected.values())) {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-721 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-722 no-casts `packages/ui/react-ui-form/src/util/omit.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-35 (`export const omitId = <S extends Schema.Codec<any, any> | Type.AnyEntity>(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-723 no-casts `packages/ui/react-ui-form/src/util/properties.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 114-125 (`SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-724 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:120`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 120-131 (`queueMicrotask(() => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-725 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 216-227 (`positioning={virtualAnchor(popoverAnchorRef)}`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-726 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 317-328 (`<Toolbar.Root>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-727 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 76-84 (`setContext: (context: any) => void;`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-728 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 47-58 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-729 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-730 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-731 no-casts `packages/ui/react-ui-table/src/util/schema.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 18-29 (`export const narrowSchema = <S extends Schema.Codec<any, any>>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN be45a6b12c-732 no-sleep-in-test `packages/ui/react-ui-terminal/src/cli/shell.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 24-37 (`const session = async (...lines: string[]): Promise<string> => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be45a6b12c-733 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 162-188 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d97e88e9739a678073488d174642ea6291191f21`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 733 violations written to fragments, 7964 uncertain, 65391 clean, 0 unanswered
- left for an agentic reviewer: 581 batch(es)

```text
requests: 29546 (5820 verdicts re-asked with context the model requested)
estimated input tokens: 185263893
billed input tokens: 172564705 (cost $7.2477)
measured chars per token: 3.22
```
